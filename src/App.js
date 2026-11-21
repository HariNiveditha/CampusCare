import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';
import StudentDashboard from './components/StudentDashboard';
import AdminDashboard from './components/AdminDashboard';
import { ComplaintProvider } from './context/ComplaintContext';

function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    const savedRole = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
    const savedToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
        setRole(savedRole);
      } catch (error) {
        console.error('Error loading user session from storage:', error);
        handleLogout();
      }
    } else {
      handleLogout();
    }
  }, []);

  const handleLogin = (userData, userRole, token) => {
    setUser(userData);
    setRole(userRole);
    localStorage.setItem('currentUser', JSON.stringify(userData));
    localStorage.setItem('userRole', userRole);
    sessionStorage.setItem('currentUser', JSON.stringify(userData));
    sessionStorage.setItem('userRole', userRole);
    if (token) {
      localStorage.setItem('authToken', token);
      sessionStorage.setItem('authToken', token);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setRole(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userRole');
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('authToken');
  };

  return (
    <ComplaintProvider key={user ? (user._id || user.id || user.username) : 'unauthenticated'}>
      <div className="app">
        {!user ? (
          <Login onLogin={handleLogin} />
        ) : role === 'admin' ? (
          <AdminDashboard user={user} onLogout={handleLogout} />
        ) : (
          <StudentDashboard user={user} onLogout={handleLogout} />
        )}
      </div>
    </ComplaintProvider>
  );
}

export default App;
