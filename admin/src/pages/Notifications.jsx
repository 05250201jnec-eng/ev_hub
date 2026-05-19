import React from 'react';
import { useAdminContext } from '../context/AdminContext';
import { 
  Bell, 
  MessageSquare, 
  AlertCircle, 
  CheckCircle2, 
  Info,
  Clock,
  Trash2,
  Settings
} from 'lucide-react';
import { collection, doc, deleteDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

const Notifications = () => {
  const { notifications } = useAdminContext();

  const getRelativeTime = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    const batch = writeBatch(db);
    unread.forEach(n => {
      batch.update(doc(db, 'system_notifications', n.id), { read: true });
    });
    await batch.commit();
  };

  const deleteNotification = async (id) => {
    await deleteDoc(doc(db, 'system_notifications', id));
  };

  const toggleRead = async (n) => {
    await updateDoc(doc(db, 'system_notifications', n.id), { read: !n.read });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Bell className="text-primary" size={28} />
            Notifications Center
          </h1>
          <p className="text-gray-400 text-sm">Stay updated with system events and alerts.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto justify-between md:justify-start">
          <div className="flex gap-2">
            <button className="p-2 hover:bg-white/5 rounded-xl text-gray-400 transition-colors">
              <Settings size={20} />
            </button>
          </div>
          <button onClick={markAllAsRead} className="text-sm font-bold text-primary hover:underline">Mark all as read</button>
        </div>
      </div>

      <div className="glass rounded-3xl border border-white/5 overflow-hidden min-h-[400px]">
        {notifications.length > 0 ? (
          <div className="divide-y divide-border">
            {notifications.map(n => (
              <div key={n.id} className={`p-4 md:p-6 flex gap-4 md:gap-6 transition-all hover:bg-white/10 ${n.read ? 'opacity-60' : 'bg-primary/5'}`}>
                <div className={`p-2.5 md:p-3 rounded-xl md:rounded-2xl h-fit shrink-0 ${
                  n.type === 'alert' ? 'bg-rose-500/20 text-rose-500' :
                  n.type === 'success' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-blue-500/20 text-blue-500'
                }`}>
                  {n.type === 'alert' ? <AlertCircle size={20} className="md:w-6 md:h-6" /> :
                   n.type === 'success' ? <CheckCircle2 size={20} className="md:w-6 md:h-6" /> : <Info size={20} className="md:w-6 md:h-6" />}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                    <h3 className="font-bold text-base md:text-lg truncate sm:whitespace-normal">{n.title}</h3>
                    <span className="text-[10px] text-gray-500 font-mono flex items-center gap-1 shrink-0">
                      <Clock size={12} /> {getRelativeTime(n.timestamp)}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm line-clamp-2 sm:line-clamp-none">{n.msg}</p>
                  <div className="flex gap-4 mt-3">
                    <button onClick={() => toggleRead(n)} className="text-xs font-bold text-primary hover:underline">
                      {n.read ? 'Mark as unread' : 'Acknowledge'}
                    </button>
                  </div>
                </div>
                <button onClick={() => deleteNotification(n.id)} className="p-2 text-gray-600 hover:text-rose-500 transition-colors self-center">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-20 text-center space-y-4">
             <Bell size={48} className="text-gray-600 opacity-20" />
             <p className="text-gray-500 font-medium">All caught up! No new notifications.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
