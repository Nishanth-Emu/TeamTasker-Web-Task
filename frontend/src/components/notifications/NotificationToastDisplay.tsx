import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/20/solid';
import { useSocket, type Notification } from '../../context/SocketContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markNotificationAsRead } from '../../api/notification.api';
import { useNavigate } from 'react-router-dom';

interface NotificationToastProps {
  notification: Notification;
  onClose: (id: string) => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onClose }) => {
  const queryClient = useQueryClient();
  const { markNotificationAsReadLocally } = useSocket();
  const navigate = useNavigate();

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => markNotificationAsRead(notificationId),
    onSuccess: (_data, notificationId) => {
      console.log('Notification marked as read on backend:', notificationId);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      markNotificationAsReadLocally(notificationId);
      onClose(notificationId);
    },
    onError: (error) => {
      console.error('Error marking notification as read:', error);
    },
  });

  const handleMarkAsRead = () => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
  };

  const handleClick = () => {
    handleMarkAsRead();
    if (notification.link) {
      navigate(notification.link);
    }
    onClose(notification.id);
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
  const { notifications: realTimeNotifications } = useSocket();
  const [visibleNotifications, setVisibleNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (realTimeNotifications.length > 0) {
      const latestNotification = realTimeNotifications[0];
      if (!visibleNotifications.some(notif => notif.id === latestNotification.id)) {
        setVisibleNotifications((prevVisible) => {
          const newVisible = [latestNotification, ...prevVisible];

          setTimeout(() => {
            handleCloseToast(latestNotification.id);
          }, 6000);

          return newVisible;
        });
      }
    }
  }, [realTimeNotifications]);

  const handleCloseToast = (idToClose: string) => {
    setVisibleNotifications((prevVisible) =>
      prevVisible.filter((notif) => notif.id !== idToClose)
    );
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 max-h-[80vh] overflow-y-auto p-2 bg-transparent pointer-events-none">
      <div className="space-y-3">
        {visibleNotifications.map((notif) => (
          <div key={notif.id} className="pointer-events-auto">
            <NotificationToast
              notification={notif}
              onClose={handleCloseToast}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationToastDisplay;