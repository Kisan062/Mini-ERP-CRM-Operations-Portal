import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please enter both email and password', 'error');
      return;
    }

    setLoading(true);
    try {
      const user = await login(email, password);
      showToast(`Welcome back, ${user.name} (${user.role})!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-header">
          <h1 className="login-title">Operations Portal</h1>
          <p className="login-subtitle">Sign in to manage inventory, challans, and customers</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="input"
              style={{ width: '100%' }}
              placeholder="e.g. admin@operations.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="input"
              style={{ width: '100%' }}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '10px' }}
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In to Portal'}
          </button>
        </form>

        <div className="role-switcher">
          <div className="role-switcher-title">1-Click Seed Account Login:</div>
          <div className="role-buttons">
            <button
              type="button"
              className="role-quick-btn"
              onClick={() => quickFill('admin@operations.com', 'Admin@123')}
            >
              👑 Admin
            </button>
            <button
              type="button"
              className="role-quick-btn"
              onClick={() => quickFill('sales@operations.com', 'Sales@123')}
            >
              💼 Sales
            </button>
            <button
              type="button"
              className="role-quick-btn"
              onClick={() => quickFill('warehouse@operations.com', 'Warehouse@123')}
            >
              🏭 Warehouse
            </button>
            <button
              type="button"
              className="role-quick-btn"
              onClick={() => quickFill('accounts@operations.com', 'Accounts@123')}
            >
              📊 Accounts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
