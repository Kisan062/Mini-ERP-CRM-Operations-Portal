import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { ProductsPage } from './pages/Products/ProductsPage';
import { ChallansPage } from './pages/Challans/ChallansPage';
import { CustomersPage } from './pages/Customers/CustomersPage';
import { UsersPage } from './pages/Users/UsersPage';

type ActiveTab = 'products' | 'challans' | 'customers' | 'users';

const PortalDashboard: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('products');

  // Intelligent default tab based on user's role on login
  useEffect(() => {
    if (user) {
      if (user.role === 'SALES') {
        setActiveTab('challans');
      } else if (user.role === 'WAREHOUSE') {
        setActiveTab('products');
      } else {
        setActiveTab('products');
      }
    }
  }, [user]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          fontSize: '16px',
        }}
      >
        Initializing Operations Portal...
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app-container">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="main-content">
        {activeTab === 'products' && <ProductsPage />}
        {activeTab === 'challans' && <ChallansPage />}
        {activeTab === 'customers' && <CustomersPage />}
        {activeTab === 'users' && user.role === 'ADMIN' && <UsersPage />}
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <PortalDashboard />
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
