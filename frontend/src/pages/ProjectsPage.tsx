import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // Import useMutation
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import CreateProjectForm from '../components/projects/CreateProjectForm'; // Import CreateProjectForm
import EditProjectForm from '../components/projects/EditProjectForm'; // Import EditProjectForm

// Define Project type (match backend model)
interface Project {
  id: string;
  name: string;
  description: string;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Blocked';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator?: {
      id: string;
      username: string;
      email: string;
      role: string;
  };
}

const socket = io(import.meta.env.VITE_API_BASE_URL.replace('/api', ''), {
  // Potentially add auth headers here if needed, e.g., token: localStorage.getItem('token')
});

const ProjectsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // TanStack Query to fetch projects
  const { data: projects, isLoading, isError, error } = useQuery<Project[], Error>({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await api.get('/projects');
      return response.data;
    },
  });

  // Socket.IO useEffect for real-time updates (no change from previous step)
  useEffect(() => {
    socket.on('connect', () => { console.log('Socket.IO Connected to backend!'); });
    socket.on('disconnect', () => { console.log('Socket.IO Disconnected from backend!'); });

    socket.on('projectCreated', (newProject: Project) => {
      console.log('Real-time: Project Created', newProject);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    });

    socket.on('projectUpdated', (updatedProject: Project) => {
      console.log('Real-time: Project Updated', updatedProject);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    });

    socket.on('projectDeleted', (deletedProject: { id: string }) => {
      console.log('Real-time: Project Deleted', deletedProject.id);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('projectCreated');
      socket.off('projectUpdated');
      socket.off('projectDeleted');
    };
  }, [queryClient]);

  // Mutation for deleting a project
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      await api.delete(`/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] }); // Refetch projects after deletion
    },
    onError: (error: any) => {
      console.error('Delete project error:', error);
      alert(`Failed to delete project: ${error.response?.data?.message || error.message}`);
    },
  });

  const handleDelete = (projectId: string) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      deleteProjectMutation.mutate(projectId);
    }
  };

  // RBAC Helpers
  const canCreateProject = user && ['Admin', 'Project Manager'].includes(user.role);
  const canEditProject = (project: Project) => user && (
    ['Admin', 'Project Manager'].includes(user.role) ||
    project.createdBy === user.id
  );
  const canDeleteProject = (project: Project) => user && (
    ['Admin', 'Project Manager'].includes(user.role) ||
    project.createdBy === user.id
  );


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
                <div key={project.id} className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow relative">
                    <Link to={`/dashboard/projects/${project.id}/tasks`} className="block">
                        <h2 className="text-xl font-semibold text-gray-800 mb-2 hover:text-blue-700">{project.name}</h2>
                    </Link>
                    <p className="text-gray-600 text-sm mb-3">{project.description || 'No description provided.'}</p>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                        <span>Status: <span className={`font-medium ${project.status === 'Completed' ? 'text-green-600' : project.status === 'In Progress' ? 'text-blue-600' : 'text-gray-600'}`}>{project.status}</span></span>
                        <span>Created By: {project.creator?.username || 'N/A'}</span>
                    </div>
                    {/* Action Buttons */}
                    {(canEditProject(project) || canDeleteProject(project)) && (
                        <div className="absolute top-4 right-4 flex space-x-2">
                            {canEditProject(project) && (
                                <button
                                    onClick={() => { setSelectedProject(project); setIsEditModalOpen(true); }}
                                    className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
                                    title="Edit Project"
                                >
                                    {/* Simple edit icon */}
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.38-2.828-2.828z" />
                                    </svg>
                                </button>
                            )}
                            {canDeleteProject(project) && (
                                <button
                                    onClick={() => handleDelete(project.id)}
                                    className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
                                    title="Delete Project"
                                    disabled={deleteProjectMutation.isPending}
                                >
                                    {/* Simple delete icon */}
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm1 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            ))
        )}
      </div>

      {/* Create Project Modal */}
      {isCreateModalOpen && <CreateProjectForm onClose={() => setIsCreateModalOpen(false)} />}

      {/* Edit Project Modal */}
      {isEditModalOpen && selectedProject && (
        <EditProjectForm project={selectedProject} onClose={() => { setIsEditModalOpen(false); setSelectedProject(null); }} />
      )}
    </div>
  );
};

export default ProjectsPage;