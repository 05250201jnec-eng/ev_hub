import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import NotificationToast from './NotificationToast';

const Layout = () => {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <main style={{ padding: '2rem', flex: 1, position: 'relative' }}>
          <Outlet />
        </main>
      </div>
      <NotificationToast />
    </div>
  );
};

export default Layout;
