import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import './index.css';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import { useAuth } from './context/AuthContext';
import DashboardLayout from './components/layout/DashboardLayout';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import UsersPage from './pages/UsersPage';
import { Toaster } from 'sonner';
import { NotificationProvider } from './context/NotificationContext';
// import NotificationToastDisplay from './components/notifications/NotificationToastDisplay';

const HomePage = () => (
  <div className="p-8 text-center bg-white rounded-lg shadow-md max-w-sm mx-auto">
    <h2 className="text-3xl font-semibold mb-4">Welcome to TeamTasker!</h2>
    <p className="text-lg">Manage your projects and tasks efficiently.</p>
    <div className="mt-6 space-x-4">
      <Link to="/login" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Login</Link>
      <Link to="/register" className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600">Register</Link>
    </div>
  </div>
);

// Protected Route component (copied from previous step, ensuring it's available)
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-xl text-gray-700">Loading user data...</div>;
  }

  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  return <>{children}</>;
};

function App() {
  return (
    <NotificationProvider>
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />

          {/* Protected Dashboard Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            {/* Nested routes within the dashboard */}
            <Route index element={<ProjectsPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:projectId/tasks" element={<ProjectDetailPage />} />
            <Route path="users" element={<UsersPage />} />
          </Route>

          <Route path="*" element={<div className="text-center text-xl font-bold p-10">404 - Page Not Found</div>} />
        </Routes>
      </div>
      <Toaster richColors position="top-right" />
    </NotificationProvider>
  );
}

export default App;