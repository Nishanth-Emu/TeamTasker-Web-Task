import { Router } from 'express';
import { getNotifications, markNotificationAsRead, deleteNotification } from '../controllers/notification.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.get('/', protect, getNotifications); 
router.put('/:id/read', protect, markNotificationAsRead); 
router.delete('/:id', protect, deleteNotification)

export default router;