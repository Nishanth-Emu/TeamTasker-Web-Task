import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from '../api/notification.api';
import type { Notification } from '../context/SocketContext'; 
import { Link } from 'react-router-dom';
import { ArrowPathIcon, CheckCircleIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';

const NotificationsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading, isError, error, refetch } = useQuery<Notification[], Error>({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    // Add a polling interval for unread notifications if you want to refresh automatically
    // refetchInterval: 60000, // Refetch every minute, adjust as needed
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => markNotificationAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] }); // Invalidate to refetch
    },
    onError: (err) => console.error("Failed to mark notification as read:", err),
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err) => console.error("Failed to mark all notifications as read:", err),
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId: string) => deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err) => console.error("Failed to delete notification:", err),
  });

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  const handleDeleteNotification = (id: string) => {
    if (window.confirm("Are you sure you want to delete this notification?")) {
      deleteNotificationMutation.mutate(id);
    }
  };

  if (isLoading) return <div className="p-6">Loading notifications...</div>;
  if (isError) return <div className="p-6 text-red-500">Error: {error?.message || 'Failed to load notifications'}</div>;

  const unreadNotifications = notifications?.filter(notif => !notif.isRead).length || 0;

  return (
    <div className="container mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Your Notifications ({unreadNotifications} Unread)</h1>
      <div className="mb-4 flex items-center space-x-3">
        <button
          onClick={() => markAllReadMutation.mutate()}
          disabled={markAllReadMutation.isPending || unreadNotifications === 0}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center space-x-1"
        >
          <CheckCircleIcon className="h-5 w-5" />
          <span>Mark All Read</span>
        </button>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 flex items-center space-x-1"
        >
          <ArrowPathIcon className="h-5 w-5" />
          <span>Refresh</span>
        </button>
      </div>
      {notifications?.length === 0 ? (
        <p className="text-gray-600">You have no notifications.</p>
      ) : (
        <ul className="space-y-4">
          {notifications?.map((notif) => (
            <li
              key={notif.id}
              className={`p-4 rounded-lg shadow-sm flex items-center justify-between transition-colors duration-200 ${
                notif.isRead ? 'bg-gray-50 text-gray-600' : 'bg-white border border-blue-200 shadow-md'
              }`}
            >
              <div className="flex-1">
                <p className={`font-semibold ${!notif.isRead ? 'text-blue-700' : ''}`}>{notif.message}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(notif.createdAt).toLocaleString()}
                </p>
                {notif.link && (
                  <Link to={notif.link} onClick={() => handleMarkAsRead(notif.id)} className="text-blue-500 hover:underline text-sm mt-1 block">
                    View Details
                  </Link>
                )}
              </div>
              <div className="flex space-x-2 ml-4">
                {!notif.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(notif.id)}
                    disabled={markAsReadMutation.isPending}
                    className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 disabled:opacity-50"
                    title="Mark as Read"
                  >
                    <EyeIcon className="h-5 w-5" />
                  </button>
                )}
                <button
                  onClick={() => handleDeleteNotification(notif.id)}
                  disabled={deleteNotificationMutation.isPending}
                  className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-50"
                  title="Delete Notification"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default NotificationsPage;