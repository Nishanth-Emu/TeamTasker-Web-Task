import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database'; 

interface UserAttributes {
  id: string; 
  username: string;
  email: string;
  passwordHash: string; 
  role: 'Admin' | 'Project Manager' | 'Developer' | 'Tester' | 'Viewer';
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

// Define the User model class
class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public username!: string;
  public email!: string;
  public passwordHash!: string;
  public role!: 'Admin' | 'Project Manager' | 'Developer' | 'Tester' | 'Viewer';

  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// Initialize the User model  
User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4, // Auto-generate UUIDs
      primaryKey: true,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // Usernames must be unique
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // Emails must be unique
      validate: {
        isEmail: true, // Basic email format validation
      },
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('Admin', 'Project Manager', 'Developer', 'Tester', 'Viewer'),
      allowNull: false,
      defaultValue: 'Viewer', // Default role for new users
    },
  },
  {
    sequelize, 
    tableName: 'users', 
    timestamps: true, 
    // modelName: 'User', 
  }
);

export default User;