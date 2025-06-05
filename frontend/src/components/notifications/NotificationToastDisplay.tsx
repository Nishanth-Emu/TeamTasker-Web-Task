import React, { useEffect } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const NotificationToastDisplay: React.FC = () => {
  const { notifications, markAsRead } = useNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    const unreadAndUndisplayedNotifications = notifications.filter(
      n => !n.read && !n.id.startsWith('toast_')
    );

    unreadAndUndisplayedNotifications.forEach(notification => {
      toast.info(notification.message, {
        id: `toast_${notification.id}`,
        duration: 4000,
        action: notification.link ? {
          label: 'View',
          onClick: () => {
            markAsRead(notification.id);
            navigate(notification.link!);
          },
        } : undefined,
        onDismiss: () => {
        },
      });
    });
  }, [notifications, markAsRead, navigate]);

  return null;
};

export default NotificationToastDisplay;