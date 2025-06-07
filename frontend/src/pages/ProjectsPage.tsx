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
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import {
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  MinusCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  ArchiveBoxXMarkIcon,
  ArrowPathIcon,
  EyeIcon,
  ListBulletIcon,
  NoSymbolIcon,
  RocketLaunchIcon,
  PauseCircleIcon,
} from '@heroicons/react/24/outline';
import { UserIcon } from '@heroicons/react/24/solid';

// --- INTERFACES & CONSTANTS ---
interface Project {
  id: string;
  name: string;
  description: string;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator?: { id: string; username: string; email: string; role: string; };
}

const socket = io(import.meta.env.VITE_API_BASE_URL.replace('/api', ''));

const KANBAN_COLUMNS = [
  { id: 'Not Started', title: 'Not Started', icon: MinusCircleIcon, color: 'slate' },
  { id: 'In Progress', title: 'In Progress', icon: RocketLaunchIcon, color: 'sky' },
  { id: 'On Hold', title: 'On Hold', icon: PauseCircleIcon, color: 'yellow' },
  { id: 'Completed', title: 'Completed', icon: CheckCircleIcon, color: 'green' },
  { id: 'Cancelled', title: 'Cancelled', icon: NoSymbolIcon, color: 'red' },
] as const;

type ProjectStatus = typeof KANBAN_COLUMNS[number]['id'];

// --- REUSABLE UI COMPONENTS ---

const UserAvatar: React.FC<{ user?: { username: string } }> = ({ user }) => {
  if (!user?.username) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200" title="Unknown User">
        <UserIcon className="h-5 w-5 text-slate-500" />
      </div>
    );
  }

  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200" title={user.username}>
       <UserIcon className="h-5 w-5 text-slate-600" />
    </div>
  );
};

const ProjectCard: React.FC<{
  project: Project;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  isOverlay?: boolean;
}> = ({ project, canEdit, onEdit, onDelete, isOverlay = false }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
    data: { type: 'Project', project },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: isOverlay ? 'none' : transition,
  };

  if (isDragging) {
    return <div ref={setNodeRef} style={style} className="h-[180px] rounded-xl border-2 border-dashed border-slate-300 bg-slate-100" />;
  }
  
  const cardClasses = `bg-white rounded-xl shadow-sm hover:shadow-lg border border-slate-200/80 transition-shadow duration-300 group relative ${isOverlay ? 'shadow-2xl cursor-grabbing' : 'cursor-grab'}`;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={cardClasses}>
      <div className="p-4 flex flex-col h-full">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-base font-semibold text-slate-800 group-hover:text-blue-600 transition-colors pr-14 line-clamp-2">
            {project.name}
          </h3>
          {canEdit && (
            <div className="absolute top-3 right-3 flex opacity-0 group-hover:opacity-100 transition-opacity duration-200 space-x-1">
              <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-2 text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-100 rounded-full" title="Edit"><PencilSquareIcon className="h-4 w-4" /></button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-100 rounded-full" title="Delete"><TrashIcon className="h-4 w-4" /></button>
            </div>
          )}
        </div>
        <p className="text-sm text-slate-500 mb-4 line-clamp-2 flex-grow">{project.description || 'No description provided.'}</p>
        <div className="flex justify-between items-center text-sm mt-auto pt-2 border-t border-slate-100">
          <div className="flex items-center space-x-3">
            <UserAvatar user={project.creator} />
            <span className="text-slate-600 font-medium">{project.creator?.username || 'N/A'}</span>
          </div>
          <div className="flex items-center text-slate-500">
            <CalendarDaysIcon className="h-4 w-4 mr-1.5" />
            <span>{new Date(project.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
       <Link to={`/dashboard/projects/${project.id}/tasks`} onClick={(e) => e.stopPropagation()} className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="flex items-center text-xs px-2.5 py-1.5 bg-slate-700 hover:bg-slate-900 rounded-full font-semibold text-white">
          View Tasks <EyeIcon className="h-3.5 w-3.5 ml-1.5" />
        </div>
      </Link>
    </div>
  );
};

const ProjectKanbanColumn: React.FC<{
  column: (typeof KANBAN_COLUMNS)[number];
  projects: Project[];
  isOver: boolean;
  children: React.ReactNode;
}> = ({ column, projects, isOver, children }) => {
  const { setNodeRef } = useDroppable({ id: column.id, data: { type: 'Column' } });
  
  const colorMap = {
    slate:  { border: 'border-slate-500', bg: 'bg-slate-100', text: 'text-slate-600',  highlight: 'bg-slate-200/60' },
    sky:    { border: 'border-sky-500',   bg: 'bg-sky-50',    text: 'text-sky-600',    highlight: 'bg-sky-100/60' },
    yellow: { border: 'border-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-700', highlight: 'bg-yellow-100/60' },
    green:  { border: 'border-green-500', bg: 'bg-green-50',  text: 'text-green-600',  highlight: 'bg-green-100/60' },
    red:    { border: 'border-red-500',   bg: 'bg-red-50',    text: 'text-red-600',    highlight: 'bg-red-100/60' },
  };
  const ui = colorMap[column.color];

  return (
    <div className={`flex flex-col flex-shrink-0 w-full md:w-96 rounded-xl border-t-4 ${ui.border} ${ui.bg} shadow-sm`}>
      <div className="p-4 sticky top-0 z-[5]">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <column.icon className={`h-6 w-6 mr-2.5 flex-shrink-0 ${ui.text}`} />
            <h2 className="text-lg font-bold text-slate-800">{column.title}</h2>
          </div>
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${ui.text} bg-white/70 border border-slate-200/50`}>
            {projects.length}
          </span>
        </div>
      </div>
      <div ref={setNodeRef} className={`p-2 space-y-3 min-h-[200px] flex-grow overflow-y-auto custom-scrollbar rounded-b-lg transition-colors duration-300 ${isOver ? ui.highlight : ''}`}>
        {children}
      </div>
    </div>
  );
};

const ProjectFilterControls: React.FC<{
    searchTerm: string;
    onSearchTermChange: (value: string) => void;
    filterStatus: string;
    onFilterStatusChange: (value: string) => void;
    sortBy: string;
    onSortByChange: (value: string) => void;
    sortOrder: 'asc' | 'desc';
    onSortOrderChange: (value: 'asc' | 'desc') => void;
}> = ({ searchTerm, onSearchTermChange, filterStatus, onFilterStatusChange, sortBy, onSortByChange, sortOrder, onSortOrderChange }) => {
    
    const commonInputClasses = "form-input block w-full py-2 px-3 border border-slate-300 bg-white rounded-lg shadow-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none sm:text-sm transition";
    const commonSelectClasses = "form-select block w-full py-2 pl-3 pr-10 border border-slate-300 bg-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none sm:text-sm appearance-none transition";
    const commonLabelClasses = "block text-sm font-medium text-slate-700 mb-1.5";

    return (
        <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-sm mb-8 sticky top-[68px] sm:top-[76px] z-10 border border-slate-200/80">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-4 items-end">
                <div className="relative col-span-1 sm:col-span-2 lg:col-span-1">
                    <label htmlFor="search-projects" className={commonLabelClasses}>Search</label>
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 mt-px h-5 w-5 text-slate-400 pointer-events-none transform -translate-y-1/2" />
                    <input id="search-projects" type="search" placeholder="Project name..." value={searchTerm} onChange={(e) => onSearchTermChange(e.target.value)} className={`${commonInputClasses} pl-10`} autoComplete="off" />
                </div>
                <div>
                    <label htmlFor="filter-status-kanban" className={commonLabelClasses}>Status</label>
                    <div className="relative">
                        <select id="filter-status-kanban" value={filterStatus} onChange={(e) => onFilterStatusChange(e.target.value)} className={commonSelectClasses}>
                            <option value="All">All Statuses</option>
                            {KANBAN_COLUMNS.map(col => (<option key={col.id} value={col.id}>{col.title}</option>))}
                        </select>
                        <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                    </div>
                </div>
                <div>
                    <label htmlFor="sort-by" className={commonLabelClasses}>Sort By</label>
                    <div className="relative">
                        <select id="sort-by" value={sortBy} onChange={(e) => onSortByChange(e.target.value)} className={commonSelectClasses}>
                            <option value="updatedAt">Last Updated</option>
                            <option value="createdAt">Date Created</option>
                            <option value="name">Project Name</option>
                        </select>
                        <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                    </div>
                </div>
                <div>
                    <label htmlFor="sort-order" className={commonLabelClasses}>Order</label>
                    <div className="relative">
                        <select id="sort-order" value={sortOrder} onChange={(e) => onSortOrderChange(e.target.value as 'asc' | 'desc')} className={commonSelectClasses}>
                            <option value="desc">Descending</option>
                            <option value="asc">Ascending</option>
                        </select>
                        <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- STATE INDICATOR COMPONENTS ---

const LoadingState: React.FC = () => (
    <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center text-slate-600">
        <svg className="animate-spin h-12 w-12 text-blue-600 mb-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        <p className="text-xl font-semibold">Loading Projects Board</p>
        <p className="text-base text-slate-500">Please wait a moment...</p>
    </div>
);

const ErrorState: React.FC<{ message?: string; onRetry: () => void }> = ({ message, onRetry }) => (
    <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center text-red-700 bg-red-50 p-10 rounded-lg">
        <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mb-6" />
        <p className="text-2xl font-semibold mb-2">Error Loading Board</p>
        <p className="text-red-600 text-center mb-6 max-w-md">{message || "An unexpected error occurred. Please try again."}</p>
        <button onClick={onRetry} className="px-6 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors shadow-md flex items-center">
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            Try Again
        </button>
    </div>
);

const EmptyState: React.FC<{ canCreate: boolean; onCreate: () => void }> = ({ canCreate, onCreate }) => (
    <div className="text-center py-20 px-6 bg-white rounded-xl shadow-sm flex flex-col items-center justify-center border border-slate-200/80">
        <ArchiveBoxXMarkIcon className="h-20 w-20 text-slate-400 mb-6" />
        <p className="text-2xl font-semibold text-slate-700 mb-2">No Projects Yet</p>
        <p className="text-slate-500 max-w-md mb-8">{canCreate ? "It looks a bit empty here. Let's get started by creating your first project!" : "There are currently no projects to display."}</p>
        {canCreate && (
            <button onClick={onCreate} className="flex items-center px-5 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition text-base font-semibold">
                <PlusIcon className="h-5 w-5 mr-2 -ml-1" />
                Create First Project
            </button>
        )}
    </div>
);

const NoResultsState: React.FC<{ onClear: () => void }> = ({ onClear }) => (
    <div className="text-center py-20 px-6 bg-white rounded-xl shadow-sm flex flex-col items-center justify-center border border-slate-200/80">
        <MagnifyingGlassIcon className="h-20 w-20 text-slate-400 mb-6" />
        <p className="text-2xl font-semibold text-slate-700 mb-2">No Matching Projects</p>
        <p className="text-slate-500 max-w-md mb-8">We couldn't find any projects matching your filters. Try adjusting your search.</p>
        <button onClick={onClear} className="px-5 py-3 bg-slate-600 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors shadow-sm">
            Clear Filters & Search
        </button>
    </div>
);

// --- MAIN PAGE COMPONENT ---
const ProjectsPage: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('All');
    const [sortBy, setSortBy] = useState<string>('updatedAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');
    const [localProjects, setLocalProjects] = useState<Project[]>([]);
    const [activeProject, setActiveProject] = useState<Project | null>(null);
    const [overColumnId, setOverColumnId] = useState<string | null>(null);

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
        staleTime: 30000,
        refetchOnWindowFocus: true,
    });
    
    useEffect(() => {
        if (projects) {
            setLocalProjects(Array.from(new Map(projects.map(p => [p.id, p])).values()));
        }
    }, [projects]);

    useEffect(() => {
        const handleProjectChange = () => { queryClient.invalidateQueries({ queryKey: ['projects'] }); };
        socket.on('connect', () => {});
        socket.on('disconnect', () => {});
        socket.on('projectCreated', handleProjectChange);
        socket.on('projectUpdated', handleProjectChange);
        socket.on('projectDeleted', handleProjectChange);
        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('projectCreated');
            socket.off('projectUpdated');
            socket.off('projectDeleted');
        };
    }, [queryClient]);

    const updateProjectStatusMutation = useMutation({
        mutationFn: ({ projectId, status }: { projectId: string; status: ProjectStatus }) =>
            api.patch(`/projects/${projectId}`, { status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        },
    });

    const deleteProjectMutation = useMutation({
        mutationFn: (projectId: string) => api.delete(`/projects/${projectId}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            setIsConfirmDeleteDialogOpen(false);
            setProjectToDelete(null);
        },
        onError: (err: any) => {
            alert(`Failed to delete project: ${err.response?.data?.message || err.message}`);
        },
    });

    const openDeleteConfirmDialog = useCallback((project: Project) => {
        setProjectToDelete(project);
        setIsConfirmDeleteDialogOpen(true);
    }, []);

    const handleConfirmDelete = useCallback(() => {
        if (projectToDelete) deleteProjectMutation.mutate(projectToDelete.id);
    }, [projectToDelete, deleteProjectMutation]);

    const handleEditProject = useCallback((project: Project) => {
        setSelectedProject(project);
        setIsEditModalOpen(true);
    }, []);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 10 } }));

    const handleDragStart = (event: DragStartEvent) => {
        if (event.active.data.current?.type === 'Project') {
            setActiveProject(event.active.data.current.project);
        }
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { over } = event;
        const overId = over?.id;
        setOverColumnId(over?.data.current?.type === 'Column' ? (overId as string) : null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveProject(null);
        setOverColumnId(null);
        const { active, over } = event;
        if (!over || active.id === over.id || active.data.current?.type !== 'Project') return;
        
        if (over.data.current?.type === 'Column') {
            const projectId = active.id as string;
            const project = localProjects.find(p => p.id === projectId);
            const newStatus = over.id as ProjectStatus;
            
            if (project && project.status !== newStatus) {
                const optimisticOldState = [...localProjects];
                setLocalProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: newStatus } : p));
                updateProjectStatusMutation.mutate({ projectId, status: newStatus }, {
                    onError: () => { setLocalProjects(optimisticOldState); },
                });
            }
        }
    };

    const canCreateProject = useMemo(() => user && ['Admin', 'Project Manager'].includes(user.role), [user]);
    const canEditOrDeleteProject = useCallback((project: Project) => !!(user && (['Admin', 'Project Manager'].includes(user.role) || project.createdBy === user.id)), [user]);

    const groupedProjects = useMemo(() => {
        const initial = KANBAN_COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: [] }), {} as Record<ProjectStatus, Project[]>);
        return localProjects.reduce((acc, project) => {
            if (project?.status && acc[project.status]) acc[project.status].push(project);
            return acc;
        }, initial);
    }, [localProjects]);

    const activeColumns = useMemo(() => 
        filterStatus === 'All' ? KANBAN_COLUMNS : KANBAN_COLUMNS.filter(col => col.id === filterStatus),
    [filterStatus]);
    
    const clearFiltersAndSearch = () => {
        setFilterStatus('All');
        setSearchTerm('');
        setDebouncedSearchTerm('');
        setSortBy('updatedAt');
        setSortOrder('desc');
    };

    const renderKanbanBoard = () => {
        if (!projects && isLoading) return <LoadingState />;
        if (!projects && isError) return <ErrorState message={error?.message} onRetry={refetch} />;

        const isInitialLoad = projects?.length === 0 && filterStatus === 'All' && !debouncedSearchTerm;
        if (isInitialLoad) {
            return <EmptyState canCreate={!!canCreateProject} onCreate={() => setIsCreateModalOpen(true)} />;
        }
        
        const noResultsAfterFilter = localProjects.length === 0 && !isInitialLoad;
        if (noResultsAfterFilter) {
            return <NoResultsState onClear={clearFiltersAndSearch} />;
        }
        
        return (
            <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0 pb-4 min-w-full md:overflow-x-auto">
                {activeColumns.map(column => {
                    const columnProjects = groupedProjects[column.id] || [];
                    const projectIds = columnProjects.map(p => p.id);
                    return (
                        <ProjectKanbanColumn key={column.id} column={column} projects={columnProjects} isOver={overColumnId === column.id}>
                            <SortableContext items={projectIds} id={column.id} strategy={verticalListSortingStrategy}>
                                {columnProjects.length > 0 ? (
                                    columnProjects.map(project => (
                                        <ProjectCard 
                                            key={project.id} 
                                            project={project} 
                                            canEdit={canEditOrDeleteProject(project)} 
                                            onEdit={() => handleEditProject(project)} 
                                            onDelete={() => openDeleteConfirmDialog(project)}
                                        />
                                    ))
                                ) : (
                                    <div className="text-center py-10 px-4">
                                        <ListBulletIcon className="h-12 w-12 text-slate-400/60 mx-auto mb-2" />
                                        <p className="text-sm text-slate-500">No projects in this stage.</p>
                                    </div>
                                )}
                            </SortableContext>
                        </ProjectKanbanColumn>
                    )
                })}
            </div>
        );
    };

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} onDragCancel={() => { setActiveProject(null); setOverColumnId(null); }}>
            <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white">
                <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-20 border-b border-slate-200/80">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center py-4">
                            <div className="flex items-center">
                                <BriefcaseIcon className="h-8 w-8 text-blue-600 mr-3" />
                                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Projects Board</h1>
                            </div>
                            {canCreateProject && (
                                <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition text-sm font-semibold">
                                    <PlusIcon className="h-5 w-5 mr-1.5 -ml-1" /> New Project
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
                    <ProjectFilterControls
                        searchTerm={searchTerm} onSearchTermChange={setSearchTerm}
                        filterStatus={filterStatus} onFilterStatusChange={setFilterStatus}
                        sortBy={sortBy} onSortByChange={setSortBy}
                        sortOrder={sortOrder} onSortOrderChange={setSortOrder}
                    />
                    
                    {isLoading && projects && (
                        <div className="text-sm text-slate-600 mb-4 py-2 px-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-center shadow-sm">
                            <ArrowPathIcon className="animate-spin h-5 w-5 mr-2.5 text-blue-500" />
                            Updating board with the latest data...
                        </div>
                    )}
                    {isError && projects && (
                         <div className="text-sm text-red-700 mb-4 py-2 px-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center shadow-sm">
                            <ExclamationTriangleIcon className="h-5 w-5 mr-2.5" />
                            Could not update board. Displaying last known data.
                        </div>
                    )}
                    
                    {renderKanbanBoard()}
                </main>

                {isCreateModalOpen && <CreateProjectForm onClose={() => setIsCreateModalOpen(false)} />}
                {isEditModalOpen && selectedProject && <EditProjectForm project={selectedProject} onClose={() => { setIsEditModalOpen(false); setSelectedProject(null); }} />}
                {projectToDelete && <ConfirmDeleteDialog isOpen={isConfirmDeleteDialogOpen} onClose={() => { setIsConfirmDeleteDialogOpen(false); setProjectToDelete(null); }} onConfirm={handleConfirmDelete} title="Confirm Project Deletion" message="Are you sure you want to permanently delete this project and all its associated tasks? This action cannot be undone." itemName={projectToDelete.name} isDeleting={deleteProjectMutation.isPending}/>}
            </div>

            <DragOverlay>
                {activeProject ? (
                    <div style={{ transform: 'rotate(2.5deg)' }}>
                        <ProjectCard project={activeProject} canEdit={canEditOrDeleteProject(activeProject)} onEdit={() => handleEditProject(activeProject)} onDelete={() => openDeleteConfirmDialog(activeProject)} isOverlay={true} />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};

export default ProjectsPage;