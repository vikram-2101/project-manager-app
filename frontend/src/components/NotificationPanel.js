import React from 'react';

const NotificationPanel = ({ onClose }) => {
  // Mock notifications for now
  const notifications = [
    {
      id: 1,
      type: 'task_assigned',
      message: 'You have been assigned to "API Integration" task',
      time: '2 minutes ago',
      isRead: false,
      link: '/projects/1/tasks/1'
    },
    {
      id: 2,
      type: 'comment_added',
      message: 'John Doe commented on "Database Schema" task',
      time: '1 hour ago',
      isRead: false,
      link: '/projects/1/tasks/2'
    },
    {
      id: 3,
      type: 'status_changed',
      message: 'Task "User Authentication" was completed',
      time: '3 hours ago',
      isRead: true,
      link: '/projects/1/tasks/3'
    },
    {
      id: 4,
      type: 'project_update',
      message: 'You were added to "Hackathon Sprint" project',
      time: '1 day ago',
      isRead: true,
      link: '/projects/2'
    }
  ];

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'task_assigned':
        return (
          <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
        );
      case 'comment_added':
        return (
          <div className="h-8 w-8 bg-accent-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
        );
      case 'status_changed':
        return (
          <div className="h-8 w-8 bg-secondary-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="h-8 w-8 bg-neutral-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="w-80 bg-white border-l border-neutral-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-900">Notifications</h3>
        <button
          onClick={onClose}
          className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg transition-colors duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <div className="h-12 w-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5V17z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 3L3 14h8l-2 7 10-11h-8l2-7z" />
              </svg>
            </div>
            <p className="text-neutral-500 text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="p-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg mb-2 cursor-pointer transition-colors duration-200 ${
                  notification.isRead 
                    ? 'hover:bg-neutral-50' 
                    : 'bg-primary-50 hover:bg-primary-100 border border-primary-200'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${notification.isRead ? 'text-neutral-700' : 'text-neutral-900 font-medium'}`}>
                      {notification.message}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">{notification.time}</p>
                  </div>
                  {!notification.isRead && (
                    <div className="h-2 w-2 bg-primary-500 rounded-full"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-neutral-200">
        <button className="w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium">
          Mark all as read
        </button>
      </div>
    </div>
  );
};

export default NotificationPanel;