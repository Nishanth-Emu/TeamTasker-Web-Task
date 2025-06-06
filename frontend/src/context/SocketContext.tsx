import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

export interface Notification {
  id: string;
  message: string;
  link?: string;
  projectId?: string;
  isRead: boolean;
  createdAt: string;
  type?: string;
}

interface SocketContextType {
  socket: Socket | null;
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  markNotificationAsReadLocally: (notificationId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user && user.id) {
      const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_SERVER_URL || 'http://localhost:5000';
      const newSocket = io(SOCKET_SERVER_URL);

      newSocket.on('connect', () => {
        console.log('Socket.IO connected:', newSocket.id);
        newSocket.emit('registerUser', user.id);
      });

      newSocket.on('newNotification', (notification: Notification) => {
        console.log('New notification received:', notification);
        setNotifications((prevNotifications) => [notification, ...prevNotifications]);
      });

      newSocket.on('disconnect', () => {
        console.log('Socket.IO disconnected.');
        if (user && user.id) {
          newSocket.emit('unregisterUser', user.id);
        }
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
      });

      return () => {
        if (newSocket) {
          if (user && user.id) {
            newSocket.emit('unregisterUser', user.id);
          }
          newSocket.disconnect();
          setSocket(null);
        }
      };
    } else {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    }
  }, [user]);

  const addNotification = (notification: Notification) => {
    setNotifications((prevNotifications) => [notification, ...prevNotifications]);
  };

  const markNotificationAsReadLocally = (notificationId: string) => {
    setNotifications((prevNotifications) =>
      prevNotifications.map((notif) =>
        notif.id === notificationId ? { ...notif, isRead: true } : notif
      )
    );
  };

  return (
    <SocketContext.Provider value={{ socket, notifications, addNotification, markNotificationAsReadLocally }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};