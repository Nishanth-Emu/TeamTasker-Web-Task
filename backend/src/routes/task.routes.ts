import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.middleware';
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
} from '../controllers/task.controller';

const router = Router();

router.use(protect);   

router.post('/', createTask);   

router.get('/', getTasks);

router.get('/:id', getTaskById);

router.put('/:id', updateTask); 
router.patch('/:id', updateTask);


router.delete('/:id', deleteTask); 

export default router;