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
    methods: ['GET', 'POST'],
  },
});


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


// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`A user connected: ${socket.id}`);

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
  });
});

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

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

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