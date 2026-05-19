import React, { useState } from 'react';
import { useAdminContext } from '../context/AdminContext';
import { collection, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  Plus, Edit2, Trash2, Zap, MapPin, RefreshCw,
  CheckCircle, XCircle, AlertCircle, Search, X
} from 'lucide-react';

const STATUS_COLOR = {
  available: '#10b981', reserved: '#3b82f6',
  charging: '#f59e0b', occupied: '#f59e0b', offline: '#ef4444',
};

// Initial stations have been seeded. Use 'Add Station' for new entries.

const EMPTY_STATION = {
  name: '', status: 'available',
  location: { lat: '', lng: '', address: '' },
  connectors: [{ id: 'c1', type: 'CCS2', power: '50kW', status: 'available', price: 'Nu 15/kWh' }],
  amenities: [],
};

const Chargers = () => {
  const { stations, overrideStationStatus } = useAdminContext();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editStation, setEditStation] = useState(null);
  const [form, setForm] = useState(EMPTY_STATION);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const filtered = stations.filter(s => {
    const matchSearch = s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.location?.address?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openAdd = () => { setEditStation(null); setForm(EMPTY_STATION); setModalOpen(true); };
  const openEdit = (s) => { setEditStation(s); setForm(s); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.name || !form.location.address) return;
    setSaving(true);
    try {
      const data = { ...form, lastUpdated: Date.now() };
      if (editStation) {
        await updateDoc(doc(db, 'stations', editStation.id), data);
        flash('✅ Station updated');
      } else {
        await addDoc(collection(db, 'stations'), data);
        flash('✅ Station added');
      }
      setModalOpen(false);
    } catch (e) { flash('❌ ' + e.message); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this station?')) return;
    try {
      await deleteDoc(doc(db, 'stations', id));
      flash('🗑 Station deleted');
    } catch (e) { flash('❌ ' + e.message); }
  };

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>Charging Stations</h1>
          <p style={{ color: '#64748b' }}>{stations.length} stations in Firestore</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={openAdd} style={{
            padding: '0.625rem 1.25rem', borderRadius: 10, fontSize: '0.875rem', fontWeight: 700,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: 'white',
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            <Plus size={16} /> Add Station
          </button>
        </div>
      </div>

      {msg && <div style={{ padding: '0.875rem 1.25rem', borderRadius: 12, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', fontWeight: 600 }}>{msg}</div>}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search stations..."
            style={{ paddingLeft: 36, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'white', padding: '0.625rem 0.875rem 0.625rem 2.25rem', width: '100%', fontSize: '0.875rem' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {['all', 'available', 'charging', 'reserved', 'offline'].map(f => (
            <button key={f} onClick={() => setStatusFilter(f)} style={{
              padding: '0.5rem 0.875rem', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700,
              background: statusFilter === f ? '#3b82f6' : 'rgba(255,255,255,0.06)',
              color: statusFilter === f ? 'white' : '#64748b',
              border: 'none', cursor: 'pointer', textTransform: 'capitalize',
            }}>{f === 'offline' ? 'inactive' : f}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass" style={{ borderRadius: 20, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Station', 'Location', 'Status', 'Connectors', 'Actions'].map(h => (
                <th key={h} style={{ padding: '1rem 1.25rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr key={s.id} style={{
                borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '1rem 1.25rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.125rem' }}>{s.name}</div>
                  <div style={{ fontSize: '0.7rem', color: '#475569' }}>{s.id}</div>
                </td>
                <td style={{ padding: '1rem 1.25rem', color: '#64748b', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <MapPin size={13} />
                    <span style={{ maxWidth: 160, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {s.location?.address}
                    </span>
                  </div>
                </td>
                <td style={{ padding: '1rem 1.25rem' }}>
                  <select value={s.status} onChange={e => overrideStationStatus(s.id, e.target.value)}
                    style={{
                      padding: '0.35rem 0.625rem', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700,
                      background: `${STATUS_COLOR[s.status] || '#475569'}22`,
                      border: `1px solid ${STATUS_COLOR[s.status] || '#475569'}55`,
                      color: STATUS_COLOR[s.status] || '#94a3b8', cursor: 'pointer',
                    }}>
                    {['available', 'reserved', 'charging', 'offline'].map(st => (
                      <option key={st} value={st} style={{ background: '#0f1a2e', color: 'white' }}>{st === 'offline' ? 'inactive' : st}</option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#64748b' }}>
                  {s.connectors?.length || 0} port{s.connectors?.length !== 1 ? 's' : ''}
                  <span style={{ marginLeft: '0.375rem', color: '#10b981' }}>
                    ({(s.connectors || []).filter(c => c.status === 'available').length} free)
                  </span>
                </td>
                <td style={{ padding: '1rem 1.25rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => openEdit(s)} style={{
                      padding: '0.4rem', borderRadius: 8, background: 'rgba(59,130,246,0.12)',
                      border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6', cursor: 'pointer',
                    }}>
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(s.id)} style={{
                      padding: '0.4rem', borderRadius: 8, background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer',
                    }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#475569' }}>
                No stations found. Click <strong>Seed All Stations</strong> to populate.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div className="glass" style={{ width: '100%', maxWidth: 520, borderRadius: 24, padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{editStation ? 'Edit Station' : 'Add Station'}</h2>
              <button onClick={() => setModalOpen(false)} style={{ color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            {[
              { label: 'Station Name', key: 'name', type: 'text' },
              { label: 'Address', key: 'location.address', type: 'text' },
              { label: 'Latitude', key: 'location.lat', type: 'number' },
              { label: 'Longitude', key: 'location.lng', type: 'number' },
            ].map(({ label, key, type }) => {
              const keys = key.split('.');
              const val = keys.length === 2 ? form[keys[0]]?.[keys[1]] : form[keys[0]];
              return (
                <div key={key} style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '0.375rem', textTransform: 'uppercase' }}>{label}</label>
                  <input type={type} value={val || ''} onChange={e => {
                    const v = e.target.value;
                    if (keys.length === 2) setForm(f => ({ ...f, [keys[0]]: { ...f[keys[0]], [keys[1]]: v } }));
                    else setForm(f => ({ ...f, [keys[0]]: v }));
                  }} style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.875rem' }} />
                </div>
              );
            })}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '0.375rem', textTransform: 'uppercase' }}>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.875rem' }}>
                {['available', 'reserved', 'charging', 'offline'].map(s => <option key={s} value={s} style={{ background: '#0f1a2e' }}>{s === 'offline' ? 'inactive' : s}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setModalOpen(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '0.75rem', borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                {saving ? 'Saving...' : 'Save Station'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chargers;
