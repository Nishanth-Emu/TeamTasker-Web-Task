import { Router, Request, Response } from 'express';
import { protect, authorize } from '../middleware/auth.middleware'; 
import User from '../models/User';

interface CustomRequest extends Request {
  user?: {
    id: string;
    role: 'Admin' | 'Project Manager' | 'Developer' | 'Tester' | 'Viewer';
  };
}

const router = Router();

// Example: A route accessible by any authenticated user
router.get('/me', protect, async (req: CustomRequest, res: Response): Promise<void>  => {
  try {
    if (!req.user || !req.user.id) {
       res.status(401).json({ message: 'User not authenticated.' });
       return;
    }
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['passwordHash'] } // Exclude password hash from response
    });
    if (!user) {
       res.status(404).json({ message: 'User not found.' });
       return;
    }
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ message: 'Server error fetching user data.' });
  }
});

// Example: A route accessible only by Admin or Project Manager
router.get('/admin-or-pm-data', protect, authorize(['Admin', 'Project Manager']), (req: CustomRequest, res: Response) => {
  res.status(200).json({
    message: `Welcome, ${req.user?.role}! This data is for Admin or Project Managers only.`,
    userId: req.user?.id,
    userRole: req.user?.role
  });
});

// Example: A route accessible only by Admin
router.get('/admin-only', protect, authorize(['Admin']), (req: CustomRequest, res: Response) => {
  res.status(200).json({
    message: `Hello, Admin! This is highly sensitive admin-only data.`,
    userId: req.user?.id,
    userRole: req.user?.role
  });
});

export default router;