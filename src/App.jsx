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
  const { isAuthenticated, user, loading: contextLoading } = useAppContext();
  const [loading, setLoading] = React.useState(true);

  // Safety Timeout for Loading Screen
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000); // Max 3 seconds loading
    return () => clearTimeout(timer);
  }, []);

  // Sync with context loading
  React.useEffect(() => {
    if (!contextLoading) setLoading(false);
  }, [contextLoading]);

  // RULE: Admins should not be in the User App
  React.useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      window.location.href = 'http://localhost:5177';
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
           <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }} className="text-gradient animate-text-glow">EV Hub</h2>
           <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>Initializing secure connection...</p>
        </div>
        <button 
          onClick={() => setLoading(false)}
          style={{ 
            marginTop: '1rem', background: 'none', border: 'none', color: 'var(--accent-primary)', 
            fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', opacity: 0.6 
          }}
        >
          TAKING TOO LONG? CLICK TO SKIP
        </button>
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
