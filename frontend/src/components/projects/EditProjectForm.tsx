import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';

// Define Project type (same as in ProjectsPage)
interface Project {
  id: string;
  name: string;
  description: string;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Cancelled' | 'On Hold';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface EditProjectFormProps {
  project: Project;
  onClose: () => void;
}

// Zod schema for project editing (optional fields for updates)
const editProjectSchema = z.object({
  name: z.string().min(3, 'Project name must be at least 3 characters').optional(),
  description: z.string().optional(),
  status: z.enum(['Not Started', 'In Progress', 'Completed', 'Cancelled', 'On Hold']).optional(),
});

type EditProjectInputs = z.infer<typeof editProjectSchema>;

const EditProjectForm: React.FC<EditProjectFormProps> = ({ project, onClose }) => {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<EditProjectInputs>({
    resolver: zodResolver(editProjectSchema),
    defaultValues: {
      name: project.name,
      description: project.description,
      status: project.status,
    },
  });

  // Mutation to update a project
  const updateProjectMutation = useMutation({
    mutationFn: async (updatedFields: Partial<EditProjectInputs>) => {
      const response = await api.put(`/projects/${project.id}`, updatedFields);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] }); // Invalidate to refetch project list
      onClose(); // Close the modal on success
    },
    onError: (error: any) => {
      if (error.response && error.response.status === 409) {
        setError('name', {
          type: 'manual',
          message: 'Project with this name already exists.',
        });
      } else {
        setError('root', {
          type: 'manual',
          message: error.message || 'Failed to update project.',
        });
      }
      console.error('Update project error:', error);
    },
  });

  const onSubmit = (data: EditProjectInputs) => {
    // Filter out undefined values to send only updated fields
    const payload = Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined)
    );
    updateProjectMutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">Edit Project: {project.name}</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">Project Name</label>
            <input
              id="edit-name"
              type="text"
              {...register('name')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              id="edit-description"
              {...register('description')}
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            ></textarea>
            {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
          </div>
          <div>
            <label htmlFor="edit-status" className="block text-sm font-medium text-gray-700">Status</label>
            <select
              id="edit-status"
              {...register('status')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="On Hold">On Hold</option>

            </select>
            {errors.status && <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>}
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
              disabled={updateProjectMutation.isPending}
            >
              {updateProjectMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProjectForm;