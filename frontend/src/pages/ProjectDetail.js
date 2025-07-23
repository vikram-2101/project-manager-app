import React from 'react';
import { useParams } from 'react-router-dom';

const ProjectDetail = () => {
  const { projectId } = useParams();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Project Details</h2>
          <p className="text-neutral-600 mt-1">Project ID: {projectId}</p>
        </div>
      </div>

      {/* Project details will be implemented here */}
      <div className="card p-8 text-center">
        <div className="h-16 w-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">Project Details Coming Soon</h3>
        <p className="text-neutral-600">Detailed project view will be implemented in the next phase.</p>
      </div>
    </div>
  );
};

export default ProjectDetail;