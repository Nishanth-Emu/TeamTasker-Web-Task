import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header/Navbar */}
      <header className="bg-white shadow-sm p-4 border-b border-gray-200">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link to="/dashboard" className="text-2xl font-bold text-blue-700">TeamTasker</Link>
          <nav className="flex items-center space-x-6">
            {user && (
              <span className="text-gray-700 text-sm">
                Welcome, <span className="font-semibold">{user.username}</span> ({user.role})
              </span>
            )}
            <Link to="/dashboard/projects" className="text-gray-600 hover:text-blue-700 font-medium">Projects</Link>

            {user?.role === 'Admin' && (
                <Link to="/dashboard/users" className="text-gray-600 hover:text-blue-700 font-medium">Users</Link>
            )}
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition-colors"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>

      {/* Main content area */}
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto h-full">
          <Outlet /> {/* This is where nested routes will render */}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;