# TeamTasker-Web-Task

# Backend Part - Day 2 Progress

## 📅 Day 2 - Initial Setup

### ✅ What I Did Today


- Created schema for PostgreSQL using Sequelize ORM.
- Faced an error during migration to PostgreSQL, resolved it by explicitly syncing the `User` schema:
  ```ts
  await User.sync({ alter: true });
  console.log('User model synchronized successfully.');
   ```
- Created register and login routes.
- Tested both routes using Thunder Client — confirmed working correctly.
- Implemented JWT-based authentication for securing APIs.

### 🛠️ Tech Stack

- **Node.js**
- **Express.js**
- **JWT**
- **PostgreSQL**
- **Sequelize (ORM)**

### 🚀 How to Run the Project

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd <your-project-directory>
