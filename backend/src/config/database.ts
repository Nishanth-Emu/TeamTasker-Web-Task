// import { Sequelize } from 'sequelize';
// import dotenv from 'dotenv';

// dotenv.config(); 

// const dbName = process.env.DB_NAME as string;
// const dbUser = process.env.DB_USER as string;
// const dbHost = process.env.DB_HOST;
// const dbPassword = process.env.DB_PASSWORD;
// const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT as string, 10) : 5432;

// const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
//   host: dbHost,
//   port: dbPort,
//   dialect: 'postgres',
//   logging: false,
//   pool: {
//     max: 5,
//     min: 0,
//     acquire: 30000,
//     idle: 10000
//   }
// });

// export default sequelize;


// src/config/database.ts

// src/config/database.ts

import { Sequelize } from 'sequelize';
import { AppSecrets } from './secrets'; // Import the secrets interface we defined earlier

// This is no longer a singleton instance, but a function to create one.
// It is now an explicit dependency that must be passed in.
// src/config/database.ts
export const initializeDatabase = (secrets: AppSecrets): Sequelize => {
  const sequelize = new Sequelize(secrets.DB_NAME, secrets.DB_USER, secrets.DB_PASSWORD, {
    host: secrets.DB_HOST,
    port: secrets.DB_PORT,
    dialect: 'postgres',
    logging: false,
    
    // --- THIS IS THE REQUIRED ADDITION ---
    dialectOptions: {
      ssl: {
        require: true, // This will help solve the no pg_hba.conf entry error
        rejectUnauthorized: false // This is needed for connecting to AWS RDS with its default certificates
      }
    }
  });

  return sequelize;
};