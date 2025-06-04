import React from 'react';
import { useNotifications } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
  type?: 'task_assigned' | 'task_updated' | 'project_updated';
}

const NotificationsPage: React.FC = () => {
  const { notifications, markAsRead, clearNotifications } = useNotifications();
  const navigate = useNavigate();

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(); // Adjust formatting as per your preference
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Your Notifications</h1>
        {notifications.length > 0 && (
          <button
            onClick={clearNotifications}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200"
          >
            Clear All
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center text-gray-600 py-10">
          <p className="text-lg mb-2">You have no notifications at the moment.</p>
          <p className="text-md">Stay tuned for updates!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border ${
                notification.read
                  ? 'bg-gray-50 border-gray-200 text-gray-600'
                  : 'bg-blue-50 border-blue-200 text-blue-800 font-semibold'
              } flex items-center justify-between transition-all duration-200 ease-in-out`}
            >
              <div className="flex-1">
                <p className={`${notification.read ? 'text-gray-600' : 'text-blue-800'} text-lg`}>
                  {notification.message}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {formatDate(notification.createdAt)}
                </p>
              </div>
              <div className="flex space-x-3 ml-4">
                {!notification.read && (
                  <button
                    onClick={() => markAsRead(notification.id)}
                    className="px-3 py-1 bg-green-500 text-white text-sm rounded-md hover:bg-green-600 transition-colors duration-200"
                  >
                    Mark as Read
                  </button>
                )}
                {notification.link && (
                  <button
                    onClick={() => handleNotificationClick(notification)}
                    className="px-3 py-1 bg-indigo-500 text-white text-sm rounded-md hover:bg-indigo-600 transition-colors duration-200"
                  >
                    {notification.read ? 'View' : 'View Details'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
