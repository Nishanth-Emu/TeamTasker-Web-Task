import { Routes, Route, Link } from 'react-router-dom'; // Import Routes, Route, Link
import './index.css'; // Use the global index.css for Tailwind

// Placeholder components for now
const HomePage = () => (
  <div className="p-8 text-center">
    <h2 className="text-3xl font-semibold mb-4">Welcome to TeamTasker!</h2>
    <p className="text-lg">This is the home page. Navigate to login or register.</p>
    <div className="mt-6 space-x-4">
      <Link to="/login" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Login</Link>
      <Link to="/register" className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600">Register</Link>
    </div>
  </div>
);

const LoginPage = () => (
    <div className="p-8 text-center">
        <h2 className="text-3xl font-semibold mb-4">Login Page</h2>
        <p>Login form will go here.</p>
        <Link to="/" className="text-blue-500 mt-4 block">Go Home</Link>
    </div>
);

const RegisterPage = () => (
    <div className="p-8 text-center">
        <h2 className="text-3xl font-semibold mb-4">Register Page</h2>
        <p>Register form will go here.</p>
        <Link to="/" className="text-blue-500 mt-4 block">Go Home</Link>
    </div>
);


function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <Routes> {/* Define our routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        {/* Add more routes here later */}
      </Routes>
    </div>
  );
}

export default App;