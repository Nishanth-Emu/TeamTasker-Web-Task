import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.middleware';
import {
  getMe,
  getAllUsers,
  getUsersForAssignment,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  getAdminOrPmData,
  getAdminOnlyData
} from '../controllers/user.controller'; // Adjust path if necessary

const router = Router();

// Get current user profile
router.get('/me', protect, getMe);

// Get all users with full details (Admin and Project Manager only)
router.get('/', protect, authorize(['Admin', 'Project Manager']), getAllUsers);

// Get users for task assignment (limited info)
router.get('/', protect, authorize(['Admin', 'Project Manager', 'Developer', 'Tester']), getUsersForAssignment);

// Create new user (Admin only)
router.post('/', protect, authorize(['Admin']), createUser);

// Get single user by ID (Admin and Project Manager)
router.get('/:id', protect, authorize(['Admin', 'Project Manager']), getUserById);

// Update user (Admin only, or users can update their own profile)
router.put('/:id', protect, updateUser);

// Delete user (Admin only)
router.delete('/:id', protect, authorize(['Admin']), deleteUser);

// Example: A route accessible only by Admin or Project Manager
router.get('/admin-or-pm-data', protect, authorize(['Admin', 'Project Manager']), getAdminOrPmData);

// Example: A route accessible only by Admin
router.get('/admin-only', protect, authorize(['Admin']), getAdminOnlyData);

export default router;