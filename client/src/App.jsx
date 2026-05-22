import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAppContext } from './context/AppContext';
import { RefreshCw } from 'lucide-react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MapPage from './pages/MapPage';
import Schedule from './pages/Schedule';
import Bookings from './pages/Bookings';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Session from './pages/Session';


const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAppContext();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, user } = useAppContext();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
};

const LogoutAction = () => {
  const { logout, isAuthenticated } = useAppContext();
  const navigate = useNavigate();
  
  React.useEffect(() => {
    if (isAuthenticated) {
      logout();
    } else {
      // Once logged out, redirect immediately
      const timer = setTimeout(() => {
        navigate('/login', { replace: true });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [logout, navigate, isAuthenticated]);
  
  return (
    <div style={{ 
      height: '100vh', width: '100%', display: 'flex', flexDirection: 'column', 
      alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', gap: '1rem' 
    }}>
      <RefreshCw size={32} className="animate-spin text-primary" />
      <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Ending session...</p>
    </div>
  );
};

const App = () => {
  const { isAuthenticated, user, loading } = useAppContext();

  // RULE: Admins should not be in the User App
  React.useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      window.location.href = import.meta.env.VITE_ADMIN_URL || 'http://localhost:5177';
    }
  }, [isAuthenticated, user]);

  if (loading) {
    return (
      <div style={{ 
        height: '100vh', width: '100%', display: 'flex', flexDirection: 'column', 
        alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', gap: '1.5rem' 
      }}>
        <div style={{ 
          width: 60, height: 60, borderRadius: '50%', border: '3px solid rgba(59,130,246,0.1)', 
          borderTopColor: 'var(--accent-primary)', animation: 'spin 1s linear infinite' 
        }} />
        <div style={{ textAlign: 'center' }}>
           <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }} className="text-gradient">EV Hub</h2>
           <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>Initializing secure connection...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to="/" replace />
          ) : (
            <Login />
          )
        }
      />
      <Route
        path="/signup"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Signup />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="map" element={<MapPage />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="/logout" element={<LogoutAction />} />
    </Routes>
  );
};

export default App;
