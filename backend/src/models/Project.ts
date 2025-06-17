import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

// Keep the interfaces for type safety
interface ProjectAttributes {
  id: string;
  name: string;
  description?: string;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';
  createdBy: string;
}

interface ProjectCreationAttributes extends Optional<ProjectAttributes, 'id' | 'description' | 'status'> {}

// The class definition itself remains the same
class Project extends Model<ProjectAttributes, ProjectCreationAttributes> implements ProjectAttributes {
  public id!: string;
  public name!: string;
  public description?: string;
  public status!: 'Not Started' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';
  public createdBy!: string;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  /**
   * Helper method for defining associations.
   * This method is not part of Sequelize lifecycle.
   * The `models/index` file will call this method automatically.
   */
  public static associate(models: any) {
    // A Project belongs to the User who created it.
    Project.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    // A Project can have many Tasks.
    Project.hasMany(models.Task, { foreignKey: 'projectId', as: 'tasks' });
  }
}

/**
 * Exports a function that defines the Project model.
 * This function will be called by the central model initializer (`src/models/index.ts`).
 * @param sequelize The Sequelize instance to attach the model to.
 * @returns The initialized Project model.
 */
export default (sequelize: Sequelize): typeof Project => {
  Project.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('Not Started', 'In Progress', 'Completed', 'On Hold', 'Cancelled'),
        allowNull: false,
        defaultValue: 'Not Started',
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users', // Table name as a string
          key: 'id',
        },
      },
    },
    {
      sequelize,      // We use the passed-in sequelize instance
      tableName: 'projects',
      timestamps: true,
    }
  );

  return Project;
};