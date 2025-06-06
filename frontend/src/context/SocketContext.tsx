import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getNotifications } from '../api/notification.api';


const notificationSound = new Audio('/notification.mp3');

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
  markAllAsReadLocally: () => void;
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
    const fetchInitialNotifications = async () => {
      if (user) {
        try {
          const initialNotifications = await getNotifications();
          setNotifications(initialNotifications);
        } catch (error) {
          console.error('Failed to fetch initial notifications:', error);
          setNotifications([]);
        }
      } else {
        setNotifications([]);
      }
    };

    fetchInitialNotifications();
  }, [user]);

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
        notificationSound.play().catch(error => {
          console.warn("Notification sound was blocked by the browser:", error);
        });
      });

      newSocket.on('disconnect', () => {
        console.log('Socket.IO disconnected.');
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
      });
      
      setSocket(newSocket);

      return () => {
        if (newSocket) {
          newSocket.disconnect();
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
  
  const markAllAsReadLocally = () => {
    setNotifications((prevNotifications) =>
      prevNotifications.map((notif) =>
        notif.isRead ? notif : { ...notif, isRead: true }
      )
    );
  };

  return (
    <SocketContext.Provider value={{ socket, notifications, addNotification, markNotificationAsReadLocally, markAllAsReadLocally }}>
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