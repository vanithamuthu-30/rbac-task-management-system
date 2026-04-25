// server.js - Main Express Server
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json({ origin: 'http://localhost:5173', credentials: true }));

// PostgreSQL Connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'RBAC_db',
  password: process.env.DB_PASSWORD ||'1234',
  port: process.env.DB_PORT || 5432,
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to database:', err.stack);
  } else {
    console.log('Database connected successfully');
    release();
  }
});

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Role-based Authorization Middleware
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.' 
      });
    }
    next();
  };
};

// ============= AUTH ROUTES =============

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role = 'employee' } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user exists
    const userExists = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at',
      [name, email, hashedPassword, role]
    );

    const user = result.rows[0];

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get current user profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, manager_id, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============= USER MANAGEMENT ROUTES (Admin Only) =============

// Get all users
app.get('/api/users', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, manager_id, created_at FROM users ORDER BY id'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user role
app.put('/api/users/:id/role', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['admin', 'manager', 'employee'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role',
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Role updated successfully', user: result.rows[0] });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user
app.delete('/api/users/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============= MANAGER ROUTES =============

// Get employees under a manager
app.get('/api/manager/employees', authenticateToken, authorizeRoles('manager'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE manager_id = $1 AND role = $2',
      [req.user.id, 'employee']
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============= TASK ROUTES =============

// Create a task (Manager only)
app.post('/api/tasks', authenticateToken, authorizeRoles('manager', 'admin'), async (req, res) => {
  try {
    const { title, description, assignedTo } = req.body;

    if (!title || !assignedTo) {
      return res.status(400).json({ message: 'Title and assignedTo are required' });
    }

    const result = await pool.query(
      'INSERT INTO tasks (title, description, assigned_to, assigned_by, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, description || '', assignedTo, req.user.id, 'pending']
    );

    res.status(201).json({ message: 'Task created successfully', task: result.rows[0] });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get tasks based on role
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    let result;

    if (req.user.role === 'admin') {
      // Admin can see all tasks
      result = await pool.query(
        `SELECT t.*, u1.name as assigned_to_name, u2.name as assigned_by_name 
         FROM tasks t 
         LEFT JOIN users u1 ON t.assigned_to = u1.id 
         LEFT JOIN users u2 ON t.assigned_by = u2.id 
         ORDER BY t.created_at DESC`
      );
    } else if (req.user.role === 'manager') {
      // Manager sees tasks they assigned
      result = await pool.query(
        `SELECT t.*, u.name as assigned_to_name 
         FROM tasks t 
         LEFT JOIN users u ON t.assigned_to = u.id 
         WHERE t.assigned_by = $1 
         ORDER BY t.created_at DESC`,
        [req.user.id]
      );
    } else {
      // Employee sees only their tasks
      result = await pool.query(
        `SELECT t.*, u.name as assigned_by_name 
         FROM tasks t 
         LEFT JOIN users u ON t.assigned_by = u.id 
         WHERE t.assigned_to = $1 
         ORDER BY t.created_at DESC`,
        [req.user.id]
      );
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update task status
app.put('/api/tasks/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'in-progress', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Check permissions
    const taskCheck = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const task = taskCheck.rows[0];

    // Employee can only update their own tasks
    if (req.user.role === 'employee' && task.assigned_to !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Manager can update tasks they assigned
    if (req.user.role === 'manager' && task.assigned_by !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const result = await pool.query(
      'UPDATE tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );

    res.json({ message: 'Task status updated', task: result.rows[0] });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete task (Manager/Admin only)
app.delete('/api/tasks/:id', authenticateToken, authorizeRoles('manager', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});