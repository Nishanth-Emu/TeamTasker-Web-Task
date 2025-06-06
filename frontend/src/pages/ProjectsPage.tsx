import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import CreateProjectForm from '../components/projects/CreateProjectForm';
import EditProjectForm from '../components/projects/EditProjectForm';
import ConfirmDeleteDialog from '../components/common/ConfirmDeleteDialog';
import { io } from 'socket.io-client';

import {
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  BriefcaseIcon,
  UserCircleIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PlusIcon,
  XMarkIcon,
  ArchiveBoxXMarkIcon,
  ArrowPathIcon
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
      return 'bg-sky-100 text-sky-700 border-sky-300';
    case 'Cancelled':
      return 'bg-red-100 text-red-700 border-red-300';
    case 'Not Started':
    default:
      return 'bg-slate-200 text-slate-700 border-slate-400';
  }
};

const ProjectsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: projects, isLoading, isError, error, refetch } = useQuery<Project[], Error>({
    queryKey: ['projects', filterStatus, sortBy, sortOrder, debouncedSearchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== 'All') params.append('status', filterStatus);
      if (debouncedSearchTerm.trim()) params.append('search', debouncedSearchTerm.trim());
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      const response = await api.get(`/projects?${params.toString()}`);
      return response.data;
    },
    staleTime: 60000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const handleProjectChange = (_action: string, _data: any) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    };
    socket.on('connect', () => {});
    socket.on('disconnect', () => {});
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
      setIsConfirmDeleteDialogOpen(false);
      setProjectToDelete(null);
    },
    onError: (err: any) => {
      console.error('Delete project error:', err);
      alert(`Failed to delete project: ${err.response?.data?.message || err.message}`);
      setIsConfirmDeleteDialogOpen(false);
      setProjectToDelete(null);
    },
  });

  const openDeleteConfirmDialog = useCallback((project: Project) => {
    setProjectToDelete(project);
    setIsConfirmDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (projectToDelete) {
      deleteProjectMutation.mutate(projectToDelete.id);
    }
  }, [projectToDelete, deleteProjectMutation]);

  const handleEditProject = useCallback((project: Project) => {
    setSelectedProject(project);
    setIsEditModalOpen(true);
  }, []);
  
  const handleSortOrderChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOrder(e.target.value as 'asc' | 'desc');
  }, []);

  const commonInputClasses = "form-input block w-full py-2.5 px-4 border border-slate-300 bg-white rounded-lg shadow-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:outline-none sm:text-sm transition-colors duration-150 ease-in-out";
  const commonSelectClasses = "form-select block w-full py-2.5 pl-4 pr-10 border border-slate-300 bg-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:outline-none sm:text-sm appearance-none transition-colors duration-150 ease-in-out";
  const commonLabelClasses = "block text-xs font-medium text-slate-600 mb-1.5";

  const filteringControls = useMemo(() => (
    <div className="bg-white p-5 sm:p-6 rounded-xl shadow-lg mb-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5 items-end">
        <div className="relative col-span-1 sm:col-span-2 lg:col-span-1">
          <label htmlFor="search-projects" className={commonLabelClasses}>Search Projects</label>
          <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 mt-px h-5 w-5 text-slate-400 pointer-events-none transform -translate-y-1/2" />
          <input
            id="search-projects"
            type="search"
            placeholder="Name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${commonInputClasses} pl-11`}
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="filter-status" className={commonLabelClasses}>Status</label>
          <div className="relative">
            <select id="filter-status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={commonSelectClasses}>
              <option value="All">All Statuses</option>
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <ChevronDownIcon className="absolute right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
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
            <ChevronDownIcon className="absolute right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <label htmlFor="sort-order" className={commonLabelClasses}>Order</label>
          <div className="relative">
            <select
                id="sort-order"
                value={sortOrder}
                onChange={handleSortOrderChange}
                className={commonSelectClasses}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
            <ChevronDownIcon className="absolute right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  ), [searchTerm, filterStatus, sortBy, sortOrder, handleSortOrderChange, commonInputClasses, commonSelectClasses, commonLabelClasses]);

  const canCreateProject = useMemo(() => user && ['Admin', 'Project Manager'].includes(user.role), [user]);
  const canEditOrDeleteProject = useCallback((project: Project) =>
    user && (['Admin', 'Project Manager'].includes(user.role) || (project.createdBy === user.id)), [user]
  );

  const projectCards = useMemo(() => {
    if (!projects || projects.length === 0) {
      return (
        <div className="col-span-1 md:col-span-2 xl:col-span-3 text-center py-20 px-6 bg-white rounded-xl shadow-lg flex flex-col items-center justify-center">
          <ArchiveBoxXMarkIcon className="h-20 w-20 text-slate-400 mb-6" />
          <p className="text-2xl font-semibold text-slate-700 mb-2">No Projects Found</p>
          <p className="text-slate-500 max-w-md">
            {filterStatus !== 'All' || debouncedSearchTerm ? "Try adjusting your filters or search term to find what you're looking for." : 
             (canCreateProject ? "Ready to start something new? Create your first project." : "There are currently no projects to display.")}
          </p>
          {filterStatus !== 'All' || debouncedSearchTerm ? (
            <button 
              onClick={() => { setFilterStatus('All'); setSearchTerm(''); setDebouncedSearchTerm(''); setSortBy('createdAt'); setSortOrder('desc');}}
              className="mt-6 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Clear Filters & Search
            </button>
          ) : null}
        </div>
      );
    }

    return projects.map((project) => (
      <div key={project.id} className="bg-white rounded-xl shadow-lg hover:shadow-2xl border border-slate-200/70 transition-all duration-300 ease-in-out flex flex-col overflow-hidden group">
        <div className="p-6 flex-grow">
          <div className="flex justify-between items-start mb-3.5">
            <Link to={`/dashboard/projects/${project.id}/tasks`} className="block mr-3 overflow-hidden">
              <h2 className="text-xl font-semibold text-slate-800 group-hover:text-blue-600 transition-colors mb-1 line-clamp-2 break-words">{project.name}</h2>
            </Link>
            {(canEditOrDeleteProject(project)) && (
              <div className="flex-shrink-0 flex items-center space-x-1">
                <button
                  onClick={() => handleEditProject(project)}
                  className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                  title="Edit Project"
                >
                  <PencilSquareIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => openDeleteConfirmDialog(project)}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                  title="Delete Project"
                  disabled={deleteProjectMutation.isPending && deleteProjectMutation.variables === project.id}
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
          <p className="text-slate-600 text-sm mb-5 line-clamp-3 leading-relaxed">{project.description || 'No description provided for this project.'}</p>
          
          <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusStyles(project.status)}`}>
            {project.status === 'In Progress' && <ClockIcon className="h-4 w-4 mr-1.5" />}
            {project.status === 'Completed' && <CheckCircleIcon className="h-4 w-4 mr-1.5" />}
            {project.status === 'Not Started' && <InformationCircleIcon className="h-4 w-4 mr-1.5" />}
            {project.status === 'Cancelled' && <XMarkIcon className="h-4 w-4 mr-1.5" />}
            {project.status}
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-200/70 text-xs text-slate-500 space-y-2.5">
           <div className="flex items-center">
            <UserCircleIcon className="h-4.5 w-4.5 mr-2 text-slate-400 flex-shrink-0" />
            <span>Created by: <span className="font-medium text-slate-700">{project.creator?.username || 'N/A'}</span></span>
          </div>
          <div className="flex items-center">
            <CalendarDaysIcon className="h-4.5 w-4.5 mr-2 text-slate-400 flex-shrink-0" />
            <span>Created: <span className="font-medium text-slate-700">{new Date(project.createdAt).toLocaleDateString()}</span></span>
          </div>
          <div className="flex items-center">
            <ClockIcon className="h-4.5 w-4.5 mr-2 text-slate-400 flex-shrink-0" />
            <span>Last Update: <span className="font-medium text-slate-700">{new Date(project.updatedAt).toLocaleDateString()}</span></span>
          </div>
        </div>
      </div>
    ));
  }, [projects, canEditOrDeleteProject, handleEditProject, openDeleteConfirmDialog, deleteProjectMutation.isPending, deleteProjectMutation.variables, filterStatus, debouncedSearchTerm, canCreateProject]);


  if (isLoading && !projects) return (
    <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center text-slate-600 bg-slate-50">
        <svg className="animate-spin h-12 w-12 text-blue-600 mb-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-xl font-semibold">Loading Projects</p>
        <p className="text-sm text-slate-500">Please wait while we fetch your project data.</p>
    </div>
  );

  if (isError && !projects) return (
    <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center text-red-700 bg-red-50 p-10 rounded-lg">
        <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mb-6" />
        <p className="text-2xl font-semibold mb-2">Error Loading Projects</p>
        <p className="text-red-600 text-center mb-6 max-w-md">{error?.message || "An unexpected error occurred while trying to load your projects. Please try again."}</p>
        <button 
          onClick={() => refetch()}
          className="px-6 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors shadow-md"
        >
          Try Again
        </button>
    </div>
  );
  
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 selection:bg-blue-600 selection:text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-y-4">
          <div className="flex items-center">
            <BriefcaseIcon className="h-10 w-10 text-blue-600 mr-3.5 hidden sm:block flex-shrink-0" />
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-800">My Projects</h1>
          </div>
          {canCreateProject && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center px-5 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-150 ease-in-out text-sm font-semibold"
            >
              <PlusIcon className="h-5 w-5 mr-2 -ml-1" />
              Create New Project
            </button>
          )}
        </header>

        {filteringControls}

        {isLoading && projects && (
          <div className="text-center text-sm text-slate-500 mb-6 py-3 px-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-center shadow-sm">
            <ArrowPathIcon className="animate-spin h-5 w-5 mr-2.5 text-blue-500" />
            Refreshing project list...
          </div>
        )}
        {isError && projects && (
          <div className="text-center text-sm text-red-600 mb-6 py-3 px-4 bg-red-50 border border-red-300 rounded-lg flex items-center justify-center shadow-sm">
            <ExclamationTriangleIcon className="h-5 w-5 mr-2.5 text-red-500" />
            Could not refresh projects. Displaying cached data. Please try again later.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-8 lg:gap-x-8">
          {projectCards}
        </div>
      </div>

      {isCreateModalOpen && (
        <CreateProjectForm onClose={() => setIsCreateModalOpen(false)} />
      )}

      {isEditModalOpen && selectedProject && (
        <EditProjectForm
          project={selectedProject}
          onClose={() => { setIsEditModalOpen(false); setSelectedProject(null); }}
        />
      )}

      {projectToDelete && (
        <ConfirmDeleteDialog
            isOpen={isConfirmDeleteDialogOpen}
            onClose={() => { setIsConfirmDeleteDialogOpen(false); setProjectToDelete(null); }}
            onConfirm={handleConfirmDelete}
            title="Confirm Project Deletion"
            message="Are you sure you want to permanently delete this project and all its associated tasks? This action cannot be undone."
            itemName={projectToDelete.name}
            isDeleting={deleteProjectMutation.isPending}
        />
      )}
    </div>
  );
};

export default ProjectsPage;