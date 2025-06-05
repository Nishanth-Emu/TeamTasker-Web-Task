import { Request, Response } from 'express';
import Notification from '../models/Notification'; 
import { Op } from 'sequelize'; // For Sequelize operators like 'not' or 'in'

interface CustomRequest extends Request {
  user?: {
    id: string;
    role: 'Admin' | 'Project Manager' | 'Developer' | 'Tester' | 'Viewer';
  };
}

// @route   GET /api/notifications
// @desc    Get all notifications for the authenticated user
// @access  Private
export const getNotifications = async (req: CustomRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated.' });
      return;
    }

    const notifications = await Notification.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 50, // Limits to the last 50 notifications
    });

    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error fetching notifications.' });
  }
};

// @route   PUT /api/notifications/:id/read
// @desc    Mark a notification as read
// @access  Private
export const markNotificationAsRead = async (req: CustomRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated.' });
      return;
    }

    const { id } = req.params;

    const [updatedRows] = await Notification.update(
      { isRead: true },
      {
        where: {
          id: id,
          userId: req.user.id, // Ensure only the owner can mark their notification as read
          isRead: false, // Only update if it's not already read
        },
      }
    );

    if (updatedRows === 0) {
      // Condition for 404: Notification not found, not owned by user, or already marked as read
      res.status(404).json({ message: 'Notification not found or already read.' });
      return;
    }

    res.status(200).json({ message: 'Notification marked as read.' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server error marking notification as read.' });
  }
};

// @route   PUT /api/notifications/mark-all-read
// @desc    Mark all unread notifications for the authenticated user as read
// @access  Private
export const markAllNotificationsAsRead = async (req: CustomRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated.' });
      return;
    }

    await Notification.update(
      { isRead: true },
      {
        where: {
          userId: req.user.id,
          isRead: false,
        },
      }
    );

    res.status(200).json({ message: 'All unread notifications marked as read.' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Server error marking all notifications as read.' });
  }
};

// @route   DELETE /api/notifications/:id
// @desc    Delete a specific notification for the authenticated user
// @access  Private
export const deleteNotification = async (req: CustomRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated.' });
      return;
    }

    const { id } = req.params;

    const deletedRows = await Notification.destroy({
      where: {
        id: id,
        userId: req.user.id, // Ensure only the owner can delete their notification
      },
    });

    if (deletedRows === 0) {
      res.status(404).json({ message: 'Notification not found or not owned by user.' });
      return;
    }

    res.status(200).json({ message: 'Notification deleted successfully.' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Server error deleting notification.' });
  }
};