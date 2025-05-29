import { Request, Response } from 'express';
import Project from '../models/Project';
import User from '../models/User'; 

interface CustomRequest extends Request {
  user?: {
    id: string;
    role: 'Admin' | 'Project Manager' | 'Developer' | 'Tester' | 'Viewer';
  };
}


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

export const getProjects = async (req: CustomRequest, res: Response): Promise<void> => {
  try {
    // We'll add more sophisticated filtering/rbac here later.
    // For now, any authenticated user can see all projects.
    const projects = await Project.findAll({
      include: [{ model: User, as: 'creator', attributes: ['id', 'username', 'email', 'role'] }],
      order: [['createdAt', 'DESC']] // Order by creation date, newest first
    });
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


export const updateProject = async (req: CustomRequest, res: Response): Promise<void> => {
  const { name, description, status } = req.body;
  const { id } = req.params; // Project ID from URL

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
    res.status(200).json({ message: 'Project deleted successfully.' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: 'Server error deleting project.' });
  }
};