# 🧑‍💻 TeamTasker-Web-Task

## 📅 Day 6 – Frontend Progress Update

### ✅ What's Done Today
- 🔔 **Notification Feature**
  - Real-time notifications currently working on.

- 🐛 **Bug Fixes**
  - Fixed issues in the project search functionality.

- 🎯 **Filter Support**
  - Added filter options for better data navigation and task management.

- 🧑‍💼 **Admin Features**
  - Admins can now perform full CRUD operations on users directly from the dashboard.

---

## 📁 Project Structure
```
TeamTasker-Web-Task/
├── backend/       # Node.js, Express, PostgreSQL, Redis, Socket.IO
└── frontend/      # Vite + React (TypeScript)
```

---

## 🚀 Getting Started

### 🛠 Backend Setup
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with the following contents:
   ```env
   DB_NAME=postgres
   DB_USER=postgres
   DB_PASSWORD=root
   DB_HOST=localhost
   DB_PORT=5432
   PORT=5000
   JWT_SECRET=b5056ee36290d96b53695296a45e20be09728467d0fd7d57e81786139786f2e9
   JWT_EXPIRES_IN=1h 
   REDIS_HOST=127.0.0.1
   REDIS_PORT=6379
   REDIS_PASSWORD=
   REDIS_CACHE_TTL=3600
   ```

4. Start the backend server:
   ```bash
   npm run dev
   ```

---

### 🎨 Frontend Setup
1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with the following:
   ```env
   VITE_API_BASE_URL=http://localhost:5000/api
   ```

4. Run the frontend:
   ```bash
   npm run dev
   ```

---

## ⚙️ Tech Stack

### Backend
- Node.js + Express
- TypeScript
- PostgreSQL + Sequelize ORM
- JWT for Authentication
- Redis for caching
- Socket.IO for real-time updates

### Frontend
- Vite + React
- TypeScript
- Tailwind CSS
