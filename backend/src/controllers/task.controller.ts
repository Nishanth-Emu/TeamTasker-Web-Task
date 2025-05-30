import { Request, Response } from 'express';
import Task from '../models/Task';
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

const getTasksCacheKey = (projectId?: string) => projectId ? `projectTasks:${projectId}` : 'allTasks';


// @route   POST /api/tasks
// @desc    Create a new task
// @access  Private (Admin, Project Manager, Developer)
export const createTask = async (req: CustomRequest, res: Response): Promise<void> => {
  const { title, description, status, priority, deadline, projectId, assignedTo } = req.body;

  try {
    if (!req.user || !['Admin', 'Project Manager', 'Developer'].includes(req.user.role)) {
      res.status(403).json({ message: 'Not authorized to create tasks.' });
      return;
    }

    const project = await Project.findByPk(projectId);
    if (!project) {
      res.status(404).json({ message: 'Project not found.' });
      return;
    }

    if (assignedTo) {
      const assignee = await User.findByPk(assignedTo);
      if (!assignee) {
        res.status(404).json({ message: 'Assigned user not found.' });
        return;
      }
    }

    const task = await Task.create({
      title,
      description,
      status: status || 'To Do',
      priority: priority || 'Medium',
      deadline,
      projectId,
      assignedTo: assignedTo || null,
      reportedBy: req.user.id,
    });

    // Invalidate the cache for all tasks and for the specific project's tasks
    await redisClient.del(getTasksCacheKey());
    await redisClient.del(getTasksCacheKey(projectId)); // Invalidate cache for tasks in this project
    console.log(`Invalidated all tasks cache and project ${projectId} tasks cache.`);


    const createdTaskWithAssociations = await Task.findByPk(task.id, {
        include: [
            { model: Project, as: 'project', attributes: ['id', 'name', 'status'] },
            { model: User, as: 'assignee', attributes: userAttributes },
            { model: User, as: 'reporter', attributes: userAttributes },
        ],
    });

    if (createdTaskWithAssociations) {
        io.to(projectId).emit('taskCreated', createdTaskWithAssociations);
        console.log(`Emitted 'taskCreated' for project ${projectId}`);
    }

    res.status(201).json({ message: 'Task created successfully', task });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Server error creating task.' });
  }
};


// @route   GET /api/tasks
// @desc    Get all tasks (with caching)
// @access  Private (Any authenticated user)
export const getTasks = async (req: CustomRequest, res: Response): Promise<void> => {
  const cacheKey = getTasksCacheKey(); 

  try {
    const cachedTasks = await redisClient.get(cacheKey);
    if (cachedTasks) {
      console.log('Serving tasks from Redis cache.');
      res.status(200).json(JSON.parse(cachedTasks));
      return;
    }

    const tasks = await Task.findAll({
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name', 'status'] },
        { model: User, as: 'assignee', attributes: userAttributes },
        { model: User, as: 'reporter', attributes: userAttributes },
      ],
      order: [['createdAt', 'DESC']],
    });

    await redisClient.setex(cacheKey, REDIS_CACHE_TTL, JSON.stringify(tasks));
    console.log('Tasks fetched from DB and cached.');

    res.status(200).json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Server error fetching tasks.' });
  }
};


// @route   GET /api/tasks/:id
// @desc    Get a single task by ID
// @access  Private (Any authenticated user)
export const getTaskById = async (req: CustomRequest, res: Response): Promise<void> => {
  try {
    const task = await Task.findByPk(req.params.id, {
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name', 'status'] },
        { model: User, as: 'assignee', attributes: userAttributes },
        { model: User, as: 'reporter', attributes: userAttributes },
      ],
    });

    if (!task) {
      res.status(404).json({ message: 'Task not found.' });
      return;
    }
    res.status(200).json(task);
  } catch (error) {
    console.error('Error fetching task by ID:', error);
    res.status(500).json({ message: 'Server error fetching task.' });
  }
};

// @route   PUT /api/tasks/:id
// @desc    Update a task
// @access  Private (Admin, Project Manager, Developer, Tester, Reporter, Assignee)
export const updateTask = async (req: CustomRequest, res: Response): Promise<void> => {
  const { title, description, status, priority, deadline, projectId, assignedTo } = req.body;
  const { id } = req.params;

  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated.' });
      return;
    }

    const task = await Task.findByPk(id);
    if (!task) {
      res.status(404).json({ message: 'Task not found.' });
      return;
    }

    const currentUserRole = req.user.role;
    const currentUserId = req.user.id;

    let isAuthorized = false;
    if (['Admin', 'Project Manager'].includes(currentUserRole)) {
      isAuthorized = true;
    } else {
      if (currentUserRole === 'Developer' && (task.assignedTo === currentUserId || task.reportedBy === currentUserId)) {
        isAuthorized = true;
      }
      if (currentUserRole === 'Tester' && task.assignedTo === currentUserId) {
        isAuthorized = true;
      }
      if (task.reportedBy === currentUserId && !isAuthorized) {
          if (status && ['Done', 'Blocked'].includes(status)) {
              if (task.reportedBy === currentUserId && task.assignedTo !== currentUserId && !['Developer', 'Tester'].includes(currentUserRole)) {
                  res.status(403).json({ message: 'Reporters cannot mark tasks as Done or Blocked unless they are also the assignee/developer.' });
                  return;
              }
          }
          isAuthorized = true;
      }
      if (task.assignedTo === currentUserId && !isAuthorized) {
          isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      res.status(403).json({ message: 'Not authorized to update this task.' });
      return;
    }

    if (projectId && projectId !== task.projectId) {
      const newProject = await Project.findByPk(projectId);
      if (!newProject) {
        res.status(404).json({ message: 'New project not found.' });
        return;
      }
    }

    if (assignedTo && assignedTo !== task.assignedTo) {
      const newAssignee = await User.findByPk(assignedTo);
      if (!newAssignee) {
        res.status(404).json({ message: 'New assigned user not found.' });
        return;
      }
    }

    const oldProjectId = task.projectId; // Capture old project ID for cache invalidation and Socket.IO

    await task.update({
      title: title !== undefined ? title : task.title,
      description: description !== undefined ? description : task.description,
      status: status !== undefined ? status : task.status,
      priority: priority !== undefined ? priority : task.priority,
      deadline: deadline !== undefined ? deadline : task.deadline,
      projectId: projectId !== undefined ? projectId : task.projectId,
      assignedTo: assignedTo !== undefined ? assignedTo : task.assignedTo,
    });

    // Invalidate the cache for all tasks
    await redisClient.del(getTasksCacheKey());
    // Invalidate cache for the old project's tasks (if projectId changed)
    await redisClient.del(getTasksCacheKey(oldProjectId));
    // Invalidate cache for the new project's tasks (if projectId changed)
    if (projectId && projectId !== oldProjectId) {
        await redisClient.del(getTasksCacheKey(projectId));
    }
    console.log(`Invalidated all tasks cache and relevant project tasks caches.`);


    const updatedTaskWithAssociations = await Task.findByPk(task.id, {
        include: [
            { model: Project, as: 'project', attributes: ['id', 'name', 'status'] },
            { model: User, as: 'assignee', attributes: userAttributes },
            { model: User, as: 'reporter', attributes: userAttributes },
        ],
    });

    if (updatedTaskWithAssociations) {
        if (projectId && projectId !== oldProjectId) {
            io.to(oldProjectId).emit('taskDeleted', { id: task.id, projectId: oldProjectId });
            io.to(projectId).emit('taskCreated', updatedTaskWithAssociations);
        } else {
            io.to(task.projectId).emit('taskUpdated', updatedTaskWithAssociations);
        }
        console.log(`Emitted 'taskUpdated' for project ${task.projectId}`);
    }

    res.status(200).json({ message: 'Task updated successfully', task });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Server error updating task.' });
  }
};

// @route   DELETE /api/tasks/:id
// @desc    Delete a task
// @access  Private (Admin, Project Manager, or Reporter)
export const deleteTask = async (req: CustomRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated.' });
      return;
    }

    const task = await Task.findByPk(id);
    if (!task) {
      res.status(404).json({ message: 'Task not found.' });
      return;
    }

    const isAuthorized = ['Admin', 'Project Manager'].includes(req.user.role) || task.reportedBy === req.user.id;

    if (!isAuthorized) {
      res.status(403).json({ message: 'Not authorized to delete this task.' });
      return;
    }

    const projectId = task.projectId; // Get projectId before deleting

    await task.destroy();

    // Invalidate the cache for all tasks and for the specific project's tasks
    await redisClient.del(getTasksCacheKey());
    await redisClient.del(getTasksCacheKey(projectId));
    console.log(`Invalidated all tasks cache and project ${projectId} tasks cache.`);

    io.to(projectId).emit('taskDeleted', { id, projectId });
    console.log(`Emitted 'taskDeleted' for project ${projectId}`);

    res.status(200).json({ message: 'Task deleted successfully.' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Server error deleting task.' });
  }
};