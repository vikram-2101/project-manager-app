import React from 'react';

const Tasks = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">My Tasks</h2>
          <p className="text-neutral-600 mt-1">View and manage your assigned tasks</p>
        </div>
        <div className="flex space-x-2">
          <select className="input-field">
            <option>All Tasks</option>
            <option>To Do</option>
            <option>In Progress</option>
            <option>Done</option>
          </select>
        </div>
      </div>

      {/* Tasks will be implemented here */}
      <div className="card p-8 text-center">
        <div className="h-16 w-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Tasks Coming Soon</h3>
        <p className="text-neutral-600">Task management features will be implemented in the next phase.</p>
      </div>
    </div>
  );
};

export default Tasks;