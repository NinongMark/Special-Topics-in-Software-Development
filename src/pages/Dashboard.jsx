// src/pages/Dashboard.jsx
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export const Dashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div style={{ padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Dashboard</h1>
        <div>
          <span>Welcome, <strong>{user?.name || user?.email}</strong> ({user?.role || 'User'})</span>
          <button onClick={logout} style={{ marginLeft: '15px', padding: '6px 12px', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </header>

      <nav style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
        <Link to="/students">Students Directory</Link>
      </nav>

      <p>Select a module from the menu above to manage system records.</p>
    </div>
  );
};