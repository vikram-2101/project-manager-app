import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();

  const isActive = (path) => {
    return location.pathname === path;
  };

  const navItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6a2 2 0 01-2 2H10a2 2 0 01-2-2V5z" />
        </svg>
      ),
      available: true
    },
    {
      name: 'Projects',
      path: '/projects',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      available: true
    },
    {
      name: 'My Tasks',
      path: '/tasks',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      available: true
    }
  ];

  return (
    <div className="w-64 bg-white border-r border-neutral-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-neutral-200">
        <div className="flex items-center">
          <div className="h-10 w-10 bg-primary-500 rounded-lg flex items-center justify-center">
            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h1 className="text-lg font-bold text-neutral-900">ProjectHub</h1>
            <p className="text-xs text-neutral-500">Task Management</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.filter(item => item.available).map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
          >
            {item.icon}
            <span className="ml-3 font-medium">{item.name}</span>
          </Link>
        ))}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-neutral-200">
        <div className="flex items-center mb-4">
          <div className="h-10 w-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center">
            <span className="text-white font-medium text-sm">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-neutral-900">{user?.full_name}</p>
            <p className="text-xs text-neutral-500 flex items-center">
              {isAdmin() ? (
                <>
                  <span className="inline-block w-2 h-2 bg-secondary-500 rounded-full mr-1"></span>
                  Admin
                </>
              ) : (
                <>
                  <span className="inline-block w-2 h-2 bg-accent-500 rounded-full mr-1"></span>
                  Team Member
                </>
              )}
            </p>
          </div>
        </div>
        
        <button
          onClick={logout}
          className="w-full flex items-center px-3 py-2 text-sm text-neutral-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;