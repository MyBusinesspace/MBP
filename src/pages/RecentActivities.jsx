import React, { useState, useEffect, useCallback } from 'react';
import { TimeEntry } from '@/entities/all';
import { useData } from '../components/DataProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function RecentActivitiesPage() {
  const { projects, users: allEmployees, currentUser, loading: dataLoading } = useData();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadEntries = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const entriesData = await TimeEntry.list('-start_time', 50);
      const relevantEntries = currentUser?.role === 'admin'
        ? entriesData.filter(e => e.duration_minutes > 0 || e.is_active === true)
        : entriesData.filter(e => e.employee_id === currentUser?.id && (e.duration_minutes > 0 || e.is_active === true));
        
      setEntries(relevantEntries);
    } catch (error) {
      console.error('Error loading entries:', error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!dataLoading) {
      loadEntries();
    }
  }, [dataLoading, loadEntries]);

  const getProject = (projectId) => {
    return projects.find(p => p.id === projectId);
  };

  const getEmployeeName = (employeeId) => {
    if (!allEmployees || allEmployees.length === 0) return 'Loading...';
    
    const employee = allEmployees.find(e => e.id === employeeId);
    if (!employee) return 'Unknown Employee';
    
    const firstName = employee.first_name || '';
    const lastName = employee.last_name || '';
    const dynamicName = `${firstName} ${lastName}`.trim();
    return dynamicName || employee.full_name || employee.name || 'Unknown Employee';
  };

  const formatDuration = (minutes) => {
    if (minutes === null || minutes === undefined) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (dataLoading || loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">Loading recent activities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-100 rounded-lg">
            <Calendar className="w-6 h-6 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold header-express text-slate-900">Recent Activities</h1>
          {entries.length > 0 && (
            <Badge variant="secondary" className="font-mono">{entries.length}</Badge>
          )}
        </div>

        <Card className="bg-white rounded-xl shadow-lg border border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg header-express text-slate-800">
              <Clock className="w-5 h-5" />
              Recent Time Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {entries.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Clock className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-lg font-medium content-lexend">No recent activities</p>
                  <p className="text-sm content-lexend">Time entries will appear here once work is tracked</p>
                </div>
              ) : (
                entries.map((entry) => {
                  const project = getProject(entry.project_id);
                  const employeeName = getEmployeeName(entry.employee_id);
                  return (
                    <div key={entry.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full bg-${project?.color || 'gray'}-500 flex-shrink-0`}></div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-base text-slate-900 truncate content-lexend">
                              {project?.name || 'Unknown Project'}
                            </p>
                            {entry.is_active && (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                Active
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-slate-600">
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              <span className="content-lexend">{employeeName}</span>
                            </div>
                            {entry.task && (
                              <span className="truncate content-lexend">• {entry.task}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="font-medium text-base content-lexend">
                          {formatDuration(entry.duration_minutes)}
                        </p>
                        <p className="text-sm text-slate-500 content-lexend">
                          {format(new Date(entry.start_time), "MMM d, HH:mm")}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}