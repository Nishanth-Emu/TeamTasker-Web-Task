import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext'; 

interface Notification {
  id: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
  type?: 'task_assigned' | 'task_updated' | 'project_updated'; // Example types
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  clearNotifications: () => void;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    // Load notifications from local storage on initial load
    if (typeof window !== 'undefined') {
      const storedNotifications = localStorage.getItem(`notifications_${user?.id}`);
      return storedNotifications ? JSON.parse(storedNotifications) : [];
    }
    return [];
  });

  useEffect(() => {
    // Save notifications to local storage whenever they change
    if (user) {
      localStorage.setItem(`notifications_${user.id}`, JSON.stringify(notifications));
    }
  }, [notifications, user]);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Socket.IO for real-time notifications
  useEffect(() => {
    if (!user) return; // Only connect if a user is logged in

    const socket = io(import.meta.env.VITE_API_BASE_URL.replace('/api', ''));

    socket.on('connect', () => {
      console.log('Notification Socket.IO Connected!');
      // Inform the server about the connected user
      socket.emit('registerUser', user.id);
    });

    socket.on('disconnect', () => {
      console.log('Notification Socket.IO Disconnected!');
    });

    socket.on('newNotification', (newNotification: Notification) => {
      console.log('New real-time notification:', newNotification);
      setNotifications(prev => [newNotification, ...prev]); // Add new to top
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('newNotification');
      socket.emit('unregisterUser', user.id); // Inform server user is disconnecting
      socket.disconnect(); // Explicitly disconnect socket
    };
  }, [user]); // Reconnect socket if user changes (e.g., login/logout)


  const addNotification = useCallback((notification: Notification) => {
    setNotifications(prev => {
      // Ensure no duplicate IDs if re-adding for some reason
      if (prev.some(n => n.id === notification.id)) return prev;
      return [notification, ...prev];
    });
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, markAsRead, clearNotifications, unreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};