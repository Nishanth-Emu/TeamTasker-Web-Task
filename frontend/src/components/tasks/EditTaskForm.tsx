import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../../api/axios';
import {
  XMarkIcon,
  ExclamationCircleIcon,
  PencilSquareIcon as FormTitleIcon,
  PencilIcon,
  Bars3BottomLeftIcon,
  ListBulletIcon,
  FlagIcon,
  CalendarDaysIcon,
  UserCircleIcon,
  BriefcaseIcon,
} from '@heroicons/react/24/outline';

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
}

interface User {
  id: string;
  username: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
}

interface EditTaskFormProps {
  task: Task;
  onClose: () => void;
}

const editTaskSchema = z.object({
  title: z.string().min(3, 'Task title must be at least 3 characters long.').optional(),
  description: z.string().optional(),
  status: z.enum(['To Do', 'In Progress', 'Done', 'Blocked']).optional(),
  priority: z.enum(['Low', 'Medium', 'High']).optional(),
  deadline: z.string()
    .optional()
    .refine(val => !val || val.trim() === '' || !isNaN(Date.parse(val)), {
      message: "Invalid date format. Please use YYYY-MM-DD or leave empty."
    })
    .transform(val => val && val.trim() !== '' ? new Date(val).toISOString().split('T')[0] : undefined),
  assignedTo: z.string()
    .optional()
    .nullable()
    .transform(val => (val === "" || val === null) ? null : val),
  projectId: z.string().optional(),
});

type EditTaskInputs = z.infer<typeof editTaskSchema>;

const EditTaskForm: React.FC<EditTaskFormProps> = ({ task, onClose }) => {
  const queryClient = useQueryClient();

  const { data: projects, isLoading: areProjectsLoading, isError: isProjectsError } = useQuery<Project[], Error>({
    queryKey: ['allProjectsListForEditTask'],
    queryFn: async () => {
      const response = await api.get('/projects');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: users, isLoading: areUsersLoading, isError: isUsersError } = useQuery<User[], Error>({
    queryKey: ['usersListForEditTask'],
    queryFn: async () => {
      const response = await api.get('/users');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<EditTaskInputs>({
    resolver: zodResolver(editTaskSchema),
    defaultValues: {
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      deadline: task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : undefined,
      assignedTo: task.assignedTo || '',
      projectId: task.projectId,
    },
    mode: 'onTouched',
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (updatedFields: Partial<EditTaskInputs>) => {
      const response = await api.put(`/tasks/${task.id}`, updatedFields);
      return response.data;
    },
    onSuccess: (updatedTask: Task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', task.projectId] });
      if (updatedTask.projectId && updatedTask.projectId !== task.projectId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', updatedTask.projectId] });
      }
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onClose();
    },
    onError: (error: any) => {
      setError('root.serverError', {
        type: 'manual',
        message: error.response?.data?.message || error.message || 'Failed to update task. Please try again.',
      });
      console.error('Update task error:', error);
    },
  });

  const onSubmit = (data: EditTaskInputs) => {
    const changedFields: Partial<EditTaskInputs> = {};

    if (data.title !== undefined && data.title !== task.title) {
      changedFields.title = data.title;
    }
    if (data.description !== undefined && data.description !== (task.description || '')) {
        changedFields.description = data.description === '' ? undefined : data.description; // API might expect undefined for cleared optional string
    }
    if (data.status !== undefined && data.status !== task.status) {
      changedFields.status = data.status;
    }
    if (data.priority !== undefined && data.priority !== task.priority) {
      changedFields.priority = data.priority;
    }
    if (data.projectId !== undefined && data.projectId !== task.projectId) {
      changedFields.projectId = data.projectId;
    }

    const formDeadline = data.deadline;
    const originalTaskDeadline = task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : undefined;
    if (formDeadline !== originalTaskDeadline) {
      changedFields.deadline = formDeadline;
    }

    const formAssignedTo = data.assignedTo;
    const originalTaskAssignedTo = task.assignedTo || null;
    if (formAssignedTo !== originalTaskAssignedTo) {
      changedFields.assignedTo = formAssignedTo;
    }

    if (Object.keys(changedFields).length > 0) {
      updateTaskMutation.mutate(changedFields);
    } else {
      onClose();
    }
  };
  
  const commonInputClasses = "form-input block w-full py-2.5 px-3.5 border border-slate-300 bg-white rounded-lg shadow-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none sm:text-sm transition-colors duration-150 ease-in-out";
  const commonLabelClasses = "block text-sm font-medium text-slate-700 mb-1.5";
  const commonErrorClasses = "mt-1.5 text-xs text-red-600 flex items-center";
  const today = new Date().toISOString().split('T')[0];

  const renderLoadingOrError = (isLoading: boolean, isError: boolean, entityName: string) => {
    if (isLoading) return (
        <div className="py-10 text-center">
            <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-slate-600">Loading {entityName} data...</p>
        </div>
    );
    if (isError) return (
        <div className="py-10 text-center">
            <ExclamationCircleIcon className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <p className="text-red-600 font-medium">Error loading {entityName}.</p>
            <p className="text-sm text-slate-500 mt-1">Cannot edit task options at the moment. Please try again later.</p>
        </div>
    );
    return null;
  };

  const loadingOrErrorUsers = renderLoadingOrError(areUsersLoading, isUsersError, 'user');
  const loadingOrErrorProjects = renderLoadingOrError(areProjectsLoading, isProjectsError, 'project');

  return (
    <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-task-title-modal"
    >
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-lg transform transition-all">
        <div className="flex items-center justify-between mb-6 sm:mb-8 pb-4 border-b border-slate-200">
          <div className="flex items-center">
            <FormTitleIcon className="h-7 w-7 text-blue-600 mr-3" />
            <h2 id="edit-task-title-modal" className="text-xl sm:text-2xl font-semibold text-slate-800">
              Edit Task: <span className="font-normal italic line-clamp-1 break-all">{task.title}</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            aria-label="Close modal"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {loadingOrErrorUsers || loadingOrErrorProjects ? (
             <div className="min-h-[200px] flex flex-col justify-center">
                {loadingOrErrorUsers}
                {loadingOrErrorProjects}
                 <button onClick={onClose} className="mt-6 mx-auto px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition-colors">Close</button>
            </div>
        ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {errors.root?.serverError && (
            <div className="rounded-md bg-red-50 p-3.5 border border-red-300">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ExclamationCircleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-700">
                    {errors.root.serverError.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="edit-task-title" className={commonLabelClasses}>Task Title</label>
             <div className="relative">
                <PencilIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                <input
                  id="edit-task-title"
                  type="text"
                  {...register('title')}
                  aria-invalid={errors.title ? "true" : "false"}
                  className={`${commonInputClasses} pl-10 ${errors.title ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                />
            </div>
            {errors.title && <p className={commonErrorClasses}><ExclamationCircleIcon className="h-4 w-4 mr-1" />{errors.title.message}</p>}
          </div>

          <div>
            <label htmlFor="edit-task-description" className={commonLabelClasses}>Description (Optional)</label>
            <div className="relative">
                <Bars3BottomLeftIcon className="absolute left-3 top-3.5 h-5 w-5 text-slate-400 pointer-events-none" />
                <textarea
                  id="edit-task-description"
                  {...register('description')}
                  rows={3}
                  aria-invalid={errors.description ? "true" : "false"}
                  className={`${commonInputClasses} pl-10 resize-y ${errors.description ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                ></textarea>
            </div>
            {errors.description && <p className={commonErrorClasses}><ExclamationCircleIcon className="h-4 w-4 mr-1" />{errors.description.message}</p>}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
            <div>
              <label htmlFor="edit-task-status" className={commonLabelClasses}>Status</label>
              <div className="relative">
                  <ListBulletIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                  <select
                    id="edit-task-status"
                    {...register('status')}
                    aria-invalid={errors.status ? "true" : "false"}
                    className={`${commonInputClasses} pl-10 appearance-none ${errors.status ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                  <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
              </div>
              {errors.status && <p className={commonErrorClasses}><ExclamationCircleIcon className="h-4 w-4 mr-1" />{errors.status.message}</p>}
            </div>

            <div>
              <label htmlFor="edit-task-priority" className={commonLabelClasses}>Priority</label>
              <div className="relative">
                  <FlagIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                  <select
                    id="edit-task-priority"
                    {...register('priority')}
                    aria-invalid={errors.priority ? "true" : "false"}
                    className={`${commonInputClasses} pl-10 appearance-none ${errors.priority ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                   <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
              </div>
              {errors.priority && <p className={commonErrorClasses}><ExclamationCircleIcon className="h-4 w-4 mr-1" />{errors.priority.message}</p>}
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
            <div>
              <label htmlFor="edit-task-deadline" className={commonLabelClasses}>Deadline (Optional)</label>
              <div className="relative">
                <CalendarDaysIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                <input
                  id="edit-task-deadline"
                  type="date"
                  min={today}
                  {...register('deadline')}
                  aria-invalid={errors.deadline ? "true" : "false"}
                  className={`${commonInputClasses} pl-10 ${errors.deadline ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                />
              </div>
              {errors.deadline && <p className={commonErrorClasses}><ExclamationCircleIcon className="h-4 w-4 mr-1" />{errors.deadline.message}</p>}
            </div>

            <div>
              <label htmlFor="edit-task-assignedTo" className={commonLabelClasses}>Assign To (Optional)</label>
              <div className="relative">
                <UserCircleIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                <select
                  id="edit-task-assignedTo"
                  {...register('assignedTo')}
                  aria-invalid={errors.assignedTo ? "true" : "false"}
                  className={`${commonInputClasses} pl-10 appearance-none ${errors.assignedTo ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                >
                  <option value="">Unassigned</option>
                  {users?.map((user) => (
                    <option key={user.id} value={user.id}>{user.username}</option>
                  ))}
                </select>
                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
              </div>
              {errors.assignedTo && <p className={commonErrorClasses}><ExclamationCircleIcon className="h-4 w-4 mr-1" />{errors.assignedTo.message}</p>}
            </div>
          </div>
           <div>
              <label htmlFor="edit-task-projectId" className={commonLabelClasses}>Move to Project (Optional)</label>
              <div className="relative">
                <BriefcaseIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                <select
                  id="edit-task-projectId"
                  {...register('projectId')}
                  aria-invalid={errors.projectId ? "true" : "false"}
                  className={`${commonInputClasses} pl-10 appearance-none ${errors.projectId ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                >
                  {projects?.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
              </div>
              {errors.projectId && <p className={commonErrorClasses}><ExclamationCircleIcon className="h-4 w-4 mr-1" />{errors.projectId.message}</p>}
            </div>


          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 pt-4 mt-6 border-t border-slate-200 space-y-2 sm:space-y-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto flex items-center justify-center px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors disabled:opacity-60"
              disabled={isSubmitting || updateTaskMutation.isPending}
            >
              {isSubmitting || updateTaskMutation.isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};

export default EditTaskForm;