import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { User, Mail, Phone, Car, CreditCard, Zap, Clock, History, Edit3, Save, X, Lock, Eye, EyeOff } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const Profile = () => {
  const { user, setUser, sessions, addNotification } = useAppContext();
  const [editing, setEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', vehicle: user?.vehicle || '', password: user?.password || 'Bhutan@2026' });
  const [saving, setSaving] = useState(false);

  const completedSessions = (sessions || []).filter(s => s.status === 'completed');
  const totalEnergy = completedSessions.reduce((sum, s) => sum + (s.energyConsumed || 0), 0).toFixed(1);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = { ...user, ...form };
      await updateDoc(doc(db, 'users', user.id), form);
      setUser(updated);
      localStorage.setItem('ev_user', JSON.stringify(updated));
      addNotification('Profile updated ✅', 'success');
      setEditing(false);
    } catch (e) {
      addNotification('Update failed: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const statItems = [
    { label: 'Total Sessions', value: completedSessions.length, icon: <Zap size={18} color="#f59e0b" />, color: '#f59e0b' },
    { label: 'Energy Consumed', value: `${totalEnergy} kWh`, icon: <Clock size={18} color="#10b981" />, color: '#10b981' },
    { label: 'Wallet Balance', value: `Nu ${user?.credits || 0}`, icon: <CreditCard size={18} color="#8b5cf6" />, color: '#8b5cf6' },
  ];

  if (!user) return null;

  return (
    <div className="animate-fade-in" style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Profile</h1>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="btn btn-secondary" style={{ gap: '0.5rem' }}>
            <Edit3 size={16} /> Edit Profile
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => setEditing(false)} className="btn btn-secondary" style={{ gap: '0.5rem' }}>
              <X size={16} /> Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ gap: '0.5rem' }}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div className="glass" style={{ width: '100%', maxWidth: 500, padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2rem' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', background: 'var(--accent-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: '0 8px 24px rgba(59,130,246,0.35)',
            }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>
                {user.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 style={{ fontSize: '1.375rem', fontWeight: 700, margin: 0 }}>{user.name}</h2>
              <span style={{
                display: 'inline-block', marginTop: '0.375rem',
                padding: '0.2rem 0.625rem', borderRadius: 'var(--radius-full)', fontSize: '0.7rem', fontWeight: 700,
                background: user.role === 'admin' ? 'rgba(139,92,246,0.15)' : 'rgba(16,185,129,0.12)',
                color: user.role === 'admin' ? '#8b5cf6' : '#10b981',
              }}>
                {user.role === 'admin' ? '⚡ Admin' : '🚗 EV Driver'}
              </span>
            </div>
          </div>

          {/* Fields */}
          {[
              { label: 'Email', key: 'email', icon: <Mail size={16} />, readonly: true },
            { label: 'Password', key: 'password', icon: <Lock size={16} />, readonly: false, isPassword: true },
            { label: 'Phone', key: 'phone', icon: <Phone size={16} />, readonly: false },
            { label: 'Vehicle', key: 'vehicle', icon: <Car size={16} />, readonly: false },
            { label: 'Name', key: 'name', icon: <User size={16} />, readonly: false },
          ].map(({ label, key, icon, readonly, isPassword }) => (
            <div key={key} style={{ marginBottom: '1.125rem' }}>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {label}
              </label>
              {editing && !readonly ? (
                <div style={{ position: 'relative' }}>
                  <input
                    type={isPassword ? (showPassword ? 'text' : 'password') : 'text'}
                    value={form[key] || ''}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{
                      width: '100%', padding: '0.75rem 1rem', paddingRight: isPassword ? '2.5rem' : '1rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-color)', border: '1px solid var(--accent-primary)',
                      color: 'var(--text-primary)', fontSize: '0.9375rem',
                    }}
                  />
                  {isPassword && (
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', color: 'var(--text-secondary)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 10
                      }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  )}
                </div>
              ) : (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  background: 'var(--bg-tertiary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)',
                  position: 'relative'
                }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{icon}</span>
                  <span style={{ fontSize: '0.9375rem' }}>{isPassword ? (showPassword ? form.password : '••••••••') : (user[key] || '—')}</span>
                  {isPassword && (
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', color: 'var(--text-secondary)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Profile;
