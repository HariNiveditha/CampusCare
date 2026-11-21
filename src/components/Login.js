import React, { useState } from 'react';
import { authAPI } from '../api/api';

const Login = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState('login'); // login or signup
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.password.trim()) {
      setError('Please enter username and password');
      return;
    }

    try {
      setLoading(true);
      const response = await authAPI.login(formData.username, formData.password);
      const { user, role, token } = response.data;

      // Store token consistently in localStorage and sessionStorage
      localStorage.setItem('authToken', token);
      sessionStorage.setItem('authToken', token);

      if (onLogin) {
        onLogin(user, role, token);
      }
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    if (!formData.username.trim() || !formData.email.trim() || !formData.password.trim()) {
      setError('All fields are required');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      const response = await authAPI.register(
        formData.username,
        formData.email,
        formData.password,
        formData.confirmPassword
      );
      const { user, role, token } = response.data;

      // Store token consistently in localStorage and sessionStorage
      localStorage.setItem('authToken', token);
      sessionStorage.setItem('authToken', token);

      if (onLogin) {
        onLogin(user, role, token);
      }
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ username: '', email: '', password: '', confirmPassword: '' });
    setError('');
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    resetForm();
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={activeTab === 'login' ? handleLogin : handleSignup}>
        <h1>🏛️ Complaint System</h1>
        <p>College Complaint Redressal System</p>

        {error && <div className="alert alert-error">{error}</div>}

        {/* Tabs */}
        <div style={{ display: 'flex', marginBottom: '20px', borderBottom: '2px solid #FFE5CC' }}>
          <button
            type="button"
            onClick={() => switchTab('login')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: activeTab === 'login' ? '#FF9F5A' : '#FFF8F3',
              color: activeTab === 'login' ? 'white' : '#333',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.3s',
            }}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => switchTab('signup')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: activeTab === 'signup' ? '#FF9F5A' : '#FFF8F3',
              color: activeTab === 'signup' ? 'white' : '#333',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.3s',
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Login Tab */}
        {activeTab === 'login' && (
          <>
            <div className="form-group">
              <label htmlFor="login-username">Username</label>
              <input
                id="login-username"
                type="text"
                name="username"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </>
        )}

        {/* Signup Tab */}
        {activeTab === 'signup' && (
          <>
            <div className="form-group">
              <label htmlFor="signup-username">Username</label>
              <input
                id="signup-username"
                type="text"
                name="username"
                placeholder="Choose a username"
                value={formData.username}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="signup-email">Email</label>
              <input
                id="signup-email"
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                type="password"
                name="password"
                placeholder="Minimum 6 characters"
                value={formData.password}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="signup-confirm">Confirm Password</label>
              <input
                id="signup-confirm"
                type="password"
                name="confirmPassword"
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>

            <p style={{ marginTop: '20px', fontSize: '12px', color: '#999', textAlign: 'center' }}>
              New users are created with student role
            </p>
          </>
        )}
      </form>
    </div>
  );
};

export default Login;
