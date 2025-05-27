import express, { Application, Request, Response } from 'express';
import healthRoutes from './routes/health.routes'
import sequelize from './config/database';

const app: Application = express();
const PORT = 5000;

app.use(express.json());

// Basic route
app.get('/', (req: Request, res: Response) => {
  res.send('TeamTasker Backend is running!');
});

app.use('/api/health', healthRoutes);

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log('Press CTRL+C to stop');
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1); // Exit process if DB connection fails
  }
};

startServer();