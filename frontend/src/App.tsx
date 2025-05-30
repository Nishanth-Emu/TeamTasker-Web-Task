import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import './index.css';
import LoginForm from './components/auth/LoginForm'; // Import LoginForm
import RegisterForm from './components/auth/RegisterForm'; // Import RegisterForm
import { useAuth } from './context/AuthContext'; // Import useAuth for logout

// Dashboard placeholder (will be built out later)
const DashboardPage = () => {
  const { user, logout } = useAuth();
  return (
    <div className="p-8 text-center bg-white rounded-lg shadow-md max-w-lg mx-auto">
      <h2 className="text-3xl font-semibold mb-4">Dashboard</h2>
      {user ? (
        <>
          <p className="text-lg">Welcome, <span className="font-bold text-blue-700">{user.username}</span>!</p>
          <p className="text-md text-gray-600">Your role: <span className="font-medium">{user.role}</span></p>
          <button
            onClick={logout}
            className="mt-6 px-6 py-3 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Logout
          </button>
        </>
      ) : (
        <p>You are not logged in.</p>
      )}
      <div className="mt-4">
         <Link to="/" className="text-blue-500 hover:underline">Go Home</Link>
      </div>
    </div>
  );
};

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading user data...</div>;
  }

  if (!user) {
    navigate('/login', { replace: true }); // Redirect to login if not authenticated
    return null;
  }

  return <>{children}</>;
};

function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginForm />} /> {/* Render LoginForm component */}
        <Route path="/register" element={<RegisterForm />} /> {/* Render RegisterForm component */}

        {/* Protected Dashboard Route */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Optionally, a NotFound page */}
        <Route path="*" element={<div className="text-center text-xl font-bold">404 - Page Not Found</div>} />
      </Routes>
    </div>
  );
}

// Reuse HomePage from previous step, or define it here if deleted
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


export default App;