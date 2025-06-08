import axios from './axios'; 

interface NotificationResponse {
  id: string;
  userId: string;
  message: string;
  type: string;
  itemId?: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  link?: string;
}

export const getNotifications = async (): Promise<NotificationResponse[]> => {
  const response = await axios.get('/notifications');
  return response.data;
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  await axios.put(`/notifications/${notificationId}/read`);
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
  await axios.put('/notifications/mark-all-read');
};

export const deleteNotification = async (notificationId: string): Promise<void> => {
  await axios.delete(`/notifications/${notificationId}`);
};