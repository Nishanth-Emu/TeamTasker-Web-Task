import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import User from '../models/User';

const generateToken = (id: string, role: string): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables. Please ensure it is set.');
  }

  const expiresInValue: string = process.env.JWT_EXPIRES_IN || '1h';

  const options: SignOptions = {
    expiresIn: expiresInValue as any,
  };

  return jwt.sign({ id, role }, secret, options);
};

export const registerUser = async (req: Request, res: Response): Promise<void> => {
  const { username, email, password, role } = req.body;

  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      res.status(409).json({ message: 'User with this email already exists.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      username,
      email,
      passwordHash,
      role: role || 'Viewer',
    });

    const token = generateToken(newUser.id, newUser.role);

    res.status(201).json({
      message: 'User registered successfully',
      token,
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

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid credentials.' });
      return;
    }

    const token = generateToken(user.id, user.role);

    res.status(200).json({
      message: 'Logged in successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
};