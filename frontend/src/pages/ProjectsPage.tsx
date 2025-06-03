import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import CreateProjectForm from '../components/projects/CreateProjectForm';
import EditProjectForm from '../components/projects/EditProjectForm';
import { io } from 'socket.io-client';

// Type Definitions
interface Project {
  id: string;
  name: string;
  description: string;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Cancelled';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator?: { id: string; username: string; email: string; role: string; };
}

// Create socket instance outside component to prevent recreation
const socket = io(import.meta.env.VITE_API_BASE_URL.replace('/api', ''));

const ProjectsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // State for Filtering and Sorting
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');

  // Debounce search term to prevent excessive API calls and re-renders
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch projects with filters and sorting
  const { data: projects, isLoading, isError, error } = useQuery<Project[], Error>({
    queryKey: ['projects', filterStatus, sortBy, sortOrder, debouncedSearchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== 'All') {
        params.append('status', filterStatus);
      }
      if (debouncedSearchTerm.trim()) {
        params.append('search', debouncedSearchTerm.trim());
      }
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);

      const response = await api.get(`/projects?${params.toString()}`);
      return response.data;
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
  });

  // Socket.IO for real-time updates - Memoized to prevent recreation
  useEffect(() => {
    const handleConnect = () => {
      console.log('Socket.IO Connected to backend for Projects!');
    };

    const handleDisconnect = () => {
      console.log('Socket.IO Disconnected from backend for Projects!');
    };

    const handleProjectCreated = (newProject: Project) => {
      console.log('Real-time: Project Created', newProject);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    };

    const handleProjectUpdated = (updatedProject: Project) => {
      console.log('Real-time: Project Updated', updatedProject);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    };

    const handleProjectDeleted = (deletedProject: { id: string }) => {
      console.log('Real-time: Project Deleted', deletedProject.id);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('projectCreated', handleProjectCreated);
    socket.on('projectUpdated', handleProjectUpdated);
    socket.on('projectDeleted', handleProjectDeleted);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('projectCreated', handleProjectCreated);
      socket.off('projectUpdated', handleProjectUpdated);
      socket.off('projectDeleted', handleProjectDeleted);
    };
  }, [queryClient]);

  // Mutation for deleting a project
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      await api.delete(`/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error: any) => {
      console.error('Delete project error:', error);
      alert(`Failed to delete project: ${error.response?.data?.message || error.message}`);
    },
  });

  // Memoized event handlers to prevent unnecessary re-renders
  const handleDeleteProject = useCallback((projectId: string) => {
    if (window.confirm('Are you sure you want to delete this project and all its associated tasks? This action cannot be undone.')) {
      deleteProjectMutation.mutate(projectId);
    }
  }, [deleteProjectMutation]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleFilterStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterStatus(e.target.value);
  }, []);

  const handleSortByChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value);
  }, []);

  const handleSortOrderChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOrder(e.target.value as 'asc' | 'desc');
  }, []);

  const handleEditProject = useCallback((project: Project) => {
    setSelectedProject(project);
    setIsEditModalOpen(true);
  }, []);

  const handleCloseCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setSelectedProject(null);
  }, []);

  // RBAC helpers - Memoized for performance
  const canCreateProject = useMemo(() => 
    user && ['Admin', 'Project Manager'].includes(user.role), [user]
  );

  const canEditProject = useCallback((project: Project) => 
    user && (
      ['Admin', 'Project Manager'].includes(user.role) ||
      (project.createdBy === user.id && user.role === 'Developer')
    ), [user]
  );

  const canDeleteProject = useCallback((project: Project) => 
    user && (
      ['Admin', 'Project Manager'].includes(user.role) ||
      (project.createdBy === user.id && user.role === 'Developer')
    ), [user]
  );

  // Memoized filtering controls to prevent input field recreation
  const filteringControls = useMemo(() => (
    <div className="bg-white p-4 rounded-lg shadow-md mb-6 flex flex-wrap items-center gap-4">
      <div className="flex-1 min-w-[200px]">
        <label htmlFor="search-projects" className="sr-only">Search Projects</label>
        <input
          key="search-projects-input"
          id="search-projects"
          type="text"
          placeholder="Search by name or description..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          autoComplete="off"
        />
      </div>

      <div>
        <label htmlFor="filter-status" className="block text-sm font-medium text-gray-700">Filter by Status</label>
        <select
          id="filter-status"
          value={filterStatus}
          onChange={handleFilterStatusChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          <option value="All">All Statuses</option>
          <option value="Not Started">Not Started</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      <div>
        <label htmlFor="sort-by" className="block text-sm font-medium text-gray-700">Sort By</label>
        <select
          id="sort-by"
          value={sortBy}
          onChange={handleSortByChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          <option value="createdAt">Created Date</option>
          <option value="name">Project Name</option>
          <option value="status">Status</option>
          <option value="updatedAt">Last Updated</option>
        </select>
      </div>

      <div>
        <label htmlFor="sort-order" className="block text-sm font-medium text-gray-700">Order</label>
        <select
          id="sort-order"
          value={sortOrder}
          onChange={handleSortOrderChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>
    </div>
  ), [searchTerm, filterStatus, sortBy, sortOrder, handleSearchChange, handleFilterStatusChange, handleSortByChange, handleSortOrderChange]);

  // Memoized project cards to prevent unnecessary re-renders
  const projectCards = useMemo(() => {
    if (!projects || projects.length === 0) {
      return (
        <p className="md:col-span-3 text-center text-gray-500">
          No projects found. {canCreateProject && "Start by creating one!"}
        </p>
      );
    }

    return projects.map((project) => (
      <div key={project.id} className="bg-white p-6 rounded-lg shadow-md border border-gray-100 hover:shadow-lg transition-shadow relative">
        <Link to={`/dashboard/projects/${project.id}/tasks`} className="block">
          <h2 className="text-xl font-semibold text-blue-700 mb-2 hover:underline">{project.name}</h2>
          <p className="text-gray-600 text-sm mb-4">{project.description || 'No description provided.'}</p>
          <div className="text-xs text-gray-500 space-y-1">
            <p>Status: <span className={`font-medium ${project.status === 'Completed' ? 'text-green-600' : project.status === 'In Progress' ? 'text-blue-600' : 'text-gray-600'}`}>{project.status}</span></p>
            <p>Created By: <span className="font-medium">{project.creator?.username || 'N/A'}</span></p>
            <p>Created: {new Date(project.createdAt).toLocaleDateString()}</p>
            <p>Last Updated: {new Date(project.updatedAt).toLocaleDateString()}</p>
          </div>
        </Link>

        {/* Action Buttons */}
        {(canEditProject(project) || canDeleteProject(project)) && (
          <div className="absolute top-4 right-4 flex space-x-2">
            {canEditProject(project) && (
              <button
                onClick={() => handleEditProject(project)}
                className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
                title="Edit Project"
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.38-2.828-2.828z" />
                </svg>
              </button>
            )}
            {canDeleteProject(project) && (
              <button
                onClick={() => handleDeleteProject(project.id)}
                className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
                title="Delete Project"
                disabled={deleteProjectMutation.isPending}
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm1 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    ));
  }, [projects, canEditProject, canDeleteProject, handleEditProject, handleDeleteProject, deleteProjectMutation.isPending, canCreateProject]);

  if (isLoading) return <div className="text-center text-lg">Loading projects...</div>;
  if (isError) return <div className="text-center text-lg text-red-600">Error: {error?.message}</div>;

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">My Projects</h1>
        {canCreateProject && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            type="button"
          >
            Create New Project
          </button>
        )}
      </div>

      {/* Filtering and Sorting Controls */}
      {filteringControls}

      {/* Projects List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projectCards}
      </div>

      {/* Modals */}
      {isCreateModalOpen && (
        <CreateProjectForm onClose={handleCloseCreateModal} />
      )}

      {isEditModalOpen && selectedProject && (
        <EditProjectForm
          project={selectedProject}
          onClose={handleCloseEditModal}
        />
      )}
    </div>
  );
};

export default ProjectsPage;