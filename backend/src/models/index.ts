import { Sequelize } from 'sequelize';

// Import the model-defining functions.
// These functions are used to initialize the model classes.
import createUserModel from './User';
import createProjectModel from './Project';
import createTaskModel from './Task';
import createNotificationModel from './Notification';

/**
 * The 'db' object serves as a central repository for the Sequelize instance
 * and all initialized models.
 */
const db: any = {};

/**
 * Initializes all Sequelize models and establishes their associations.
 * This function orchestrates the loading and linking of all database models.
 * @param sequelize The configured Sequelize instance.
 */
export const initializeModels = (sequelize: Sequelize) => {
  // Initialize each model by calling its respective defining function,
  // passing in the Sequelize instance.
  const User = createUserModel(sequelize);
  const Project = createProjectModel(sequelize);
  const Task = createTaskModel(sequelize);
  const Notification = createNotificationModel(sequelize);

  // Store the initialized model classes in the 'db' object for easy access.
  db.User = User;
  db.Project = Project;
  db.Task = Task;
  db.Notification = Notification;

  // Set up associations between models.
  // This loop iterates through all initialized models in the 'db' object.
  // If a model has a static 'associate' method, it's called with the 'db' object
  // as an argument, allowing each model to define its relationships with others.
  Object.keys(db).forEach(modelName => {
    if (db[modelName].associate) {
      db[modelName].associate(db);
    }
  });

  // Store the Sequelize instance and the Sequelize library itself in the 'db' object
  // for convenient access throughout the application.
  db.sequelize = sequelize;
  db.Sequelize = Sequelize;

  console.log('All models have been initialized and associations are set up.');
};

/**
 * Export the 'db' object, which contains the Sequelize instance and all initialized models.
 * This provides a centralized point of access for database interactions.
 */
export default db;