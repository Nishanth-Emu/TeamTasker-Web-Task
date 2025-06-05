import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { FolderPlusIcon, XMarkIcon, ExclamationCircleIcon, PencilIcon, Bars3BottomLeftIcon, ListBulletIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface CreateProjectFormProps {
  onClose: () => void;
}

const createProjectSchema = z.object({
  name: z.string().min(3, 'Project name must be at least 3 characters long.'),
  description: z.string().optional(),
  status: z.enum(['Not Started', 'In Progress', 'Completed', 'On Hold', 'Cancelled']).default('Not Started'),
});

type CreateProjectInputs = z.infer<typeof createProjectSchema>;

const CreateProjectForm: React.FC<CreateProjectFormProps> = ({ onClose }) => {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<CreateProjectInputs>({
    resolver: zodResolver(createProjectSchema) as any, // Keep 'as any' if it resolves a complex resolver type issue for now
    defaultValues: {
      status: 'Not Started',
    },
    mode: 'onTouched',
  });

  const createProjectMutation = useMutation({
    mutationFn: async (newProject: CreateProjectInputs) => {
      const response = await api.post('/projects', newProject);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      onClose();
    },
    onError: (error: any) => {
      if (error.response && error.response.status === 409) {
        setError('name', {
          type: 'manual',
          message: 'A project with this name already exists. Please choose a different name.',
        });
      } else {
        setError('root.serverError', {
          type: 'manual',
          message: error.response?.data?.message || error.message || 'Failed to create project. Please try again.',
        });
      }
      console.error('Create project error:', error);
    },
  });

  const onSubmit = (data: CreateProjectInputs) => {
    createProjectMutation.mutate(data);
  };

  const commonInputBaseClasses = "form-input block w-full py-2.5 border bg-white rounded-lg shadow-sm placeholder-slate-400 focus:ring-2 focus:outline-none sm:text-sm transition-colors duration-150 ease-in-out";
  const commonInputWithIconPadding = "pl-10 pr-3.5";
  const commonSelectWithIconPadding = "pl-10 pr-10";
  
  const commonLabelClasses = "block text-sm font-medium text-slate-700 mb-1.5";
  const commonErrorClasses = "mt-1.5 text-xs text-red-600 flex items-center";

  return (
    <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" // Added bg-black/40 and backdrop-blur-sm
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-project-title"
        onClick={onClose} // Allow closing by clicking the backdrop
    >
      <div 
        className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-lg transform transition-all"
        onClick={(e) => e.stopPropagation()} // Prevent click inside modal from closing it
      >
        <div className="flex items-center justify-between mb-6 sm:mb-8 pb-4 border-b border-slate-200">
          <div className="flex items-center">
            <FolderPlusIcon className="h-7 w-7 text-blue-600 mr-3" />
            <h2 id="create-project-title" className="text-xl sm:text-2xl font-semibold text-slate-800">
              Create New Project
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
            <label htmlFor="name" className={commonLabelClasses}>Project Name</label>
             <div className="relative">
                <PencilIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                <input
                  id="name"
                  type="text"
                  {...register('name')}
                  aria-invalid={errors.name ? "true" : "false"}
                  className={`${commonInputBaseClasses} ${commonInputWithIconPadding} ${errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500'}`}
                  placeholder="e.g., Website Redesign Q3"
                />
            </div>
            {errors.name && <p className={commonErrorClasses}><ExclamationCircleIcon className="h-4 w-4 mr-1" />{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="description" className={commonLabelClasses}>Description (Optional)</label>
            <div className="relative">
                <Bars3BottomLeftIcon className="absolute left-3 top-3.5 h-5 w-5 text-slate-400 pointer-events-none" />
                <textarea
                  id="description"
                  {...register('description')}
                  rows={4}
                  aria-invalid={errors.description ? "true" : "false"}
                  className={`${commonInputBaseClasses} ${commonInputWithIconPadding} resize-y ${errors.description ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500'}`}
                  placeholder="Provide a brief overview of the project goals and scope."
                ></textarea>
            </div>
            {errors.description && <p className={commonErrorClasses}><ExclamationCircleIcon className="h-4 w-4 mr-1" />{errors.description.message}</p>}
          </div>

          <div>
            <label htmlFor="status" className={commonLabelClasses}>Initial Status</label>
            <div className="relative">
                <ListBulletIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none z-10" />
                <select
                  id="status"
                  {...register('status')}
                  aria-invalid={errors.status ? "true" : "false"}
                  className={`${commonInputBaseClasses} ${commonSelectWithIconPadding} appearance-none ${errors.status ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500'}`}
                >
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
                <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
            </div>
            {errors.status && <p className={commonErrorClasses}><ExclamationCircleIcon className="h-4 w-4 mr-1" />{errors.status.message}</p>}
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
              disabled={isSubmitting || createProjectMutation.isPending}
            >
              {isSubmitting || createProjectMutation.isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectForm;