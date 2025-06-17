import express, { Application, Request, Response } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { Sequelize } from 'sequelize';

// --- SERVICE AND MODEL INITIALIZERS ---
import { initializeDatabase } from './config/database';
import { initializeRedis, RedisClient } from './config/redis';
import { loadSecrets } from './config/secrets';
// --- THIS IS THE NEW REQUIRED IMPORT ---
import { initializeModels } from './models/index'; // Assumes you created src/models/index.ts

// --- ROUTE IMPORTS ---
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import projectRoutes from './routes/project.routes';
import taskRoutes from './routes/task.routes';
import notificationRoutes from './routes/notification.routes';

// --- TOP-LEVEL INSTANCE DECLARATIONS ---
let sequelize: Sequelize;
let redisClient: RedisClient;
export let REDIS_CACHE_TTL: number;

const app: Application = express();
const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ["GET", "POST"],
  },
});

// --- MIDDLEWARE & ROUTE REGISTRATION ---
app.use(express.json());
app.use(cors());

app.get('/', (req: Request, res: Response) => {
  res.send('TeamTasker Backend is running!');
});

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);

// --- SOCKET.IO LOGIC ---
const connectedUsers = new Map<string, string>();
// ... (Your existing io.on('connection', ...) logic remains here)
io.on('connection', (socket) => {
  console.log(`A user connected: ${socket.id}`);

  socket.on('registerUser', (userId: string) => {
    connectedUsers.set(userId, socket.id);
    console.log(`User ${userId} registered with socket ${socket.id}. Total connected: ${connectedUsers.size}`);
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
    for (const [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        console.log(`User ${userId} unregistered due to disconnect.`);
        break;
      }
    }
  });

  socket.on('unregisterUser', (userId: string) => {
    if (connectedUsers.get(userId) === socket.id) {
      connectedUsers.delete(userId);
      console.log(`User ${userId} explicitly unregistered.`);
    }
  });
});


export const sendNotificationToUser = (userId: string, notification: { id: string; message: string; link?: string; read: boolean; createdAt: string; type?: string }) => {
    // ... (Your existing sendNotificationToUser logic remains here)
};

// --- ASYNCHRONOUS SERVER STARTUP ---
const startServer = async () => {
  try {
    console.log('Attempting to load application secrets...');
    const secrets = await loadSecrets();
    console.log('Secrets loaded successfully.');

    // Step 1: Create the Sequelize instance
    console.log('Initializing database connection...');
    sequelize = initializeDatabase(secrets);

    // --- STEP 2: THIS IS THE NEW REQUIRED STEP ---
    // Initialize all models and set up their associations.
    // This function populates the `sequelize` instance with your models.
    console.log('Initializing all database models...');
    initializeModels(sequelize);

    // Step 3: Initialize other services like Redis
    console.log('Initializing Redis client...');
    redisClient = initializeRedis(secrets);
    REDIS_CACHE_TTL = secrets.REDIS_CACHE_TTL;
    console.log(`Global cache TTL set to: ${REDIS_CACHE_TTL} seconds.`);

    // Step 4: Verify database connection and sync models
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // This sync call will now work correctly because initializeModels
    // has registered all your models with the sequelize instance.
    await sequelize.sync({ alter: true });
    console.log('All models were synchronized successfully.');

    // Step 5: Start the server
    const appPort = secrets.PORT;
    httpServer.listen(appPort, () => {
      console.log(`🚀 Server is running on port ${appPort}`);
      console.log(`🔌 Socket.IO is listening on port ${appPort}`);
      console.log('Press CTRL+C to stop');
    });

  } catch (error) {
    console.error('❌ FATAL: Failed to start the server:', error);
    process.exit(1);
  }
};

// --- START THE APPLICATION ---
startServer();

// --- EXPORT INITIALIZED INSTANCES ---
export { io, redisClient };