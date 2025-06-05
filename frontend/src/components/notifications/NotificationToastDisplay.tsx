import React from 'react';
import { XMarkIcon } from '@heroicons/react/20/solid'; // Assuming you use heroicons
import { useSocket, type Notification } from '../../context/SocketContext'; // Import useSocket and Notification interface
import { useMutation, useQueryClient } from '@tanstack/react-query'; // For marking as read on backend
import { markNotificationAsRead } from '../../api/notification.api'; // We'll create this API call next
import { useNavigate } from 'react-router-dom'; // Assuming you use React Router

interface NotificationToastProps {
  notification: Notification;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notification }) => {
  const queryClient = useQueryClient();
  const { markNotificationAsReadLocally } = useSocket(); // Get local update function
  const navigate = useNavigate();

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => markNotificationAsRead(notificationId),
    onSuccess: (_data, notificationId) => {
      console.log('Notification marked as read on backend:', notificationId);
      // Invalidate the query for all notifications to refetch updated list
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      // Also update the local state in SocketContext immediately
      markNotificationAsReadLocally(notificationId);
    },
    onError: (error) => {
      console.error('Error marking notification as read:', error);
      // Potentially show an error message to the user
    },
  });

  const handleMarkAsRead = () => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
  };

  const handleClick = () => {
    handleMarkAsRead(); // Mark as read when clicked
    if (notification.link) {
      navigate(notification.link); // Navigate to the linked task/project
    }
  };

  const timeSince = (dateString: string) => {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
  };


  return (
    <div
      className={`relative p-4 mb-3 rounded-lg shadow-lg cursor-pointer ${
        notification.isRead ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-800 border border-blue-200'
      } transition-all duration-300`}
      onClick={handleClick}
    >
      {!notification.isRead && (
        <button
          onClick={(e) => { e.stopPropagation(); handleMarkAsRead(); }}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-200"
          title="Mark as read"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      )}
      <p className="font-semibold">{notification.message}</p>
      <p className="text-sm text-gray-500 mt-1">
        {notification.type === 'task_assignment' && 'New task assigned.'}
        {notification.type === 'task_updated' && 'Task updated.'}
        {notification.type === 'task_deleted' && 'Task deleted.'}
        {notification.type === 'general' && 'General notification.'}
        <span className="ml-2 text-xs">({timeSince(notification.createdAt)})</span>
      </p>
    </div>
  );
};

const NotificationToastDisplay: React.FC = () => {
  const { notifications: realTimeNotifications } = useSocket(); // Get real-time notifications from context

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 max-h-[80vh] overflow-y-auto p-2 bg-transparent pointer-events-none">
      <div className="space-y-3">
        {realTimeNotifications.map((notif) => (
          <div key={notif.id} className="pointer-events-auto"> {/* Make individual toasts interactive */}
            <NotificationToast notification={notif} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationToastDisplay;