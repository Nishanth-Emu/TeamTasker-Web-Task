import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { BriefcaseIcon, UsersIcon, BellIcon, ArrowLeftEndOnRectangleIcon , UserCircleIcon } from '@heroicons/react/24/outline'; 
import { BuildingOffice2Icon } from '@heroicons/react/24/solid';


const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  

  const navLinkClasses = "flex items-center px-3 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-150 ease-in-out";
  // const activeNavLinkClasses = "flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-lg transition-all duration-150 ease-in-out"; // Example, logic not implemented here

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800 selection:bg-blue-500 selection:text-white">
      <header className="bg-white shadow-md sticky top-0 z-30 border-b border-slate-200">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/dashboard" className="flex items-center text-2xl font-bold text-blue-600 tracking-tight">
              <BuildingOffice2Icon className="h-7 w-7 mr-2 text-blue-500" />
              TeamTasker
            </Link>
            
            <nav className="flex items-center space-x-2 sm:space-x-4">
              {user && (
                <div className="hidden sm:flex items-center space-x-2 p-2 rounded-lg bg-slate-50 border border-slate-200/70">
                  <UserCircleIcon className="h-6 w-6 text-slate-500" />
                  <span className="text-slate-700 text-xs md:text-sm">
                    <span className="font-semibold">{user.username}</span>
                    <span className="text-slate-500 hidden md:inline"> ({user.role})</span>
                  </span>
                </div>
              )}

              <Link to="/dashboard/projects" className={navLinkClasses}>
                <BriefcaseIcon className="h-5 w-5 mr-1.5 hidden sm:inline-block" />
                Projects
              </Link>

              {user?.role === 'Admin' && (
                <Link to="/dashboard/users" className={navLinkClasses}>
                  <UsersIcon className="h-5 w-5 mr-1.5 hidden sm:inline-block" />
                  Users
                </Link>
              )}

              <Link to="/dashboard/notifications" className={`${navLinkClasses} relative`}>
                <BellIcon className="h-5 w-5 mr-1.5 hidden sm:inline-block" />
                Notifications
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 inline-flex items-center justify-center h-4 w-4 min-w-[1rem] p-0.5 text-[0.6rem] font-bold leading-none text-white bg-red-500 rounded-full ring-2 ring-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-600 text-sm font-medium rounded-lg transition-colors duration-150 ease-in-out border border-slate-200/80 hover:border-red-200"
                title="Logout"
              >
                <ArrowLeftEndOnRectangleIcon  className="h-5 w-5 sm:mr-1.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 h-full">
          <Outlet />
        </div>
      </main>
      
      {/* Optional Footer Example */}
      {/* <footer className="py-4 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
        © {new Date().getFullYear()} TeamTasker. All rights reserved.
      </footer> */}
    </div>
  );
};

export default DashboardLayout;