import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TimeEntry } from '@/entities/all';
import { ClipboardList, Play, Check } from 'lucide-react';
import { format } from 'date-fns';

export default function PendingTasks({ currentUser, projects, onStartTask }) {
  const [pendingTasks, setPendingTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPendingTasks = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        // Buscar tareas asignadas al usuario actual que no estén activas y no tengan duración
        const allEntries = await TimeEntry.list('-start_time', 50);
        const userPendingTasks = allEntries.filter(entry => 
          (entry.employee_ids || []).includes(currentUser.id) && 
          !entry.is_active && 
          !entry.duration_minutes
        );
        setPendingTasks(userPendingTasks);
      } catch (error) {
        console.error('Error loading pending tasks:', error);
        setPendingTasks([]);
      } finally {
        setLoading(false);
      }
    };

    loadPendingTasks();
  }, [currentUser]);

  const handleStartTask = async (task) => {
    await onStartTask(task);
    // Refresh pending tasks
    const allEntries = await TimeEntry.list('-start_time', 50);
    const userPendingTasks = allEntries.filter(entry => 
      (entry.employee_ids || []).includes(currentUser.id) && 
      !entry.is_active && 
      !entry.duration_minutes
    );
    setPendingTasks(userPendingTasks);
  };

  const handleCompleteTask = async (taskId) => {
    try {
      await TimeEntry.update(taskId, { 
        task_status: 'finished',
        duration_minutes: 1 // Mark as completed without time tracking
      });
      setPendingTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  if (loading) {
    return (
      <Card className="bg-white rounded-xl shadow-lg border border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="w-4 h-4" />
            Your Pending Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-slate-500">Loading tasks...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white rounded-xl shadow-lg border border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="w-4 h-4" />
          Your Pending Tasks
          {pendingTasks.length > 0 && (
            <Badge variant="secondary" className="ml-2">{pendingTasks.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendingTasks.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <ClipboardList className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-sm">No pending tasks assigned to you</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingTasks.map((task) => {
              const project = projects.find(p => p.id === task.project_id);
              return (
                <div key={task.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-3 h-3 rounded-full bg-${project?.color || 'gray'}-500 flex-shrink-0`}></div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-slate-900 truncate">
                        {project?.name || 'Unknown Project'}
                      </p>
                      {task.task && (
                        <p className="text-xs text-slate-600 truncate">{task.task}</p>
                      )}
                      <p className="text-xs text-slate-500">
                        Assigned {format(new Date(task.start_time), 'MMM d, HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleCompleteTask(task.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Check className="w-4 h-4 text-green-600" />
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => handleStartTask(task)}
                      className="h-8 px-3 bg-green-600 hover:bg-green-700"
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Start
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}