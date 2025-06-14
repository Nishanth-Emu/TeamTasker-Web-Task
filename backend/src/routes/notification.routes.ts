import { Router } from 'express';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from '../controllers/notification.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.get('/', protect, getNotifications);
router.put('/mark-all-read', protect, markAllNotificationsAsRead); 
router.put('/:id/read', protect, markNotificationAsRead);         
router.delete('/:id', protect, deleteNotification);


export default router;