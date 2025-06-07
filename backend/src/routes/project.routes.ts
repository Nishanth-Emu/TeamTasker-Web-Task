import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.middleware';
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
} from '../controllers/project.controller';

const router = Router();

router.use(protect); 

router.post('/', authorize(['Admin', 'Project Manager']), createProject);

router.get('/', getProjects);

router.get('/:id', getProjectById);

router.put('/:id', updateProject);

router.patch('/:id', updateProject);

router.delete('/:id', deleteProject);

export default router;