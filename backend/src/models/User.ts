import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

/**
 * Interface representing the attributes of a User.
 */
interface UserAttributes {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: 'Admin' | 'Project Manager' | 'Developer' | 'Tester' | 'Viewer';
}

/**
 * Interface representing the attributes for creating a User, where 'id' is optional.
 */
interface UserCreationAttributes extends Optional<UserAttributes, 'id'> {}

/**
 * Represents the User model, extending Sequelize's Model class.
 */
class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: string;
  public username!: string;
  public email!: string;
  public passwordHash!: string;
  public role!: 'Admin' | 'Project Manager' | 'Developer' | 'Tester' | 'Viewer';

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  /**
   * Defines associations with other models.
   * This method is typically called after all models have been initialized.
   * @param models An object containing all initialized Sequelize models.
   */
  public static associate(models: any) {
    // Example: User.hasMany(models.Project, { foreignKey: 'userId' });
  }
}

/**
 * Initializes the User model with the provided Sequelize instance.
 * @param sequelize The Sequelize instance to associate with the model.
 * @returns The initialized User model.
 */
export default (sequelize: Sequelize): typeof User => {
  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM('Admin', 'Project Manager', 'Developer', 'Tester', 'Viewer'),
        allowNull: false,
        defaultValue: 'Viewer',
      },
    },
    {
      sequelize,
      tableName: 'users',
      timestamps: true,
    }
  );

  return User;
};