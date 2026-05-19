import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

const AddChargerModal = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    lat: '',
    lng: '',
    status: 'available',
    connectors: [{ id: 'c1', type: 'CCS2', power: '50kW', status: 'available', price: 'Nu 15/kWh' }]
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'stations'), {
        ...formData,
        location: {
          address: formData.address,
          lat: parseFloat(formData.lat),
          lng: parseFloat(formData.lng)
        },
        lastUpdated: Date.now()
      });
      onClose();
    } catch (error) {
      alert("Error adding charger: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-secondary border border-border w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h2 className="text-xl font-bold">Add New Charger</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Station Name</label>
            <input 
              required
              className="w-full bg-bg-primary border border-border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g. Thimphu Plaza"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Address</label>
            <input 
              required
              className="w-full bg-bg-primary border border-border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Full street address"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Latitude</label>
              <input 
                required
                type="number" step="any"
                className="w-full bg-bg-primary border border-border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="27.4728"
                value={formData.lat}
                onChange={(e) => setFormData({...formData, lat: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Longitude</label>
              <input 
                required
                type="number" step="any"
                className="w-full bg-bg-primary border border-border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="89.6393"
                value={formData.lng}
                onChange={(e) => setFormData({...formData, lng: e.target.value})}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Register Station'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddChargerModal;
