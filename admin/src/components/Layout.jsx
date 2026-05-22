import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Users, Menu, X } from 'lucide-react';

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-bg-primary text-slate-100">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 border-b border-border bg-bg-secondary/50 backdrop-blur-md flex items-center px-4 lg:px-8 justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-bg-tertiary rounded-lg transition-colors"
            >
              <Menu size={24} />
            </button>
            <h2 className="font-semibold text-lg truncate">Control Center</h2>
          </div>
          <div className="flex items-center gap-3 lg:gap-6">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold">Super Admin</span>
              <span className="text-xs text-primary">System Operator</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-bg-tertiary border border-border flex items-center justify-center shrink-0">
              <Users size={20} className="text-gray-400" />
            </div>
          </div>
        </header>
        <main className="p-4 lg:p-8 overflow-x-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
