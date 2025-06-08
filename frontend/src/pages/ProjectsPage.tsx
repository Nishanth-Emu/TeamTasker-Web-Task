import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';

import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import CreateProjectForm from '../components/projects/CreateProjectForm';
import EditProjectForm from '../components/projects/EditProjectForm';
import ConfirmDeleteDialog from '../components/common/ConfirmDeleteDialog';

import {
  DndContext, PointerSensor, useSensor, useSensors, useDroppable,
  type DragEndEvent, type DragOverEvent, type DragStartEvent, DragOverlay
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import {
  PencilSquareIcon, TrashIcon, MagnifyingGlassIcon, ChevronDownIcon, BriefcaseIcon, CheckCircleIcon,
  CalendarDaysIcon, MinusCircleIcon, ExclamationTriangleIcon, PlusIcon, ArchiveBoxXMarkIcon,
  ArrowPathIcon, EyeIcon, ListBulletIcon, NoSymbolIcon, RocketLaunchIcon, PauseCircleIcon
} from '@heroicons/react/24/outline';
import { UserIcon } from '@heroicons/react/24/solid';

// --- Type Definitions & Constants ---

interface Project {
  id: string; name: string; description: string;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';
  createdBy: string; createdAt: string; updatedAt: string;
  creator?: { id: string; username: string; email: string; role: string; };
}

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL.replace('/api', '');
const socket = io(SOCKET_URL);

const KANBAN_COLUMNS = [
  { id: 'Not Started', title: 'Not Started', icon: MinusCircleIcon, color: 'slate' },
  { id: 'In Progress', title: 'In Progress', icon: RocketLaunchIcon, color: 'sky' },
  { id: 'On Hold', title: 'On Hold', icon: PauseCircleIcon, color: 'yellow' },
  { id: 'Completed', title: 'Completed', icon: CheckCircleIcon, color: 'green' },
  { id: 'Cancelled', title: 'Cancelled', icon: NoSymbolIcon, color: 'red' },
] as const;

type ProjectStatus = typeof KANBAN_COLUMNS[number]['id'];

// --- Reusable UI Components ---

const UserAvatar: React.FC<{ user?: { username:string } }> = ({ user }) => {
  if (!user?.username) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200" title="Unknown User">
        <UserIcon className="h-5 w-5 text-slate-500" />
      </div>
    );
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 ring-2 ring-white" title={user.username}>
       <UserIcon className="h-5 w-5 text-slate-600" />
    </div>
  );
};

const ProjectCard: React.FC<{
  project: Project; canEdit: boolean;
  onEdit: () => void; onDelete: () => void; isOverlay?: boolean;
}> = ({ project, canEdit, onEdit, onDelete, isOverlay = false }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
    data: { type: 'Project', project },
  });

  const style = { transform: CSS.Translate.toString(transform), transition: isOverlay ? 'none' : transition };

  if (isDragging) {
    return <div ref={setNodeRef} style={style} className="h-[184px] rounded-xl border-2 border-dashed border-slate-300 bg-slate-200/50" />;
  }
  
  const cardClasses = `bg-white rounded-xl shadow-sm hover:shadow-md border border-slate-200/80 transition-all duration-200 group relative ${isOverlay ? 'shadow-lg cursor-grabbing scale-[1.03]' : 'cursor-grab hover:-translate-y-0.5'}`;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={cardClasses}>
      <div className="flex h-full flex-col p-4">
        <div className="mb-2 flex items-start justify-between">
          <h3 className="pr-16 text-base font-semibold text-slate-800 transition-colors group-hover:text-blue-600 line-clamp-2">
            {project.name}
          </h3>
          {canEdit && (
            <div className="absolute right-3 top-3 z-10 flex space-x-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-blue-100 hover:text-blue-600" title="Edit"><PencilSquareIcon className="h-4 w-4" /></button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-red-100 hover:text-red-600" title="Delete"><TrashIcon className="h-4 w-4" /></button>
            </div>
          )}
        </div>
        <p className="mb-4 flex-grow text-sm text-slate-500 line-clamp-2">{project.description || 'No description provided.'}</p>
        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
          <div className="flex items-center space-x-2">
            <UserAvatar user={project.creator} />
            <span className="font-medium text-slate-600">{project.creator?.username || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-x-1.5 text-slate-500">
            <CalendarDaysIcon className="h-4 w-4 text-slate-400" />
            <span>{new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
      </div>
      <Link to={`/dashboard/projects/${project.id}/tasks`} onClick={(e) => e.stopPropagation()} className="absolute bottom-3 right-3 z-10 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:bottom-4">
        <div className="flex items-center gap-x-1.5 rounded-full bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-slate-900">
          View Tasks <EyeIcon className="h-3.5 w-3.5" />
        </div>
      </Link>
    </div>
  );
};

const ProjectKanbanColumn: React.FC<{
  column: (typeof KANBAN_COLUMNS)[number]; projects: Project[];
  isOver: boolean; children: React.ReactNode;
}> = ({ column, projects, isOver, children }) => {
  const { setNodeRef } = useDroppable({ id: column.id, data: { type: 'Column' } });
  
  const colorMap = {
    slate:  { border: 'border-slate-400', bg: 'bg-slate-200/70', text: 'text-slate-600',  highlight: 'bg-slate-200/60' },
    sky:    { border: 'border-sky-500',   bg: 'bg-sky-200/50',    text: 'text-sky-700',    highlight: 'bg-sky-200/60' },
    yellow: { border: 'border-yellow-400', bg: 'bg-yellow-200/40', text: 'text-yellow-700', highlight: 'bg-yellow-200/50' },
    green:  { border: 'border-green-500', bg: 'bg-green-200/50',  text: 'text-green-700',  highlight: 'bg-green-200/60' },
    red:    { border: 'border-red-500',   bg: 'bg-red-200/50',    text: 'text-red-700',    highlight: 'bg-red-200/60' },
  };
  const ui = colorMap[column.color];

  return (
    <div className={`flex w-full shrink-0 flex-col rounded-xl border-t-4 ${ui.border} ${ui.bg} md:w-96 lg:w-[400px]`}>
      <div className="sticky top-0 z-[5] bg-inherit p-4 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-x-3">
            <column.icon className={`h-6 w-6 shrink-0 ${ui.text}`} />
            <h2 className="text-lg font-bold text-slate-800">{column.title}</h2>
          </div>
          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${ui.text} bg-white/80 ring-1 ring-inset ring-slate-200/80`}>
            {projects.length}
          </span>
        </div>
      </div>
      <div ref={setNodeRef} className={`min-h-[200px] flex-grow space-y-4 overflow-y-auto p-2 pb-4 transition-colors duration-300 ${isOver ? ui.highlight : ''}`}>
        {children}
      </div>
    </div>
  );
};

const ProjectFilterControls: React.FC<{
    searchTerm: string; onSearchTermChange: (v: string) => void;
    filterStatus: string; onFilterStatusChange: (v: string) => void;
    sortBy: string; onSortByChange: (v: string) => void;
    sortOrder: 'asc' | 'desc'; onSortOrderChange: (v: 'asc' | 'desc') => void;
}> = (props) => {
    const commonInputBase = "w-full rounded-lg border-slate-300 bg-white shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50";
    const commonLabel = "mb-1.5 block text-sm font-medium text-slate-700";

    return (
        <div className="sticky top-[68px] z-10 mb-8 rounded-xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-sm sm:top-[76px]">
            <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="relative col-span-1 sm:col-span-2 lg:col-span-1">
                    <label htmlFor="search-projects" className={commonLabel}>Search</label>
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 mt-px h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input id="search-projects" type="search" placeholder="Project name..." value={props.searchTerm} onChange={(e) => props.onSearchTermChange(e.target.value)} className={`${commonInputBase} form-input py-2 pl-10`} autoComplete="off" />
                </div>
                <div>
                    <label htmlFor="filter-status-kanban" className={commonLabel}>Status</label>
                    <div className="relative">
                        <select id="filter-status-kanban" value={props.filterStatus} onChange={(e) => props.onFilterStatusChange(e.target.value)} className={`${commonInputBase} appearance-none py-2 pl-3 pr-10`}>
                            <option value="All">All Statuses</option>
                            {KANBAN_COLUMNS.map(col => (<option key={col.id} value={col.id}>{col.title}</option>))}
                        </select>
                        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    </div>
                </div>
                <div>
                    <label htmlFor="sort-by" className={commonLabel}>Sort By</label>
                    <div className="relative">
                        <select id="sort-by" value={props.sortBy} onChange={(e) => props.onSortByChange(e.target.value)} className={`${commonInputBase} appearance-none py-2 pl-3 pr-10`}>
                            <option value="updatedAt">Last Updated</option>
                            <option value="createdAt">Date Created</option>
                            <option value="name">Project Name</option>
                        </select>
                        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    </div>
                </div>
                <div>
                    <label htmlFor="sort-order" className={commonLabel}>Order</label>
                    <div className="relative">
                        <select id="sort-order" value={props.sortOrder} onChange={(e) => props.onSortOrderChange(e.target.value as 'asc' | 'desc')} className={`${commonInputBase} appearance-none py-2 pl-3 pr-10`}>
                            <option value="desc">Descending</option>
                            <option value="asc">Ascending</option>
                        </select>
                        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- State Indicator Components ---

const LoadingState: React.FC = () => (
    <div className="flex min-h-[calc(100vh-300px)] flex-col items-center justify-center text-slate-600">
        <ArrowPathIcon className="mb-6 h-12 w-12 animate-spin text-blue-600" />
        <p className="text-xl font-semibold">Loading Projects Board</p>
        <p className="text-base text-slate-500">Please wait a moment...</p>
    </div>
);

const ErrorState: React.FC<{ message?: string; onRetry: () => void }> = ({ message, onRetry }) => (
    <div className="flex min-h-[calc(100vh-300px)] flex-col items-center justify-center rounded-lg bg-red-50 p-10 text-red-700">
        <ExclamationTriangleIcon className="mb-6 h-16 w-16 text-red-500" />
        <h2 className="mb-2 text-2xl font-semibold">Error Loading Board</h2>
        <p className="mb-8 max-w-md text-center text-red-600">{message || "An unexpected error occurred. Please try again."}</p>
        <button onClick={onRetry} className="flex items-center gap-x-2 rounded-lg bg-red-600 px-6 py-2.5 text-sm font-medium text-white shadow-md transition-colors hover:bg-red-700">
            <ArrowPathIcon className="h-5 w-5" /> Try Again
        </button>
    </div>
);

const EmptyState: React.FC<{ canCreate: boolean; onCreate: () => void }> = ({ canCreate, onCreate }) => (
    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-white px-6 py-20 text-center shadow-sm">
        <ArchiveBoxXMarkIcon className="mb-6 h-20 w-20 text-slate-400" />
        <h2 className="mb-2 text-2xl font-semibold text-slate-700">No Projects Yet</h2>
        <p className="mb-8 max-w-md text-slate-500">{canCreate ? "It's a bit empty here. Let's create your first project!" : "There are currently no projects to display."}</p>
        {canCreate && (
            <button onClick={onCreate} className="flex items-center gap-x-2 rounded-lg bg-blue-600 px-5 py-3 text-base font-semibold text-white shadow-md transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/50">
                <PlusIcon className="h-5 w-5" /> Create First Project
            </button>
        )}
    </div>
);

const NoResultsState: React.FC<{ onClear: () => void }> = ({ onClear }) => (
    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200/80 bg-white px-6 py-20 text-center shadow-sm">
        <MagnifyingGlassIcon className="mb-6 h-20 w-20 text-slate-400" />
        <h2 className="mb-2 text-2xl font-semibold text-slate-700">No Matching Projects</h2>
        <p className="mb-8 max-w-md text-slate-500">We couldn't find any projects matching your filters. Try adjusting your search.</p>
        <button onClick={onClear} className="rounded-lg bg-slate-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-700">
            Clear Filters & Search
        </button>
    </div>
);

// --- Main Page Component ---
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
            const params = new URLSearchParams({ sortBy, sortOrder });
            if (filterStatus !== 'All') params.append('status', filterStatus);
            if (debouncedSearchTerm.trim()) params.append('search', debouncedSearchTerm.trim());
            const { data } = await api.get(`/projects?${params.toString()}`);
            return data;
        },
        staleTime: 30_000,
        refetchOnWindowFocus: true,
    });
    
    useEffect(() => { if (projects) setLocalProjects(Array.from(new Map(projects.map(p => [p.id, p])).values())); }, [projects]);

    useEffect(() => {
        const handleProjectChange = () => { queryClient.invalidateQueries({ queryKey: ['projects'] }); };
        socket.on('projectCreated', handleProjectChange); socket.on('projectUpdated', handleProjectChange); socket.on('projectDeleted', handleProjectChange);
        return () => { socket.off('projectCreated'); socket.off('projectUpdated'); socket.off('projectDeleted'); };
    }, [queryClient]);

    const updateProjectStatusMutation = useMutation({
        mutationFn: ({ projectId, status }: { projectId: string; status: ProjectStatus }) => api.patch(`/projects/${projectId}`, { status }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
    });

    const deleteProjectMutation = useMutation({
        mutationFn: (projectId: string) => api.delete(`/projects/${projectId}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            setIsConfirmDeleteDialogOpen(false); setProjectToDelete(null);
        },
        onError: (err: any) => alert(`Failed to delete project: ${err.response?.data?.message || err.message}`),
    });

    const openDeleteConfirmDialog = useCallback((project: Project) => { setProjectToDelete(project); setIsConfirmDeleteDialogOpen(true); }, []);
    const handleConfirmDelete = useCallback(() => { if (projectToDelete) deleteProjectMutation.mutate(projectToDelete.id); }, [projectToDelete, deleteProjectMutation]);
    const handleEditProject = useCallback((project: Project) => { setSelectedProject(project); setIsEditModalOpen(true); }, []);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 10 } }));
    const handleDragStart = (event: DragStartEvent) => { if (event.active.data.current?.type === 'Project') setActiveProject(event.active.data.current.project); };
    const handleDragOver = (event: DragOverEvent) => setOverColumnId(event.over?.data.current?.type === 'Column' ? (event.over.id as string) : null);
    const handleDragEnd = (event: DragEndEvent) => {
        setActiveProject(null); setOverColumnId(null);
        const { active, over } = event;
        if (!over || active.id === over.id || active.data.current?.type !== 'Project') return;
        if (over.data.current?.type === 'Column') {
            const projectId = active.id as string;
            const project = localProjects.find(p => p.id === projectId);
            const newStatus = over.id as ProjectStatus;
            if (project && project.status !== newStatus) {
                const optimisticOldState = [...localProjects];
                setLocalProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: newStatus } : p));
                updateProjectStatusMutation.mutate({ projectId, status: newStatus }, { onError: () => setLocalProjects(optimisticOldState) });
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

    const activeColumns = useMemo(() => filterStatus === 'All' ? KANBAN_COLUMNS : KANBAN_COLUMNS.filter(col => col.id === filterStatus), [filterStatus]);
    const clearFiltersAndSearch = () => {
        setFilterStatus('All'); setSearchTerm(''); setDebouncedSearchTerm('');
        setSortBy('updatedAt'); setSortOrder('desc');
    };

    const renderKanbanBoard = () => {
        if (!projects && isLoading) return <LoadingState />;
        if (!projects && isError) return <ErrorState message={error?.message} onRetry={refetch} />;
        if (projects?.length === 0 && filterStatus === 'All' && !debouncedSearchTerm) return <EmptyState canCreate={!!canCreateProject} onCreate={() => setIsCreateModalOpen(true)} />;
        if (localProjects.length === 0) return <NoResultsState onClear={clearFiltersAndSearch} />;
        
        return (
            <div className="flex min-w-full gap-x-6 overflow-x-auto pb-4">
                {activeColumns.map(column => {
                    const columnProjects = groupedProjects[column.id] || [];
                    const projectIds = columnProjects.map(p => p.id);
                    return (
                        <ProjectKanbanColumn key={column.id} column={column} projects={columnProjects} isOver={overColumnId === column.id}>
                            <SortableContext items={projectIds} id={column.id} strategy={verticalListSortingStrategy}>
                                {columnProjects.length > 0 ? (
                                    columnProjects.map(project => (
                                        <ProjectCard key={project.id} project={project} canEdit={canEditOrDeleteProject(project)} onEdit={() => handleEditProject(project)} onDelete={() => openDeleteConfirmDialog(project)} />
                                    ))
                                ) : (
                                    <div className="px-4 py-10 text-center">
                                        <ListBulletIcon className="mx-auto mb-2 h-12 w-12 text-slate-400/60" />
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
            <div className="min-h-screen bg-slate-100 text-slate-900">
                <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-sm">
                    <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center gap-x-3">
                                <BriefcaseIcon className="h-8 w-8 text-blue-600" />
                                <h1 className="text-2xl font-bold tracking-tight text-slate-800">Projects Board</h1>
                            </div>
                            {canCreateProject && (
                                <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-x-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/50">
                                    <PlusIcon className="h-5 w-5" /> New Project
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6 md:py-8 lg:px-8">
                    <ProjectFilterControls searchTerm={searchTerm} onSearchTermChange={setSearchTerm} filterStatus={filterStatus} onFilterStatusChange={setFilterStatus} sortBy={sortBy} onSortByChange={setSortBy} sortOrder={sortOrder} onSortOrderChange={setSortOrder} />
                    {renderKanbanBoard()}
                </main>

                {isCreateModalOpen && <CreateProjectForm onClose={() => setIsCreateModalOpen(false)} />}
                {isEditModalOpen && selectedProject && <EditProjectForm project={selectedProject} onClose={() => { setIsEditModalOpen(false); setSelectedProject(null); }} />}
                {projectToDelete && <ConfirmDeleteDialog isOpen={isConfirmDeleteDialogOpen} onClose={() => { setIsConfirmDeleteDialogOpen(false); setProjectToDelete(null); }} onConfirm={handleConfirmDelete} title="Confirm Project Deletion" message="Are you sure you want to permanently delete this project and all its tasks? This action cannot be undone." itemName={projectToDelete.name} isDeleting={deleteProjectMutation.isPending}/>}
            </div>

            <DragOverlay>
                {activeProject ? (
                    <div style={{ transform: 'rotate(2deg)' }}>
                        <ProjectCard project={activeProject} canEdit={canEditOrDeleteProject(activeProject)} onEdit={() => handleEditProject(activeProject)} onDelete={() => openDeleteConfirmDialog(activeProject)} isOverlay={true} />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};

export default ProjectsPage;