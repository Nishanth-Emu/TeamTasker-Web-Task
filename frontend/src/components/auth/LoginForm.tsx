import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod'; 
import { useMutation } from '@tanstack/react-query'; 
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext'; 
import { Link } from 'react-router-dom';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

const LoginForm: React.FC = () => {
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema), 
  });

  // TanStack Query mutation for login
  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormInputs) => {
      const response = await api.post('/auth/login', data);
      return response.data;
    },
    onSuccess: (data) => {
      // If login is successful, use the login function from AuthContext
      login(data.token, data.user);
    },
    onError: (error: any) => {
      // Handle API errors (e.g., incorrect credentials)
      if (error.response && error.response.status === 401) {
        setError('password', {
          type: 'manual',
          message: 'Invalid credentials',
        });
      } else {
        setError('root', {
          type: 'manual',
          message: error.message || 'An unexpected error occurred.',
        });
      }
      console.error('Login error:', error);
    },
  });

  const onSubmit = (data: LoginFormInputs) => {
    loginMutation.mutate(data); // Trigger the login mutation
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6 bg-white rounded-lg shadow-md max-w-sm w-full">
      <h2 className="text-2xl font-bold text-center mb-6">Login</h2>
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
      {errors.root && <p className="mt-1 text-sm text-red-600 text-center">{errors.root.message}</p>}
      <button
        type="submit"
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        disabled={loginMutation.isPending} // Disable button while loading
      >
        {loginMutation.isPending ? 'Logging in...' : 'Login'}
      </button>
      <div className="text-center text-sm text-gray-600">
        Don't have an account? <Link to="/register" className="text-blue-600 hover:underline">Register</Link>
      </div>
    </form>
  );
};

export default LoginForm;