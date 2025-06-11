import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import tinycolor from 'tinycolor2';
import { io } from 'socket.io-client';

import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import CreateTaskForm from '../components/tasks/CreateTaskForm';
import EditTaskForm from '../components/tasks/EditTaskForm';
import ConfirmDeleteDialog from '../components/common/ConfirmDeleteDialog';

import {
  DndContext, PointerSensor, useSensor, useSensors, useDroppable,
  type DragEndEvent, type DragOverEvent, type DragStartEvent, DragOverlay
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import {
  ArrowLeftIcon, FlagIcon, PlusIcon, PencilSquareIcon, TrashIcon, ExclamationTriangleIcon,
  ArchiveBoxXMarkIcon, ArrowPathIcon, CalendarDaysIcon, ListBulletIcon,
  // === DESIGN PRINCIPLE: SYSTEMATIC APPROACH & AFFORDANCES ===
  // Importing specific, universally understood icons for each column status.
  ClipboardDocumentListIcon, Cog8ToothIcon, CheckCircleIcon, NoSymbolIcon
} from '@heroicons/react/24/outline';
import { UserIcon } from '@heroicons/react/24/solid';

interface Project { id: string; name: string; description: string; }
interface Task {
  id: string; title: string; description?: string; status: 'To Do' | 'In Progress' | 'Done' | 'Blocked';
  priority: 'Low' | 'Medium' | 'High'; deadline?: string; projectId: string;
  reportedBy: string; createdAt: string; updatedAt: string;
  assignee?: { id: string; username: string; };
  reporter?: { id: string; username: string; };
}
type TaskStatus = Task['status'];

// === DESIGN PRINCIPLE: SYSTEMATIC APPROACH ===
// Icons are now part of the column configuration, creating a single source of truth.
// This makes the design system more robust and easier to maintain.
const TASK_KANBAN_COLUMNS = [
    { id: 'To Do', title: 'To Do', color: 'slate', icon: ClipboardDocumentListIcon },
    { id: 'In Progress', title: 'In Progress', color: 'sky', icon: Cog8ToothIcon },
    { id: 'Done', title: 'Done', color: 'green', icon: CheckCircleIcon },
    { id: 'Blocked', title: 'Blocked', color: 'red', icon: NoSymbolIcon },
] as const;

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL.replace('/api', '');
const socket = io(SOCKET_URL);

const getAvatarColor = (name: string) => {
    const color = tinycolor(name).saturate(20).darken(10);
    return {
      backgroundColor: color.toHexString(),
      color: tinycolor.mostReadable(color, ['#ffffff', '#808080'])?.toHexString() || '#ffffff',
    };
};

const UserAvatar: React.FC<{ user?: { username: string } }> = ({ user }) => {
    if (!user?.username) {
        return (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200" title="Unassigned">
                <UserIcon className="h-5 w-5 text-slate-500" />
            </div>
        );
    }
    const { backgroundColor, color } = getAvatarColor(user.username);
    return (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ backgroundColor, color }} title={user.username}>
            {user.username.charAt(0).toUpperCase()}
        </div>
    );
};

const PriorityBadge: React.FC<{ priority: Task['priority'] }> = ({ priority }) => {
    const styles: Record<Task['priority'], string> = {
        High: 'bg-red-100 text-red-800 ring-1 ring-inset ring-red-200',
        Medium: 'bg-yellow-100 text-yellow-800 ring-1 ring-inset ring-yellow-200',
        Low: 'bg-green-100 text-green-800 ring-1 ring-inset ring-green-200',
    };
    return (
        <div className={`flex items-center gap-x-1.5 rounded-full px-2 py-1 text-xs font-medium ${styles[priority]}`}>
            <FlagIcon className="h-3.5 w-3.5" />
            {priority}
        </div>
    );
};

const TaskCard: React.FC<{
  task: Task; canEdit: boolean; canDelete: boolean;
  onEdit: () => void; onDelete: () => void; isOverlay?: boolean;
}> = ({ task, canEdit, canDelete, onEdit, onDelete, isOverlay = false }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: task.id,
      data: { type: 'Task', task },
  });
  
  const style = { transform: CSS.Translate.toString(transform), transition: isOverlay ? 'none' : transition };

  if (isDragging) {
    return <div ref={setNodeRef} style={style} className="h-[178px] rounded-xl border-2 border-dashed border-slate-300 bg-slate-200/50" />;
  }
  
  const cardClasses = `bg-white rounded-xl shadow-sm hover:shadow-md border border-slate-200/80 transition-all duration-200 group relative ${isOverlay ? 'shadow-xl cursor-grabbing scale-[1.03]' : 'cursor-grab hover:-translate-y-0.5'}`;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={cardClasses}>
      <div className="flex h-full flex-col p-4">
        <div className="mb-2 flex items-start justify-between">
            <h4 className="pr-14 font-semibold text-slate-800 line-clamp-2">{task.title}</h4>
            {(canEdit || canDelete) && (
              <div className="absolute right-3 top-3 z-10 flex space-x-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  {canEdit && <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-blue-100 hover:text-blue-600" title="Edit Task"><PencilSquareIcon className="h-4 w-4"/></button>}
                  {canDelete && <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-red-100 hover:text-red-600" title="Delete Task"><TrashIcon className="h-4 w-4"/></button>}
              </div>
            )}
        </div>
        <p className="mb-4 flex-grow text-sm text-slate-500">{task.description}</p>
        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
            <div className="flex items-center space-x-2">
                 <div title={`Assignee: ${task.assignee?.username || 'Unassigned'}`}>
                    <UserAvatar user={task.assignee} />
                </div>
                 <div title={`Reporter: ${task.reporter?.username || 'N/A'}`}>
                    <UserAvatar user={task.reporter} />
                </div>
            </div>
            <div className="flex items-center space-x-4">
                {task.deadline && (
                    <div className="flex items-center gap-x-1.5 text-sm text-slate-600" title={`Deadline: ${new Date(task.deadline).toLocaleDateString()}`}>
                        <CalendarDaysIcon className="h-4 w-4 text-slate-400" />
                        <span>{new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                )}
                <PriorityBadge priority={task.priority} />
            </div>
        </div>
      </div>
    </div>
  );
};

const TaskColumn: React.FC<{
    column: (typeof TASK_KANBAN_COLUMNS)[number];
    tasks: Task[];
    isOver: boolean;
    children: React.ReactNode;
}> = ({ column, tasks, isOver, children }) => {
    const { setNodeRef } = useDroppable({ id: column.id, data: { type: 'Column' } });
    const colorMap = {
        slate:  { border: 'border-slate-500', bg: 'bg-slate-200/70', text: 'text-slate-600',  highlight: 'bg-slate-200/60' },
        sky:    { border: 'border-sky-500',   bg: 'bg-sky-100/50',    text: 'text-sky-700',    highlight: 'bg-sky-200/60' },
        green:  { border: 'border-green-500', bg: 'bg-green-100/50',  text: 'text-green-700',  highlight: 'bg-green-200/60' },
        red:    { border: 'border-red-500',   bg: 'bg-red-100/50',    text: 'text-red-700',    highlight: 'bg-red-200/60' },
    };
    const ui = colorMap[column.color];
    // === DESIGN PRINCIPLE: SYSTEMATIC APPROACH ===
    // Retrieving the icon component directly from the column configuration prop.
    const IconComponent = column.icon;

    return (
        <div className={`flex w-full shrink-0 flex-col rounded-xl border-t-4 ${ui.border} ${ui.bg} md:w-80 lg:w-[340px]`}>
            <div className="sticky top-0 z-[5] bg-inherit p-4 rounded-t-xl">
                <div className="flex items-center justify-between">
                    {/* === DESIGN PRINCIPLE: HIERARCHY, SPACING & 5-SECOND RULE ===
                        - An outer div groups the icon and title.
                        - `items-center` ensures vertical alignment.
                        - `gap-x-3` provides consistent 12px spacing (adhering to 4pt/8pt grid).
                        - The icon appears first, aiding rapid visual scanning (F-Pattern).
                        - The icon's color is tied to the column theme for visual cohesion.
                    */}
                    <div className="flex items-center gap-x-3">
                      <IconComponent className={`h-6 w-6 shrink-0 ${ui.text}`} aria-hidden="true" />
                      <h3 className="text-lg font-semibold text-slate-800">{column.title}</h3>
                    </div>
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${ui.text} bg-white/80 ring-1 ring-inset ring-slate-200/80`}>{tasks.length}</span>
                </div>
            </div>
            <div ref={setNodeRef} className={`min-h-[200px] flex-grow space-y-4 overflow-y-auto p-2 pb-4 transition-colors duration-300 ${isOver ? ui.highlight : ''}`}>
                {children}
                {tasks.length === 0 && (
                     <div className="flex h-full items-center justify-center">
                        <div className="px-4 py-10 text-center">
                            <ListBulletIcon className="mx-auto mb-2 h-12 w-12 text-slate-400/60" />
                            <p className="text-sm text-slate-500">No tasks here.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  useEffect(() => {
    if (alertMessage) {
      const timer = setTimeout(() => {
        setAlertMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [alertMessage]);

  const { data: project, isLoading: isProjectLoading, isError: isProjectError, error: projectError } = useQuery<Project, Error>({
    queryKey: ['project', projectId],
    queryFn: async () => { if (!projectId) throw new Error('Project ID is missing.'); const { data } = await api.get(`/projects/${projectId}`); return data; },
    enabled: !!projectId,
  });

  const { data: tasks, isLoading: isTasksLoading } = useQuery<Task[], Error>({
    queryKey: ['tasks', projectId],
    queryFn: async () => { if (!projectId) throw new Error('Project ID is missing.'); const { data } = await api.get(`/tasks?projectId=${projectId}&sortBy=updatedAt&sortOrder=desc`); return data; },
    enabled: !!projectId,
  });

  useEffect(() => { if (tasks) setActiveTasks(tasks); }, [tasks]);

  const tasksByStatus = useMemo(() => {
    const initial = TASK_KANBAN_COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: [] }), {} as Record<TaskStatus, Task[]>);
    return activeTasks.reduce((acc, task) => {
        if (task?.status && acc[task.status]) acc[task.status].push(task);
        return acc;
    }, initial);
  }, [activeTasks]);

  useEffect(() => {
    if (!projectId) return;
    socket.emit('joinProject', projectId);
    const handleTaskEvent = () => queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    socket.on('taskCreated', handleTaskEvent); socket.on('taskUpdated', handleTaskEvent); socket.on('taskDeleted', handleTaskEvent);
    return () => { socket.emit('leaveProject', projectId); socket.off('taskCreated'); socket.off('taskUpdated'); socket.off('taskDeleted'); };
  }, [projectId, queryClient]);

  const updateTaskStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) => api.patch(`/tasks/${taskId}`, { status }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => api.delete(`/tasks/${taskId}`),
    onSuccess: () => { setIsConfirmDeleteDialogOpen(false); setTaskToDelete(null); },
    onError: (error: any) => alert(`Failed to delete task: ${error.response?.data?.message || error.message}`),
  });

  const handleEditTask = useCallback((task: Task) => { setSelectedTask(task); setIsEditTaskModalOpen(true); }, []);
  const openDeleteConfirmDialogForTask = useCallback((task: Task) => { setTaskToDelete(task); setIsConfirmDeleteDialogOpen(true); }, []);
  const handleConfirmTaskDelete = useCallback(() => { if (taskToDelete) deleteTaskMutation.mutate(taskToDelete.id); }, [taskToDelete, deleteTaskMutation]);

  const canCreateTask = useMemo(() => !!(user && ['Admin', 'Project Manager', 'Developer'].includes(user.role)), [user]);
  const canEditTask = useCallback((task: Task) => !!(user && (['Admin', 'Project Manager'].includes(user.role) || task.assignee?.id === user.id || task.reporter?.id === user.id)), [user]);
  const canDeleteTask = useCallback((task: Task) => !!(user && (['Admin', 'Project Manager'].includes(user.role) || task.reporter?.id === user.id)), [user]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const handleDragStart = (event: DragStartEvent) => { if (event.active.data.current?.type === 'Task') setActiveTask(event.active.data.current.task); };
  const handleDragOver = (event: DragOverEvent) => setOverColumnId(event.over?.data.current?.type === 'Column' ? (event.over.id as string) : null);
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveTask(null);
    setOverColumnId(null);
    const { active, over } = event;
    
    if (!over || active.data.current?.type !== 'Task' || !user) return;
    
    const task = active.data.current.task as Task;
    const canDragTask = ['Admin', 'Project Manager'].includes(user.role) || task?.assignee?.id === user.id;

    if (!canDragTask) {
        setAlertMessage("you have no permission to do this");
        return;
    }

    if (over.data.current?.type === 'Column') {
        const taskId = active.id as string;
        const newStatus = over.id as TaskStatus;
        if (task && task.status !== newStatus) {
            const optimisticOldState = [...activeTasks];
            setActiveTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
            updateTaskStatusMutation.mutate({ taskId, status: newStatus }, { onError: () => setActiveTasks(optimisticOldState) });
        }
    }
  }, [activeTasks, updateTaskStatusMutation, user]);
  const handleDragCancel = () => { setActiveTask(null); setOverColumnId(null); };

  if (isProjectLoading || isTasksLoading) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center text-slate-600">
            <ArrowPathIcon className="mb-4 h-10 w-10 animate-spin text-blue-600" />
            <p className="text-lg font-semibold">Loading Project Board...</p>
        </div>
    </div>
  );

  if (isProjectError || !project) return (
    <div className="flex min-h-screen items-center justify-center bg-red-50 p-4">
        <div className="flex flex-col items-center text-center text-red-700">
            <ExclamationTriangleIcon className="mb-4 h-12 w-12 text-red-500" />
            <h1 className="mb-2 text-xl font-semibold">Error Loading Project</h1>
            <p className="mb-6 text-base text-red-600">{projectError?.message || "The project could not be found or you don't have permission to view it."}</p>
            <Link to="/dashboard/projects" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-red-50">
                Back to Projects
            </Link>
        </div>
    </div>
  );

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
        {alertMessage && (
            <div role="alert" className="fixed top-24 right-6 z-50 flex items-center gap-x-3 rounded-md border-l-4 border-yellow-400 bg-yellow-50 p-4 shadow-lg">
                <ExclamationTriangleIcon className="h-6 w-6 shrink-0 text-yellow-500" />
                <p className="text-sm font-medium text-yellow-800">
                    {alertMessage}
                </p>
            </div>
        )}
        <div className="min-h-screen bg-slate-100 text-slate-900">
            <main className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
                <Link to="/dashboard/projects" className="group mb-8 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800">
                    <ArrowLeftIcon className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    Back to All Projects
                </Link>
                
                <div className="mb-10 rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
                    <h1 className="mb-1 text-4xl font-extrabold tracking-tight text-slate-900">{project.name}</h1>
                    <p className="max-w-4xl text-base text-slate-600">{project.description}</p>
                </div>

                <header className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-2xl font-bold text-slate-900">Task Board</h2>
                    {canCreateTask && (
                        <button onClick={() => setIsCreateTaskModalOpen(true)} className="flex items-center gap-x-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/50">
                            <PlusIcon className="h-5 w-5" />
                            Create Task
                        </button>
                    )}
                </header>

                <div className="flex min-w-full gap-x-6 overflow-x-auto pb-4">
                    {TASK_KANBAN_COLUMNS.map(column => {
                        const columnTasks = tasksByStatus[column.id] || [];
                        const taskIds = columnTasks.map(t => t.id);
                        return (
                            <TaskColumn key={column.id} column={column} tasks={columnTasks} isOver={overColumnId === column.id}>
                                <SortableContext items={taskIds} id={column.id} strategy={verticalListSortingStrategy}>
                                    {columnTasks.map(task => (
                                        <TaskCard key={task.id} task={task} canEdit={canEditTask(task)} canDelete={canDeleteTask(task)} onEdit={() => handleEditTask(task)} onDelete={() => openDeleteConfirmDialogForTask(task)} />
                                    ))}
                                </SortableContext>
                            </TaskColumn>
                        )
                    })}
                </div>
                
                {tasks?.length === 0 && !isTasksLoading && (
                    <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/50 py-20 text-center">
                        <ArchiveBoxXMarkIcon className="mb-4 h-16 w-16 text-slate-400" />
                        <p className="mb-1 text-xl font-medium text-slate-700">No Tasks Yet</p>
                        <p className="text-slate-500">
                            {canCreateTask ? "Get started by creating the first task for this project." : "There are currently no tasks for this project."}
                        </p>
                    </div>
                )}
            </main>

            {isCreateTaskModalOpen && <CreateTaskForm projectId={project.id} onClose={() => setIsCreateTaskModalOpen(false)} />}
            {isEditTaskModalOpen && selectedTask && <EditTaskForm task={selectedTask} onClose={() => { setIsEditTaskModalOpen(false); setSelectedTask(null); }} />}
            {taskToDelete && <ConfirmDeleteDialog isOpen={isConfirmDeleteDialogOpen} onClose={() => setIsConfirmDeleteDialogOpen(false)} onConfirm={handleConfirmTaskDelete} title="Confirm Task Deletion" message="Are you sure you want to delete this task? This action cannot be undone." itemName={taskToDelete.title} isDeleting={deleteTaskMutation.isPending} />}
        </div>
        <DragOverlay>
            {activeTask ? (
                <div style={{ transform: 'rotate(2deg)' }}>
                    <TaskCard task={activeTask} canEdit={canEditTask(activeTask)} canDelete={canDeleteTask(activeTask)} onEdit={() => {}} onDelete={() => {}} isOverlay={true} />
                </div>
            ) : null}
        </DragOverlay>
    </DndContext>
  );
};

export default ProjectDetailPage;