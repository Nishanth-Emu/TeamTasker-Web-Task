import { Request, Response } from 'express';
import Project from '../models/Project';
import User from '../models/User'; 
import { io } from '../index';
import { redisClient, REDIS_CACHE_TTL } from '../config/redis'; 

interface CustomRequest extends Request {
  user?: {
    id: string;
    role: 'Admin' | 'Project Manager' | 'Developer' | 'Tester' | 'Viewer';
  };
}

const userAttributes = ['id', 'username', 'email', 'role'];
const projectListCacheKey = 'allProjects';

// @route   POST /api/projects
// @desc    Create a new project
// @access  Private (Admin, Project Manager)
export const createProject = async (req: CustomRequest, res: Response): Promise<void> => {
  const { name, description, status } = req.body;

  try {
    if (!req.user || !['Admin', 'Project Manager'].includes(req.user.role)) {
      res.status(403).json({ message: 'Not authorized to create projects.' });
      return;
    }

    const project = await Project.create({
      name,
      description,
      status: status || 'Not Started',
      createdBy: req.user.id,
    });

    // Invalidate the cache for all projects after creation
    await redisClient.del(projectListCacheKey);
    console.log('Invalidated project list cache.');

    // Emit real-time event
    io.emit('projectCreated', project); // Emitting globally or to relevant users later

    res.status(201).json({ message: 'Project created successfully', project });
  } catch (error) {
    console.error('Error creating project:', error);
    if (error instanceof Error && error.name === 'SequelizeUniqueConstraintError') {
      res.status(409).json({ message: 'Project with this name already exists.' });
    } else {
      res.status(500).json({ message: 'Server error creating project.' });
    }
  }
};

// @route   GET /api/projects
// @desc    Get all projects (with caching)
// @access  Private (Any authenticated user can view)
export const getProjects = async (req: CustomRequest, res: Response): Promise<void> => {
  try {
    // Try to fetch from cache first
    const cachedProjects = await redisClient.get(projectListCacheKey);
    if (cachedProjects) {
      console.log('Serving projects from Redis cache.');
      res.status(200).json(JSON.parse(cachedProjects));
      return;
    }

    // If not in cache, fetch from database
    const projects = await Project.findAll({
      include: [{ model: User, as: 'creator', attributes: userAttributes }],
      order: [['createdAt', 'DESC']]
    });

    // Store in cache for future requests
    await redisClient.setex(projectListCacheKey, REDIS_CACHE_TTL, JSON.stringify(projects));
    console.log('Projects fetched from DB and cached.');

    res.status(200).json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Server error fetching projects.' });
  }
};


export const getProjectById = async (req: CustomRequest, res: Response): Promise<void> => {
  try {
    const project = await Project.findByPk(req.params.id, {
      include: [{ model: User, as: 'creator', attributes: ['id', 'username', 'email', 'role'] }],
    });

    if (!project) {
      res.status(404).json({ message: 'Project not found.' });
      return;
    }
    res.status(200).json(project);
  } catch (error) {
    console.error('Error fetching project by ID:', error);
    res.status(500).json({ message: 'Server error fetching project.' });
  }
};


// @route   PUT /api/projects/:id
// @desc    Update a project
// @access  Private (Admin, Project Manager, or project creator)
export const updateProject = async (req: CustomRequest, res: Response): Promise<void> => {
  const { name, description, status } = req.body;
  const { id } = req.params;

  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated.' });
      return;
    }

    const project = await Project.findByPk(id);
    if (!project) {
      res.status(404).json({ message: 'Project not found.' });
      return;
    }

    const isAuthorized = ['Admin', 'Project Manager'].includes(req.user.role) || project.createdBy === req.user.id;

    if (!isAuthorized) {
      res.status(403).json({ message: 'Not authorized to update this project.' });
      return;
    }

    await project.update({
      name: name || project.name,
      description: description || project.description,
      status: status || project.status,
    });

    // Invalidate the cache for all projects after update
    await redisClient.del(projectListCacheKey);
    // Also invalidate specific project cache if we implemented it (future)
    // await redisClient.del(`project:${id}`);
    console.log(`Invalidated project list cache and project:${id} (if implemented).`);

    // Emit real-time event
    io.emit('projectUpdated', project);

    res.status(200).json({ message: 'Project updated successfully', project });
  } catch (error) {
    console.error('Error updating project:', error);
    if (error instanceof Error && error.name === 'SequelizeUniqueConstraintError') {
      res.status(409).json({ message: 'Project with this name already exists.' });
    } else {
      res.status(500).json({ message: 'Server error updating project.' });
    }
  }
};


// @route   DELETE /api/projects/:id
// @desc    Delete a project
// @access  Private (Admin, Project Manager, or project creator)
export const deleteProject = async (req: CustomRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated.' });
      return;
    }

    const project = await Project.findByPk(id);
    if (!project) {
      res.status(404).json({ message: 'Project not found.' });
      return;
    }

    const isAuthorized = ['Admin', 'Project Manager'].includes(req.user.role) || project.createdBy === req.user.id;

    if (!isAuthorized) {
      res.status(403).json({ message: 'Not authorized to delete this project.' });
      return;
    }

    await project.destroy();

    // Invalidate the cache for all projects after deletion
    await redisClient.del(projectListCacheKey);
    // Also invalidate specific project cache if we implemented it
    // await redisClient.del(`project:${id}`);
    console.log(`Invalidated project list cache and project:${id} (if implemented).`);


    // Emit real-time event
    io.emit('projectDeleted', { id });

    res.status(200).json({ message: 'Project deleted successfully.' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: 'Server error deleting project.' });
  }
};