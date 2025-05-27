import express, { Application, Request, Response } from 'express';
import healthRoutes from './routes/health.routes'

const app: Application = express();
const PORT = 5000;

app.use(express.json());

// Basic route
app.get('/', (req: Request, res: Response) => {
  res.send('TeamTasker Backend is running!');
});

app.use('/api/health', healthRoutes);

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Press CTRL+C to stop');
});