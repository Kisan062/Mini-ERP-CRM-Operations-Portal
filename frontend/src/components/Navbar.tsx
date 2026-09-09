import React from 'react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  activeTab: 'products' | 'challans' | 'customers' | 'users';
  onTabChange: (tab: 'products' | 'challans' | 'customers' | 'users') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-brand">
          <span>Operations Portal</span>
          <span className="brand-badge">Mini ERP</span>
        </div>

        <div className="nav-links">
          <button
            className={`nav-link ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => onTabChange('products')}
          >
            📦 Products & Stock
          </button>
          <button
            className={`nav-link ${activeTab === 'challans' ? 'active' : ''}`}
            onClick={() => onTabChange('challans')}
          >
            📄 Challans (Dispatch)
          </button>
          <button
            className={`nav-link ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => onTabChange('customers')}
          >
            👥 Customers (CRM)
          </button>
          {user?.role === 'ADMIN' && (
            <button
              className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => onTabChange('users')}
            >
              🔐 Users
            </button>
          )}
        </div>

        <div className="nav-user">
          {user && (
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-role-badge">{user.role}</span>
            </div>
          )}
          <button className="btn btn-secondary btn-sm" onClick={logout} title="Sign Out">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};
