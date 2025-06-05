import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import CreateTaskForm from '../components/tasks/CreateTaskForm';
import EditTaskForm from '../components/tasks/EditTaskForm';
import ConfirmDeleteDialog from '../components/common/ConfirmDeleteDialog';

import {
  ArrowLeftIcon,
  BriefcaseIcon,
  UserCircleIcon,
  CalendarDaysIcon,
  ClockIcon,
  TagIcon,
  FlagIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  NoSymbolIcon,
  BoltIcon, // For In Progress
  ListBulletIcon,
  ArchiveBoxXMarkIcon
} from '@heroicons/react/24/outline';

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Blocked';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator?: { id: string; username: string; email: string; role: string; };
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'To Do' | 'In Progress' | 'Done' | 'Blocked';
  priority: 'Low' | 'Medium' | 'High';
  deadline?: string;
  projectId: string;
  assignedTo?: string | null;
  reportedBy: string;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string; status: string; };
  assignee?: { id: string; username: string; email: string; role: string; };
  reporter?: { id: string; username: string; email: string; role: string; };
}

const socket = io(import.meta.env.VITE_API_BASE_URL.replace('/api', ''));

const getProjectStatusStyles = (status: Project['status']) => {
  switch (status) {
    case 'Completed':
      return 'bg-green-100 text-green-700 border-green-300';
    case 'In Progress':
      return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'Blocked':
      return 'bg-red-100 text-red-700 border-red-300';
    case 'Not Started':
    default:
      return 'bg-slate-100 text-slate-600 border-slate-300';
  }
};

const getTaskStatusStyles = (status: Task['status']) => {
  switch (status) {
    case 'Done':
      return 'bg-green-100 text-green-700';
    case 'In Progress':
      return 'bg-sky-100 text-sky-700';
    case 'Blocked':
      return 'bg-red-100 text-red-700';
    case 'To Do':
    default:
      return 'bg-slate-100 text-slate-600';
  }
};

const getTaskPriorityStyles = (priority: Task['priority']) => {
  switch (priority) {
    case 'High':
      return 'bg-red-100 text-red-700';
    case 'Medium':
      return 'bg-amber-100 text-amber-700';
    case 'Low':
    default:
      return 'bg-emerald-100 text-emerald-600';
  }
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

  const { data: project, isLoading: isProjectLoading, isError: isProjectError, error: projectError } = useQuery<Project, Error>({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is missing.');
      const response = await api.get(`/projects/${projectId}`);
      return response.data;
    },
    enabled: !!projectId,
    staleTime: 60000,
  });

  const { data: tasks, isLoading: isTasksLoading, isError: isTasksError, error: tasksError } = useQuery<Task[], Error>({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is missing.');
      const response = await api.get(`/tasks?projectId=${projectId}`);
      return response.data;
    },
    enabled: !!projectId,
    staleTime: 30000,
  });

  useEffect(() => {
    if (!projectId) return;
    socket.emit('joinProject', projectId);
    const handleTaskEvent = (_event: string, _taskData: Task | { id: string; projectId: string }) => {
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    };
    socket.on('taskCreated', (task: Task) => handleTaskEvent('taskCreated', task));
    socket.on('taskUpdated', (task: Task) => handleTaskEvent('taskUpdated', task));
    socket.on('taskDeleted', (task: { id: string; projectId: string }) => handleTaskEvent('taskDeleted', task));
    return () => {
      socket.emit('leaveProject', projectId);
      socket.off('taskCreated');
      socket.off('taskUpdated');
      socket.off('taskDeleted');
    };
  }, [projectId, queryClient]);

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await api.delete(`/tasks/${taskId}`);
    },
    onSuccess: () => {
      setIsConfirmDeleteDialogOpen(false);
      setTaskToDelete(null);
    },
    onError: (error: any) => {
      console.error('Delete task error:', error);
      alert(`Failed to delete task: ${error.response?.data?.message || error.message}`);
      setIsConfirmDeleteDialogOpen(false);
      setTaskToDelete(null);
    },
  });

  const openDeleteConfirmDialogForTask = useCallback((task: Task) => {
    setTaskToDelete(task);
    setIsConfirmDeleteDialogOpen(true);
  }, []);

  const handleConfirmTaskDelete = useCallback(() => {
    if (taskToDelete) {
      deleteTaskMutation.mutate(taskToDelete.id);
    }
  }, [taskToDelete, deleteTaskMutation]);

  const canCreateTask = user && ['Admin', 'Project Manager', 'Developer'].includes(user.role);
  const canEditTask = (task: Task) => user && (
    ['Admin', 'Project Manager'].includes(user.role) ||
    (task.assignedTo === user.id && user.role === 'Developer') ||
    (task.reportedBy === user.id)
  );
  const canDeleteTask = (task: Task) => user && (
    ['Admin', 'Project Manager'].includes(user.role) ||
    (task.reportedBy === user.id)
  );

  const isLoading = isProjectLoading || (isTasksLoading && !tasks); // Show loading if project is loading or tasks are loading initially
  const isError = isProjectError || (isTasksError && !tasks); // Show error if project errored or tasks errored initially
  const combinedError = projectError || tasksError;

  if (isLoading) return (
    <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center text-slate-600">
        <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-lg font-medium">Loading Project Details...</p>
    </div>
  );

  if (isError) return (
    <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center text-red-600 bg-red-50 p-8 rounded-lg">
        <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-xl font-semibold mb-2">Error Loading Project</p>
        <p className="text-sm text-red-700 text-center mb-4">{combinedError?.message || "An unexpected error occurred."}</p>
         <button 
          onClick={() => queryClient.refetchQueries({ queryKey: ['project', projectId] })}
          className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-md hover:bg-red-600 transition-colors"
        >
          Try Again
        </button>
    </div>
  );
  if (!project) return (
    <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center text-slate-600">
        <BriefcaseIcon className="h-12 w-12 text-slate-400 mb-4" />
        <p className="text-xl font-semibold mb-2">Project Not Found</p>
        <p className="text-sm text-slate-500">The project you are looking for does not exist or you may not have access.</p>
        <Link to="/dashboard/projects" className="mt-4 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors">
          Go Back to Projects
        </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 selection:bg-blue-500 selection:text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <Link 
          to="/dashboard/projects" 
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-md transition-colors mb-6 sm:mb-8 group"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2 transform transition-transform group-hover:-translate-x-0.5" />
          Back to Projects
        </Link>

        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-xl mb-8 md:mb-10">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">{project.name}</h1>
              <p className="text-slate-600 text-base mb-5 max-w-3xl">{project.description || 'No description provided for this project.'}</p>
            </div>
            <div className={`flex-shrink-0 mt-4 md:mt-0 md:ml-6 inline-flex items-center px-3.5 py-1.5 rounded-full text-sm font-semibold border ${getProjectStatusStyles(project.status)}`}>
              {project.status === 'Completed' && <CheckCircleIcon className="h-5 w-5 mr-1.5" />}
              {project.status === 'In Progress' && <BoltIcon className="h-5 w-5 mr-1.5" />}
              {project.status === 'Blocked' && <NoSymbolIcon className="h-5 w-5 mr-1.5" />}
              {project.status === 'Not Started' && <ListBulletIcon className="h-5 w-5 mr-1.5" />}
              {project.status}
            </div>
          </div>
          <div className="mt-5 pt-5 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm text-slate-500">
            <div className="flex items-center">
              <UserCircleIcon className="h-5 w-5 mr-2 text-slate-400" />
              <span>Created by: <span className="font-medium text-slate-700">{project.creator?.username || 'N/A'}</span></span>
            </div>
            <div className="flex items-center">
              <CalendarDaysIcon className="h-5 w-5 mr-2 text-slate-400" />
              <span>Created: <span className="font-medium text-slate-700">{new Date(project.createdAt).toLocaleDateString()}</span></span>
            </div>
             <div className="flex items-center">
              <ClockIcon className="h-5 w-5 mr-2 text-slate-400" />
              <span>Last Updated: <span className="font-medium text-slate-700">{new Date(project.updatedAt).toLocaleDateString()}</span></span>
            </div>
          </div>
        </div>

        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Tasks</h2>
          {canCreateTask && (
            <button
              onClick={() => setIsCreateTaskModalOpen(true)}
              className="flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-100 transition-colors duration-150 ease-in-out text-sm font-medium"
            >
              <PlusIcon className="h-5 w-5 mr-2 -ml-1" />
              Create New Task
            </button>
          )}
        </header>

        {isTasksLoading && tasks && (
          <div className="text-center text-sm text-slate-500 mb-4 py-2">Refreshing tasks...</div>
        )}
        {isTasksError && tasks && (
           <div className="text-center text-sm text-red-500 mb-4 py-2 bg-red-50 rounded-md">
            <ExclamationTriangleIcon className="inline h-4 w-4 mr-1" />
            Could not refresh tasks. Displaying cached data.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {tasks?.length === 0 ? (
            <div className="lg:col-span-2 xl:col-span-3 text-center py-16 flex flex-col items-center justify-center bg-white rounded-xl shadow-md">
              <ArchiveBoxXMarkIcon className="h-16 w-16 text-slate-400 mb-4" />
              <p className="text-xl font-medium text-slate-600 mb-1">No Tasks Yet</p>
              <p className="text-slate-500">
                {canCreateTask ? "Be the first to add a task to this project!" : "There are currently no tasks assigned to this project."}
              </p>
            </div>
          ) : (
            tasks?.map((task) => (
              <div key={task.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl border border-slate-200/80 transition-all duration-300 ease-in-out flex flex-col overflow-hidden">
                <div className="p-5 sm:p-6 flex-grow">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold text-slate-800 line-clamp-2 break-words">{task.title}</h3>
                    {(canEditTask(task) || canDeleteTask(task)) && (
                      <div className="flex-shrink-0 flex space-x-1.5">
                        {canEditTask(task) && (
                          <button
                            onClick={() => { setSelectedTask(task); setIsEditTaskModalOpen(true); }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                            title="Edit Task"
                          >
                            <PencilSquareIcon className="h-5 w-5" />
                          </button>
                        )}
                        {canDeleteTask(task) && (
                          <button
                            onClick={() => openDeleteConfirmDialogForTask(task)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                            title="Delete Task"
                            disabled={deleteTaskMutation.isPending && deleteTaskMutation.variables === task.id}
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-slate-600 text-sm mb-4 line-clamp-3">{task.description || 'No description provided.'}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getTaskStatusStyles(task.status)}`}>
                      {task.status === 'Done' && <CheckCircleIcon className="h-3.5 w-3.5 mr-1" />}
                      {task.status === 'In Progress' && <BoltIcon className="h-3.5 w-3.5 mr-1" />}
                      {task.status === 'Blocked' && <NoSymbolIcon className="h-3.5 w-3.5 mr-1" />}
                      {task.status === 'To Do' && <ListBulletIcon className="h-3.5 w-3.5 mr-1" />}
                      {task.status}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getTaskPriorityStyles(task.priority)}`}>
                      <FlagIcon className="h-3.5 w-3.5 mr-1" />
                      {task.priority}
                    </span>
                  </div>
                </div>
                <div className="px-5 sm:px-6 py-4 bg-slate-50 border-t border-slate-200/80 text-xs text-slate-500 space-y-1.5">
                  <div className="flex items-center">
                    <UserCircleIcon className="h-4 w-4 mr-1.5 text-slate-400" />
                    Assignee: <span className="font-medium text-slate-600 ml-1">{task.assignee?.username || 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center">
                    <TagIcon className="h-4 w-4 mr-1.5 text-slate-400" />
                    Reporter: <span className="font-medium text-slate-600 ml-1">{task.reporter?.username || 'N/A'}</span>
                  </div>
                  {task.deadline && (
                    <div className="flex items-center">
                      <CalendarDaysIcon className="h-4 w-4 mr-1.5 text-slate-400" />
                      Deadline: <span className="font-medium text-slate-600 ml-1">{new Date(task.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isCreateTaskModalOpen && project && (
         <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" aria-hidden="true" />
      )}
      {isCreateTaskModalOpen && project && (
        <CreateTaskForm
          projectId={project.id}
          onClose={() => setIsCreateTaskModalOpen(false)}
        />
      )}

      {isEditTaskModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" aria-hidden="true" />
      )}
      {isEditTaskModalOpen && selectedTask && (
        <EditTaskForm
          task={selectedTask}
          onClose={() => { setIsEditTaskModalOpen(false); setSelectedTask(null); }}
        />
      )}

      {taskToDelete && (
        <ConfirmDeleteDialog
            isOpen={isConfirmDeleteDialogOpen}
            onClose={() => { setIsConfirmDeleteDialogOpen(false); setTaskToDelete(null); }}
            onConfirm={handleConfirmTaskDelete}
            title="Confirm Task Deletion"
            message="Are you sure you want to delete this task? This action cannot be undone."
            itemName={taskToDelete.title}
            isDeleting={deleteTaskMutation.isPending}
        />
      )}
    </div>
  );
};

export default ProjectDetailPage;