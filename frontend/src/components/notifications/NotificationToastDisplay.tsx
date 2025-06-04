// NotificationToastDisplay.tsx
import React, { useEffect } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const NotificationToastDisplay: React.FC = () => {
  const { notifications, markAsRead } = useNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    console.log("NotificationToastDisplay useEffect running. Current notifications:", notifications); // <--- ADD THIS LOG

    const unreadAndUndisplayedNotifications = notifications.filter(
      n => !n.read && !n.id.startsWith('toast_')
    );

    console.log("Notifications to display as toast:", unreadAndUndisplayedNotifications); // <--- ADD THIS LOG

    unreadAndUndisplayedNotifications.forEach(notification => {
      console.log(`Attempting to show toast for:`, notification.message); // <--- ADD THIS LOG
      toast.info(notification.message, {
        id: `toast_${notification.id}`,
        duration: 8000,
        action: notification.link ? {
          label: 'View',
          onClick: () => {
            markAsRead(notification.id);
            navigate(notification.link!);
          },
        } : undefined,
        onDismiss: () => {
            console.log(`Toast for notification ${notification.id} dismissed.`);
        },
      });
    });
  }, [notifications, markAsRead, navigate]);

  return null;
};

export default NotificationToastDisplay;