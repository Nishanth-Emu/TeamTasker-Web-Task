import { Request, Response } from 'express';
import Project from '../models/Project';
import User from '../models/User'; 
import { io } from '../index';
import { redisClient, REDIS_CACHE_TTL } from '../config/redis';
import { Op } from 'sequelize';

interface CustomRequest extends Request {
  user?: {
    id: string;
    role: 'Admin' | 'Project Manager' | 'Developer' | 'Tester' | 'Viewer';
  };
}

const userAttributes = ['id', 'username', 'email', 'role'];

// @route   GET /api/projects
// @desc    Get all projects with filtering, sorting, and search
// @access  Private (Any authenticated user can view)
export const getProjects = async (req: CustomRequest, res: Response): Promise<void> => {
  try {
    const { status, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Create cache key that includes query parameters
    const cacheKey = `projects:${JSON.stringify({ status, search, sortBy, sortOrder })}`;

    // Try to fetch from cache first
    const cachedProjects = await redisClient.get(cacheKey);
    if (cachedProjects) {
      console.log('Serving filtered projects from Redis cache.');
      res.status(200).json(JSON.parse(cachedProjects));
      return;
    }

    // Build where clause for filtering
    const whereClause: any = {};
    
    // Status filter
    if (status && status !== 'All') {
      whereClause.status = status;
    }

    // Search filter (search in name and description) - PostgreSQL optimized
    if (search) {
      const searchTerm = String(search).trim();
      if (searchTerm) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${searchTerm}%` } },
          { description: { [Op.iLike]: `%${searchTerm}%` } }
        ];
      }
    }

    // Build order clause for sorting
    const validSortFields = ['createdAt', 'updatedAt', 'name', 'status'];
    const validSortOrders = ['asc', 'desc'];
    
    const sortField = validSortFields.includes(sortBy as string) ? sortBy as string : 'createdAt';
    const order = validSortOrders.includes(sortOrder as string) ? sortOrder as string : 'desc';

    // Special handling for sorting by creator username
    let orderClause: any;
    if (sortField === 'creator') {
      orderClause = [[{ model: User, as: 'creator' }, 'username', order.toUpperCase()]];
    } else {
      orderClause = [[sortField, order.toUpperCase()]];
    }

    // Fetch from database with filters and sorting
    const projects = await Project.findAll({
      where: whereClause,
      include: [{ 
        model: User, 
        as: 'creator', 
        attributes: userAttributes,
        required: false // LEFT JOIN instead of INNER JOIN
      }],
      order: orderClause,
      // Add these for better PostgreSQL performance
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
    });

    // Store in cache for future requests (with shorter TTL for filtered results)
    const cacheTTL = Object.keys(req.query).length > 0 ? Math.floor(REDIS_CACHE_TTL / 2) : REDIS_CACHE_TTL;
    await redisClient.setex(cacheKey, cacheTTL, JSON.stringify(projects));
    console.log('Filtered projects fetched from DB and cached.');

    res.status(200).json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Server error fetching projects.' });
  }
};

// Update cache invalidation to clear all project-related cache keys
const invalidateProjectCache = async (): Promise<void> => {
  try {
    // PostgreSQL-optimized pattern matching for Redis keys
    const keys = await redisClient.keys('projects:*');
    if (keys.length > 0) {
      // Use pipeline for better performance with multiple deletions
      const pipeline = redisClient.pipeline();
      keys.forEach(key => pipeline.del(key));
      await pipeline.exec();
      console.log(`Invalidated ${keys.length} project cache keys using pipeline.`);
    }
    
    // Also invalidate the old cache key for backward compatibility
    await redisClient.del('allProjects');
  } catch (error) {
    console.error('Error invalidating project cache:', error);
  }
};

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

    // Input validation
    if (!name || name.trim().length === 0) {
      res.status(400).json({ message: 'Project name is required.' });
      return;
    }

    const project = await Project.create({
      name: name.trim(),
      description: description?.trim() || '',
      status: status || 'Not Started',
      createdBy: req.user.id,
    });

    // Fetch the created project with creator info for consistent response
    const createdProject = await Project.findByPk(project.id, {
      include: [{ model: User, as: 'creator', attributes: userAttributes }]
    });

    // Invalidate all project-related cache
    await invalidateProjectCache();

    // Emit real-time event
    io.emit('projectCreated', createdProject);

    res.status(201).json({ message: 'Project created successfully', project: createdProject });
  } catch (error) {
    console.error('Error creating project:', error);
    if (error instanceof Error && error.name === 'SequelizeUniqueConstraintError') {
      res.status(409).json({ message: 'Project with this name already exists.' });
    } else {
      res.status(500).json({ message: 'Server error creating project.' });
    }
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

    const project = await Project.findByPk(id, {
      include: [{ model: User, as: 'creator', attributes: userAttributes }]
    });

    if (!project) {
      res.status(404).json({ message: 'Project not found.' });
      return;
    }

    const isAuthorized = ['Admin', 'Project Manager'].includes(req.user.role) || project.createdBy === req.user.id;

    if (!isAuthorized) {
      res.status(403).json({ message: 'Not authorized to update this project.' });
      return;
    }

    // Input validation
    if (name !== undefined && name.trim().length === 0) {
      res.status(400).json({ message: 'Project name cannot be empty.' });
      return;
    }

    await project.update({
      name: name ? name.trim() : project.name,
      description: description !== undefined ? description.trim() : project.description,
      status: status || project.status,
    });

    // Reload to get updated data
    await project.reload({
      include: [{ model: User, as: 'creator', attributes: userAttributes }]
    });

    // Invalidate all project-related cache
    await invalidateProjectCache();

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

    // Invalidate all project-related cache
    await invalidateProjectCache();

    // Emit real-time event
    io.emit('projectDeleted', { id });

    res.status(200).json({ message: 'Project deleted successfully.' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: 'Server error deleting project.' });
  }
};

export const getProjectById = async (req: CustomRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Optional: Add caching for individual projects
    const cacheKey = `project:${id}`;
    const cachedProject = await redisClient.get(cacheKey);
    
    if (cachedProject) {
      console.log(`Serving project ${id} from cache.`);
      res.status(200).json(JSON.parse(cachedProject));
      return;
    }

    const project = await Project.findByPk(id, {
      include: [{ model: User, as: 'creator', attributes: userAttributes }],
    });

    if (!project) {
      res.status(404).json({ message: 'Project not found.' });
      return;
    }

    // Cache individual project
    await redisClient.setex(cacheKey, REDIS_CACHE_TTL, JSON.stringify(project));
    
    res.status(200).json(project);
  } catch (error) {
    console.error('Error fetching project by ID:', error);
    res.status(500).json({ message: 'Server error fetching project.' });
  }
};