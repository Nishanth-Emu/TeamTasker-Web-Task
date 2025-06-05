import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { UserPlusIcon, EnvelopeIcon, KeyIcon, UserCircleIcon, ExclamationCircleIcon, ArrowRightCircleIcon } from '@heroicons/react/24/solid';

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters long.'),
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters long.'),
  confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters long.'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match. Please re-enter.",
  path: ["confirmPassword"],
});

type RegisterFormInputs = z.infer<typeof registerSchema>;

const RegisterForm: React.FC = () => {
  const { register: authRegister } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormInputs) => {
      const { confirmPassword, ...payload } = data;
      const response = await api.post('/auth/register', payload);
      return response.data;
    },
    onSuccess: (data) => {
      authRegister(data.token, data.user);
    },
    onError: (error: any) => {
      if (error.response && error.response.status === 409) {
        setError('email', {
          type: 'manual',
          message: 'This email address is already registered. Please use a different email or login.',
        });
      } else {
        setError('root.serverError', {
          type: 'manual',
          message: error.response?.data?.message || error.message || 'An unexpected error occurred during registration. Please try again.',
        });
      }
      console.error('Registration error:', error);
    },
  });

  const onSubmit = (data: RegisterFormInputs) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 text-slate-900 selection:bg-emerald-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white shadow-xl rounded-xl p-8 sm:p-10">
          <div className="mb-8 sm:mb-10 text-center">
            <UserPlusIcon className="mx-auto h-12 w-12 text-emerald-600" aria-hidden="true" />
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-slate-800">
              Create your account
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Join us and get started in minutes.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            {errors.root?.serverError && (
              <div className="rounded-md bg-red-50 p-4 border border-red-300">
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
              <label htmlFor="username" className="block text-sm font-medium text-slate-700">
                Username
              </label>
              <div className="mt-1.5 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserCircleIcon className="h-5 w-5 text-slate-400" aria-hidden="true" />
                </div>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  {...register('username')}
                  aria-invalid={errors.username ? "true" : "false"}
                  aria-describedby={errors.username ? "username-error" : undefined}
                  className={`form-input block w-full pl-10 pr-3 py-2.5 border rounded-md shadow-sm placeholder-slate-400 
                    ${errors.username
                      ? 'border-red-500 text-red-900 focus:ring-red-500 focus:border-red-500'
                      : 'border-slate-300 text-slate-900 bg-white focus:ring-emerald-500 focus:border-emerald-500'
                    } 
                    focus:outline-none sm:text-sm transition-colors duration-150 ease-in-out`}
                  placeholder="your_username"
                />
              </div>
              {errors.username && (
                <p className="mt-1.5 text-xs text-red-600" id="username-error">
                  {errors.username.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email address
              </label>
              <div className="mt-1.5 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-slate-400" aria-hidden="true" />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                  aria-invalid={errors.email ? "true" : "false"}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className={`form-input block w-full pl-10 pr-3 py-2.5 border rounded-md shadow-sm placeholder-slate-400 
                    ${errors.email
                      ? 'border-red-500 text-red-900 focus:ring-red-500 focus:border-red-500'
                      : 'border-slate-300 text-slate-900 bg-white focus:ring-emerald-500 focus:border-emerald-500'
                    } 
                    focus:outline-none sm:text-sm transition-colors duration-150 ease-in-out`}
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-600" id="email-error">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="mt-1.5 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyIcon className="h-5 w-5 text-slate-400" aria-hidden="true" />
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  {...register('password')}
                  aria-invalid={errors.password ? "true" : "false"}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  className={`form-input block w-full pl-10 pr-3 py-2.5 border rounded-md shadow-sm placeholder-slate-400
                    ${errors.password
                      ? 'border-red-500 text-red-900 focus:ring-red-500 focus:border-red-500'
                      : 'border-slate-300 text-slate-900 bg-white focus:ring-emerald-500 focus:border-emerald-500'
                    }
                    focus:outline-none sm:text-sm transition-colors duration-150 ease-in-out`}
                  placeholder="••••••••"
                />
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-600" id="password-error">
                  {errors.password.message}
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
                Confirm Password
              </label>
              <div className="mt-1.5 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyIcon className="h-5 w-5 text-slate-400" aria-hidden="true" />
                </div>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                  aria-invalid={errors.confirmPassword ? "true" : "false"}
                  aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                  className={`form-input block w-full pl-10 pr-3 py-2.5 border rounded-md shadow-sm placeholder-slate-400
                    ${errors.confirmPassword
                      ? 'border-red-500 text-red-900 focus:ring-red-500 focus:border-red-500'
                      : 'border-slate-300 text-slate-900 bg-white focus:ring-emerald-500 focus:border-emerald-500'
                    }
                    focus:outline-none sm:text-sm transition-colors duration-150 ease-in-out`}
                  placeholder="••••••••"
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1.5 text-xs text-red-600" id="confirmPassword-error">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white 
                           bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:ring-offset-slate-50
                           disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 ease-in-out group"
                disabled={isSubmitting || registerMutation.isPending}
              >
                {isSubmitting || registerMutation.isPending ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRightCircleIcon className="ml-2 h-5 w-5 transform transition-transform duration-150 ease-in-out group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </div>
          </form>

          <p className="mt-8 sm:mt-10 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors duration-150 ease-in-out"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;