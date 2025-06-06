import { Request, Response } from 'express';
import Task from '../models/Task';
import Project from '../models/Project';
import User from '../models/User';
import Notification from '../models/Notification';
import { io, sendNotificationToUser } from '../index'; // Import the notification function
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
    if (!req.user || !['Admin', 'Project Manager', 'Developer', 'Tester'].includes(req.user.role)) {
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
    await redisClient.del(getTasksCacheKey()); // Invalidate general tasks cache
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
        // Emit to project room for real-time updates
        io.to(projectId).emit('taskCreated', createdTaskWithAssociations);
        console.log(`Emitted 'taskCreated' for project ${projectId}`);

        // Send notification to assigned user if task is assigned
        if (assignedTo && assignedTo !== req.user.id) {
          // Create and save the notification in the database
          const newNotification = await Notification.create({
            userId: assignedTo,
            message: `You have been assigned a new task: "${title}"`,
            type: 'task_assigned', // Use 'task_assigned' as defined in your model
            link: `/dashboard/projects/${projectId}/tasks`,
            itemId: task.id, // Store the task ID
            isRead: false, // Default from model
          });

          // Prepare notification for Socket.IO (add frontend-specific fields)
          const notificationForSocket = {
            id: newNotification.id, // Use the DB generated ID
            message: newNotification.message,
            link: `/dashboard/projects/${projectId}/tasks/${task.id}`, // More specific link to the task
            projectId: projectId,
            read: newNotification.isRead,
            createdAt: newNotification.createdAt.toISOString(),
            type: newNotification.type
          };
          sendNotificationToUser(assignedTo, notificationForSocket);
          console.log(`Notification saved to DB and sent for task assignment to user ${assignedTo}`);
        }
    }

    res.status(201).json({ message: 'Task created successfully', task: createdTaskWithAssociations });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Server error creating task.' });
  }
};

// @route   GET /api/tasks
// @desc    Get all tasks or tasks for a specific project (with caching)
// @access  Private (Any authenticated user)
export const getTasks = async (req: CustomRequest, res: Response): Promise<void> => {
  const { projectId } = req.query; 

  // Use the projectId to generate a specific cache key
  const cacheKey = getTasksCacheKey(projectId as string); 

  try {
    const cachedTasks = await redisClient.get(cacheKey);
    if (cachedTasks) {
      console.log(`Serving tasks for ${projectId ? `project ${projectId}` : 'all tasks'} from Redis cache.`);
      res.status(200).json(JSON.parse(cachedTasks));
      return;
    }

    // Define a where clause object
    const whereClause: { projectId?: string } = {};

    // If projectId is provided in the query, add it to the where clause
    if (projectId) {
      whereClause.projectId = projectId as string;
    }

    const tasks = await Task.findAll({
      where: whereClause, 
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name', 'status'] },
        { model: User, as: 'assignee', attributes: userAttributes },
        { model: User, as: 'reporter', attributes: userAttributes },
      ],
      order: [['createdAt', 'DESC']],
    });

    await redisClient.setex(cacheKey, REDIS_CACHE_TTL, JSON.stringify(tasks));
    console.log(`Tasks fetched from DB and cached for ${projectId ? `project ${projectId}` : 'all tasks'}.`);

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

    const task = await Task.findByPk(id, {
      include: [
        { model: User, as: 'assignee', attributes: userAttributes },
        { model: User, as: 'reporter', attributes: userAttributes },
      ],
    });
    
    if (!task) {
      res.status(404).json({ message: 'Task not found.' });
      return;
    }

    const currentUserRole = req.user.role;
    const currentUserId = req.user.id;
    const oldAssignedTo = task.assignedTo;
    const oldStatus = task.status;

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
    // Invalidate cache for the old project's tasks
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
        // Always emit 'taskUpdated' to the NEW project's room
        io.to(updatedTaskWithAssociations.projectId).emit('taskUpdated', updatedTaskWithAssociations);
        console.log(`Emitted 'taskUpdated' to new project room: ${updatedTaskWithAssociations.projectId}`);

        // If the project ID changed, also notify the OLD project's room
        if (projectId && projectId !== oldProjectId) {
            io.to(oldProjectId).emit('taskUpdated', updatedTaskWithAssociations);
            console.log(`Emitted 'taskUpdated' to old project room (for removal): ${oldProjectId}`);
        }

        // Send notifications for relevant changes
        // 1. Task assignment change notification
        if (assignedTo && assignedTo !== oldAssignedTo && assignedTo !== currentUserId) {
          const newNotification = await Notification.create({
            userId: assignedTo,
            message: `You have been assigned to task: "${updatedTaskWithAssociations.title}"`,
            type: 'task_assigned', // Consistent type
            itemId: updatedTaskWithAssociations.id,
            isRead: false,
          });

          const notificationForSocket = {
            id: newNotification.id,
            message: newNotification.message,
            link: `/dashboard/projects/${updatedTaskWithAssociations.projectId}/tasks/${updatedTaskWithAssociations.id}`,
            projectId: updatedTaskWithAssociations.projectId,
            read: newNotification.isRead,
            createdAt: newNotification.createdAt.toISOString(),
            type: newNotification.type
          };
          sendNotificationToUser(assignedTo, notificationForSocket);
          console.log(`Notification saved to DB and sent for task reassignment to user ${assignedTo}`);
        }

        // 2. Status change notification (notify assignee if status changed and user is not the assignee)
        if (status && status !== oldStatus && task.assignedTo && task.assignedTo !== currentUserId) {
          const newNotification = await Notification.create({
            userId: task.assignedTo,
            message: `Task "${updatedTaskWithAssociations.title}" status changed to: ${status}`,
            type: 'task_updated', // Use 'task_updated' type
            itemId: updatedTaskWithAssociations.id,
            isRead: false,
          });

          const notificationForSocket = {
            id: newNotification.id,
            message: newNotification.message,
            link: `/dashboard/projects/${updatedTaskWithAssociations.projectId}/tasks/${updatedTaskWithAssociations.id}`,
            projectId: updatedTaskWithAssociations.projectId,
            read: newNotification.isRead,
            createdAt: newNotification.createdAt.toISOString(),
            type: newNotification.type
          };
          sendNotificationToUser(task.assignedTo, notificationForSocket);
          console.log(`Notification saved to DB and sent for task status change to user ${task.assignedTo}`);
        }

        // 3. Notify reporter if task is completed and reporter is not the one making the change
        if (status === 'Done' && task.reportedBy && task.reportedBy !== currentUserId) {
          const newNotification = await Notification.create({
            userId: task.reportedBy,
            message: `Task "${updatedTaskWithAssociations.title}" has been completed.`,
            type: 'task_updated', // Using 'task_updated' for completion as well
            itemId: updatedTaskWithAssociations.id,
            isRead: false,
          });

          const notificationForSocket = {
            id: newNotification.id,
            message: newNotification.message,
            link: `/dashboard/projects/${updatedTaskWithAssociations.projectId}/tasks/${updatedTaskWithAssociations.id}`,
            projectId: updatedTaskWithAssociations.projectId,
            read: newNotification.isRead,
            createdAt: newNotification.createdAt.toISOString(),
            type: newNotification.type
          };
          sendNotificationToUser(task.reportedBy, notificationForSocket);
          console.log(`Notification saved to DB and sent for task completion to user ${task.reportedBy}`);
        }
    }

    res.status(200).json({ message: 'Task updated successfully', task: updatedTaskWithAssociations });
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

    const task = await Task.findByPk(id, {
      include: [
        { model: User, as: 'assignee', attributes: userAttributes },
        { model: User, as: 'reporter', attributes: userAttributes },
      ],
    });
    
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
    const taskTitle = task.title;
    const assignedTo = task.assignedTo;

    await task.destroy();

    // Invalidate the cache for all tasks and for the specific project's tasks
    await redisClient.del(getTasksCacheKey());
    await redisClient.del(getTasksCacheKey(projectId));
    console.log(`Invalidated all tasks cache and project ${projectId} tasks cache.`);

    // Emit real-time update
    io.to(projectId).emit('taskDeleted', { id, projectId });
    console.log(`Emitted 'taskDeleted' for project ${projectId}`);

    // Send notification to assignee if task was assigned and assignee is not the one deleting
    if (assignedTo && assignedTo !== req.user.id) {
      const newNotification = await Notification.create({
        userId: assignedTo,
        message: `Task "${taskTitle}" has been deleted.`,
        type: 'general', // Or create a 'task_deleted' type in your enum if preferred
        itemId: id, // The ID of the deleted task
        isRead: false,
      });

      const notificationForSocket = {
        id: newNotification.id,
        message: newNotification.message,
        link: `/dashboard/projects/${projectId}/tasks`, // Link to the project's tasks page as the task is gone
        projectId: projectId,
        read: newNotification.isRead,
        createdAt: newNotification.createdAt.toISOString(),
        type: newNotification.type
      };
      sendNotificationToUser(assignedTo, notificationForSocket);
      console.log(`Notification saved to DB and sent for task deletion to user ${assignedTo}`);
    }

    res.status(200).json({ message: 'Task deleted successfully.' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Server error deleting task.' });
  }
};
