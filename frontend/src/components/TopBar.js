import React from 'react';
import { useLocation } from 'react-router-dom';

const TopBar = ({ user, onNotificationToggle, showNotifications }) => {
  const location = useLocation();

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard':
        return 'Dashboard';
      case '/projects':
        return 'Projects';
      case '/tasks':
        return 'My Tasks';
      default:
        if (location.pathname.startsWith('/projects/')) {
          return 'Project Details';
        }
        return 'Dashboard';
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <header className="bg-white border-b border-neutral-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{getPageTitle()}</h1>
          {location.pathname === '/dashboard' && (
            <p className="text-neutral-600 mt-1">
              {getGreeting()}, {user?.full_name?.split(' ')[0] || 'there'}! 
              <span className="ml-2">Ready to tackle your tasks today?</span>
            </p>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {/* Notifications Bell */}
          <button
            onClick={onNotificationToggle}
            className={`relative p-2 rounded-lg transition-colors duration-200 ${
              showNotifications 
                ? 'bg-primary-100 text-primary-600' 
                : 'text-neutral-600 hover:text-primary-600 hover:bg-primary-50'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5V17z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 3L3 14h8l-2 7 10-11h-8l2-7z" />
            </svg>
            
            {/* Notification Badge */}
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-secondary-500 text-white text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </button>

          {/* Profile Avatar */}
          <div className="flex items-center">
            <div className="h-10 w-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-sm">
                {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;