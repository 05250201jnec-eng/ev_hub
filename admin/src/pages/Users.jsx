import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { 
  Users as UsersIcon, 
  Search, 
  UserMinus, 
  Trash2, 
  MoreVertical,
  Mail,
  Phone,
  ShieldCheck,
  ShieldX,
  Loader2,
  Database
} from 'lucide-react';

const MOCK_USERS = [
  { id: 'u-001', name: 'Karma Wangchuk', email: 'karma.wangchuk@example.bt', phone: '+975 17 12 34 56', vehicle: 'Nissan Leaf', status: 'active', createdAt: Date.now() },
  { id: 'u-002', name: 'Dechen Zangmo', email: 'dechen.z@example.bt', phone: '+975 77 65 43 21', vehicle: 'Hyundai Kona', status: 'active', createdAt: Date.now() },
  { id: 'u-003', name: 'Tashi Dorji', email: 'tashi.d@example.bt', phone: '+975 17 99 88 77', vehicle: 'MG ZS EV', status: 'blocked', createdAt: Date.now() },
];

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort newest users first
      usersData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      
      setUsers(usersData);
      setLoading(false);
    }, (err) => {
      console.error("Firestore Error in Users Page:", err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const toggleStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'blocked' : 'active';
    try {
      await updateDoc(doc(db, 'users', user.id), { status: newStatus });
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  const deleteUser = async (id) => {
    if (window.confirm("Are you sure? This is permanent.")) {
      try {
        await deleteDoc(doc(db, 'users', id));
      } catch (e) {
        alert("Error: " + e.message);
      }
    }
  };

  const seedUsers = async () => {
    setIsSeeding(true);
    try {
      const col = collection(db, 'users');
      for (const u of MOCK_USERS) {
        await addDoc(col, u);
      }
    } finally {
      setIsSeeding(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-gray-400 text-sm">Manage customers and their account status.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text"
            placeholder="Search users..."
            className="bg-bg-secondary border border-border rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden border border-white/5">
        {loading ? (
          <div className="p-20 text-center flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-primary" size={32} />
            <p className="text-gray-400">Loading user records...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-20 text-center">
            <UsersIcon size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400 mb-6">No users found in the system.</p>
            <button onClick={seedUsers} className="bg-primary text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 mx-auto">
              {isSeeding ? <Loader2 className="animate-spin" size={18} /> : <Database size={18} />}
              Seed Sample Users
            </button>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-bg-secondary/30 border-b border-border">
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase">User</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase">Contact</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase">Vehicle</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center font-bold text-primary">
                        {user.name ? user.name.charAt(0) : '?'}
                      </div>
                      <span className="font-semibold">{user.name || 'Anonymous User'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Mail size={14} /> {user.email || 'No email'}
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Phone size={14} /> {user.phone || 'No phone'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">{user.vehicle}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      user.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                    }`}>
                      {user.status === 'active' ? <ShieldCheck size={14} /> : <ShieldX size={14} />}
                      {(user.status || 'active').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => toggleStatus(user)}
                        className={`p-2 rounded-lg transition-colors ${
                          user.status === 'active' ? 'hover:bg-amber-500/10 text-gray-400 hover:text-amber-500' : 'hover:bg-emerald-500/10 text-gray-400 hover:text-emerald-500'
                        }`}
                        title={user.status === 'active' ? 'Block User' : 'Unblock User'}
                      >
                        <UserMinus size={18} />
                      </button>
                      <button 
                        onClick={() => deleteUser(user.id)}
                        className="p-2 hover:bg-rose-500/10 text-gray-400 hover:text-rose-500 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Users;
