import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

interface TaskAttributes {
  id: string;
  title: string;
  description?: string;
  status: 'To Do' | 'In Progress' | 'Done' | 'Blocked';
  priority: 'Low' | 'Medium' | 'High';
  deadline?: Date;
  projectId: string;
  assignedTo?: string;
  reportedBy: string;
}

interface TaskCreationAttributes extends Optional<TaskAttributes, 'id' | 'description' | 'status' | 'priority' | 'deadline' | 'assignedTo'> {}

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

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  /**
   * Helper method for defining associations.
   */
  public static associate(models: any) {
    // A Task belongs to one Project.
    Task.belongsTo(models.Project, { foreignKey: 'projectId', as: 'project' });
    // A Task can be assigned to one User.
    Task.belongsTo(models.User, { foreignKey: 'assignedTo', as: 'assignee' });
    // A Task is reported by one User.
    Task.belongsTo(models.User, { foreignKey: 'reportedBy', as: 'reporter' });
  }
}

/**
 * Exports a function that defines the Task model.
 * @param sequelize The Sequelize instance to attach the model to.
 * @returns The initialized Task model.
 */
export default (sequelize: Sequelize): typeof Task => {
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
          model: 'projects', // Table name as a string
          key: 'id',
        },
      },
      assignedTo: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'users', // Table name as a string
          key: 'id',
        },
      },
      reportedBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users', // Table name as a string
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

  return Task;
};