import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Project {
  id: number; // PostgreSQL auto-incremented primary key
  projectName: string;
  percentageValue: number;
}

interface ProjectListProps {
  userId: string;
  refreshTrigger?: boolean;
}

export const ProjectList: React.FC<ProjectListProps> = ({ userId, refreshTrigger }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await axios.get(`/api/present-pro/all/${userId}`);
        // Ensure standard array format is loaded
        if (Array.isArray(response.data)) {
          setProjects(response.data);
        } else {
          setProjects([]);
        }
      } catch (err: any) {
        console.error('Failed to fetch projects:', err);
        setError(err.response?.data?.message || err.message || 'Error occurred while fetching projects.');
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchProjects();
    }
  }, [userId, refreshTrigger]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-xs font-bold text-gray-400 uppercase tracking-widest">
          Loading active projects...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium">
        {error}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400 border-2 border-dashed border-gray-100 rounded-3xl">
        <p className="font-bold text-sm uppercase tracking-wide">No projects found</p>
        <p className="text-xs mt-1">Create a project using the form above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-md w-full">
      <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight italic">
        Project Ledger
      </h3>
      <div className="space-y-3">
        {projects.map((project) => (
          <div 
            key={project.id} // Mapping using database auto-incremented numeric ID
            className="p-5 bg-white border border-gray-100 rounded-2xl flex justify-between items-center shadow-sm hover:border-indigo-100 transition-all"
          >
            <div className="flex flex-col">
              <span className="font-bold text-gray-900">{project.projectName}</span>
              <span className="text-[9px] font-mono font-black text-indigo-400 mt-0.5">
                DATABASE ID: {project.id}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-indigo-600 font-black text-lg">{project.percentageValue}%</span>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
