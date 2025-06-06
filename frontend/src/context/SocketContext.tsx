import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getNotifications } from '../api/notification.api'; // IMPORTED

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
  markAllAsReadLocally: () => void; // ADDED
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();

  // --- ADDED: EFFECT TO FETCH INITIAL NOTIFICATIONS ---
  useEffect(() => {
    const fetchInitialNotifications = async () => {
      if (user) {
        try {
          const initialNotifications = await getNotifications();
          setNotifications(initialNotifications);
        } catch (error) {
          console.error('Failed to fetch initial notifications:', error);
          setNotifications([]); // Set to empty array on error
        }
      } else {
        // Clear notifications when user logs out
        setNotifications([]);
      }
    };

    fetchInitialNotifications();
  }, [user]);
  // ----------------------------------------------------

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
  
  // --- ADDED: NEW FUNCTION TO MARK ALL AS READ IN LOCAL STATE ---
  const markAllAsReadLocally = () => {
    setNotifications((prevNotifications) =>
      prevNotifications.map((notif) =>
        notif.isRead ? notif : { ...notif, isRead: true }
      )
    );
  };
  // -----------------------------------------------------------------

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