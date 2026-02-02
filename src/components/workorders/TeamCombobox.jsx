import React, { useState, useMemo } from 'react';
import { X, Users, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import Avatar from '../Avatar';

export default function TeamCombobox({
  teams = [],
  users = [],
  selectedTeamIds = [],
  selectedUserIds = [],
  onTeamChange,
  onUserChange,
  disabled = false,
}) {
  // ✅ Validación defensiva: Asegurar que todos los arrays existen
  const safeTeams = Array.isArray(teams) ? teams : [];
  const safeUsers = Array.isArray(users) ? users : [];
  const safeSelectedTeamIds = Array.isArray(selectedTeamIds) ? selectedTeamIds : [];
  const safeSelectedUserIds = Array.isArray(selectedUserIds) ? selectedUserIds : [];

  const [open, setOpen] = useState(false);

  // Obtener equipos y usuarios seleccionados
  const selectedTeams = useMemo(() => {
    return safeTeams.filter(t => safeSelectedTeamIds.includes(t.id));
  }, [safeTeams, safeSelectedTeamIds]);

  const selectedUsers = useMemo(() => {
    return safeUsers.filter(u => safeSelectedUserIds.includes(u.id));
  }, [safeUsers, safeSelectedUserIds]);

  // Calcular usuarios que NO pertenecen a ningún equipo seleccionado
  const standaloneUsers = useMemo(() => {
    return selectedUsers.filter(user => {
      return !safeSelectedTeamIds.includes(user.team_id);
    });
  }, [selectedUsers, safeSelectedTeamIds]);

  const handleTeamToggle = (teamId) => {
    if (disabled) return;

    const isSelected = safeSelectedTeamIds.includes(teamId);
    const teamUsers = safeUsers.filter(u => u.team_id === teamId).map(u => u.id);

    if (isSelected) {
      // Remover equipo y sus usuarios
      onTeamChange(safeSelectedTeamIds.filter(id => id !== teamId));
      onUserChange(safeSelectedUserIds.filter(id => !teamUsers.includes(id)));
    } else {
      // Agregar equipo y sus usuarios
      onTeamChange([...safeSelectedTeamIds, teamId]);
      onUserChange([...new Set([...safeSelectedUserIds, ...teamUsers])]);
    }
  };

  const handleUserToggle = (userId) => {
    if (disabled) return;

    const isSelected = safeSelectedUserIds.includes(userId);

    if (isSelected) {
      onUserChange(safeSelectedUserIds.filter(id => id !== userId));
    } else {
      onUserChange([...safeSelectedUserIds, userId]);
    }
  };

  const handleRemoveTeam = (teamId) => {
    if (disabled) return;

    const teamUsers = safeUsers.filter(u => u.team_id === teamId).map(u => u.id);
    onTeamChange(safeSelectedTeamIds.filter(id => id !== teamId));
    onUserChange(safeSelectedUserIds.filter(id => !teamUsers.includes(id)));
  };

  const handleRemoveUser = (userId) => {
    if (disabled) return;
    onUserChange(safeSelectedUserIds.filter(id => id !== userId));
  };

  const totalSelected = selectedTeams.length + standaloneUsers.length;

  return (
    <div className="space-y-2">
      {/* Selected Items Display */}
      {totalSelected > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-slate-50 rounded-lg">
          {/* Equipos seleccionados */}
          {selectedTeams.map(team => (
            <Badge
              key={team.id}
              variant="secondary"
              className="text-xs px-2 py-1 gap-1 bg-indigo-100 text-indigo-700"
            >
              <Users className="w-3 h-3" />
              {team.name}
              {!disabled && (
                <button
                  onClick={() => handleRemoveTeam(team.id)}
                  className="ml-1 hover:bg-indigo-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </Badge>
          ))}

          {/* Usuarios independientes (no en equipos seleccionados) */}
          {standaloneUsers.map(user => {
            const userName = user.nickname || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.full_name || user.email;
            return (
              <Badge
                key={user.id}
                variant="secondary"
                className="text-xs px-2 py-1 gap-1 bg-blue-100 text-blue-700"
              >
                <User className="w-3 h-3" />
                {userName}
                {!disabled && (
                  <button
                    onClick={() => handleRemoveUser(user.id)}
                    className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Selector Popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between"
            disabled={disabled}
          >
            <span className="text-slate-600">
              {totalSelected === 0 
                ? 'Select teams or users...' 
                : `${totalSelected} selected`}
            </span>
            <Users className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <div className="max-h-[400px] overflow-y-auto">
            {/* Teams Section */}
            <div className="p-3 border-b border-slate-200">
              <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Teams
              </h4>
              {safeTeams.length === 0 ? (
                <div className="text-sm text-slate-500 text-center py-2">
                  No teams available
                </div>
              ) : (
                <div className="space-y-1">
                  {safeTeams.map(team => {
                    const isSelected = safeSelectedTeamIds.includes(team.id);
                    const teamUsers = safeUsers.filter(u => u.team_id === team.id);

                    return (
                      <div
                        key={team.id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors",
                          isSelected && "bg-indigo-50"
                        )}
                        onClick={() => handleTeamToggle(team.id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleTeamToggle(team.id)}
                          disabled={disabled}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Users className="w-4 h-4 text-indigo-600" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{team.name}</div>
                          <div className="text-xs text-slate-500">
                            {teamUsers.length} user{teamUsers.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Individual Users Section */}
            <div className="p-3">
              <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                Individual Users
              </h4>
              {safeUsers.length === 0 ? (
                <div className="text-sm text-slate-500 text-center py-2">
                  No users available
                </div>
              ) : (
                <div className="space-y-1">
                  {safeUsers.map(user => {
                    const isSelected = safeSelectedUserIds.includes(user.id);
                    const userName = user.nickname || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.full_name || user.email;

                    return (
                      <div
                        key={user.id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors",
                          isSelected && "bg-blue-50"
                        )}
                        onClick={() => handleUserToggle(user.id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleUserToggle(user.id)}
                          disabled={disabled}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Avatar user={user} size="sm" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{userName}</div>
                          {user.job_role && (
                            <div className="text-xs text-slate-500">{user.job_role}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}