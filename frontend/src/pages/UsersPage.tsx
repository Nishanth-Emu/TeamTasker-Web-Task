import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import CreateUserForm from '../components/users/CreateUserForm';
import EditUserForm from '../components/users/EditUserForm';
import { io } from 'socket.io-client';

// User type (match backend model)
interface User {
  id: string;
  username: string;
  email: string;
  role: 'Admin' | 'Project Manager' | 'Developer' | 'Tester' | 'Viewer';
  createdAt: string;
  updatedAt: string;
}

const socket = io(import.meta.env.VITE_API_BASE_URL.replace('/api', ''));

const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth(); // Renamed to currentUser to avoid conflict
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Fetch all users
  const { data: users, isLoading, isError, error } = useQuery<User[], Error>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users'); // Admin endpoint to get all users
      return response.data;
    },
  });

  // Socket.IO for real-time user updates (optional, but good for consistency)
  useEffect(() => {
    socket.on('connect', () => { console.log('Socket.IO Connected to backend for Users!'); });
    socket.on('disconnect', () => { console.log('Socket.IO Disconnected from backend for Users!'); });

    socket.on('userCreated', (newUser: User) => {
      console.log('Real-time: User Created', newUser);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    });

    socket.on('userUpdated', (updatedUser: User) => {
      console.log('Real-time: User Updated', updatedUser);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      // If the current user's own data changed (e.g., role changed by admin),
      // it might be good to refetch current user data from AuthContext too,
      // though usually AuthContext handles token updates.
    });

    socket.on('userDeleted', (deletedUser: { id: string }) => {
      console.log('Real-time: User Deleted', deletedUser.id);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('userCreated');
      socket.off('userUpdated');
      socket.off('userDeleted');
    };
  }, [queryClient]);

  // Mutation for deleting a user
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      console.error('Delete user error:', error);
      alert(`Failed to delete user: ${error.response?.data?.message || error.message}`);
    },
  });

  const handleDeleteUser = (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      deleteUserMutation.mutate(userId);
    }
  };

  // RBAC: Only Admin can access this page and perform actions
  const canManageUsers = currentUser?.role === 'Admin';

  if (!canManageUsers) {
    return <div className="text-center text-red-600 text-lg">Access Denied: Only Admins can manage users.</div>;
  }

  if (isLoading) return <div className="text-center text-lg">Loading users...</div>;
  if (isError) return <div className="text-center text-lg text-red-600">Error: {error?.message}</div>;

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Create New User
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users?.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">No users found.</td>
              </tr>
            ) : (
              users?.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => { setSelectedUser(user); setIsEditModalOpen(true); }}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit User"
                      >
                        {/* Edit icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.38-2.828-2.828z" />
                        </svg>
                      </button>
                      {/* Prevent deleting current user or last admin */}
                      {user.id !== currentUser?.id && user.role !== 'Admin' && ( // Add logic to prevent deleting self and last admin
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete User"
                          disabled={deleteUserMutation.isPending}
                        >
                            {/* Delete icon */}
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm1 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                            </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {isCreateModalOpen && <CreateUserForm onClose={() => setIsCreateModalOpen(false)} />}

      {/* Edit User Modal */}
      {isEditModalOpen && selectedUser && (
        <EditUserForm user={selectedUser} onClose={() => { setIsEditModalOpen(false); setSelectedUser(null); }} />
      )}
    </div>
  );
};

export default UsersPage;