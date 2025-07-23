import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import NotificationPanel from './NotificationPanel';

const DashboardLayout = ({ children }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const { user } = useAuth();

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <TopBar 
          user={user} 
          onNotificationToggle={toggleNotifications}
          showNotifications={showNotifications}
        />

        {/* Main Content */}
        <main className="flex-1 flex overflow-hidden">
          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {children}
            </div>
          </div>

          {/* Notification Panel */}
          {showNotifications && (
            <NotificationPanel onClose={() => setShowNotifications(false)} />
          )}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;