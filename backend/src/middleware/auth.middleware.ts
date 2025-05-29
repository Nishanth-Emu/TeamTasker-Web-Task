import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';


interface CustomRequest extends Request {
  user?: {
    id: string;
    role: 'Admin' | 'Project Manager' | 'Developer' | 'Tester' | 'Viewer';
  };
}

// Middleware to protect routes (authenticate JWT)
export const protect = (req: CustomRequest, res: Response, next: NextFunction): void => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Ensure JWT_SECRET is defined
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined');
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as { id: string; role: string };

      // Attach user (id and role) to the request object
      req.user = { id: decoded.id, role: decoded.role as 'Admin' | 'Project Manager' | 'Developer' | 'Tester' | 'Viewer' };

      next(); // Proceed to the next middleware/route handler
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(401).json({ message: 'Not authorized, token failed.' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token.' });
  }
};

// Middleware to restrict access based on roles (RBAC)
export const authorize = (roles: Array<'Admin' | 'Project Manager' | 'Developer' | 'Tester' | 'Viewer'>) => {
  return (req: CustomRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !req.user.role) {
      res.status(403).json({ message: 'Not authorized, no user role.' });
      return;
    }

    // Check if the user's role is included in the allowed roles for this route
    if (roles.includes(req.user.role)) {
      next(); // User has the required role, proceed
    } else {
      res.status(403).json({ message: 'Not authorized, insufficient role.' });
    }
  };
};