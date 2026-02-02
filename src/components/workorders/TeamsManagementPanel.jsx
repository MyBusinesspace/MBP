import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Crown, Save, X, Loader2, Briefcase, Home, UserX, Calendar, ArrowRight, Plus, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Avatar from '../Avatar';
import TeamAvatar from '../shared/TeamAvatar';
import { LeaveRequest, Team } from '@/entities/all';
import { format, parseISO, isWithinInterval, startOfDay, isAfter } from 'date-fns';

export default function TeamsManagementPanel({
  isOpen = false,
  onClose,
  teams = [],
  users = [],
  onSave,
  isLoading = false,
}) {
  const [localTeams, setLocalTeams] = useState([]);
  const [localUsers, setLocalUsers] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  
  // Team creation/editing states
  const [showTeamDialog, setShowTeamDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [teamFormData, setTeamFormData] = useState({
    name: '',
    color: 'blue',
    avatar_code: '',
    sort_order: 0,
  });

  useEffect(() => {
    if (isOpen) {
      setLocalTeams(teams.map(t => ({ ...t })));
      // ✅ Filter out archived users from team members display
      setLocalUsers(users.filter(u => !u.archived).map(u => ({ ...u })));
      setHasChanges(false);
      
      // Load leave requests
      loadLeaveRequests();
    }
  }, [isOpen, teams, users]);

  const loadLeaveRequests = async () => {
    setLoadingLeaves(true);
    try {
      const leaves = await LeaveRequest.filter({ status: 'approved' }, '-start_date', 100);
      setLeaveRequests(leaves || []);
    } catch (error) {
      console.error('Failed to load leave requests:', error);
    } finally {
      setLoadingLeaves(false);
    }
  };

  // Get active and upcoming absences
  const getActiveAbsences = () => {
    const today = startOfDay(new Date());
    return leaveRequests.filter(leave => {
      const startDate = startOfDay(parseISO(leave.start_date));
      const endDate = startOfDay(parseISO(leave.end_date));
      // Active: today is within the leave period
      // Upcoming: start date is in the future
      return isWithinInterval(today, { start: startDate, end: endDate }) || isAfter(startDate, today);
    }).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
  };

  const handleSetTeamLeader = (teamId, userId) => {
    const leaderId = userId === '' || userId === 'none' ? null : userId;
    
    setLocalTeams(prev => prev.map(team => {
      if (team.id === teamId) {
        return { ...team, team_leader_id: leaderId };
      }
      return team;
    }));

    setLocalUsers(prev => prev.map(user => {
      if (user.team_id === teamId) {
        return { ...user, is_team_leader: user.id === leaderId };
      }
      return user;
    }));

    setHasChanges(true);
  };

  const handleSetWorkerType = (teamId, workerType) => {
    setLocalTeams(prev => prev.map(team => {
      if (team.id === teamId) {
        return { ...team, worker_type: workerType };
      }
      return team;
    }));

    setHasChanges(true);
  };

  const handleMoveUser = (userId, newTeamId) => {
    const user = localUsers.find(u => u.id === userId);
    
    if (user?.is_team_leader) {
      setLocalTeams(prev => prev.map(team => {
        if (team.id === user.team_id) {
          return { ...team, team_leader_id: null };
        }
        return team;
      }));
    }

    setLocalUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return { ...u, team_id: newTeamId, is_team_leader: false };
      }
      return u;
    }));

    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!hasChanges) {
      toast.info('No changes to save');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({ teams: localTeams, users: localUsers });
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save teams:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTeam = async () => {
    if (!teamFormData.name.trim()) {
      toast.error('Team name cannot be empty.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingTeam) {
        await Team.update(editingTeam.id, teamFormData);
        toast.success('Team updated successfully.');
      } else {
        const maxSortOrder = localTeams.length > 0 ? Math.max(...localTeams.map(t => t.sort_order || 0)) : -1;
        await Team.create({ ...teamFormData, sort_order: maxSortOrder + 1 });
        toast.success('Team created successfully.');
      }
      setShowTeamDialog(false);
      setEditingTeam(null);
      setTeamFormData({ name: '', color: 'blue', avatar_code: '', sort_order: 0 });
      
      // Reload teams
      const updatedTeams = await Team.list('sort_order', 1000);
      setLocalTeams(updatedTeams || []);
    } catch (error) {
      console.error('Error saving team:', error);
      toast.error('Failed to save team.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTeam = async (teamId) => {
    const team = localTeams.find(t => t.id === teamId);
    if (!team) return;

    const confirmDelete = window.confirm(`⚠️ Permanently delete team "${team.name}"? This cannot be undone.`);
    if (!confirmDelete) return;

    setIsSaving(true);
    try {
      await Team.delete(teamId);
      toast.success(`Team "${team.name}" deleted successfully.`);
      
      // Reload teams
      const updatedTeams = await Team.list('sort_order', 1000);
      setLocalTeams(updatedTeams || []);
    } catch (error) {
      console.error('Error deleting team:', error);
      toast.error('Failed to delete team.');
    } finally {
      setIsSaving(false);
    }
  };

  const getMemberCounts = () => {
    const counts = {};
    localUsers.forEach(user => {
      if (user.team_id) {
        counts[user.team_id] = (counts[user.team_id] || 0) + 1;
      }
    });
    return counts;
  };

  const getUsersInTeam = (teamId) => {
    return localUsers.filter(u => u.team_id === teamId);
  };

  const isUserOnLeave = (userId) => {
    const today = startOfDay(new Date());
    return leaveRequests.some(leave => {
      if (leave.employee_id !== userId || leave.status !== 'approved') return false;
      const startDate = startOfDay(parseISO(leave.start_date));
      const endDate = startOfDay(parseISO(leave.end_date));
      return isWithinInterval(today, { start: startDate, end: endDate });
    });
  };

  const getUsersWithoutTeam = () => {
    return localUsers.filter(u => !u.team_id);
  };

  const getTeamLeader = (teamId) => {
    return localUsers.find(u => u.team_id === teamId && u.is_team_leader);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-3xl flex flex-col p-0 h-screen max-h-screen">
        <SheetHeader className="px-6 py-4 border-b bg-indigo-600 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-white" />
              <SheetTitle className="text-white">Team Management</SheetTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-indigo-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        <Tabs defaultValue="teams" className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full grid grid-cols-5 rounded-none border-b bg-white flex-shrink-0">
            <TabsTrigger value="teams">Teams ({localTeams.length})</TabsTrigger>
            <TabsTrigger value="leaders">Leaders</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="unassigned">
              Unassigned ({getUsersWithoutTeam().length})
            </TabsTrigger>
            <TabsTrigger value="absences">
              Absences ({getActiveAbsences().length})
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto min-h-0" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            <TabsContent value="teams" className="p-6 space-y-4 m-0 h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-slate-600">
                  Create, edit, and manage teams. Assign colors and codes for easy identification.
                </div>
                <Button 
                  onClick={() => {
                    setEditingTeam(null);
                    setTeamFormData({ name: '', color: 'blue', avatar_code: '', sort_order: localTeams.length });
                    setShowTeamDialog(true);
                  }}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Team
                </Button>
              </div>

              <div className="space-y-3">
                {localTeams.map((team) => {
                  const memberCount = getMemberCounts()[team.id] || 0;
                  const currentLeader = getTeamLeader(team.id);
                  
                  return (
                    <div
                      key={team.id}
                      className="p-4 border-2 border-slate-200 rounded-lg bg-white hover:border-indigo-300 transition-all"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <TeamAvatar team={team} size="md" />
                          <div>
                            <div className="font-semibold text-slate-900">{team.name}</div>
                            <div className="text-xs text-slate-500">
                              {memberCount} member{memberCount !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {currentLeader && (
                            <Badge variant="default" className="bg-blue-500 gap-1">
                              <Crown className="w-3 h-3" />
                              Leader
                            </Badge>
                          )}
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "gap-1",
                              team.worker_type === 'field' ? "border-green-300 bg-green-50 text-green-700" : "border-blue-300 bg-blue-50 text-blue-700"
                            )}
                          >
                            {team.worker_type === 'field' ? (
                              <>
                                <Briefcase className="w-3 h-3" />
                                Field
                              </>
                            ) : (
                              <>
                                <Home className="w-3 h-3" />
                                Office
                              </>
                            )}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingTeam(team);
                              setTeamFormData({
                                name: team.name,
                                color: team.color || 'blue',
                                avatar_code: team.avatar_code || '',
                                sort_order: team.sort_order || 0
                              });
                              setShowTeamDialog(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTeam(team.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-700">Worker Type:</label>
                        <Select
                          value={team.worker_type || 'field'}
                          onValueChange={(value) => handleSetWorkerType(team.id, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue>
                              <div className="flex items-center gap-2">
                                {(team.worker_type || 'field') === 'field' ? (
                                  <>
                                    <Briefcase className="w-4 h-4 text-green-600" />
                                    <span>Field Workers</span>
                                  </>
                                ) : (
                                  <>
                                    <Home className="w-4 h-4 text-blue-600" />
                                    <span>Office Workers</span>
                                  </>
                                )}
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="field">
                              <div className="flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-green-600" />
                                <span>Field Workers</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="office">
                              <div className="flex items-center gap-2">
                                <Home className="w-4 h-4 text-blue-600" />
                                <span>Office Workers</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-medium text-slate-700">Team Members:</div>
                          <Select
                            value=""
                            onValueChange={(userId) => handleMoveUser(userId, team.id)}
                          >
                            <SelectTrigger className="h-7 w-32 text-xs">
                              <SelectValue placeholder="+ Add member" />
                            </SelectTrigger>
                            <SelectContent>
                              {localUsers
                                .filter(u => u.team_id !== team.id)
                                .map((user) => (
                                  <SelectItem key={user.id} value={user.id}>
                                    <div className="flex items-center gap-2">
                                      <Avatar user={user} size="xs" />
                                      <span className="text-xs">
                                        {user.nickname || user.first_name || user.email}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {getUsersInTeam(team.id).map((user) => (
                            <div
                              key={user.id}
                              className={cn(
                                "flex items-center gap-1 px-2 py-1 rounded-full text-xs",
                                user.is_team_leader
                                  ? "bg-blue-100 border border-blue-300"
                                  : "bg-slate-100 border border-slate-200"
                              )}
                            >
                              <Avatar user={user} size="xs" />
                              <span className="text-slate-700">
                                {user.nickname || user.first_name || user.email}
                              </span>
                              {user.is_team_leader && <Crown className="w-3 h-3 text-blue-600" />}
                            </div>
                          ))}
                          {getUsersInTeam(team.id).length === 0 && (
                            <span className="text-xs text-slate-400">No members in this team</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="leaders" className="p-6 space-y-4 m-0 h-full">
              <div className="text-sm text-slate-600 mb-4">
                Assign a team leader for each team.
              </div>

              {localTeams.map((team) => {
                const teamUsers = getUsersInTeam(team.id);
                const currentLeader = getTeamLeader(team.id);

                return (
                  <div
                    key={team.id}
                    className="p-4 border-2 border-slate-200 rounded-lg bg-white hover:border-indigo-300 transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <TeamAvatar team={team} size="md" />
                        <div>
                          <div className="font-semibold text-slate-900">{team.name}</div>
                          <div className="text-xs text-slate-500">
                            {teamUsers.length} member{teamUsers.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {currentLeader && (
                          <Badge variant="default" className="bg-blue-500 gap-1">
                            <Crown className="w-3 h-3" />
                            Leader
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-700">Team Leader:</label>
                      <Select
                        value={team.team_leader_id || 'none'}
                        onValueChange={(userId) => handleSetTeamLeader(team.id, userId)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue>
                            {(() => {
                              if (!team.team_leader_id || team.team_leader_id === 'none') {
                                return 'No leader assigned';
                              }
                              const leader = teamUsers.find(u => u.id === team.team_leader_id);
                              if (!leader) return 'No leader assigned';
                              return (
                                <div className="flex items-center gap-2">
                                  <Avatar user={leader} size="xs" />
                                  <span>{leader.nickname || `${leader.first_name || ''} ${leader.last_name || ''}`.trim() || leader.email}</span>
                                </div>
                              );
                            })()}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No leader</SelectItem>
                          {teamUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              <div className="flex items-center gap-2">
                                <Avatar user={user} size="xs" />
                                <span>
                                  {user.nickname || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <div className="text-xs font-medium text-slate-700 mb-2">Team Members:</div>
                      <div className="flex flex-wrap gap-2">
                        {teamUsers.map((user) => (
                          <div
                            key={user.id}
                            className={cn(
                              "flex items-center gap-1 px-2 py-1 rounded-full text-xs",
                              user.is_team_leader
                                ? "bg-blue-100 border border-blue-300"
                                : "bg-slate-100 border border-slate-200"
                            )}
                          >
                            <Avatar user={user} size="xs" />
                            <span className="text-slate-700">
                              {user.nickname || user.first_name || user.email}
                            </span>
                            {user.is_team_leader && <Crown className="w-3 h-3 text-blue-600" />}
                          </div>
                        ))}
                        {teamUsers.length === 0 && (
                          <span className="text-xs text-slate-400">No members in this team</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="members" className="p-6 space-y-4 m-0 h-full">
              <div className="text-sm text-slate-600 mb-4">
                Move team members between teams. Moving a team leader will remove their leader status.
              </div>

              {localTeams.map((team) => {
                const teamUsers = getUsersInTeam(team.id);

                return (
                  <div
                    key={team.id}
                    className="p-4 border-2 border-slate-200 rounded-lg bg-white"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <TeamAvatar team={team} size="md" />
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900">{team.name}</div>
                        <div className="text-xs text-slate-500">
                          {teamUsers.length} member{teamUsers.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {teamUsers.length === 0 ? (
                        <div className="text-center py-4 text-slate-400 text-sm">
                          No members in this team
                        </div>
                      ) : (
                        teamUsers.map((user) => {
                          const onLeave = isUserOnLeave(user.id);
                          return (
                            <div
                             key={user.id}
                             className={cn(
                               "flex items-center justify-between p-2 rounded border transition-all",
                               onLeave
                                 ? "border-slate-100 bg-slate-50/50 opacity-50"
                                 : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                             )}
                            >
                             <div className="flex items-center gap-2 flex-1">
                               <Avatar user={user} size="sm" />
                               <div className="flex-1">
                                 <div className={cn(
                                   "text-sm font-medium",
                                   onLeave ? "text-slate-400" : "text-slate-900"
                                 )}>
                                   {user.nickname || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email}
                                 </div>
                                 <div className="text-xs text-slate-500">{user.job_role || 'No role'}</div>
                               </div>
                               {user.is_team_leader && (
                                 <Badge variant="default" className="bg-blue-500 text-xs gap-1">
                                   <Crown className="w-3 h-3" />
                                   Leader
                                 </Badge>
                               )}
                               {onLeave && (
                                 <Badge variant="outline" className="bg-red-50 border-red-200 text-red-600 text-xs">
                                   On Leave
                                 </Badge>
                               )}
                               <Select
                                 value={user.worker_type || 'field'}
                                 onValueChange={(value) => {
                                   setLocalUsers(prev => prev.map(u => 
                                     u.id === user.id ? { ...u, worker_type: value } : u
                                   ));
                                   setHasChanges(true);
                                 }}
                                 disabled={onLeave}
                               >
                                 <SelectTrigger className={cn("w-32", onLeave && "opacity-50")}>
                                   <SelectValue>
                                     {user.worker_type === 'office' ? 'Office' : 'Field'}
                                   </SelectValue>
                                 </SelectTrigger>
                                 <SelectContent>
                                   <SelectItem value="field">
                                     <div className="flex items-center gap-2">
                                       <Briefcase className="w-3 h-3" />
                                       Field
                                     </div>
                                   </SelectItem>
                                   <SelectItem value="office">
                                     <div className="flex items-center gap-2">
                                       <Home className="w-3 h-3" />
                                       Office
                                     </div>
                                   </SelectItem>
                                 </SelectContent>
                               </Select>
                             </div>

                             <div className="flex items-center gap-2 ml-2">
                               <Select
                                 value=""
                                 onValueChange={(newTeamId) => {
                                   console.log('🔄 Moving user:', { userId: user.id, newTeamId });
                                   if (newTeamId) {
                                     handleMoveUser(user.id, newTeamId);
                                   }
                                 }}
                                 disabled={onLeave}
                               >
                                 <SelectTrigger className={cn(
                                   "w-40",
                                   onLeave && "cursor-not-allowed opacity-50"
                                 )}>
                                   <SelectValue placeholder={onLeave ? "Cannot move" : "Move to..."} />
                                 </SelectTrigger>
                                 <SelectContent>
                                   {localTeams
                                     .filter(t => t.id !== team.id)
                                     .map((t) => (
                                       <SelectItem key={t.id} value={t.id}>
                                         <div className="flex items-center gap-2">
                                           <TeamAvatar team={t} size="xs" />
                                           <span>{t.name}</span>
                                         </div>
                                       </SelectItem>
                                     ))}
                                 </SelectContent>
                               </Select>
                             </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="unassigned" className="p-6 space-y-4 m-0 h-full">
              <div className="text-sm text-slate-600 mb-4">
                Users without a team. Assign them to a team to organize your workforce.
              </div>
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                ⚠️ <strong>Note:</strong> Unassigned users are not counted as field workers in the daily statistics.
              </div>

              {getUsersWithoutTeam().length === 0 ? (
                <div className="text-center py-12">
                  <UserX className="w-16 h-16 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500 font-medium">All users are assigned to teams</p>
                  <p className="text-sm text-slate-400 mt-1">Great job organizing your workforce!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {getUsersWithoutTeam().map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 rounded-lg border-2 border-orange-200 bg-orange-50 hover:border-orange-400 transition-all"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar user={user} size="md" />
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-slate-900">
                            {user.nickname || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email}
                          </div>
                          <div className="text-xs text-slate-600">{user.job_role || 'No role'}</div>
                        </div>
                        <Badge variant="outline" className="border-orange-400 text-orange-700 bg-orange-100">
                          No Team
                        </Badge>
                      </div>

                      <div className="ml-3">
                        <Select
                          value=""
                          onValueChange={(teamId) => handleMoveUser(user.id, teamId)}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Assign to team..." />
                          </SelectTrigger>
                          <SelectContent>
                            {localTeams.map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                <div className="flex items-center gap-2">
                                  <TeamAvatar team={team} size="xs" />
                                  <span>{team.name}</span>
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "text-[10px] px-1",
                                      team.worker_type === 'field' ? "border-green-300 text-green-700" : "border-blue-300 text-blue-700"
                                    )}
                                  >
                                    {team.worker_type === 'field' ? 'Field' : 'Office'}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="absences" className="p-6 space-y-4 m-0 h-full">
              <div className="text-sm text-slate-600 mb-4">
                Employees currently on leave or with upcoming absences. They will be automatically reassigned to their team when they return.
              </div>
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                ⚠️ <strong>Note:</strong> Users on leave are excluded from the daily field workers count.
              </div>

              {loadingLeaves ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                </div>
              ) : getActiveAbsences().length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500 font-medium">No active or upcoming absences</p>
                  <p className="text-sm text-slate-400 mt-1">All team members are available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {getActiveAbsences().map((leave) => {
                    const employee = localUsers.find(u => u.id === leave.employee_id);
                    const team = localTeams.find(t => t.id === leave.team_at_leave_start_id);
                    const today = startOfDay(new Date());
                    const startDate = startOfDay(parseISO(leave.start_date));
                    const endDate = startOfDay(parseISO(leave.end_date));
                    const isActive = isWithinInterval(today, { start: startDate, end: endDate });
                    const isUpcoming = isAfter(startDate, today);

                    const leaveTypeLabels = {
                      sick_leave: 'Sick Leave',
                      unjustified_leave: 'Unjustified Leave',
                      holiday: 'Holiday',
                      day_off: 'Day Off',
                      personal_leave: 'Personal Leave',
                      other: 'Other'
                    };

                    return (
                      <div
                        key={leave.id}
                        className={cn(
                          "p-4 rounded-lg border-2 transition-all",
                          isActive 
                            ? "border-red-200 bg-red-50" 
                            : "border-amber-200 bg-amber-50"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar user={employee} size="md" />
                            <div>
                              <div className="font-semibold text-slate-900">
                                {employee?.nickname || `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim() || employee?.email || 'Unknown'}
                              </div>
                              <div className="text-xs text-slate-600">
                                {employee?.job_role || 'No role'}
                              </div>
                            </div>
                          </div>

                          <Badge 
                            variant="outline" 
                            className={cn(
                              isActive 
                                ? "border-red-400 bg-red-100 text-red-700"
                                : "border-amber-400 bg-amber-100 text-amber-700"
                            )}
                          >
                            {isActive ? 'On Leave' : 'Upcoming'}
                          </Badge>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">Type:</span>
                            <span className="ml-2 font-medium text-slate-700">
                              {leaveTypeLabels[leave.request_type] || leave.request_type}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Days:</span>
                            <span className="ml-2 font-medium text-slate-700">
                              {leave.total_days || 1} day{(leave.total_days || 1) > 1 ? 's' : ''}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">From:</span>
                            <span className="ml-2 font-medium text-slate-700">
                              {format(startDate, 'MMM d, yyyy')}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Until:</span>
                            <span className="ml-2 font-medium text-slate-700">
                              {format(endDate, 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>

                        {team && (
                          <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-2 text-sm">
                            <ArrowRight className="w-4 h-4 text-green-600" />
                            <span className="text-slate-600">Returns to:</span>
                            <div className="flex items-center gap-2">
                              <TeamAvatar team={team} size="xs" />
                              <span className="font-medium text-slate-700">{team.name}</span>
                            </div>
                            <span className="text-slate-500 ml-auto">
                              on {format(new Date(endDate.getTime() + 86400000), 'MMM d, yyyy')}
                            </span>
                          </div>
                        )}

                        {leave.reason && (
                          <div className="mt-2 text-xs text-slate-500 italic">
                            "{leave.reason}"
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between flex-shrink-0">
          <div>
            {hasChanges && (
              <span className="text-sm text-orange-600 font-medium">
                You have unsaved changes
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Team Create/Edit Dialog */}
        {showTeamDialog && (
          <Dialog open={showTeamDialog} onOpenChange={setShowTeamDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingTeam ? 'Edit Team' : 'New Team'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium">Team Name</label>
                  <Input
                    value={teamFormData.name}
                    onChange={(e) => setTeamFormData({...teamFormData, name: e.target.value})}
                    placeholder="e.g., Service Team 1"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium">Avatar Code</label>
                  <Input
                    value={teamFormData.avatar_code}
                    onChange={(e) => setTeamFormData({...teamFormData, avatar_code: e.target.value.toUpperCase().slice(0, 3)})}
                    placeholder="e.g., S1, OP, MNT"
                    maxLength={3}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Short code (max 3 characters) displayed in work orders
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium">Color</label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {['gray', 'red', 'yellow', 'green', 'blue', 'indigo', 'purple', 'pink'].map(color => (
                      <button
                        key={color}
                        onClick={() => setTeamFormData({...teamFormData, color})}
                        className={cn(
                          "h-10 rounded-lg border-2 transition-all",
                          teamFormData.color === color ? "border-slate-900 scale-105" : "border-slate-200",
                          {
                            'bg-gray-500': color === 'gray',
                            'bg-red-500': color === 'red',
                            'bg-yellow-500': color === 'yellow',
                            'bg-green-500': color === 'green',
                            'bg-blue-500': color === 'blue',
                            'bg-indigo-500': color === 'indigo',
                            'bg-purple-500': color === 'purple',
                            'bg-pink-500': color === 'pink'
                          }
                        )}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowTeamDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveTeam} disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {editingTeam ? 'Update' : 'Create'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </SheetContent>
    </Sheet>
  );
}