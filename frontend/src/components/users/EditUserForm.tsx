import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';

// User type (match backend model)
interface User {
  id: string;
  username: string;
  email: string;
  role: 'Admin' | 'Project Manager' | 'Developer' | 'Tester' | 'Viewer';
  createdAt: string;
  updatedAt: string;
}

interface EditUserFormProps {
  user: User; // The user object to be edited
  onClose: () => void;
}

// Zod schema for user editing
const editUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  role: z.enum(['Admin', 'Project Manager', 'Developer', 'Tester', 'Viewer']).optional(),
  // Password field is optional for edit, not required
  password: z.string().min(8, 'Password must be at least 8 characters').optional().or(z.literal('')),
});

type EditUserInputs = z.infer<typeof editUserSchema>;

const EditUserForm: React.FC<EditUserFormProps> = ({ user, onClose }) => {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<EditUserInputs>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      username: user.username,
      email: user.email,
      role: user.role,
      password: '', // Initialize password field as empty
    },
  });

  // Mutation to update a user
  const updateUserMutation = useMutation({
    mutationFn: async (updatedFields: Partial<EditUserInputs>) => {
      // Filter out empty password if it's not being changed
      const payload = { ...updatedFields };
      if (payload.password === '') {
        delete payload.password;
      }
      const response = await api.put(`/users/${user.id}`, payload);
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
          message: 'Failed to update user. Please try again.',
        });
      }
      console.error('Update user error:', error);
    },
  });

  const onSubmit = (data: EditUserInputs) => {
    const changedFields: Partial<EditUserInputs> = {};
    
    if (data.username && data.username !== user.username) {
        changedFields.username = data.username;
    }
    
    if (data.email && data.email !== user.email) {
        changedFields.email = data.email;
    }
    
    if (data.role && data.role !== user.role) {
        changedFields.role = data.role;
    }
    
    if (data.password && data.password !== '') {
        changedFields.password = data.password;
    }
    
    updateUserMutation.mutate(changedFields);
   };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">Edit User: {user.username}</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="edit-username" className="block text-sm font-medium text-gray-700">Username</label>
            <input
              id="edit-username"
              type="text"
              {...register('username')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>}
          </div>
          <div>
            <label htmlFor="edit-email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              id="edit-email"
              type="email"
              {...register('email')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700">Role</label>
            <select
              id="edit-role"
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
          <div>
            <label htmlFor="edit-password" className="block text-sm font-medium text-gray-700">New Password (leave blank to keep current)</label>
            <input
              id="edit-password"
              type="password"
              {...register('password')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
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
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserForm;