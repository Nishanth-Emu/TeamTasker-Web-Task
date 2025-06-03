import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';

interface CreateUserFormProps {
  onClose: () => void;
}

// Zod schema for user creation (similar to register, but includes role)
const createUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['Admin', 'Project Manager', 'Developer', 'Tester', 'Viewer']),
});

type CreateUserInputs = z.infer<typeof createUserSchema>;

const CreateUserForm: React.FC<CreateUserFormProps> = ({ onClose }) => {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<CreateUserInputs>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      role: 'Viewer', // Default role for new users
    },
  });

  // Mutation to create a user
  const createUserMutation = useMutation({
    mutationFn: async (newUser: CreateUserInputs) => {
      const response = await api.post('/users', newUser); // Admin endpoint for creating users
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] }); // Invalidate to refetch user list
      onClose(); // Close the modal on success
    },
    onError: (error: any) => {
      if (error.response && error.response.data && error.response.data.message) {
        setError('root', {
          type: 'manual',
          message: error.response.data.message,
        });
      } else {
        setError('root', {
          type: 'manual',
          message: 'Failed to create user. Please try again.',
        });
      }
      console.error('Create user error:', error);
    },
  });

  const onSubmit = (data: CreateUserInputs) => {
    createUserMutation.mutate(data);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">Create New User</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
            <input
              id="username"
              type="text"
              {...register('username')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>}
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              id="email"
              type="email"
              {...register('email')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input
              id="password"
              type="password"
              {...register('password')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
          </div>
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
            <select
              id="role"
              {...register('role')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="Admin">Admin</option>
              <option value="Project Manager">Project Manager</option>
              <option value="Developer">Developer</option>
              <option value="Tester">Tester</option>
              <option value="Viewer">Viewer</option>
            </select>
            {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>}
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
              disabled={createUserMutation.isPending}
            >
              {createUserMutation.isPending ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUserForm;