import express, { Application, Request, Response } from 'express';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import sequelize from './config/database';
import User from './models/User';
import Project from './models/Project'

const app: Application = express();
const PORT: number = process.env.PORT ? parseInt(process.env.PORT as string, 10) : 5000;

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('TeamTasker Backend is running!');
});

// routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes)

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

    // sync all models
    await sequelize.sync({ alter: true });
    console.log('All models were synchronized successfully.');

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

startServer();