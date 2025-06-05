import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { UserCircleIcon as UserIconSolid } from '@heroicons/react/24/solid';
import { XMarkIcon, ExclamationCircleIcon, UserCircleIcon, EnvelopeIcon, KeyIcon, BriefcaseIcon as RoleIcon } from '@heroicons/react/24/outline';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'Admin' | 'Project Manager' | 'Developer' | 'Tester' | 'Viewer';
  createdAt: string;
  updatedAt: string;
}

interface EditUserFormProps {
  user: User;
  onClose: () => void;
}

const editUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters long.').optional(),
  email: z.string().email('Please enter a valid email address.').optional(),
  role: z.enum(['Admin', 'Project Manager', 'Developer', 'Tester', 'Viewer']).optional(),
  password: z.string().min(8, 'New password must be at least 8 characters long.').optional().or(z.literal('')),
});

type EditUserInputs = z.infer<typeof editUserSchema>;

const EditUserForm: React.FC<EditUserFormProps> = ({ user, onClose }) => {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<EditUserInputs>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      username: user.username,
      email: user.email,
      role: user.role,
      password: '',
    },
    mode: 'onTouched',
  });

  const updateUserMutation = useMutation({
    mutationFn: async (updatedFields: Partial<EditUserInputs>) => {
      const payload = { ...updatedFields };
      if (payload.password === '') {
        delete payload.password;
      }
      const response = await api.put(`/users/${user.id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (error: any) => {
      if (error.response && error.response.data && error.response.data.message) {
        const message = error.response.data.message;
        if (message.toLowerCase().includes('email') && message.toLowerCase().includes('exists')) {
            setError('email', { type: 'manual', message });
        } else if (message.toLowerCase().includes('username') && message.toLowerCase().includes('exists')) {
            setError('username', { type: 'manual', message });
        } else {
            setError('root.serverError', { type: 'manual', message });
        }
      } else {
        setError('root.serverError', {
          type: 'manual',
          message: 'Failed to update user. Please try again.',
        });
      }
      console.error('Update user error:', error);
    },
  });

  const onSubmit = (data: EditUserInputs) => {
    const changedFields: Partial<EditUserInputs> = {};
    if (data.username && data.username !== user.username) changedFields.username = data.username;
    if (data.email && data.email !== user.email) changedFields.email = data.email;
    if (data.role && data.role !== user.role) changedFields.role = data.role;
    if (data.password && data.password.trim() !== '') changedFields.password = data.password;
    
    if (Object.keys(changedFields).length > 0) {
        updateUserMutation.mutate(changedFields);
    } else {
        onClose(); // No changes, just close
    }
  };

  const commonInputClasses = "form-input block w-full py-2.5 px-3.5 border border-slate-300 bg-white rounded-lg shadow-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none sm:text-sm transition-colors duration-150 ease-in-out";
  const commonLabelClasses = "block text-sm font-medium text-slate-700 mb-1.5";
  const commonErrorClasses = "mt-1.5 text-xs text-red-600 flex items-center";

  return (
    <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-user-title"
    >
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-lg transform transition-all">
        <div className="flex items-center justify-between mb-6 sm:mb-8 pb-4 border-b border-slate-200">
          <div className="flex items-center">
            <UserIconSolid className="h-7 w-7 text-blue-600 mr-3" />
            <h2 id="edit-user-title" className="text-xl sm:text-2xl font-semibold text-slate-800">
              Edit User: <span className="font-bold text-blue-700">{user.username}</span>
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
            <label htmlFor="edit-username" className={commonLabelClasses}>Username</label>
            <div className="relative">
              <UserCircleIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
              <input
                id="edit-username"
                type="text"
                {...register('username')}
                aria-invalid={errors.username ? "true" : "false"}
                className={`${commonInputClasses} pl-10 ${errors.username ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                placeholder="e.g., john.doe"
              />
            </div>
            {errors.username && <p className={commonErrorClasses}><ExclamationCircleIcon className="h-4 w-4 mr-1" />{errors.username.message}</p>}
          </div>

          <div>
            <label htmlFor="edit-email" className={commonLabelClasses}>Email Address</label>
            <div className="relative">
              <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
              <input
                id="edit-email"
                type="email"
                {...register('email')}
                aria-invalid={errors.email ? "true" : "false"}
                className={`${commonInputClasses} pl-10 ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                placeholder="e.g., user@example.com"
              />
            </div>
            {errors.email && <p className={commonErrorClasses}><ExclamationCircleIcon className="h-4 w-4 mr-1" />{errors.email.message}</p>}
          </div>

           <div>
            <label htmlFor="edit-role" className={commonLabelClasses}>Assign Role</label>
            <div className="relative">
              <RoleIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
              <select
                id="edit-role"
                {...register('role')}
                aria-invalid={errors.role ? "true" : "false"}
                className={`${commonInputClasses} pl-10 appearance-none ${errors.role ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                disabled={user.id === 'YOUR_CURRENT_LOGGED_IN_USER_ID_FROM_CONTEXT' && user.role === 'Admin'}
              >
                <option value="Viewer">Viewer</option>
                <option value="Tester">Tester</option>
                <option value="Developer">Developer</option>
                <option value="Project Manager">Project Manager</option>
                <option value="Admin">Admin</option>
              </select>
              <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            {errors.role && <p className={commonErrorClasses}><ExclamationCircleIcon className="h-4 w-4 mr-1" />{errors.role.message}</p>}
            {user.id === 'YOUR_CURRENT_LOGGED_IN_USER_ID_FROM_CONTEXT' && user.role === 'Admin' && (
                <p className="mt-1.5 text-xs text-amber-700 bg-amber-50 p-2 rounded-md">You cannot change your own role as an Admin.</p>
            )}
          </div>

          <div>
            <label htmlFor="edit-password" className={commonLabelClasses}>New Password</label>
             <div className="relative">
                <KeyIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                <input
                  id="edit-password"
                  type="password"
                  {...register('password')}
                  aria-invalid={errors.password ? "true" : "false"}
                  className={`${commonInputClasses} pl-10 ${errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="Leave blank to keep current password"
                  autoComplete="new-password"
                />
            </div>
            {errors.password && <p className={commonErrorClasses}><ExclamationCircleIcon className="h-4 w-4 mr-1" />{errors.password.message}</p>}
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
              disabled={isSubmitting || updateUserMutation.isPending}
            >
              {isSubmitting || updateUserMutation.isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving Changes...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserForm;