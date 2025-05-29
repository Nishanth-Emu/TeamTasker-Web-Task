import { Request, Response } from 'express';
import Task from '../models/Task';
import Project from '../models/Project'; 
import User from '../models/User';     

interface CustomRequest extends Request {
  user?: {
    id: string;
    role: 'Admin' | 'Project Manager' | 'Developer' | 'Tester' | 'Viewer';
  };
}

const userAttributes = ['id', 'username', 'email', 'role'];


export const createTask = async (req: CustomRequest, res: Response): Promise<void> => {
  const { title, description, status, priority, deadline, projectId, assignedTo } = req.body;

  try {
    if (!req.user || !['Admin', 'Project Manager', 'Developer'].includes(req.user.role)) {
      res.status(403).json({ message: 'Not authorized to create tasks.' });
      return;
    }

    // Validate projectId exists
    const project = await Project.findByPk(projectId);
    if (!project) {
      res.status(404).json({ message: 'Project not found.' });
      return;
    }

    // Validate assignedTo user exists if provided
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
      reportedBy: req.user.id, // Task creator is the authenticated user
    });

    res.status(201).json({ message: 'Task created successfully', task });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Server error creating task.' });
  }
};


export const getTasks = async (req: CustomRequest, res: Response): Promise<void> => {
  try {
    const tasks = await Task.findAll({
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name', 'status'] },
        { model: User, as: 'assignee', attributes: userAttributes },
        { model: User, as: 'reporter', attributes: userAttributes },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Server error fetching tasks.' });
  }
};


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

    // Complex authorization for updating tasks:
    // Admin, Project Manager can update anything
    // Developer can update status, priority, description, assignedTo (if they are assigned)
    // Tester can update status (if 'Done' or 'Blocked') and add comments (future feature)
    // Reporter (the one who created task) can update anything but status to 'Done'/'Blocked'
    // Assignee can update status (to 'In Progress', 'Done', 'Blocked'), priority, description
    const currentUserRole = req.user.role;
    const currentUserId = req.user.id;

    let isAuthorized = false;

    if (['Admin', 'Project Manager'].includes(currentUserRole)) {
      isAuthorized = true;
    }
    else {
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

    await task.update({
      title: title !== undefined ? title : task.title,
      description: description !== undefined ? description : task.description,
      status: status !== undefined ? status : task.status,
      priority: priority !== undefined ? priority : task.priority,
      deadline: deadline !== undefined ? deadline : task.deadline,
      projectId: projectId !== undefined ? projectId : task.projectId,
      assignedTo: assignedTo !== undefined ? assignedTo : task.assignedTo,
    });

    res.status(200).json({ message: 'Task updated successfully', task });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Server error updating task.' });
  }
};


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

    // Authorization check: Admin, Project Manager, or the task reporter can delete
    const isAuthorized = ['Admin', 'Project Manager'].includes(req.user.role) || task.reportedBy === req.user.id;

    if (!isAuthorized) {
      res.status(403).json({ message: 'Not authorized to delete this task.' });
      return;
    }

    await task.destroy();
    res.status(200).json({ message: 'Task deleted successfully.' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Server error deleting task.' });
  }
};