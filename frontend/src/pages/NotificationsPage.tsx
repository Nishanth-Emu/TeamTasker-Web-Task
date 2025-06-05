import React from 'react';
import { useNotifications } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import {
  BellIcon,
  BellSlashIcon,
  CheckCircleIcon,
  EyeIcon,
  TrashIcon,
  InformationCircleIcon,
  UserPlusIcon,
  PencilSquareIcon,
  BriefcaseIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';

interface Notification {
  id: string;
  message: string;
  link?: string;
  projectId?: string;
  read: boolean;
  createdAt: string;
  type?: 'task_assigned' | 'task_updated' | 'project_updated' | string; // Allow other string types
}

const NotificationsPage: React.FC = () => {
  const { notifications, markAsRead, clearNotifications } = useNotifications();
  const navigate = useNavigate();

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.link) {
      let targetPath = notification.link;
      if (notification.link.startsWith('/tasks/') && notification.projectId) {
        targetPath = `/dashboard/projects/${notification.projectId}/tasks`;
      }
      navigate(targetPath);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    };
    return date.toLocaleString(undefined, options);
  };

  const getNotificationIcon = (type?: Notification['type']) => {
    switch (type) {
      case 'task_assigned':
        return <UserPlusIcon className="h-6 w-6 text-sky-600" />;
      case 'task_updated':
        return <PencilSquareIcon className="h-6 w-6 text-amber-600" />;
      case 'project_updated':
        return <BriefcaseIcon className="h-6 w-6 text-purple-600" />;
      default:
        return <InformationCircleIcon className="h-6 w-6 text-slate-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 selection:bg-blue-500 selection:text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 md:mb-10 gap-4">
          <div className="flex items-center">
            <BellIcon className="h-9 w-9 text-blue-600 mr-3 hidden sm:block" />
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Your Notifications</h1>
          </div>
          {notifications.length > 0 && (
            <button
              onClick={clearNotifications}
              className="flex items-center px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-50 transition-colors duration-150 ease-in-out"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Clear All
            </button>
          )}
        </header>

        {notifications.length === 0 ? (
          <div className="text-center py-16 sm:py-24 flex flex-col items-center justify-center bg-white rounded-xl shadow-md border border-slate-200/70">
            <BellSlashIcon className="h-20 w-20 text-slate-400 mb-6" />
            <p className="text-2xl font-semibold text-slate-700 mb-2">No New Notifications</p>
            <p className="text-slate-500 max-w-md text-center">
              You're all caught up! We'll let you know when there's something new.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200/80 overflow-hidden">
            <ul className="divide-y divide-slate-200">
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={`
                    p-4 sm:p-6 transition-all duration-200 ease-in-out group
                    ${notification.read ? 'bg-white hover:bg-slate-50' : 'bg-sky-50 hover:bg-sky-100 border-l-4 border-sky-500'}
                  `}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`flex-shrink-0 p-2 rounded-full ${notification.read ? 'bg-slate-100 group-hover:bg-slate-200' : 'bg-sky-100 group-hover:bg-sky-200'}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm sm:text-base leading-relaxed ${notification.read ? 'text-slate-700' : 'text-sky-800 font-medium'}`}>
                        {notification.message}
                      </p>
                      <p className={`text-xs sm:text-sm mt-1.5 ${notification.read ? 'text-slate-500' : 'text-sky-600'}`}>
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex flex-col sm:flex-row items-end sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 ml-2 sm:ml-4">
                      {!notification.read && (
                        <button
                          onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                          className="flex items-center justify-center w-full sm:w-auto px-3 py-1.5 bg-green-500 text-white text-xs sm:text-sm font-medium rounded-md shadow-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 transition-colors"
                          aria-label="Mark as read"
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-1.5 hidden sm:inline" />
                          Mark Read
                        </button>
                      )}
                      {notification.link && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleNotificationClick(notification); }}
                          className="flex items-center justify-center w-full sm:w-auto px-3 py-1.5 bg-indigo-500 text-white text-xs sm:text-sm font-medium rounded-md shadow-sm hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 transition-colors"
                          aria-label={notification.read ? 'View notification details' : 'View details and mark as read'}
                        >
                          {notification.read ? <EyeIcon className="h-4 w-4 mr-1.5 hidden sm:inline" /> : <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-1.5 hidden sm:inline" />}
                          {notification.read ? 'View' : 'View Details'}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;