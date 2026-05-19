import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  User, 
  Zap, 
  Shield, 
  Bell, 
  Globe, 
  Save,
  DollarSign,
  Clock
} from 'lucide-react';

const Settings = () => {
  const { updateUser } = useAdminContext();
  const savedUser = JSON.parse(localStorage.getItem('ev_user') || '{}');
  const [formData, setFormData] = useState({
    name: savedUser.name || '',
    phone: savedUser.phone || '',
    vehicle: savedUser.vehicle || ''
  });

  const handleSave = async () => {
    setIsSaving(true);
    const success = await updateUser(formData);
    setIsSaving(false);
    if (success) {
      alert("Settings saved successfully!");
    } else {
      alert("Failed to save settings.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold">System Settings</h1>
        <p className="text-gray-400 text-sm">Configure your global charging network parameters and personal profile.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Tabs Sidebar */}
        <div className="w-full lg:w-64 space-y-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === tab.id 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20 font-bold' 
                  : 'text-gray-400 hover:bg-bg-secondary hover:text-white border border-transparent hover:border-border'
              }`}
            >
              {tab.icon}
              <span className="text-sm">{tab.name}</span>
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div className="flex-1 glass rounded-3xl p-8 border border-white/5 space-y-8">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold border-b border-border pb-4">Global Parameters</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Station Language</label>
                  <select className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/50 outline-none">
                    <option>English</option>
                    <option>Dzongkha</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Currency Symbol</label>
                  <input className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/50 outline-none" placeholder="Nu" defaultValue="Nu" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold border-b border-border pb-4">Admin Personal Profile</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Full Name</label>
                  <input 
                    className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/50 outline-none" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Contact Number</label>
                  <input 
                    className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/50 outline-none" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Official Vehicle</label>
                  <input 
                    className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary/50 outline-none" 
                    value={formData.vehicle}
                    onChange={(e) => setFormData({...formData, vehicle: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'charging' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold border-b border-border pb-4">Pricing & Limits</h2>
              <div className="space-y-6">
                <div className="p-6 bg-primary/5 border border-primary/10 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 text-primary rounded-xl">
                      <Zap size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold">Base Price per kWh</h4>
                      <p className="text-sm text-gray-400">Default rate across all stations.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 font-medium">Nu</span>
                    <input className="w-24 bg-bg-secondary border border-border rounded-lg px-3 py-1.5 text-center font-bold" defaultValue="15" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-8 border-t border-border flex justify-end">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              Save All Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
