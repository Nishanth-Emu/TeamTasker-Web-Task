import React from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import './index.css';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import { useAuth } from './context/AuthContext';
import DashboardLayout from './components/layout/DashboardLayout';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import UsersPage from './pages/UsersPage';
import NotificationsPage from './pages/NotificationsPage'; 
// import { Toaster } from 'sonner';
import NotificationToastDisplay from './components/notifications/NotificationToastDisplay';
import { ArrowRightIcon, BuildingOffice2Icon, ArrowPathIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/solid';

const HomePage: React.FC = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-sky-50 to-blue-100 p-6 text-slate-800 selection:bg-blue-500 selection:text-white">
    <div className="text-center max-w-2xl">
      <BuildingOffice2Icon className="mx-auto h-20 w-20 text-blue-600 mb-6" />
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 mb-6">
        Welcome to <span className="text-blue-600">TeamTasker</span>
      </h1>
      <p className="text-lg sm:text-xl text-slate-600 mb-10 leading-relaxed">
        Streamline your projects, enhance collaboration, and boost productivity with our intuitive task management platform. Get started today and bring your team's vision to life.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
        <Link 
          to="/login" 
          className="group inline-flex items-center justify-center w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-white bg-blue-600 rounded-xl shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-sky-50 transition-all duration-150 ease-in-out"
        >
          Sign In
          <ArrowRightIcon className="ml-2 h-5 w-5 transform transition-transform duration-150 ease-in-out group-hover:translate-x-1" />
        </Link>
        <Link 
          to="/register" 
          className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-blue-600 bg-white rounded-xl shadow-lg hover:bg-blue-50 border border-blue-200 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-sky-50 transition-all duration-150 ease-in-out"
        >
          Create Account
        </Link>
      </div>
    </div>
    <footer className="absolute bottom-6 text-xs text-slate-500">
      © {new Date().getFullYear()} TeamTasker. All rights reserved.
    </footer>
  </div>
);

const LoadingSpinner: React.FC<{ message?: string }> = ({ message = "Loading..."}) => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-700">
        <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-lg font-medium">{message}</p>
    </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return <LoadingSpinner message="Loading user data..." />;
  }

  if (!user) {
    navigate('/login', { replace: true, state: { from: location.pathname } });
    return null;
  }

  return <>{children}</>;
};

const NotFoundPage: React.FC = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-6 text-slate-700">
    <QuestionMarkCircleIcon className="h-24 w-24 text-blue-500 mb-8" />
    <h1 className="text-5xl font-bold text-slate-800 mb-4">404</h1>
    <p className="text-2xl font-medium text-slate-600 mb-2">Page Not Found</p>
    <p className="text-lg text-slate-500 mb-8 text-center max-w-md">
      Oops! The page you are looking for doesn't exist or has been moved.
    </p>
    <Link 
      to="/dashboard" 
      className="inline-flex items-center px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-100 transition-colors"
    >
      <ArrowPathIcon className="h-5 w-5 mr-2 transform rotate-[-90deg]" />
      Go to Dashboard
    </Link>
  </div>
);


function App() {
  return (
    <>
      <div className="min-h-screen bg-slate-100 text-slate-800">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ProjectsPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:projectId/tasks" element={<ProjectDetailPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
      <NotificationToastDisplay /> 
      {/* <Toaster richColors position="top-right" theme="light" closeButton /> */}
    </>
  );
}

export default App;