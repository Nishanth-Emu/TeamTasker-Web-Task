import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User';    
import Project from './Project'; 


interface TaskAttributes {
  id: string; // Using UUID for IDs
  title: string;
  description?: string;
  status: 'To Do' | 'In Progress' | 'Done' | 'Blocked';
  priority: 'Low' | 'Medium' | 'High';
  deadline?: Date;
  projectId: string;  // Foreign key to Project ID
  assignedTo?: string; // Foreign key to User ID (who it's assigned to)
  reportedBy: string; // Foreign key to User ID (who created it)
  createdAt?: Date;
  updatedAt?: Date;
}


interface TaskCreationAttributes extends Optional<TaskAttributes, 'id' | 'description' | 'status' | 'priority' | 'deadline' | 'assignedTo' | 'createdAt' | 'updatedAt'> {}

// Define the Task model class
class Task extends Model<TaskAttributes, TaskCreationAttributes> implements TaskAttributes {
  public id!: string;
  public title!: string;
  public description?: string;
  public status!: 'To Do' | 'In Progress' | 'Done' | 'Blocked';
  public priority!: 'Low' | 'Medium' | 'High';
  public deadline?: Date;
  public projectId!: string;
  public assignedTo?: string;
  public reportedBy!: string;

  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// Initialize the Task model
Task.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('To Do', 'In Progress', 'Done', 'Blocked'),
      allowNull: false,
      defaultValue: 'To Do',
    },
    priority: {
      type: DataTypes.ENUM('Low', 'Medium', 'High'),
      allowNull: false,
      defaultValue: 'Medium',
    },
    deadline: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Project,
        key: 'id',
      },
    },
    assignedTo: {
      type: DataTypes.UUID,
      allowNull: true, // A task can be unassigned
      references: {
        model: User,
        key: 'id',
      },
    },
    reportedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
  },
  {
    sequelize,
    tableName: 'tasks',
    timestamps: true,
  }
);

// Define Associations
Task.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
Project.hasMany(Task, { foreignKey: 'projectId', as: 'tasks' });

Task.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignee' });
User.hasMany(Task, { foreignKey: 'assignedTo', as: 'assignedTasks' });

Task.belongsTo(User, { foreignKey: 'reportedBy', as: 'reporter' });
User.hasMany(Task, { foreignKey: 'reportedBy', as: 'reportedTasks' });


export default Task;