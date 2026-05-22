import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Mail, Lock, User, Phone, Car, ArrowRight, Eye, EyeOff, Loader, Database } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const Login = () => {
  const { login, register } = useAppContext();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    vehicle: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        if (!formData.email || !formData.password) {
          throw new Error('Please fill in all fields');
        }
        const res = await login(formData.email, formData.password);
        
        // RULE: Admin users go directly to the operator side
        if (formData.email.toLowerCase().endsWith('@evhub.com')) {
          window.location.href = import.meta.env.VITE_ADMIN_URL || 'http://localhost:5177';
          return;
        }
      } else {
        if (!formData.name || !formData.email || !formData.password) {
          throw new Error('Please fill in all required fields');
        }
        await register(formData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-color)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background orbs */}
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
        top: '-100px',
        right: '-100px',
        animation: 'pulse 4s ease-in-out infinite'
      }} />
      <div style={{
        position: 'absolute',
        width: '350px',
        height: '350px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
        bottom: '-80px',
        left: '-80px',
        animation: 'pulse 5s ease-in-out infinite reverse'
      }} />

      <div className="animate-fade-in auth-card" style={{
        display: 'flex',
        width: '100%',
        maxWidth: '1000px',
        minHeight: '600px',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)',
        margin: '2rem'
      }}>
        {/* Left Panel – Branding */}
        <div className="auth-left" style={{
          flex: 1,
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #1a1040 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '3rem',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 30% 70%, rgba(59,130,246,0.1) 0%, transparent 60%)',
          }} />
          
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <div style={{
              background: 'var(--accent-gradient)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '2rem',
              boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)'
            }}>
              <Zap size={48} color="white" fill="white" />
            </div>

            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>
              <span className="text-gradient">EV Hub</span>
            </h1>

            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '1.125rem',
              lineHeight: 1.6,
              maxWidth: '300px'
            }}>
              Bhutan's premier electric vehicle charging network. Find, book, and charge – all in one place.
            </p>

            <div style={{
              display: 'flex',
              gap: '2rem',
              marginTop: '3rem',
              justifyContent: 'center'
            }}>
              {[
                { value: '50+', label: 'Stations' },
                { value: '1.2K', label: 'Users' },
                { value: '99.9%', label: 'Uptime' }
              ].map(stat => (
                <div key={stat.label}>
                  <p className="text-gradient" style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{stat.value}</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel – Form */}
        <div className="auth-right" style={{
          flex: 1,
          background: 'var(--bg-secondary)',
          padding: '3rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            {isLogin ? 'Sign in to access your EV Hub dashboard.' : 'Join the EV Hub network today.'}
          </p>

          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--status-offline)',
              marginBottom: '1.5rem',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {!isLogin && (
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Full Name *
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  padding: '0 1rem',
                  transition: 'border-color 0.3s'
                }}>
                  <User size={18} color="var(--text-secondary)" />
                  <input
                    name="name"
                    type="text"
                    placeholder="Karma Wangchuk"
                    value={formData.name}
                    onChange={handleChange}
                    style={{
                      flex: 1,
                      padding: '0.875rem',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Email *
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                padding: '0 1rem',
                transition: 'border-color 0.3s'
              }}>
                <Mail size={18} color="var(--text-secondary)" />
                <input
                  name="email"
                  type="email"
                  placeholder="karma@example.bt"
                  value={formData.email}
                  onChange={handleChange}
                  style={{
                    flex: 1,
                    padding: '0.875rem',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Password *
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                padding: '0 1rem',
                transition: 'border-color 0.3s'
              }}>
                <Lock size={18} color="var(--text-secondary)" />
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  style={{
                    flex: 1,
                    padding: '0.875rem',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Phone
                  </label>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    padding: '0 1rem'
                  }}>
                    <Phone size={18} color="var(--text-secondary)" />
                    <input
                      name="phone"
                      type="tel"
                      placeholder="+975 17 12 34 56"
                      value={formData.phone}
                      onChange={handleChange}
                      style={{
                        flex: 1,
                        padding: '0.875rem',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Vehicle Model
                  </label>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    padding: '0 1rem'
                  }}>
                    <Car size={18} color="var(--text-secondary)" />
                    <input
                      name="vehicle"
                      type="text"
                      placeholder="Nissan Leaf"
                      value={formData.vehicle}
                      onChange={handleChange}
                      style={{
                        flex: 1,
                        padding: '0.875rem',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: '1rem', fontSize: '1rem', marginTop: '0.5rem' }}
            >
              {loading ? (
                <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <p style={{
            textAlign: 'center',
            marginTop: '2rem',
            color: 'var(--text-secondary)',
            fontSize: '0.875rem'
          }}>
            Don't have an account? {' '}
            <Link
              to="/signup"
              style={{
                color: 'var(--accent-primary)',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Login;
