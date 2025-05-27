import { Router, Request, Response } from 'express';

const router = Router();

router.get('/ping', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Pong! Backend is healthy.' });
});

export default router;