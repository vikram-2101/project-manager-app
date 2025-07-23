import React from 'react';

const Dashboard = () => {
  // Mock data for demonstration
  const stats = [
    {
      title: 'Tasks Due Today',
      value: '5',
      change: '+2 from yesterday',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'secondary'
    },
    {
      title: 'Tasks Completed',
      value: '23',
      change: '+12 this week',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'accent'
    },
    {
      title: 'Active Projects',
      value: '4',
      change: '2 new this month',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      color: 'primary'
    },
    {
      title: 'Team Members',
      value: '12',
      change: '3 added recently',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      color: 'primary'
    }
  ];

  const recentActivities = [
    {
      id: 1,
      type: 'task_completed',
      message: 'You completed "API Integration" task',
      time: '2 minutes ago',
      user: 'You'
    },
    {
      id: 2,
      type: 'comment_added',
      message: 'John Doe commented on "Database Schema"',
      time: '1 hour ago',
      user: 'John Doe'
    },
    {
      id: 3,
      type: 'task_assigned',
      message: 'New task "User Testing" was assigned to you',
      time: '3 hours ago',
      user: 'Sarah Wilson'
    },
    {
      id: 4,
      type: 'project_created',
      message: 'Created new project "Mobile App"',
      time: '1 day ago',
      user: 'You'
    },
    {
      id: 5,
      type: 'task_status',
      message: 'Changed "Frontend Design" status to In Progress',
      time: '2 days ago',
      user: 'Mike Chen'
    }
  ];

  const getColorClasses = (color) => {
    const colorMap = {
      primary: 'bg-primary-500 text-white',
      secondary: 'bg-secondary-500 text-white',
      accent: 'bg-accent-500 text-white'
    };
    return colorMap[color] || colorMap.primary;
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'task_completed':
        return (
          <div className="h-8 w-8 bg-accent-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'comment_added':
        return (
          <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
        );
      case 'task_assigned':
        return (
          <div className="h-8 w-8 bg-secondary-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600 mb-1">{stat.title}</p>
                <p className="text-3xl font-bold text-neutral-900">{stat.value}</p>
                <p className="text-sm text-neutral-500 mt-1">{stat.change}</p>
              </div>
              <div className={`p-3 rounded-xl ${getColorClasses(stat.color)}`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Feed */}
        <div className="card">
          <div className="p-6 border-b border-neutral-200">
            <h3 className="text-lg font-semibold text-neutral-900">Recent Activity</h3>
            <p className="text-sm text-neutral-600">Latest updates from your projects</p>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-neutral-50 transition-colors duration-200">
                {getActivityIcon(activity.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-900">{activity.message}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="text-xs text-neutral-500">{activity.user}</p>
                    <span className="text-xs text-neutral-400">•</span>
                    <p className="text-xs text-neutral-500">{activity.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="p-6 border-b border-neutral-200">
            <h3 className="text-lg font-semibold text-neutral-900">Quick Actions</h3>
            <p className="text-sm text-neutral-600">Common tasks to get you started</p>
          </div>
          <div className="p-6 space-y-4">
            <button className="w-full btn-primary text-left flex items-center">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create New Task
            </button>
            
            <button className="w-full btn-outline text-left flex items-center">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Start New Project
            </button>
            
            <button className="w-full btn-outline text-left flex items-center">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Invite Team Member
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;