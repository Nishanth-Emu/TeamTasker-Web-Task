import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios'; 
import { useAuth } from '../context/AuthContext'; 
import CreateProjectForm from '../components/projects/CreateProjectForm'; 
import EditProjectForm from '../components/projects/EditProjectForm';
import { io } from 'socket.io-client';

// Heroicons
import {
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  BriefcaseIcon,
  UserCircleIcon,
  CalendarDaysIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PlusIcon,
  XMarkIcon,
  ArchiveBoxXMarkIcon
} from '@heroicons/react/24/outline';

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

const socket = io(import.meta.env.VITE_API_BASE_URL.replace('/api', ''));

const getStatusStyles = (status: Project['status']) => {
  switch (status) {
    case 'Completed':
      return 'bg-green-100 text-green-700 border-green-300';
    case 'In Progress':
      return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'Cancelled':
      return 'bg-red-100 text-red-700 border-red-300';
    case 'Not Started':
    default:
      return 'bg-slate-100 text-slate-600 border-slate-300';
  }
};

const ProjectsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc'); // Logic was present
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: projects, isLoading, isError, error } = useQuery<Project[], Error>({
    queryKey: ['projects', filterStatus, sortBy, sortOrder, debouncedSearchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== 'All') params.append('status', filterStatus);
      if (debouncedSearchTerm.trim()) params.append('search', debouncedSearchTerm.trim());
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder); // Used in query
      const response = await api.get(`/projects?${params.toString()}`);
      return response.data;
    },
    staleTime: 60000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const handleProjectChange = (action: string, data: any) => {
      console.log(`Real-time: Project ${action}`, data);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    };

    socket.on('connect', () => console.log('Socket.IO Connected for Projects'));
    socket.on('disconnect', () => console.log('Socket.IO Disconnected for Projects'));
    socket.on('projectCreated', (d: Project) => handleProjectChange('Created', d));
    socket.on('projectUpdated', (d: Project) => handleProjectChange('Updated', d));
    socket.on('projectDeleted', (d: { id: string }) => handleProjectChange('Deleted', d));

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('projectCreated');
      socket.off('projectUpdated');
      socket.off('projectDeleted');
    };
  }, [queryClient]);

  const deleteProjectMutation = useMutation({
    mutationFn: (projectId: string) => api.delete(`/projects/${projectId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err: any) => {
      console.error('Delete project error:', err);
      alert(`Failed to delete project: ${err.response?.data?.message || err.message}`);
    },
  });

  const handleDeleteProject = useCallback((projectId: string) => {
    if (window.confirm('Are you sure you want to delete this project and all its associated tasks? This action cannot be undone.')) {
      deleteProjectMutation.mutate(projectId);
    }
  }, [deleteProjectMutation]);

  const handleEditProject = useCallback((project: Project) => {
    setSelectedProject(project);
    setIsEditModalOpen(true);
  }, []);

  // The handleSortOrderChange callback was in your original code and is correct
  const handleSortOrderChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOrder(e.target.value as 'asc' | 'desc');
  }, []);


  const commonInputClasses = "form-input block w-full py-2.5 px-4 border border-slate-300 bg-white rounded-lg shadow-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none sm:text-sm transition-colors duration-150 ease-in-out";
  const commonSelectClasses = "form-select block w-full py-2.5 pl-4 pr-10 border border-slate-300 bg-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none sm:text-sm appearance-none transition-colors duration-150 ease-in-out";
  const commonLabelClasses = "block text-xs font-medium text-slate-600 mb-1";

  const filteringControls = useMemo(() => (
    <div className="bg-white p-5 sm:p-6 rounded-xl shadow-lg mb-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 items-end">
        <div className="relative col-span-1 sm:col-span-2 lg:col-span-1"> {/* Adjusted span for search */}
          <label htmlFor="search-projects" className={commonLabelClasses}>Search Projects</label>
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 mt-[1px] h-5 w-5 text-slate-400 pointer-events-none transform -translate-y-1/2" />
          <input
            id="search-projects"
            type="text"
            placeholder="Search by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${commonInputClasses} pl-10`}
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="filter-status" className={commonLabelClasses}>Filter by Status</label>
          <div className="relative">
            <select id="filter-status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={commonSelectClasses}>
              <option value="All">All Statuses</option>
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label htmlFor="sort-by" className={commonLabelClasses}>Sort By</label>
           <div className="relative">
            <select id="sort-by" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={commonSelectClasses}>
              <option value="createdAt">Created Date</option>
              <option value="name">Project Name</option>
              <option value="status">Status</option>
              <option value="updatedAt">Last Updated</option>
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <div> {/* <<<< REINSTATED SORT ORDER CONTROL >>>> */}
          <label htmlFor="sort-order" className={commonLabelClasses}>Order</label>
          <div className="relative">
            <select
                id="sort-order"
                value={sortOrder}
                onChange={handleSortOrderChange} // Using the existing callback
                className={commonSelectClasses}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  ), [searchTerm, filterStatus, sortBy, sortOrder, handleSortOrderChange, commonInputClasses, commonSelectClasses, commonLabelClasses]);
  // Added handleSortOrderChange to dependency array for useMemo

  const canCreateProject = useMemo(() => user && ['Admin', 'Project Manager'].includes(user.role), [user]);
  const canEditOrDeleteProject = useCallback((project: Project) =>
    user && (['Admin', 'Project Manager'].includes(user.role) || (project.createdBy === user.id)), [user]
  );


  const projectCards = useMemo(() => {
    if (!projects || projects.length === 0) {
      return (
        <div className="col-span-1 md:col-span-2 xl:col-span-3 text-center py-16 flex flex-col items-center justify-center bg-white rounded-xl shadow-md">
          <ArchiveBoxXMarkIcon className="h-16 w-16 text-slate-400 mb-4" />
          <p className="text-xl font-medium text-slate-600 mb-1">No Projects Found</p>
          <p className="text-slate-500">
            {filterStatus !== 'All' || debouncedSearchTerm ? "Try adjusting your filters or search term." : 
             (canCreateProject ? "Get started by creating a new project!" : "There are currently no projects to display.")}
          </p>
          {filterStatus !== 'All' || debouncedSearchTerm ? (
            <button 
              onClick={() => { setFilterStatus('All'); setSearchTerm(''); setDebouncedSearchTerm(''); setSortBy('createdAt'); setSortOrder('desc');}}
              className="mt-4 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors"
            >
              Clear Filters & Search
            </button>
          ) : null}
        </div>
      );
    }

    return projects.map((project) => (
      <div key={project.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl border border-slate-200/80 transition-all duration-300 ease-in-out flex flex-col overflow-hidden">
        <div className="p-6 flex-grow">
          <div className="flex justify-between items-start mb-3">
            <Link to={`/dashboard/projects/${project.id}/tasks`} className="group">
              <h2 className="text-xl font-semibold text-slate-800 group-hover:text-blue-600 transition-colors mb-1.5 line-clamp-2 break-words">{project.name}</h2>
            </Link>
            {(canEditOrDeleteProject(project)) && (
              <div className="flex-shrink-0 flex space-x-1.5">
                <button
                  onClick={() => handleEditProject(project)}
                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                  title="Edit Project"
                >
                  <PencilSquareIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleDeleteProject(project.id)}
                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                  title="Delete Project"
                  disabled={deleteProjectMutation.isPending && deleteProjectMutation.variables === project.id}
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
          <p className="text-slate-600 text-sm mb-5 line-clamp-3">{project.description || 'No description available.'}</p>
          
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusStyles(project.status)}`}>
            {project.status === 'In Progress' && <ClockIcon className="h-3.5 w-3.5 mr-1.5" />}
            {project.status === 'Completed' && <InformationCircleIcon className="h-3.5 w-3.5 mr-1.5" />}
            {project.status === 'Not Started' && <InformationCircleIcon className="h-3.5 w-3.5 mr-1.5" />}
            {project.status === 'Cancelled' && <XMarkIcon className="h-3.5 w-3.5 mr-1.5" />}
            {project.status}
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 text-xs text-slate-500 space-y-2">
           <div className="flex items-center">
            <UserCircleIcon className="h-4 w-4 mr-2 text-slate-400" />
            <span>Created by: <span className="font-medium text-slate-600">{project.creator?.username || 'Unknown'}</span></span>
          </div>
          <div className="flex items-center">
            <CalendarDaysIcon className="h-4 w-4 mr-2 text-slate-400" />
            <span>Created: <span className="font-medium text-slate-600">{new Date(project.createdAt).toLocaleDateString()}</span></span>
          </div>
          <div className="flex items-center">
            <ClockIcon className="h-4 w-4 mr-2 text-slate-400" />
            <span>Last Updated: <span className="font-medium text-slate-600">{new Date(project.updatedAt).toLocaleDateString()}</span></span>
          </div>
        </div>
      </div>
    ));
  }, [projects, canEditOrDeleteProject, handleEditProject, handleDeleteProject, deleteProjectMutation.isPending, deleteProjectMutation.variables, filterStatus, debouncedSearchTerm, canCreateProject]);


  if (isLoading && !projects) return (
    <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center text-slate-600">
        <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-lg font-medium">Loading Projects...</p>
        <p className="text-sm">Please wait a moment.</p>
    </div>
  );

  if (isError && !projects) return (
    <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center text-red-600 bg-red-50 p-8 rounded-lg">
        <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-xl font-semibold mb-2">Error Loading Projects</p>
        <p className="text-sm text-red-700 text-center mb-4">{error?.message || "An unexpected error occurred."}</p>
        <button 
          onClick={() => queryClient.refetchQueries({ queryKey: ['projects'] })}
          className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-md hover:bg-red-600 transition-colors"
        >
          Try Again
        </button>
    </div>
  );
  
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 selection:bg-blue-500 selection:text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="flex items-center">
            <BriefcaseIcon className="h-9 w-9 text-blue-600 mr-3 hidden sm:block" />
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">My Projects</h1>
          </div>
          {canCreateProject && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-100 transition-colors duration-150 ease-in-out text-sm font-medium"
            >
              <PlusIcon className="h-5 w-5 mr-2 -ml-1" />
              Create New Project
            </button>
          )}
        </header>

        {filteringControls}

        {isLoading && projects && (
          <div className="text-center text-sm text-slate-500 mb-4 py-2">Refreshing projects...</div>
        )}
        {isError && projects && (
          <div className="text-center text-sm text-red-500 mb-4 py-2 bg-red-50 rounded-md">
            <ExclamationTriangleIcon className="inline h-4 w-4 mr-1" />
            Could not refresh projects. Displaying cached data.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
          {projectCards}
        </div>
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" aria-hidden="true" />
      )}
      {isCreateModalOpen && (
        <CreateProjectForm onClose={() => setIsCreateModalOpen(false)} />
      )}

      {isEditModalOpen && selectedProject && (
         <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" aria-hidden="true" />
      )}
      {isEditModalOpen && selectedProject && (
        <EditProjectForm
          project={selectedProject}
          onClose={() => { setIsEditModalOpen(false); setSelectedProject(null); }}
        />
      )}
    </div>
  );
};

export default ProjectsPage;