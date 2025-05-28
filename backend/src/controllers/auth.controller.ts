import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User'; // Import the User model

// Register a new user
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  const { username, email, password, role } = req.body;

  try {
    // 1. Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
       res.status(409).json({ message: 'User with this email already exists.' });
       return
    }

    // 2. Hash the password
    const salt = await bcrypt.genSalt(10); // Generate a salt (random string)
    const passwordHash = await bcrypt.hash(password, salt); // Hash the password with the salt

    // 3. Create the new user in the database
    const newUser = await User.create({
      username,
      email,
      passwordHash,
      role: role || 'Viewer', // Use provided role or default to 'Viewer'
    });

    // 4. Send a success response (excluding password hash for security)
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
};

// More authentication functions (like login) will go here later.