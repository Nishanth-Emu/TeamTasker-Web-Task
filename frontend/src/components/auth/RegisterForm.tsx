import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

// Define the validation schema for registration form
const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters'),
//   role: z.enum(['Developer', 'Tester', 'Viewer']).default('Viewer'), 
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"], 
});

type RegisterFormInputs = z.infer<typeof registerSchema>;

const RegisterForm: React.FC = () => {
  const { register: authRegister } = useAuth(); 

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema),
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
      if (error.response && error.response.status === 409) { // 409 Conflict for existing user
        setError('email', {
          type: 'manual',
          message: 'Email already registered.',
        });
      } else {
        setError('root', {
          type: 'manual',
          message: error.message || 'An unexpected error occurred during registration.',
        });
      }
      console.error('Registration error:', error);
    },
  });

  const onSubmit = (data: RegisterFormInputs) => {
    registerMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6 bg-white rounded-lg shadow-md max-w-sm w-full">
      <h2 className="text-2xl font-bold text-center mb-6">Register</h2>
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
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm Password</label>
        <input
          id="confirmPassword"
          type="password"
          {...register('confirmPassword')}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
        {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>}
      </div>
      {errors.root && <p className="mt-1 text-sm text-red-600 text-center">{errors.root.message}</p>}
      <button
        type="submit"
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        disabled={registerMutation.isPending}
      >
        {registerMutation.isPending ? 'Registering...' : 'Register'}
      </button>
      <div className="text-center text-sm text-gray-600">
        Already have an account? <Link to="/login" className="text-blue-600 hover:underline">Login</Link>
      </div>
    </form>
  );
};

export default RegisterForm;