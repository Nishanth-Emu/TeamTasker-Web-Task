import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../../api/axios';

// Type Definitions (match backend models and what's passed in)
interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'To Do' | 'In Progress' | 'Done' | 'Blocked';
  priority: 'Low' | 'Medium' | 'High';
  deadline?: string;
  projectId: string;
  assignedTo?: string | null; // Can be null
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

// Zod schema for task editing
const editTaskSchema = z.object({
  title: z.string().min(3, 'Task title must be at least 3 characters').optional(),
  description: z.string().optional(),
  status: z.enum(['To Do', 'In Progress', 'Done', 'Blocked']).optional(),
  priority: z.enum(['Low', 'Medium', 'High']).optional(),
  deadline: z.string().optional().nullable(), // Allow null for deadline
  assignedTo: z.string().optional().nullable(), // Allow null for assignedTo
  projectId: z.string().optional(), // Allow changing project
});

type EditTaskInputs = z.infer<typeof editTaskSchema>;

const EditTaskForm: React.FC<EditTaskFormProps> = ({ task, onClose }) => {
  const queryClient = useQueryClient();

  // Fetch all projects for the project change dropdown with proper typing
  const { data: projects, isLoading: areProjectsLoading, isError: isProjectsError } = useQuery<Project[], Error>({
    queryKey: ['allProjects'], // Use a distinct query key for all projects
    queryFn: async () => {
      const response = await api.get('/projects');
      return response.data;
    },
  });

  // Fetch users for assignee dropdown
  const { data: users, isLoading: areUsersLoading, isError: isUsersError } = useQuery<User[], Error>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users');
      return response.data;
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<EditTaskInputs>({
    resolver: zodResolver(editTaskSchema),
    defaultValues: {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      // Format deadline to 'YYYY-MM-DD' for date input
      deadline: task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '',
      assignedTo: task.assignedTo || '', // Default to empty string for unassigned
      projectId: task.projectId, // Default to current project
    },
  });

  // Mutation to update a task
  const updateTaskMutation = useMutation({
    mutationFn: async (updatedFields: Partial<EditTaskInputs>) => {
      const payload = {
        ...updatedFields,
        // Convert empty string for assignedTo/deadline back to null if needed
        assignedTo: updatedFields.assignedTo === '' ? null : updatedFields.assignedTo,
        deadline: updatedFields.deadline === '' ? null : updatedFields.deadline,
      };
      const response = await api.put(`/tasks/${task.id}`, payload);
      return response.data;
    },
    onSuccess: (updatedTask) => {
      // Invalidate tasks for the original project and potentially the new project if changed
      queryClient.invalidateQueries({ queryKey: ['tasks', task.projectId] });
      if (updatedTask.projectId !== task.projectId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', updatedTask.projectId] });
      }
      onClose(); // Close the modal on success
    },
    onError: (error: any) => {
      setError('root', {
        type: 'manual',
        message: error.response?.data?.message || error.message || 'Failed to update task.',
      });
      console.error('Update task error:', error);
    },
  });

  const onSubmit = (data: EditTaskInputs) => {
    const changedFields: Partial<EditTaskInputs> = {};
    
    // Define a type-safe way to handle field comparisons
    const compareAndAddField = <K extends keyof EditTaskInputs>(
      key: K,
      formValue: EditTaskInputs[K],
      originalValue: any
    ) => {
      if (formValue !== originalValue && formValue !== undefined) {
        changedFields[key] = formValue;
      }
    };
    
    // Handle each field individually for type safety
    if (data.title !== undefined) {
      compareAndAddField('title', data.title, task.title);
    }
    
    if (data.description !== undefined) {
      compareAndAddField('description', data.description, task.description);
    }
    
    if (data.status !== undefined) {
      compareAndAddField('status', data.status, task.status);
    }
    
    if (data.priority !== undefined) {
      compareAndAddField('priority', data.priority, task.priority);
    }
    
    if (data.projectId !== undefined) {
      compareAndAddField('projectId', data.projectId, task.projectId);
    }
    
    // Special handling for deadline
    if (data.deadline !== undefined) {
      const currentDeadline = data.deadline === '' ? null : data.deadline;
      const originalDeadline = task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : null;
      if (currentDeadline !== originalDeadline) {
        changedFields.deadline = currentDeadline;
      }
    }
    
    // Special handling for assignedTo
    if (data.assignedTo !== undefined) {
      const currentAssignee = data.assignedTo === '' ? null : data.assignedTo;
      const originalAssignee = task.assignedTo || null;
      if (currentAssignee !== originalAssignee) {
        changedFields.assignedTo = currentAssignee;
      }
    }
    
    updateTaskMutation.mutate(changedFields);
  };

  if (areUsersLoading || areProjectsLoading) return <div>Loading data...</div>;
  if (isUsersError) return <div>Error loading users.</div>;
  if (isProjectsError) return <div>Error loading projects.</div>;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">Edit Task: {task.title}</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="edit-task-title" className="block text-sm font-medium text-gray-700">Task Title</label>
            <input
              id="edit-task-title"
              type="text"
              {...register('title')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
          </div>
          <div>
            <label htmlFor="edit-task-description" className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              id="edit-task-description"
              {...register('description')}
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            ></textarea>
            {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
          </div>
          <div>
            <label htmlFor="edit-task-status" className="block text-sm font-medium text-gray-700">Status</label>
            <select
              id="edit-task-status"
              {...register('status')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="To Do">To Do</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
              <option value="Blocked">Blocked</option>
            </select>
            {errors.status && <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>}
          </div>
          <div>
            <label htmlFor="edit-task-priority" className="block text-sm font-medium text-gray-700">Priority</label>
            <select
              id="edit-task-priority"
              {...register('priority')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
            {errors.priority && <p className="mt-1 text-sm text-red-600">{errors.priority.message}</p>}
          </div>
          <div>
            <label htmlFor="edit-task-deadline" className="block text-sm font-medium text-gray-700">Deadline</label>
            <input
              id="edit-task-deadline"
              type="date"
              {...register('deadline')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            {errors.deadline && <p className="mt-1 text-sm text-red-600">{errors.deadline.message}</p>}
          </div>
          <div>
            <label htmlFor="edit-task-assignedTo" className="block text-sm font-medium text-gray-700">Assigned To</label>
            <select
              id="edit-task-assignedTo"
              {...register('assignedTo')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Unassigned</option>
              {users?.map((user) => (
                <option key={user.id} value={user.id}>{user.username}</option>
              ))}
            </select>
            {errors.assignedTo && <p className="mt-1 text-sm text-red-600">{errors.assignedTo.message}</p>}
          </div>
          <div>
            <label htmlFor="edit-task-projectId" className="block text-sm font-medium text-gray-700">Move to Project</label>
            <select
              id="edit-task-projectId"
              {...register('projectId')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              {projects?.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
            {errors.projectId && <p className="mt-1 text-sm text-red-600">{errors.projectId.message}</p>}
          </div>

          {errors.root && <p className="mt-1 text-sm text-red-600 text-center">{errors.root.message}</p>}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              disabled={updateTaskMutation.isPending}
            >
              {updateTaskMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTaskForm;