import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

interface NotificationAttributes {
  id: string;
  userId: string;
  message: string;
  type: 'task_assigned' | 'task_updated' | 'project_assigned' | 'general';
  itemId?: string;
  link?: string;
  isRead: boolean;
}

interface NotificationCreationAttributes extends Optional<NotificationAttributes, 'id' | 'isRead' | 'itemId' | 'link'> {}

class Notification extends Model<NotificationAttributes, NotificationCreationAttributes> implements NotificationAttributes {
  public id!: string;
  public userId!: string;
  public message!: string;
  public type!: 'task_assigned' | 'task_updated' | 'project_assigned' | 'general';
  public itemId?: string;
  public link?: string;
  public isRead!: boolean;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  /**
   * Helper method for defining associations.
   */
  public static associate(models: any) {
    // Each notification belongs to a single user.
    Notification.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  }
}

/**
 * Exports a function that defines the Notification model.
 * @param sequelize The Sequelize instance to attach the model to.
 * @returns The initialized Notification model.
 */
export default (sequelize: Sequelize): typeof Notification => {
  Notification.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users', // Table name as a string
          key: 'id',
        },
      },
      message: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM('task_assigned', 'task_updated', 'project_assigned', 'general'),
        defaultValue: 'general',
        allowNull: false,
      },
      itemId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      link: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: 'notifications',
      timestamps: true,
    }
  );

  return Notification;
};