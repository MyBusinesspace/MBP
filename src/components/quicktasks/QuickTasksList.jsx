import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { QuickTask } from '@/entities/all';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Loader2, Trash2, Edit } from 'lucide-react';
import Avatar from '../Avatar';

const departmentColorClasses = {
  white: { bg: 'bg-white', border: 'border-slate-200', text: 'text-slate-900' },
  gray: { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-900' },
  red: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-900' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-900' },
  green: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-900' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-900' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-900' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-900' },
  pink: { bg: 'bg-pink-50', border: 'border-pink-300', text: 'text-pink-900' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-900' },
  teal: { bg: 'bg-teal-50', border: 'border-teal-300', text: 'text-teal-900' }
};

export default function QuickTasksList({
  onEditTask,
  settings,
  visibleColumns,
  currentUser,
  allUsers,
  allCustomers,
  allDepartments,
  refreshKey,
  collapsed = false,
  onToggleTask
}) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAssignedTo, setFilterAssignedTo] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterCustomer, setFilterCustomer] = useState('all');
  const [viewMode, setViewMode] = useState('ongoing'); // 'ongoing' or 'completed'
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskComment, setNewTaskComment] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const allTasks = await QuickTask.list('-created_date');
      setTasks(allTasks || []);
    } catch (err) {
      console.error('Failed to fetch quick tasks:', err);
      toast.error('Failed to load quick tasks.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks, refreshKey]);

  const filteredTasks = useMemo(() => {
    let tempTasks = tasks;

    // Apply permission filtering
    if (settings?.permission_mode === 'restricted' && currentUser) {
      const userTeamIds = currentUser.team_ids || [];
      const currentUserEmail = currentUser.email || currentUser.user_email;
      tempTasks = tempTasks.filter(task => {
        const isAssignedToUser = task.assigned_to_user_ids?.includes(currentUser.id);
        const isAssignedToUserTeam = task.assigned_to_team_ids?.some(teamId => userTeamIds.includes(teamId));
        const isCreatedByUser = task.created_by === currentUserEmail || !task.created_by; // Include tasks without creator
        return isAssignedToUser || isAssignedToUserTeam || isCreatedByUser;
      });
    }

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      tempTasks = tempTasks.filter(task =>
        task.title?.toLowerCase().includes(lowerSearchTerm) ||
        task.description?.toLowerCase().includes(lowerSearchTerm)
      );
    }
    if (filterStatus !== 'all') {
      tempTasks = tempTasks.filter(task => task.status === filterStatus);
    }
    if (filterAssignedTo !== 'all') {
      tempTasks = tempTasks.filter(task => task.assigned_to_user_ids?.includes(filterAssignedTo));
    }
    if (filterDepartment !== 'all') {
      tempTasks = tempTasks.filter(task => task.department_id === filterDepartment);
    }
    if (filterCustomer !== 'all') {
      tempTasks = tempTasks.filter(task => task.customer_id === filterCustomer);
    }
    return tempTasks;
  }, [tasks, searchTerm, filterStatus, filterAssignedTo, filterDepartment, filterCustomer, settings, currentUser]);

  const sortedTasks = useMemo(() => {
    let tasksToSort = [...filteredTasks];
    
    // Filter by view mode
    if (viewMode === 'ongoing') {
      tasksToSort = tasksToSort.filter(task => !task.status || task.status === 'open' || task.status === 'in_progress' || task.status !== 'completed');
    } else if (viewMode === 'completed') {
      tasksToSort = tasksToSort.filter(task => task.status === 'completed');
    }
    
    return tasksToSort.sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      return 0;
    });
  }, [filteredTasks, viewMode]);

  const getDepartmentColor = (departmentId) => {
    const department = allDepartments?.find(d => d.id === departmentId);
    return departmentColorClasses[department?.color || 'blue'];
  };

  const handleToggleTaskStatus = useCallback(async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'completed' ? 'open' : 'completed';
    
    // Update UI immediately
    setTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, status: newStatus } : task
    ));
    
    try {
      if (onToggleTask) {
        await onToggleTask(taskId, currentStatus);
      } else {
        await QuickTask.update(taskId, { status: newStatus });
      }
    } catch (err) {
      console.error('❌ Error toggling task:', err);
      // Revert on error
      setTasks(prev => prev.map(task =>
        task.id === taskId ? { ...task, status: currentStatus } : task
      ));
    }
  }, [onToggleTask]);

  const handleDeleteTask = useCallback(async (taskId) => {
    // Update UI immediately
    setTasks(prev => prev.filter(task => task.id !== taskId));
    
    try {
      await QuickTask.delete(taskId);
    } catch (err) {
      console.error('❌ Error deleting task:', err);
      // Reload on error
      loadTasks();
    }
  }, [loadTasks]);

  const handleQuickCreateTask = useCallback(async () => {
    if (!newTaskTitle.trim()) return;
    
    const tempId = `temp_${Date.now()}`;
    const newTask = {
      id: tempId,
      title: newTaskTitle.trim(),
      description: newTaskComment.trim(),
      status: 'open',
      created_date: new Date().toISOString()
    };
    
    // Update UI immediately
    setTasks(prev => [newTask, ...prev]);
    setNewTaskTitle('');
    setNewTaskComment('');
    setShowQuickAdd(false);
    
    try {
      const createdTask = await QuickTask.create({
        title: newTask.title,
        description: newTask.description,
        status: 'open'
      });
      
      // Replace temp task with real one
      setTasks(prev => prev.map(t => t.id === tempId ? createdTask : t));
    } catch (err) {
      console.error('❌ Error creating task:', err);
      // Remove temp task on error
      setTasks(prev => prev.filter(t => t.id !== tempId));
    }
  }, [newTaskTitle, newTaskComment]);

  const handleUpdateTaskField = useCallback(async (taskId, field, value) => {
    // Update UI immediately
    setTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, [field]: value } : task
    ));
    
    try {
      await QuickTask.update(taskId, { [field]: value });
    } catch (err) {
      console.error('❌ Error updating task:', err);
      // Reload on error
      loadTasks();
    }
  }, [loadTasks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (collapsed) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Subheader - Tab selector */}
        <div className="flex bg-slate-50 border-b border-slate-200">
          <button
            onClick={() => setViewMode('ongoing')}
            className={cn(
              "flex-1 p-2 text-xs font-semibold text-center transition-colors",
              viewMode === 'ongoing' ? "bg-white text-slate-900 border-b-2 border-indigo-600" : "text-slate-600 hover:text-slate-900"
            )}
          >
            Ongoing
          </button>
          <button
            onClick={() => setViewMode('completed')}
            className={cn(
              "flex-1 p-2 text-xs font-semibold text-center transition-colors",
              viewMode === 'completed' ? "bg-white text-slate-900 border-b-2 border-green-600" : "text-slate-600 hover:text-slate-900"
            )}
          >
            Done
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          <div className="flex flex-col gap-1 p-2">
            {/* Quick Add Task */}
            {showQuickAdd ? (
              <div className="bg-white border-2 border-indigo-300 rounded p-2 mb-2">
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Task title..."
                  className="text-xs h-7 mb-1 border-0 focus-visible:ring-0 px-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleQuickCreateTask();
                    }
                    if (e.key === 'Escape') {
                      setShowQuickAdd(false);
                      setNewTaskTitle('');
                      setNewTaskComment('');
                    }
                  }}
                />
                <Input
                  value={newTaskComment}
                  onChange={(e) => setNewTaskComment(e.target.value)}
                  placeholder="Comment (optional)..."
                  className="text-[10px] h-6 border-0 focus-visible:ring-0 px-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleQuickCreateTask();
                    }
                    if (e.key === 'Escape') {
                      setShowQuickAdd(false);
                      setNewTaskTitle('');
                      setNewTaskComment('');
                    }
                  }}
                />
                <div className="flex gap-1 mt-1">
                  <Button
                    size="sm"
                    onClick={handleQuickCreateTask}
                    className="h-5 text-[10px] px-2 bg-indigo-600 hover:bg-indigo-700"
                  >
                    Add
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowQuickAdd(false);
                      setNewTaskTitle('');
                      setNewTaskComment('');
                    }}
                    className="h-5 text-[10px] px-2"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowQuickAdd(true)}
                className="flex items-center gap-2 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded border border-dashed border-slate-300 hover:border-slate-400 transition-colors mb-2"
              >
                <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center">
                  <span className="text-lg leading-none">+</span>
                </div>
                <span className="text-xs">New Task</span>
              </button>
            )}

            {sortedTasks.map(task => {
              const isCompleted = task.status === 'completed';
              return (
                <div 
                  key={task.id} 
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 p-2 rounded border transition-all cursor-pointer",
                    isCompleted ? "bg-green-50 border-green-200" : "bg-white border-slate-200 hover:border-indigo-300"
                  )}
                >
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleTaskStatus(task.id, task.status);
                    }}
                    className="cursor-pointer"
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                      isCompleted 
                        ? "bg-green-500 border-green-500" 
                        : "bg-white border-slate-300 hover:border-indigo-400"
                    )}>
                      {isCompleted && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div 
                    onClick={() => onEditTask(task)}
                    className="text-[8px] text-slate-400 hover:text-indigo-600 cursor-pointer"
                  >
                    Edit
                  </div>
                  {task.assigned_to_user_ids && task.assigned_to_user_ids.length > 0 && (
                    <div className="flex -space-x-1">
                      {task.assigned_to_user_ids.slice(0, 2).map(userId => {
                        const user = allUsers?.find(u => u.id === userId);
                        return user ? (
                          <Avatar 
                            key={userId} 
                            user={user} 
                            size="xs" 
                            className="w-5 h-5 ring-1 ring-white" 
                          />
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Subheader - Tab selector */}
      <div className="flex bg-slate-50 border-b border-slate-200">
        <button
          onClick={() => setViewMode('ongoing')}
          className={cn(
            "flex-1 p-2 text-xs font-semibold text-center transition-colors",
            viewMode === 'ongoing' ? "bg-white text-slate-900 border-b-2 border-indigo-600" : "text-slate-600 hover:text-slate-900"
          )}
        >
          Ongoing
        </button>
        <button
          onClick={() => setViewMode('completed')}
          className={cn(
            "flex-1 p-2 text-xs font-semibold text-center transition-colors",
            viewMode === 'completed' ? "bg-white text-slate-900 border-b-2 border-green-600" : "text-slate-600 hover:text-slate-900"
          )}
        >
          Done
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="space-y-1 p-2">
          {/* Quick Add Task */}
          {showQuickAdd ? (
            <div className="bg-white border-2 border-indigo-300 rounded p-2 mb-2">
              <Input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Task title..."
                className="text-xs h-7 mb-1 border-0 focus-visible:ring-0 px-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleQuickCreateTask();
                  }
                  if (e.key === 'Escape') {
                    setShowQuickAdd(false);
                    setNewTaskTitle('');
                    setNewTaskComment('');
                  }
                }}
              />
              <Input
                value={newTaskComment}
                onChange={(e) => setNewTaskComment(e.target.value)}
                placeholder="Comment (optional)..."
                className="text-[10px] h-6 border-0 focus-visible:ring-0 px-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleQuickCreateTask();
                  }
                  if (e.key === 'Escape') {
                    setShowQuickAdd(false);
                    setNewTaskTitle('');
                    setNewTaskComment('');
                  }
                }}
              />
              <div className="flex gap-1 mt-1">
                <Button
                  size="sm"
                  onClick={handleQuickCreateTask}
                  className="h-5 text-[10px] px-2 bg-indigo-600 hover:bg-indigo-700"
                >
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowQuickAdd(false);
                    setNewTaskTitle('');
                    setNewTaskComment('');
                  }}
                  className="h-5 text-[10px] px-2"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowQuickAdd(true)}
              className="w-full flex items-center gap-2 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded border border-dashed border-slate-300 hover:border-slate-400 transition-colors mb-2"
            >
              <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center">
                <span className="text-lg leading-none">+</span>
              </div>
              <span className="text-xs">New Task</span>
            </button>
          )}

          {sortedTasks.length === 0 && (
            <div className="text-center text-slate-500 py-4 text-xs">
              No quick tasks found.
            </div>
          )}
          {sortedTasks.map(task => {
            const isCompleted = task.status === 'completed';
            return (
              <div 
                key={task.id} 
                className={cn(
                  "flex items-start gap-2 p-1.5 rounded border transition-all group",
                  isCompleted ? "bg-green-50 border-green-200" : "bg-white border-slate-200 hover:border-indigo-300"
                )}
              >
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleTaskStatus(task.id, task.status);
                  }}
                  className="cursor-pointer"
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all mt-0.5",
                    isCompleted 
                      ? "bg-green-500 border-green-500" 
                      : "bg-white border-slate-300 hover:border-indigo-400"
                  )}>
                    {isCompleted && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <Input
                    value={task.title}
                    onChange={(e) => handleUpdateTaskField(task.id, 'title', e.target.value)}
                    className={cn(
                      "font-medium text-[10px] h-6 border-0 focus-visible:ring-1 focus-visible:ring-indigo-300 px-1",
                      isCompleted && "line-through text-slate-400"
                    )}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Input
                    value={task.description || ''}
                    onChange={(e) => handleUpdateTaskField(task.id, 'description', e.target.value)}
                    placeholder="Add comment..."
                    className={cn(
                      "text-[9px] h-5 mt-0.5 border-0 focus-visible:ring-1 focus-visible:ring-indigo-300 px-1",
                      isCompleted ? "text-slate-400" : "text-slate-500"
                    )}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {task.assigned_to_user_ids && task.assigned_to_user_ids.length > 0 && (
                    <div className="flex -space-x-1 mt-1">
                      {task.assigned_to_user_ids.slice(0, 3).map(userId => {
                        const user = allUsers?.find(u => u.id === userId);
                        return user ? (
                          <Avatar 
                            key={userId} 
                            user={user} 
                            size="xs" 
                            className="w-5 h-5 ring-1 ring-white" 
                          />
                        ) : null;
                      })}
                      {task.assigned_to_user_ids.length > 3 && (
                        <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[8px] text-slate-600 ring-1 ring-white">
                          +{task.assigned_to_user_ids.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditTask(task)}
                    className="h-5 w-5 p-0 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTask(task.id);
                    }}
                    className="h-5 w-5 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}