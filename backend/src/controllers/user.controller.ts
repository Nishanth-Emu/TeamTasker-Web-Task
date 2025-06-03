import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import User from '../models/User'; 

// Extend the Request interface to include the user property from your auth middleware
interface CustomRequest extends Request {
  user?: {
    id: string;
    role: 'Admin' | 'Project Manager' | 'Developer' | 'Tester' | 'Viewer';
  };
}

// @desc    Get current user profile
// @route   GET /api/users/me
// @access  Private
export const getMe = async (req: CustomRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({ message: 'User not authenticated.' });
      return;
    }
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['passwordHash'] }
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
};

// @desc    Get all users with full details
// @route   GET /api/users/all
// @access  Private (Admin and Project Manager only)
export const getAllUsers = async (req: CustomRequest, res: Response): Promise<void> => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['passwordHash'] },
      order: [['createdAt', 'DESC']]
    });
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ message: 'Server error fetching users.' });
  }
};

// @desc    Get users for task assignment (limited info)
// @route   GET /api/users
// @access  Private (Admin, Project Manager, Developer, Tester)
export const getUsersForAssignment = async (req: CustomRequest, res: Response): Promise<void> => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username'],
      where: {
        role: {
          [Op.in]: ['Admin', 'Project Manager', 'Developer', 'Tester']
        }
      }
    });
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error fetching users.' });
  }
};

// @desc    Create new user
// @route   POST /api/users
// @access  Private (Admin only)
export const createUser = async (req: CustomRequest, res: Response): Promise<void> => {
  try {
    const { username, email, password, role } = req.body;

    // Validation
    if (!username || !email || !password || !role) {
      res.status(400).json({ message: 'All fields are required.' });
      return;
    }

    // Validate role
    const validRoles = ['Admin', 'Project Manager', 'Developer', 'Tester', 'Viewer'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ message: 'Invalid role specified.' });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { username }]
      }
    });

    if (existingUser) {
      res.status(400).json({
        message: existingUser.email === email ? 'Email already exists.' : 'Username already exists.'
      });
      return;
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = await User.create({
      username,
      email,
      passwordHash,
      role
    });

    // Return user without password hash
    const userResponse = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt
    };

    res.status(201).json({
      message: 'User created successfully.',
      user: userResponse
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Server error creating user.' });
  }
};

// @desc    Get single user by ID
// @route   GET /api/users/:id
// @access  Private (Admin and Project Manager)
export const getUserById = async (req: CustomRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: { exclude: ['passwordHash'] }
    });

    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error fetching user.' });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin or user's own profile)
export const updateUser = async (req: CustomRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { username, email, password, role } = req.body;

    // Check if user exists
    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    // Authorization check: Admin can edit anyone, users can edit themselves
    const isAdmin = req.user?.role === 'Admin';
    const isOwnProfile = req.user?.id === id;

    if (!isAdmin && !isOwnProfile) {
      res.status(403).json({ message: 'Access denied. You can only edit your own profile.' });
      return;
    }

    // Non-admin users cannot change their role
    if (!isAdmin && role && role !== user.role) {
      res.status(403).json({ message: 'Access denied. You cannot change your role.' });
      return;
    }

    // Validate role if provided
    if (role && isAdmin) {
      const validRoles = ['Admin', 'Project Manager', 'Developer', 'Tester', 'Viewer'];
      if (!validRoles.includes(role)) {
        res.status(400).json({ message: 'Invalid role specified.' });
        return;
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (username && username !== user.username) {
      // Check if username is already taken
      const existingUser = await User.findOne({ where: { username, id: { [Op.ne]: id } } });
      if (existingUser) {
        res.status(400).json({ message: 'Username already exists.' });
        return;
      }
      updateData.username = username;
    }

    if (email && email !== user.email) {
      // Check if email is already taken
      const existingUser = await User.findOne({ where: { email, id: { [Op.ne]: id } } });
      if (existingUser) {
        res.status(400).json({ message: 'Email already exists.' });
        return;
      }
      updateData.email = email;
    }

    if (password) {
      // Hash new password
      const saltRounds = 12;
      updateData.passwordHash = await bcrypt.hash(password, saltRounds);
    }

    if (role && isAdmin) {
      updateData.role = role;
    }

    // Update user if there are changes
    if (Object.keys(updateData).length > 0) {
      await user.update(updateData);
    }

    // Return updated user without password hash
    const updatedUser = await User.findByPk(id, {
      attributes: { exclude: ['passwordHash'] }
    });

    res.status(200).json({
      message: 'User updated successfully.',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error updating user.' });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
export const deleteUser = async (req: CustomRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (req.user?.id === id) {
      res.status(400).json({ message: 'You cannot delete your own account.' });
      return;
    }

    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    await user.destroy();

    res.status(200).json({ message: 'User deleted successfully.' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error deleting user.' });
  }
};

// @desc    Admin or Project Manager specific data
// @route   GET /api/users/admin-or-pm-data
// @access  Private (Admin or Project Manager only)
export const getAdminOrPmData = (req: CustomRequest, res: Response): void => {
  res.status(200).json({
    message: `Welcome, ${req.user?.role}! This data is for Admin or Project Managers only.`,
    userId: req.user?.id,
    userRole: req.user?.role
  });
};

// @desc    Admin specific data
// @route   GET /api/users/admin-only
// @access  Private (Admin only)
export const getAdminOnlyData = (req: CustomRequest, res: Response): void => {
  res.status(200).json({
    message: `Hello, Admin! This is highly sensitive admin-only data.`,
    userId: req.user?.id,
    userRole: req.user?.role
  });
};