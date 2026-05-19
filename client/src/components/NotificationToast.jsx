import React from 'react';
import { useAppContext } from '../context/AppContext';
import { CheckCircle, Info, XCircle } from 'lucide-react';

const NotificationToast = () => {
  const { notifications, removeNotification } = useAppContext();

  if (notifications.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '2rem',
      right: '2rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      zIndex: 1000
    }}>
      {notifications.map((notif) => (
        <div key={notif.id} className="glass animate-fade-in" style={{
          padding: '1rem 1.5rem',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: 'var(--shadow-lg)',
          borderLeft: `4px solid ${
            notif.type === 'success' ? 'var(--status-available)' : 
            notif.type === 'error' ? 'var(--status-offline)' : 
            'var(--accent-primary)'
          }`,
          minWidth: '300px'
        }}>
          {notif.type === 'success' && <CheckCircle size={20} color="var(--status-available)" />}
          {notif.type === 'error' && <XCircle size={20} color="var(--status-offline)" />}
          {notif.type === 'info' && <Info size={20} color="var(--accent-primary)" />}
          
          <p style={{ margin: 0, flex: 1, fontSize: '0.875rem' }}>{notif.message}</p>
          
          <button 
            onClick={() => removeNotification(notif.id)}
            style={{ color: 'var(--text-secondary)' }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;
