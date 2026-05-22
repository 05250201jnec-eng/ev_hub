import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import NotificationToast from './NotificationToast';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-container">
      {/* Mobile overlay backdrop */}
      <div
        className="overlay"
        onClick={() => setSidebarOpen(false)}
        style={{ display: sidebarOpen ? 'block' : 'none' }}
      />
      <Sidebar isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Navbar toggleSidebar={() => setSidebarOpen(prev => !prev)} />
        <main style={{ padding: '2rem', flex: 1, position: 'relative' }}>
          <Outlet />
        </main>
      </div>
      <NotificationToast />
    </div>
  );
};

export default Layout;
