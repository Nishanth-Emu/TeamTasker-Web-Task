import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import CreateTaskForm from '../components/tasks/CreateTaskForm'; // Import CreateTaskForm


// Type Definitions (ensure these match your backend models)
interface Project {
  id: string;
  name: string;
  description: string;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Blocked' | 'On Hold';
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
  assignedTo?: string;
  reportedBy: string;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string; status: string; };
  assignee?: { id: string; username: string; email: string; role: string; };
  reporter?: { id: string; username: string; email: string; role: string; };
}

const socket = io(import.meta.env.VITE_API_BASE_URL.replace('/api', ''));

const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>(); // Get projectId from URL params
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);

  // Fetch project details
  const { data: project, isLoading: isProjectLoading, isError: isProjectError, error: projectError } = useQuery<Project, Error>({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is missing.');
      const response = await api.get(`/projects/${projectId}`);
      return response.data;
    },
    enabled: !!projectId, // Only run query if projectId is available
  });

  // Fetch tasks for this project
  const { data: tasks, isLoading: isTasksLoading, isError: isTasksError, error: tasksError } = useQuery<Task[], Error>({
    queryKey: ['tasks', projectId], // Key includes projectId for specific tasks
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is missing.');
      const response = await api.get(`/tasks?projectId=${projectId}`); // Fetch tasks filtered by projectId
      return response.data;
    },
    enabled: !!projectId, // Only run query if projectId is available
  });

  // Socket.IO for real-time task updates
  useEffect(() => {
    if (!projectId) return;

    socket.emit('joinRoom', projectId); // Join the project-specific Socket.IO room

    socket.on('taskCreated', (newTask: Task) => {
      console.log('Real-time: Task Created', newTask);
      if (newTask.projectId === projectId) { // Only invalidate if it belongs to this project
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      }
    });

    socket.on('taskUpdated', (updatedTask: Task) => {
      console.log('Real-time: Task Updated', updatedTask);
      if (updatedTask.projectId === projectId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      } else {
        // If task moved to another project, invalidate old project's tasks too
        queryClient.invalidateQueries({ queryKey: ['tasks', updatedTask.projectId] });
      }
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }); // Invalidate current project's tasks
    });

    socket.on('taskDeleted', (deletedTask: { id: string; projectId: string }) => {
      console.log('Real-time: Task Deleted', deletedTask.id);
      if (deletedTask.projectId === projectId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      }
    });

    return () => {
      socket.emit('leaveRoom', projectId); // Leave the room on unmount
      socket.off('taskCreated');
      socket.off('taskUpdated');
      socket.off('taskDeleted');
    };
  }, [projectId, queryClient]); // Depend on projectId and queryClient

  // RBAC Helper
  const canCreateTask = user && ['Admin', 'Project Manager', 'Developer'].includes(user.role);

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
            <div key={task.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-gray-800">{task.title}</h3>
              <p className="text-gray-600 text-sm mb-2">{task.description || 'No description.'}</p>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Status: <span className="font-medium">{task.status}</span></span>
                <span>Priority: <span className="font-medium">{task.priority}</span></span>
                <span>Assignee: {task.assignee?.username || 'Unassigned'}</span>
                <span>Reporter: {task.reporter?.username || 'N/A'}</span>
                {task.deadline && <span>Deadline: {new Date(task.deadline).toLocaleDateString()}</span>}
              </div>
              {/* Task Action Buttons (Edit/Delete) will go here in next step */}
            </div>
          ))
        )}
      </div>

      {/* Create Task Modal */}
      {isCreateTaskModalOpen && project && ( // Ensure project exists before rendering
        <CreateTaskForm
          projectId={project.id}
          onClose={() => setIsCreateTaskModalOpen(false)}
        />
      )}
    </div>
  );
};

export default ProjectDetailPage;
