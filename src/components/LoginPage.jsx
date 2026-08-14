import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, LogIn, ShieldCheck, Sun, Moon } from 'lucide-react';
import { DEFAULT_CREDENTIALS } from '../config.js';

export default function LoginPage({ onLoginSuccess, theme, toggleTheme }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      if (username.trim().length > 0 && password.length > 0) {
        onLoginSuccess(username);
      } else {
        setError('Please enter a valid username and password');
        setIsLoading(false);
      }
    }, 400);
  };

  const handleQuickDemoLogin = () => {
    setUsername(DEFAULT_CREDENTIALS.username);
    setPassword(DEFAULT_CREDENTIALS.password);
    onLoginSuccess(DEFAULT_CREDENTIALS.username);
  };

  return (
    <div className="login-page-container">
      {/* Top Navbar with Theme Toggle */}
      <div className="login-top-nav">
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? (
            <>
              <Sun size={16} color="#38bdf8" /> Light Mode
            </>
          ) : (
            <>
              <Moon size={16} color="#2563eb" /> Dark Mode
            </>
          )}
        </button>
      </div>

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-icon">
            <ShieldCheck size={36} color="var(--accent-primary)" />
          </div>
          <h2 className="login-title">BSE Finder Portal</h2>
          <p className="login-subtitle">Sign in to access annual financial reports & comparison matrix</p>
        </div>

        {error && <div className="login-error-badge">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username / Email</label>
            <div className="input-with-icon">
              <User size={18} className="input-icon" />
              <input
                id="username"
                type="text"
                placeholder="Enter username (e.g. admin)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="login-submit-btn" disabled={isLoading}>
            {isLoading ? (
              <div className="spinner-sm" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff', margin: '0 auto' }}></div>
            ) : (
              <>
                <LogIn size={18} />
                <span>Sign In to Dashboard</span>
              </>
            )}
          </button>
        </form>

        <div className="login-demo-box">
          <p className="demo-title">Default Demo Credentials:</p>
          <div className="demo-credentials-tag">
            <span>Username: <strong>{DEFAULT_CREDENTIALS.username}</strong></span>
            <span>Password: <strong>{DEFAULT_CREDENTIALS.password}</strong></span>
          </div>
          <button type="button" className="quick-demo-btn" onClick={handleQuickDemoLogin}>
            ⚡ 1-Click Quick Login
          </button>
        </div>
      </div>
    </div>
  );
}
