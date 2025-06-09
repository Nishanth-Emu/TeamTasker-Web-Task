import React, { useMemo } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
// import { useQuery } from '@tanstack/react-query';
// import { getNotifications } from '../../api/notification.api';
import { BriefcaseIcon, UsersIcon, BellIcon, ArrowLeftEndOnRectangleIcon , UserCircleIcon } from '@heroicons/react/24/outline'; 
import { BuildingOffice2Icon } from '@heroicons/react/24/solid';

const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { notifications: socketNotifications } = useSocket();
  const navigate = useNavigate();

  // Fetch notifications from the server
  // const { data: serverNotifications = [] } = useQuery({
  //   queryKey: ['notifications'],
  //   queryFn: getNotifications,
  //   refetchOnWindowFocus: false,
  // });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Merge socket and server notifications, prioritizing socket notifications for real-time updates
  // const mergedNotifications = useMemo(() => {
  //   if (socketNotifications.length === 0) {
  //     return serverNotifications;
  //   }
    
  //   // Create a map of socket notifications for quick lookup
  //   const socketNotificationMap = new Map(
  //     socketNotifications.map(notif => [notif.id, notif])
  //   );
    
  //   // Merge: use socket notification if available, otherwise use server notification
  //   const merged = serverNotifications.map(serverNotif => 
  //     socketNotificationMap.get(serverNotif.id) || serverNotif
  //   );
    
  //   // Add any new socket notifications that aren't in server notifications yet
  //   const newSocketNotifications = socketNotifications.filter(
  //     socketNotif => !serverNotifications.some(serverNotif => serverNotif.id === socketNotif.id)
  //   );
    
  //   return [...merged, ...newSocketNotifications];
  // }, [socketNotifications, serverNotifications]);

  // Calculate unread count from merged notifications
   const unreadCount = useMemo(() => {
    return socketNotifications.filter(notification => !notification.isRead).length;
  }, [socketNotifications]);

  const navLinkClasses = "flex items-center px-3 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-150 ease-in-out";

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
    </div>
  );
};

export default DashboardLayout;