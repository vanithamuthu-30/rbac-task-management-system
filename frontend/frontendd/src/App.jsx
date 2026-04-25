// src/App.js - Complete Frontend with API Integration
import React, { useState, useEffect, createContext, useContext } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';

// Configure axios
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
axios.defaults.baseURL = API_BASE_URL;

// Auth Context
const AuthContext = createContext(null);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// Auth Provider Component
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post('/auth/login', { email, password });
      const { token, user: userData } = response.data;
      
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const register = async (userData) => {
    try {
      await axios.post('/auth/register', userData);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Sign Up Component
const SignUp = ({ onSwitchToLogin }) => {
  const { register } = useAuth();
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    confirmPassword: '' 
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsSubmitting(false);
      return;
    }
    
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsSubmitting(false);
      return;
    }
    
    const result = await register({
      name: formData.name,
      email: formData.email,
      password: formData.password
    });
    
    setIsSubmitting(false);
    
    if (result.success) {
      setSuccess(true);
      setTimeout(() => onSwitchToLogin(), 2000);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="container">
      <div className="row justify-content-center mt-5">
        <div className="col-md-6">
          <div className="card shadow">
            <div className="card-body p-5">
              <h2 className="card-title text-center mb-4">Sign Up</h2>
              
              {error && <div className="alert alert-danger">{error}</div>}
              {success && (
                <div className="alert alert-success">
                  Registration successful! Redirecting to login...
                </div>
              )}
              
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Confirm Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <button 
                  type="submit" 
                  className="btn btn-primary w-100 mb-3"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Signing up...' : 'Sign Up'}
                </button>
                <p className="text-center mb-0">
                  Already have an account?{' '}
                  <button 
                    type="button" 
                    className="btn btn-link p-0" 
                    onClick={onSwitchToLogin}
                    disabled={isSubmitting}
                  >
                    Sign In
                  </button>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Sign In Component
const SignIn = ({ onSwitchToSignUp }) => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    const result = await login(formData.email, formData.password);
    
    setIsSubmitting(false);
    
    if (!result.success) {
      setError(result.message);
    }
  };

  return (
    <div className="container">
      <div className="row justify-content-center mt-5">
        <div className="col-md-6">
          <div className="card shadow">
            <div className="card-body p-5">
              <h2 className="card-title text-center mb-4">Sign In</h2>
              
              {error && <div className="alert alert-danger">{error}</div>}
              
              <div className="alert alert-info">
                <strong>Demo Credentials:</strong><br/>
                Admin: admin@example.com / admin123<br/>
                Manager: manager@example.com / manager123<br/>
                Employee: employee@example.com / employee123
              </div>
              
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <button 
                  type="submit" 
                  className="btn btn-primary w-100 mb-3"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Signing in...' : 'Sign In'}
                </button>
                <p className="text-center mb-0">
                  Don't have an account?{' '}
                  <button 
                    type="button" 
                    className="btn btn-link p-0" 
                    onClick={onSwitchToSignUp}
                    disabled={isSubmitting}
                  >
                    Sign Up
                  </button>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Admin Dashboard Component
const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    role: 'employee' 
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      alert('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await axios.delete(`/users/${userId}`);
      setUsers(users.filter(u => u.id !== userId));
      alert('User deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      alert(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axios.put(`/users/${userId}/role`, { role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (error) {
      console.error('Role update error:', error);
      alert('Failed to update role');
      fetchUsers(); // Reload to get correct data
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    
    if (!newUser.name || !newUser.email || !newUser.password) {
      alert('Please fill all fields');
      return;
    }
    
    try {
      await axios.post('/auth/register', newUser);
      await fetchUsers();
      setNewUser({ name: '', email: '', password: '', role: 'employee' });
      setShowAddUser(false);
      alert('User added successfully');
    } catch (error) {
      console.error('Add user error:', error);
      alert(error.response?.data?.message || 'Failed to add user');
    }
  };

  if (loading) {
    return <div className="text-center mt-5"><div className="spinner-border"></div></div>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3>User Management</h3>
        <button 
          className="btn btn-success" 
          onClick={() => setShowAddUser(!showAddUser)}
        >
          {showAddUser ? 'Cancel' : 'Add User'}
        </button>
      </div>

      {showAddUser && (
        <div className="card mb-4">
          <div className="card-body">
            <h5>Add New User</h5>
            <form onSubmit={handleAddUser}>
              <div className="row g-3">
                <div className="col-md-3">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Name"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    required
                  />
                </div>
                <div className="col-md-3">
                  <input
                    type="email"
                    className="form-control"
                    placeholder="Email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    required
                  />
                </div>
                <div className="col-md-2">
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    required
                  />
                </div>
                <div className="col-md-2">
                  <select
                    className="form-select"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <button type="submit" className="btn btn-primary w-100">Add</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <select
                      className="form-select form-select-sm"
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Manager Dashboard Component
const ManagerDashboard = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', assignedTo: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [employeesRes, tasksRes] = await Promise.all([
        axios.get('/manager/employees'),
        axios.get('/tasks')
      ]);
      setEmployees(employeesRes.data);
      setTasks(tasksRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      alert('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    
    if (!newTask.title || !newTask.assignedTo) {
      alert('Please fill all required fields');
      return;
    }
    
    try {
      await axios.post('/tasks', {
        title: newTask.title,
        description: newTask.description,
        assignedTo: parseInt(newTask.assignedTo)
      });
      await fetchData();
      setNewTask({ title: '', description: '', assignedTo: '' });
      setShowAddTask(false);
      alert('Task created successfully');
    } catch (error) {
      console.error('Create task error:', error);
      alert('Failed to create task');
    }
  };

  const handleStatusChange = async (taskId, status) => {
    try {
      await axios.put(`/tasks/${taskId}/status`, { status });
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status } : t));
    } catch (error) {
      console.error('Status update error:', error);
      alert('Failed to update status');
    }
  };

  if (loading) {
    return <div className="text-center mt-5"><div className="spinner-border"></div></div>;
  }

  return (
    <div>
      <h3 className="mb-4">Manager Dashboard</h3>
      
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h5>My Team ({employees.length})</h5>
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr><td colSpan="2" className="text-center">No employees assigned</td></tr>
                  ) : (
                    employees.map(emp => (
                      <tr key={emp.id}>
                        <td>{emp.name}</td>
                        <td>{emp.email}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5>Tasks ({tasks.length})</h5>
        <button 
          className="btn btn-success btn-sm" 
          onClick={() => setShowAddTask(!showAddTask)}
          disabled={employees.length === 0}
        >
          {showAddTask ? 'Cancel' : 'Create Task'}
        </button>
      </div>

      {showAddTask && (
        <div className="card mb-3">
          <div className="card-body">
            <form onSubmit={handleAddTask}>
              <div className="row g-3">
                <div className="col-md-4">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Task Title"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    required
                  />
                </div>
                <div className="col-md-3">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Description (optional)"
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  />
                </div>
                <div className="col-md-3">
                  <select
                    className="form-select"
                    value={newTask.assignedTo}
                    onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                    required
                  >
                    <option value="">Assign to...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <button type="submit" className="btn btn-primary w-100">Add</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          {tasks.length === 0 ? (
            <p className="text-center text-muted">No tasks created yet</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Assigned To</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task.id}>
                    <td>
                      <strong>{task.title}</strong>
                      {task.description && <><br/><small className="text-muted">{task.description}</small></>}
                    </td>
                    <td>{task.assigned_to_name || 'Unknown'}</td>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

// Employee Dashboard Component
const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await axios.get('/tasks');
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      alert('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId, status) => {
    try {
      await axios.put(`/tasks/${taskId}/status`, { status });
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status } : t));
    } catch (error) {
      console.error('Status update error:', error);
      alert('Failed to update status');
    }
  };

  if (loading) {
    return <div className="text-center mt-5"><div className="spinner-border"></div></div>;
  }

  return (
    <div>
      <h3 className="mb-4">Employee Dashboard</h3>
      
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h5>My Profile</h5>
              <p><strong>Name:</strong> {user.name}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Role:</strong> <span className="badge bg-info">{user.role}</span></p>
            </div>
          </div>
        </div>
      </div>

      <h5 className="mb-3">My Tasks ({tasks.length})</h5>
      <div className="card">
        <div className="card-body">
          {tasks.length === 0 ? (
            <p className="text-center text-muted">No tasks assigned yet</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Assigned By</th>
                  <th>Status</th>
                  <th>Update Status</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task.id}>
                    <td>
                      <strong>{task.title}</strong>
                      {task.description && <><br/><small className="text-muted">{task.description}</small></>}
                    </td>
                    <td>{task.assigned_by_name || 'Unknown'}</td>
                    <td>
                      <span className={`badge ${
                        task.status === 'completed' ? 'bg-success' :
                        task.status === 'in-progress' ? 'bg-warning' : 'bg-secondary'
                      }`}>
                        {task.status}
                      </span>
                    </td>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

// Main Dashboard Component
const Dashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div>
      <nav className="navbar navbar-dark bg-dark">
        <div className="container-fluid">
          <span className="navbar-brand">RBAC System</span>
          <div className="d-flex align-items-center">
            <span className="text-white me-3">
              Welcome, {user.name} <span className="badge bg-primary">{user.role}</span>
            </span>
            <button className="btn btn-outline-light btn-sm" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container mt-4">
        {user.role === 'admin' && <AdminDashboard />}
        {user.role === 'manager' && <ManagerDashboard />}
        {user.role === 'employee' && <EmployeeDashboard />}
      </div>
    </div>
  );
};

// Main App Component
export default function App() {
  const [showSignIn, setShowSignIn] = useState(true);

  return (
    <AuthProvider>
      <AuthContent showSignIn={showSignIn} setShowSignIn={setShowSignIn} />
    </AuthProvider>
  );
}

const AuthContent = ({ showSignIn, setShowSignIn }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="container mt-5 text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (user) {
    return <Dashboard />;
  }

  return showSignIn ? (
    <SignIn onSwitchToSignUp={() => setShowSignIn(false)} />
  ) : (
    <SignUp onSwitchToLogin={() => setShowSignIn(true)} />
  );
}

export { AuthProvider, SignIn, SignUp, Dashboard };