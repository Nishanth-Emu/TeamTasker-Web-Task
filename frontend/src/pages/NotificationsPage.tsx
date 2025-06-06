import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from '../api/notification.api';
import type { Notification } from '../context/SocketContext';
import { useSocket } from '../context/SocketContext';
import { Link } from 'react-router-dom';
import ConfirmDeleteDialog from '../components/common/ConfirmDeleteDialog';

import {
  BellIcon,
  ArrowPathIcon,
  TrashIcon,
  EyeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BellSlashIcon
} from '@heroicons/react/24/outline';

const NotificationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { markAllAsReadLocally } = useSocket();

  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<Notification | null>(null);

  const { data: notifications, isLoading, isError, error, refetch } = useQuery<Notification[], Error>({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => markNotificationAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err) => console.error("Failed to mark notification as read:", err),
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      markAllAsReadLocally();
    },
    onError: (err) => console.error("Failed to mark all notifications as read:", err),
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId: string) => deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setIsConfirmDeleteDialogOpen(false);
      setNotificationToDelete(null);
    },
    onError: (err) => {
      console.error("Failed to delete notification:", err);
      setIsConfirmDeleteDialogOpen(false);
      setNotificationToDelete(null);
    },
  });

  useEffect(() => {
    const hasUnread = notifications?.some(n => !n.isRead);

    if (hasUnread) {
      markAllReadMutation.mutate();
    }
  }, [notifications]);

  const handleMarkAsRead = useCallback((id: string) => {
    if (notifications?.find(n => n.id === id && !n.isRead)) {
      markAsReadMutation.mutate(id);
    }
  }, [notifications, markAsReadMutation]);

  const openDeleteConfirmDialog = useCallback((notification: Notification) => {
    setNotificationToDelete(notification);
    setIsConfirmDeleteDialogOpen(true);
  }, []);

  const handleConfirmDeleteNotification = useCallback(() => {
    if (notificationToDelete) {
      deleteNotificationMutation.mutate(notificationToDelete.id);
    }
  }, [notificationToDelete, deleteNotificationMutation]);


  const unreadNotificationsCount = notifications?.filter(notif => !notif.isRead).length || 0;

  if (isLoading && !notifications) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center text-slate-600 bg-slate-50">
        <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-lg font-medium">Loading Notifications...</p>
        <p className="text-sm">Fetching your latest updates.</p>
      </div>
    );
  }

  if (isError && !notifications) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center text-red-600 bg-red-50 p-8 rounded-lg">
        <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-xl font-semibold mb-2">Error Loading Notifications</p>
        <p className="text-sm text-red-700 text-center mb-4">{error?.message || "An unexpected error occurred."}</p>
        <button
          onClick={() => refetch()}
          className="flex items-center px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-md hover:bg-red-600 transition-colors"
        >
          <ArrowPathIcon className="h-4 w-4 mr-2" />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 selection:bg-blue-500 selection:text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <header className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center mb-1">
                <BellIcon className="h-8 w-8 text-blue-600 mr-3 hidden sm:block" />
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Notifications</h1>
              </div>
              <p className="text-sm text-slate-500 ml-0 sm:ml-11">
                {unreadNotificationsCount > 0
                  ? `You have ${unreadNotificationsCount} unread notification${unreadNotificationsCount === 1 ? '' : 's'}.`
                  : 'All caught up! No new notifications.'}
              </p>
            </div>
            <div className="flex items-center space-x-3 flex-shrink-0 w-full sm:w-auto">
              <button
                onClick={() => refetch()}
                disabled={isLoading}
                className="w-1/2 sm:w-auto flex items-center justify-center px-4 py-2.5 bg-slate-200 text-slate-700 rounded-lg shadow-sm hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-100 disabled:opacity-60 transition-all text-sm font-medium"
              >
                <ArrowPathIcon className={`h-5 w-5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </header>

        {isLoading && notifications && (
          <div className="text-center text-sm text-slate-500 mb-4 py-2 flex items-center justify-center">
            <ArrowPathIcon className="animate-spin h-4 w-4 mr-2 text-blue-500" />
            Refreshing notifications...
          </div>
        )}
          {isError && notifications && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-red-500" />
            Could not refresh notifications. Displaying last known data.
          </div>
        )}

        {notifications && notifications.length === 0 ? (
          <div className="text-center py-16 px-6 bg-white rounded-xl shadow-lg flex flex-col items-center justify-center">
            <BellSlashIcon className="h-16 w-16 text-slate-400 mb-6" />
            <h2 className="text-xl font-semibold text-slate-700 mb-2">No Notifications Yet</h2>
            <p className="text-slate-500 max-w-md">
              It looks like your notification tray is empty. New updates and alerts will appear here.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-xl overflow-hidden">
            <ul className="divide-y divide-slate-200">
              {notifications?.map((notif) => (
                <li
                  key={notif.id}
                  className={`p-4 sm:p-6 transition-all duration-200 ease-in-out ${
                    notif.isRead
                      ? 'bg-slate-50/60 hover:bg-slate-100/70'
                      : 'bg-white hover:bg-blue-50/30 relative'
                  }`}
                >
                  {!notif.isRead && (
                     <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500 rounded-r-full" aria-hidden="true"></span>
                   )}
                  <div className={`flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3 ${!notif.isRead ? 'pl-3 sm:pl-2' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center mb-1">
                          {!notif.isRead && <span className="inline-block h-2 w-2 bg-blue-500 rounded-full mr-2 sm:hidden" aria-label="Unread"></span>}
                        <p className={`text-sm font-semibold break-words ${notif.isRead ? 'text-slate-700' : 'text-blue-700'}`}>
                          {notif.message}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500">
                        {new Date(notif.createdAt).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {notif.link && (
                        <Link
                          to={notif.link}
                          onClick={() => handleMarkAsRead(notif.id)}
                          className="mt-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline inline-block"
                        >
                          View Details
                        </Link>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0 mt-3 sm:mt-0 self-end sm:self-center">
                      {!notif.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(notif.id)}
                          disabled={markAsReadMutation.isPending && markAsReadMutation.variables === notif.id}
                          className="p-2 rounded-full text-slate-500 hover:bg-blue-100 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
                          title="Mark as Read"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                      )}
                      {notif.isRead && (
                        <span className="p-2 rounded-full text-green-500" title="Read">
                            <CheckCircleIcon className="h-5 w-5"/>
                        </span>
                      )}
                      <button
                        onClick={() => openDeleteConfirmDialog(notif)}
                        disabled={deleteNotificationMutation.isPending && deleteNotificationMutation.variables === notif.id}
                        className="p-2 rounded-full text-slate-500 hover:bg-red-100 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-colors"
                        title="Delete Notification"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {notificationToDelete && (
        <ConfirmDeleteDialog
            isOpen={isConfirmDeleteDialogOpen}
            onClose={() => { setIsConfirmDeleteDialogOpen(false); setNotificationToDelete(null); }}
            onConfirm={handleConfirmDeleteNotification}
            title="Confirm Notification Deletion"
            message="Are you sure you want to delete this notification? This action cannot be undone."
            itemName={`Notification: "${notificationToDelete.message.substring(0, 50)}${notificationToDelete.message.length > 50 ? '...' : ''}"`}
            isDeleting={deleteNotificationMutation.isPending}
        />
      )}
    </div>
  );
};

export default NotificationsPage;