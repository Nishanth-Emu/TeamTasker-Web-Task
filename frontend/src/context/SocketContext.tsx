import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext'; 

// Define the shape of a notification for the frontend
export interface Notification {
  id: string;
  message: string;
  link?: string;
  projectId?: string; 
  isRead: boolean;
  createdAt: string;
  type?: string; // e.g., 'task_assignment', 'task_updated', 'task_deleted'
}

interface SocketContextType {
  socket: Socket | null;
  notifications: Notification[]; // Real-time notifications received via socket
  addNotification: (notification: Notification) => void; // Function to add a notification (e.g., from an API call)
  markNotificationAsReadLocally: (notificationId: string) => void; // Function to mark as read locally
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]); // Store real-time notifications
  const { user } = useAuth(); 

  useEffect(() => {
    // Only connect if a user is logged in
    if (user && user.id) {
      const newSocket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'); 
      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('Socket.IO connected:', newSocket.id);
        // Register the user with the backend Socket.IO server
        newSocket.emit('registerUser', user.id);
      });

      // Listen for incoming real-time notifications
      newSocket.on('newNotification', (notification: Notification) => {
        console.log('New notification received:', notification);
        setNotifications((prevNotifications) => [notification, ...prevNotifications]); // Add to the top
      });

      newSocket.on('disconnect', () => {
        console.log('Socket.IO disconnected.');
        // Optionally, handle unregistration on disconnect
        if (user && user.id) {
          newSocket.emit('unregisterUser', user.id);
        }
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
      });

      return () => {
        // Clean up on component unmount or user logout
        if (newSocket) {
          if (user && user.id) {
            newSocket.emit('unregisterUser', user.id);
          }
          newSocket.disconnect();
          setSocket(null);
        }
      };
    } else {
      // If user logs out, disconnect existing socket
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    }
  }, [user]); // Re-run effect when user changes (login/logout)

  const addNotification = (notification: Notification) => {
    setNotifications((prevNotifications) => [notification, ...prevNotifications]);
  };

  const markNotificationAsReadLocally = (notificationId: string) => {
    setNotifications((prevNotifications) =>
      prevNotifications.map((notif) =>
        notif.id === notificationId ? { ...notif, read: true } : notif
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