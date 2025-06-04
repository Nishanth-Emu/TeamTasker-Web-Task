// existing index.ts with notification features integrated

import express, { Application, Request, Response } from 'express';
import { createServer } from 'http'; 
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';

import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import projectRoutes from './routes/project.routes';
import taskRoutes from './routes/task.routes';

import sequelize from './config/database';
import User from './models/User';
import Project from './models/Project'
import Task from './models/Task';

const app: Application = express();
const PORT: number = process.env.PORT ? parseInt(process.env.PORT as string, 10) : 5000;

const httpServer = createServer(app);

// Initialize Socket.IO server
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*', 
    methods: ["GET", "POST"],
  },
});

// Map to store connected users' socket IDs for notifications
const connectedUsers = new Map<string, string>(); // userId -> socketId

app.use(express.json());

app.use(cors());

app.get('/', (req: Request, res: Response) => {
  res.send('TeamTasker Backend is running!');
});

// routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes); 

// Socket.IO connection handling with notification features
io.on('connection', (socket) => {
  console.log(`A user connected: ${socket.id}`);

  // Handle user registration for notifications
  socket.on('registerUser', (userId: string) => {
    connectedUsers.set(userId, socket.id);
    console.log(`User ${userId} registered with socket ${socket.id}`);
    console.log('Connected users:', connectedUsers);
  });

  socket.on('joinProject', (projectId: string) => {
    socket.join(projectId);
    console.log(`User ${socket.id} joined project room: ${projectId}`);
  });

  socket.on('leaveProject', (projectId: string) => {
    socket.leave(projectId);
    console.log(`User ${socket.id} left project room: ${projectId}`);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    // Remove user from connectedUsers map
    for (let [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        console.log(`User ${userId} unregistered.`);
        break;
      }
    }
    console.log('Connected users after disconnect:', connectedUsers);
  });

  // Handle unregistering a user explicitly (e.g., on logout)
  socket.on('unregisterUser', (userId: string) => {
    if (connectedUsers.get(userId) === socket.id) {
      connectedUsers.delete(userId);
      console.log(`User ${userId} explicitly unregistered.`);
    }
    console.log('Connected users after unregister:', connectedUsers);
  });
});

// Function to send a notification to a specific user
export const sendNotificationToUser = (userId: string, notification: { id: string; message: string; link?: string; read: boolean; createdAt: string; type?: string }) => {
  const socketId = connectedUsers.get(userId);
  if (socketId) {
    io.to(socketId).emit('newNotification', notification);
    console.log(`Notification sent to user ${userId} (socket ${socketId}):`, notification.message);
  } else {
    console.log(`User ${userId} is not currently connected. Notification not sent via socket.`);
    // In a full production app, you might save this to a DB for later delivery
  }
};

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Explicitly sync the User model
    await User.sync({ alter: true });
    console.log('User model synchronized successfully.');
    
    // Sync the Project model
    await Project.sync({ alter: true }); 
    console.log('Project model synchronized successfully.');

    // Sync the Task model
    await Task.sync({ alter: true });
    console.log('Task model synchronized successfully.');

    // sync all models
    await sequelize.sync({ alter: true });
    console.log('All models were synchronized successfully.');

    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Socket.IO is listening on port ${PORT}`);
      console.log('Press CTRL+C to stop');
    });
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

startServer();

export { io };