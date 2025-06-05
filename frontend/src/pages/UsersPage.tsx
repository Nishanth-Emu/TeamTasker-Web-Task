import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import CreateUserForm from '../components/users/CreateUserForm';
import EditUserForm from '../components/users/EditUserForm';
import ConfirmDeleteDialog from '../components/common/ConfirmDeleteDialog'; // Assuming path
import { io } from 'socket.io-client';
import {
  UsersIcon,
  UserPlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  EnvelopeIcon,
  BriefcaseIcon as RoleIcon, // Using Briefcase as a generic role icon
  LockClosedIcon,
} from '@heroicons/react/24/outline';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'Admin' | 'Project Manager' | 'Developer' | 'Tester' | 'Viewer';
  createdAt: string;
  updatedAt: string;
}

const socket = io(import.meta.env.VITE_API_BASE_URL.replace('/api', ''));

const getRoleStyles = (role: User['role']) => {
  switch (role) {
    case 'Admin':
      return 'bg-purple-100 text-purple-700 border-purple-300';
    case 'Project Manager':
      return 'bg-sky-100 text-sky-700 border-sky-300';
    case 'Developer':
      return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    case 'Tester':
      return 'bg-amber-100 text-amber-700 border-amber-300';
    case 'Viewer':
    default:
      return 'bg-slate-100 text-slate-600 border-slate-300';
  }
};

const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const { data: users, isLoading, isError, error } = useQuery<User[], Error>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users');
      return response.data;
    },
    staleTime: 60000,
  });

  useEffect(() => {
    const handleUserChange = (_action: string, _data: any) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    };
    socket.on('connect', () => {});
    socket.on('disconnect', () => {});
    socket.on('userCreated', (d: User) => handleUserChange('User Created', d));
    socket.on('userUpdated', (d: User) => handleUserChange('User Updated', d));
    socket.on('userDeleted', (d: { id: string }) => handleUserChange('User Deleted', d));
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('userCreated');
      socket.off('userUpdated');
      socket.off('userDeleted');
    };
  }, [queryClient]);

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsConfirmDeleteDialogOpen(false);
      setUserToDelete(null);
    },
    onError: (err: any) => {
      console.error('Delete user error:', err);
      alert(`Failed to delete user: ${err.response?.data?.message || err.message}`);
      setIsConfirmDeleteDialogOpen(false);
      setUserToDelete(null);
    },
  });

  const openDeleteConfirmDialog = useCallback((user: User) => {
    setUserToDelete(user);
    setIsConfirmDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
  }, [userToDelete, deleteUserMutation]);

  const canManageUsers = currentUser?.role === 'Admin';
  const isDeletingSelfOrLastAdmin = (user: User) => {
    if (user.id === currentUser?.id) return true;
    if (user.role === 'Admin' && users?.filter(u => u.role === 'Admin').length === 1) return true;
    return false;
  };

  if (!canManageUsers) {
    return (
      <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center text-red-600 bg-red-50 p-8 rounded-lg">
        <LockClosedIcon className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-xl font-semibold mb-2">Access Denied</p>
        <p className="text-sm text-red-700">Only Administrators can manage users.</p>
      </div>
    );
  }

  if (isLoading && !users) return (
    <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center text-slate-600">
      <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p className="text-lg font-medium">Loading Users...</p>
    </div>
  );

  if (isError && !users) return (
     <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center text-red-600 bg-red-50 p-8 rounded-lg">
        <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-xl font-semibold mb-2">Error Loading Users</p>
        <p className="text-sm text-red-700 text-center mb-4">{error?.message || "An unexpected error occurred."}</p>
         <button 
          onClick={() => queryClient.refetchQueries({ queryKey: ['users'] })}
          className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-md hover:bg-red-600 transition-colors"
        >
          Try Again
        </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 selection:bg-blue-500 selection:text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="flex items-center">
            <UsersIcon className="h-9 w-9 text-blue-600 mr-3 hidden sm:block" />
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">User Management</h1>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-100 transition-colors duration-150 ease-in-out text-sm font-medium"
          >
            <UserPlusIcon className="h-5 w-5 mr-2 -ml-1" />
            Create New User
          </button>
        </header>
        
        {isLoading && users && (
          <div className="text-center text-sm text-slate-500 mb-4 py-2">Refreshing users list...</div>
        )}
         {isError && users && (
          <div className="text-center text-sm text-red-500 mb-4 py-2 bg-red-50 rounded-md">
            <ExclamationTriangleIcon className="inline h-4 w-4 mr-1" />
            Could not refresh users. Displaying cached data.
          </div>
        )}

        <div className="bg-white shadow-xl rounded-xl overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  <UserCircleIcon className="inline h-4 w-4 mr-1.5 text-slate-400" />Username
                </th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  <EnvelopeIcon className="inline h-4 w-4 mr-1.5 text-slate-400" />Email
                </th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  <RoleIcon className="inline h-4 w-4 mr-1.5 text-slate-400" />Role
                </th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Joined</th>
                <th scope="col" className="relative px-6 py-3.5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {users?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 whitespace-nowrap text-center text-slate-500">
                    <UsersIcon className="mx-auto h-12 w-12 text-slate-400" />
                    <p className="mt-2 text-sm font-medium">No users found.</p>
                    <p className="mt-1 text-xs">Try creating a new user to get started.</p>
                  </td>
                </tr>
              ) : (
                users?.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">{user.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleStyles(user.role)}`}>
                        {user.role === 'Admin' && <ShieldCheckIcon className="h-3.5 w-3.5 mr-1 opacity-70" />}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => { setSelectedUser(user); setIsEditModalOpen(true); }}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                          title="Edit User"
                        >
                          <PencilSquareIcon className="h-5 w-5" />
                        </button>
                        {!isDeletingSelfOrLastAdmin(user) ? (
                          <button
                            onClick={() => openDeleteConfirmDialog(user)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                            title="Delete User"
                            disabled={deleteUserMutation.isPending && deleteUserMutation.variables === user.id}
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        ) : (
                           <span className="p-1.5 text-slate-300 cursor-not-allowed" title="Cannot delete self or last admin">
                                <TrashIcon className="h-5 w-5" />
                           </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" aria-hidden="true" />
      )}
      {isCreateModalOpen && <CreateUserForm onClose={() => setIsCreateModalOpen(false)} />}

      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" aria-hidden="true" />
      )}
      {isEditModalOpen && selectedUser && (
        <EditUserForm user={selectedUser} onClose={() => { setIsEditModalOpen(false); setSelectedUser(null); }} />
      )}

      {userToDelete && (
        <ConfirmDeleteDialog
          isOpen={isConfirmDeleteDialogOpen}
          onClose={() => { setIsConfirmDeleteDialogOpen(false); setUserToDelete(null); }}
          onConfirm={handleConfirmDelete}
          title="Confirm User Deletion"
          message="Are you sure you want to delete this user? This action cannot be undone and will remove their access permanently."
          itemName={userToDelete.username}
          isDeleting={deleteUserMutation.isPending}
        />
      )}
    </div>
  );
};

export default UsersPage;