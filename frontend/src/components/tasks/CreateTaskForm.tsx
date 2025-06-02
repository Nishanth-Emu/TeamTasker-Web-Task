import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { useQuery } from '@tanstack/react-query';

interface CreateTaskFormProps {
  projectId: string;
  onClose: () => void;
}

// Define User type for dropdown
interface User {
    id: string;
    username: string;
}

// Zod schema for task creation
const createTaskSchema = z.object({
  title: z.string().min(3, 'Task title must be at least 3 characters'),
  description: z.string().optional(),
  status: z.enum(['To Do', 'In Progress', 'Done', 'Blocked']).default('To Do'),
  priority: z.enum(['Low', 'Medium', 'High']).default('Medium'),
  deadline: z.string().optional(), // Will be Date string from input
  assignedTo: z.string().optional().nullable(), // User ID
});

type CreateTaskInputs = z.infer<typeof createTaskSchema>;

const CreateTaskForm: React.FC<CreateTaskFormProps> = ({ projectId, onClose }) => {
  const queryClient = useQueryClient();

  // Fetch users for assignee dropdown
  const { data: users, isLoading: areUsersLoading, isError: isUsersError } = useQuery<User[], Error>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users'); // Or a dedicated endpoint for assignable users
      return response.data;
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<CreateTaskInputs>({
    resolver: zodResolver(createTaskSchema) as any,
    defaultValues: {
      status: 'To Do',
      priority: 'Medium',
      assignedTo: '', // Default to empty string for "Unassigned" option
    },
  });

  // Mutation to create a task
  const createTaskMutation = useMutation({
    mutationFn: async (newTask: CreateTaskInputs) => {
      const payload = {
        ...newTask,
        projectId, // Add projectId from props
        assignedTo: newTask.assignedTo === '' ? null : newTask.assignedTo, // Convert empty string to null
      };
      const response = await api.post('/tasks', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }); // Invalidate tasks for this project
      onClose(); // Close the modal on success
    },
    onError: (error: any) => {
      setError('root', {
        type: 'manual',
        message: error.response?.data?.message || error.message || 'Failed to create task.',
      });
      console.error('Create task error:', error);
    },
  });

  const onSubmit = (data: CreateTaskInputs) => {
    createTaskMutation.mutate(data);
  };

  if (areUsersLoading) return <div>Loading users...</div>;
  if (isUsersError) return <div>Error loading users for assignee dropdown.</div>;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">Create New Task</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Task Title</label>
            <input
              id="title"
              type="text"
              {...register('title')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              id="description"
              {...register('description')}
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            ></textarea>
            {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
            <select
              id="status"
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
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700">Priority</label>
            <select
              id="priority"
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
            <label htmlFor="deadline" className="block text-sm font-medium text-gray-700">Deadline</label>
            <input
              id="deadline"
              type="date" // Use type="date" for date input
              {...register('deadline')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            {errors.deadline && <p className="mt-1 text-sm text-red-600">{errors.deadline.message}</p>}
          </div>
          <div>
            <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700">Assigned To</label>
            <select
              id="assignedTo"
              {...register('assignedTo')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Unassigned</option> {/* Option for unassigned */}
              {users?.map((user) => (
                <option key={user.id} value={user.id}>{user.username}</option>
              ))}
            </select>
            {errors.assignedTo && <p className="mt-1 text-sm text-red-600">{errors.assignedTo.message}</p>}
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
              disabled={createTaskMutation.isPending}
            >
              {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskForm;