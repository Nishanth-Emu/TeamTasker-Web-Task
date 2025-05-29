import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './User'; 

// Define the attributes that are required for creating a Project instance
interface ProjectAttributes {
  id: string;
  name: string;
  description?: string;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';
  createdBy: string; // Foreign key to User ID
  createdAt?: Date;
  updatedAt?: Date;
}

interface ProjectCreationAttributes extends Optional<ProjectAttributes, 'id' | 'description' | 'status' | 'createdAt' | 'updatedAt'> {}

class Project extends Model<ProjectAttributes, ProjectCreationAttributes> implements ProjectAttributes {
  public id!: string;
  public name!: string;
  public description?: string;
  public status!: 'Not Started' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';
  public createdBy!: string;

  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// Initialize the Project model
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
      unique: true, // Project names should be unique for easy identification
    },
    description: {
      type: DataTypes.TEXT, // Use TEXT for potentially longer descriptions
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
      references: { // Define foreign key relationship
        model: User, // Refers to the User model
        key: 'id',   // Uses the 'id' column of the User model
      },
    },
  },
  {
    sequelize,
    tableName: 'projects', 
    timestamps: true,
  }
);

// Define Associations: A Project belongs to a User (who created it)
Project.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
User.hasMany(Project, { foreignKey: 'createdBy', as: 'projects' });

export default Project;