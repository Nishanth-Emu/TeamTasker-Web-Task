import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom'; // Added useNavigate
import { useAuth } from '../../context/AuthContext'; // Assuming @/ for consistency with new imports
import { useNotifications } from '../../context/NotificationContext'; // Added import

const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications(); // Get unreadCount
  const navigate = useNavigate(); // Initialize useNavigate

  const handleLogout = () => {
    logout();
    navigate('/login'); // Redirect to login page after logout
  };

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
            <Link to="/dashboard/projects" className="text-gray-600 hover:text-blue-700 font-medium">
              Projects
            </Link>

            {user?.role === 'Admin' && (
                <Link to="/dashboard/users" className="text-gray-600 hover:text-blue-700 font-medium">
                  Users
                </Link>
            )}

            {/* Notifications Link with Badge */}
            <Link to="/dashboard/notifications" className="relative text-gray-600 hover:text-blue-700 font-medium">
              Notifications
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                  {unreadCount}
                </span>
              )}
            </Link>

            <button
              onClick={handleLogout} // Updated to use handleLogout
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
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;