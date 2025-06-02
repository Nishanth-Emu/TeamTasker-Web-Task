import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // Import useMutation
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import CreateTaskForm from '../components/tasks/CreateTaskForm';
import EditTaskForm from '../components/tasks/EditTaskForm'; // Import EditTaskForm

// Type Definitions (ensure these match your backend models)
interface Project {
  id: string;
  name: string;
  description: string;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Blocked';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator?: { id: string; username: string; email: string; role: string; };
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'To Do' | 'In Progress' | 'Done' | 'Blocked';
  priority: 'Low' | 'Medium' | 'High';
  deadline?: string;
  projectId: string;
  assignedTo?: string | null;
  reportedBy: string;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string; status: string; };
  assignee?: { id: string; username: string; email: string; role: string; };
  reporter?: { id: string; username: string; email: string; role: string; };
}

const socket = io(import.meta.env.VITE_API_BASE_URL.replace('/api', ''));

const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false); // State for edit modal
  const [selectedTask, setSelectedTask] = useState<Task | null>(null); // State for task to edit

  // Fetch project details
  const { data: project, isLoading: isProjectLoading, isError: isProjectError, error: projectError } = useQuery<Project, Error>({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is missing.');
      const response = await api.get(`/projects/${projectId}`);
      return response.data;
    },
    enabled: !!projectId,
  });

  // Fetch tasks for this project
  const { data: tasks, isLoading: isTasksLoading, isError: isTasksError, error: tasksError } = useQuery<Task[], Error>({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is missing.');
      const response = await api.get(`/tasks?projectId=${projectId}`);
      return response.data;
    },
    enabled: !!projectId,
  });

  // Socket.IO for real-time task updates (no change, but ensure it's here)
  useEffect(() => {
    if (!projectId) return;

    socket.emit('joinRoom', projectId);

    socket.on('taskCreated', (newTask: Task) => {
      console.log('Real-time: Task Created', newTask);
      if (newTask.projectId === projectId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      }
    });

    socket.on('taskUpdated', (updatedTask: Task) => {
      console.log('Real-time: Task Updated', updatedTask);
      // Invalidate for both old and new project's tasks if project changed
      if (updatedTask.projectId !== projectId) { // Check if task was moved *from* this project
         queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      }
      queryClient.invalidateQueries({ queryKey: ['tasks', updatedTask.projectId] }); // Invalidate for the project the task now belongs to
    });

    socket.on('taskDeleted', (deletedTask: { id: string; projectId: string }) => {
      console.log('Real-time: Task Deleted', deletedTask.id);
      if (deletedTask.projectId === projectId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      }
    });

    return () => {
      socket.emit('leaveRoom', projectId);
      socket.off('taskCreated');
      socket.off('taskUpdated');
      socket.off('taskDeleted');
    };
  }, [projectId, queryClient]);

  // Mutation for deleting a task
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await api.delete(`/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }); // Refetch tasks after deletion
    },
    onError: (error: any) => {
      console.error('Delete task error:', error);
      alert(`Failed to delete task: ${error.response?.data?.message || error.message}`);
    },
  });

  const handleDeleteTask = (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  // RBAC Helpers for tasks
  const canCreateTask = user && ['Admin', 'Project Manager', 'Developer'].includes(user.role);

  const canEditTask = (task: Task) => user && (
    ['Admin', 'Project Manager'].includes(user.role) || // Admins/PMs can edit any task
    (task.assignedTo === user.id && user.role === 'Developer') || // Devs can edit their assigned tasks
    (task.reportedBy === user.id) // Users can edit tasks they reported
  );

  const canDeleteTask = (task: Task) => user && (
    ['Admin', 'Project Manager'].includes(user.role) || // Admins/PMs can delete any task
    (task.reportedBy === user.id) // Users can delete tasks they reported
  );


  if (isProjectLoading || isTasksLoading) return <div className="text-center text-lg">Loading project and tasks...</div>;
  if (isProjectError) return <div className="text-center text-lg text-red-600">Error loading project: {projectError?.message}</div>;
  if (isTasksError) return <div className="text-center text-lg text-red-600">Error loading tasks: {tasksError?.message}</div>;
  if (!project) return <div className="text-center text-lg text-gray-700">Project not found.</div>;

  return (
    <div className="container mx-auto p-4">
      <Link to="/dashboard/projects" className="text-blue-600 hover:underline mb-4 inline-block">
        &larr; Back to Projects
      </Link>

      {/* Project Details */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">{project.name}</h1>
        <p className="text-gray-600 text-lg mb-4">{project.description || 'No description provided.'}</p>
        <div className="flex justify-between items-center text-sm text-gray-500 border-t pt-4">
          <span>Status: <span className={`font-medium ${project.status === 'Completed' ? 'text-green-600' : project.status === 'In Progress' ? 'text-blue-600' : 'text-gray-600'}`}>{project.status}</span></span>
          <span>Created By: {project.creator?.username || 'N/A'}</span>
          <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Tasks Section */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Tasks</h2>
        {canCreateTask && (
          <button
            onClick={() => setIsCreateTaskModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Create New Task
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {tasks?.length === 0 ? (
          <p className="text-center text-gray-500">No tasks found for this project. {canCreateTask && "Start by creating one!"}</p>
        ) : (
          tasks?.map((task) => (
            <div key={task.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative">
              <h3 className="text-lg font-semibold text-gray-800">{task.title}</h3>
              <p className="text-gray-600 text-sm mb-2">{task.description || 'No description.'}</p>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Status: <span className="font-medium">{task.status}</span></span>
                <span>Priority: <span className="font-medium">{task.priority}</span></span>
                <span>Assignee: {task.assignee?.username || 'Unassigned'}</span>
                <span>Reporter: {task.reporter?.username || 'N/A'}</span>
                {task.deadline && <span>Deadline: {new Date(task.deadline).toLocaleDateString()}</span>}
              </div>

              {/* Task Action Buttons */}
              {(canEditTask(task) || canDeleteTask(task)) && (
                  <div className="absolute top-4 right-4 flex space-x-2">
                      {canEditTask(task) && (
                          <button
                              onClick={() => { setSelectedTask(task); setIsEditTaskModalOpen(true); }}
                              className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
                              title="Edit Task"
                          >
                              {/* Edit icon */}
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.38-2.828-2.828z" />
                              </svg>
                          </button>
                      )}
                      {canDeleteTask(task) && (
                          <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
                              title="Delete Task"
                              disabled={deleteTaskMutation.isPending}
                          >
                              {/* Delete icon */}
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm1 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                              </svg>
                          </button>
                      )}
                  </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Task Modal */}
      {isCreateTaskModalOpen && project && (
        <CreateTaskForm
          projectId={project.id}
          onClose={() => setIsCreateTaskModalOpen(false)}
        />
      )}

      {/* Edit Task Modal */}
      {isEditTaskModalOpen && selectedTask && (
        <EditTaskForm
          task={selectedTask}
          onClose={() => { setIsEditTaskModalOpen(false); setSelectedTask(null); }}
        />
      )}
    </div>
  );
};

export default ProjectDetailPage;