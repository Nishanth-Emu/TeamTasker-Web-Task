import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client'; // Import Socket.IO client

// Define Project type (match backend model)
interface Project {
  id: string;
  name: string;
  description: string;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Blocked';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator?: { // Optional, as it might be included only on specific fetches
      id: string;
      username: string;
      email: string;
      role: string;
  };
}

// Initialize Socket.IO client
const socket = io(import.meta.env.VITE_API_BASE_URL.replace('/api', ''), {
  // You might need to add transport options or authentication headers here
  // For now, assuming direct connection to base URL where Socket.IO is listening
});
// Note: VITE_API_BASE_URL is http://localhost:5000/api, we need http://localhost:5000
// so we replace '/api' part.

const ProjectsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); // State for create project modal

  // TanStack Query to fetch projects
  const { data: projects, isLoading, isError, error } = useQuery<Project[], Error>({
    queryKey: ['projects'], // Unique key for this query
    queryFn: async () => {
      const response = await api.get('/projects');
      return response.data;
    },
  });

  // Socket.IO useEffect for real-time updates
  useEffect(() => {
    socket.on('connect', () => {
      console.log('Socket.IO Connected to backend!');
    });

    socket.on('disconnect', () => {
      console.log('Socket.IO Disconnected from backend!');
    });

    // Listen for project creation events
    socket.on('projectCreated', (newProject: Project) => {
      console.log('Real-time: Project Created', newProject);
      // Invalidate 'projects' query to refetch data or update cache directly
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      // Optionally, you could use queryClient.setQueryData to update cache directly:
      // queryClient.setQueryData<Project[]>(['projects'], (oldProjects) => {
      //   return oldProjects ? [...oldProjects, newProject] : [newProject];
      // });
    });

    // Listen for project update events
    socket.on('projectUpdated', (updatedProject: Project) => {
      console.log('Real-time: Project Updated', updatedProject);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      // queryClient.setQueryData<Project[]>(['projects'], (oldProjects) => {
      //   return oldProjects ? oldProjects.map(p => p.id === updatedProject.id ? updatedProject : p) : [];
      // });
    });

    // Listen for project deletion events
    socket.on('projectDeleted', (deletedProject: { id: string }) => {
      console.log('Real-time: Project Deleted', deletedProject.id);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      // queryClient.setQueryData<Project[]>(['projects'], (oldProjects) => {
      //   return oldProjects ? oldProjects.filter(p => p.id !== deletedProject.id) : [];
      // });
    });

    return () => {
      // Clean up socket listeners on component unmount
      socket.off('connect');
      socket.off('disconnect');
      socket.off('projectCreated');
      socket.off('projectUpdated');
      socket.off('projectDeleted');
    };
  }, [queryClient]); // Dependency on queryClient is good practice

  // Function to check if user has permission to create project
  const canCreateProject = user && ['Admin', 'Project Manager'].includes(user.role);

  if (isLoading) return <div className="text-center text-lg">Loading projects...</div>;
  if (isError) return <div className="text-center text-lg text-red-600">Error: {error?.message}</div>;

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Projects</h1>
        {canCreateProject && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Create New Project
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects?.length === 0 ? (
            <p className="col-span-full text-center text-gray-500">No projects found. {canCreateProject && "Start by creating one!"}</p>
        ) : (
            projects?.map((project) => (
                <div key={project.id} className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
                    <Link to={`/dashboard/projects/${project.id}/tasks`} className="block"> {/* Link to project tasks page */}
                        <h2 className="text-xl font-semibold text-gray-800 mb-2 hover:text-blue-700">{project.name}</h2>
                    </Link>
                    <p className="text-gray-600 text-sm mb-3">{project.description || 'No description provided.'}</p>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                        <span>Status: <span className={`font-medium ${project.status === 'Completed' ? 'text-green-600' : project.status === 'In Progress' ? 'text-blue-600' : 'text-gray-600'}`}>{project.status}</span></span>
                        <span>Created By: {project.creator?.username || 'N/A'}</span>
                    </div>
                </div>
            ))
        )}
      </div>

      {/* Placeholder for Create Project Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Create New Project (Placeholder)</h2>
            <p className="mb-4">Form for creating a project will go here.</p>
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;