
import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Team } from '@/entities/all';
import { toast } from 'sonner';
import { Search, ChevronDown, Loader2 } from 'lucide-react';
import Avatar from '../Avatar';
import { cn } from '@/lib/utils';
import TeamAvatar from '../shared/TeamAvatar';

export default function TeamsQuickSelector({ isOpen, onClose }) {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [changingUser, setChangingUser] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('🔍 TeamsQuickSelector - Loading users and teams...');
      const [usersData, teamsData] = await Promise.all([
        User.list('sort_order'),
        Team.list('sort_order')
      ]);
      
      console.log('📊 Users loaded:', usersData?.length || 0);
      console.log('📊 Teams loaded:', teamsData?.length || 0);
      console.log('👥 Sample users:', usersData?.slice(0, 3));
      
      const filteredUsers = usersData.filter(u => !u.archived);
      console.log('✅ Active users (not archived):', filteredUsers.length);
      
      setUsers(filteredUsers || []);
      setTeams(teamsData || []);
    } catch (error) {
      console.error('❌ Failed to load data:', error);
      toast.error('Failed to load users and teams');
    } finally {
      setLoading(false);
    }
  };

  const getDynamicFullName = (user) => {
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    const nickname = user.nickname || '';
    return nickname || `${firstName} ${lastName}`.trim() || user.full_name || user.email;
  };

  const handleTeamChange = async (userId, newTeamId) => {
    setChangingUser(userId);
    try {
      await User.update(userId, { team_id: newTeamId || null });
      
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, team_id: newTeamId || null } : u
      ));

      const user = users.find(u => u.id === userId);
      const newTeam = teams.find(t => t.id === newTeamId);
      
      toast.success(`${getDynamicFullName(user)} moved to ${newTeam?.name || 'No Team'}`);
    } catch (error) {
      console.error('Failed to update user team:', error);
      toast.error('Failed to move user');
      await loadData();
    } finally {
      setChangingUser(null);
    }
  };

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const fullName = getDynamicFullName(user).toLowerCase();
    const email = (user.email || '').toLowerCase();
    const jobRole = (user.job_role || '').toLowerCase();
    return fullName.includes(searchQuery.toLowerCase()) || 
           email.includes(searchQuery.toLowerCase()) ||
           jobRole.includes(searchQuery.toLowerCase());
  });

  const getUsersByTeam = (teamId) => {
    return filteredUsers
      .filter(u => u.team_id === teamId)
      .sort((a, b) => getDynamicFullName(a).localeCompare(getDynamicFullName(b)));
  };

  const unassignedUsers = filteredUsers
    .filter(u => !u.team_id)
    .sort((a, b) => getDynamicFullName(a).localeCompare(getDynamicFullName(b)));

  const UserCard = ({ user }) => {
    const isChanging = changingUser === user.id;
    const currentTeam = teams.find(t => t.id === user.team_id);

    return (
      <div 
        className={cn(
          "bg-white border border-slate-200 rounded-lg p-3 transition-all hover:shadow-md",
          isChanging && "opacity-50"
        )}
      >
        <div className="flex items-center gap-3">
          <Avatar
            user={user}
            size="md"
            className="flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-slate-900 truncate">
              {getDynamicFullName(user)}
            </p>
            {user.job_role && (
              <p className="text-xs text-slate-500 truncate">{user.job_role}</p>
            )}
          </div>
          <Select
            value={user.team_id || 'unassigned'}
            onValueChange={(value) => handleTeamChange(user.id, value === 'unassigned' ? null : value)}
            disabled={isChanging}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs border-slate-300 bg-white">
              {isChanging ? (
                <Loader2 className="w-3 h-3 animate-spin mx-auto" />
              ) : (
                <>
                  <SelectValue />
                  <ChevronDown className="w-3 h-3 ml-2 opacity-50" />
                </>
              )}
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="unassigned">
                <span className="text-slate-500">No Team</span>
              </SelectItem>
              {teams.map(team => (
                <SelectItem key={team.id} value={team.id}>
                  <div className="flex items-center gap-2">
                    <TeamAvatar team={team} size="xs" />
                    <span>{team.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-[90vw] overflow-hidden p-0">
        <SheetHeader className="px-6 py-4 border-b bg-white sticky top-0 z-10">
          <SheetTitle className="text-lg font-semibold">Quick Team Assignment</SheetTitle>
          <p className="text-sm text-slate-600 mt-1">Assign users to teams quickly</p>
        </SheetHeader>

        <div className="p-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search users by name, email or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>

          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
              <p className="mt-4 text-sm text-slate-600">Loading users and teams...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Unassigned Users */}
              <div>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
                  <div className="w-2 h-2 rounded-full bg-slate-400" />
                  <h3 className="font-semibold text-sm text-slate-700">
                    No Team
                  </h3>
                  <span className="text-xs text-slate-500 ml-auto">
                    {unassignedUsers.length} {unassignedUsers.length === 1 ? 'user' : 'users'}
                  </span>
                </div>
                
                {unassignedUsers.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-lg">
                    All users are assigned to teams
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {unassignedUsers.map(user => (
                      <UserCard key={user.id} user={user} />
                    ))}
                  </div>
                )}
              </div>

              {/* Team Sections */}
              {teams.map(team => {
                const teamUsers = getUsersByTeam(team.id);
                if (teamUsers.length === 0 && searchQuery) return null;

                return (
                  <div key={team.id}>
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
                      <TeamAvatar team={team} size="xs" />
                      <h3 className="font-semibold text-sm text-slate-700">
                        {team.name}
                      </h3>
                      <span className="text-xs text-slate-500 ml-auto">
                        {teamUsers.length} {teamUsers.length === 1 ? 'user' : 'users'}
                      </span>
                    </div>
                    
                    {teamUsers.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-lg">
                        No users in this team
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {teamUsers.map(user => (
                          <UserCard key={user.id} user={user} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
