import React, { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export default function WorkOrderTicker({ entries = [], teams = [] }) {
  const sortedAndGroupedEntries = useMemo(() => {
    // Primero agrupar por equipo
    const groupedByTeam = {};
    
    entries.forEach(entry => {
      if (!entry || !entry.planned_start_time) return;
      
      // Validar fecha
      try {
        const entryDate = parseISO(entry.planned_start_time);
        if (isNaN(entryDate.getTime())) {
          console.warn('Invalid date in ticker entry:', entry.id);
          return;
        }
      } catch (e) {
        console.warn('Error parsing date in ticker:', entry.id, e);
        return;
      }

      const teamIds = entry.team_ids || [];
      const teamId = teamIds.length > 0 ? teamIds[0] : 'no-team';
      
      if (!groupedByTeam[teamId]) {
        groupedByTeam[teamId] = [];
      }
      groupedByTeam[teamId].push(entry);
    });

    // Ordenar equipos por sort_order
    const sortedTeamIds = Object.keys(groupedByTeam).sort((a, b) => {
      const teamA = teams.find(t => t.id === a);
      const teamB = teams.find(t => t.id === b);
      
      if (a === 'no-team') return 1;
      if (b === 'no-team') return -1;
      
      const orderA = teamA?.sort_order ?? 9999;
      const orderB = teamB?.sort_order ?? 9999;
      
      return orderA - orderB;
    });

    // Ordenar work orders dentro de cada equipo por hora
    const result = [];
    sortedTeamIds.forEach(teamId => {
      const teamEntries = groupedByTeam[teamId].sort((a, b) => {
        try {
          const timeA = parseISO(a.planned_start_time).getTime();
          const timeB = parseISO(b.planned_start_time).getTime();
          return timeA - timeB;
        } catch (e) {
          return 0;
        }
      });

      const team = teams.find(t => t.id === teamId);
      result.push({
        teamId,
        teamName: team?.name || 'Unassigned',
        teamColor: team?.color || 'gray',
        entries: teamEntries
      });
    });

    return result;
  }, [entries, teams]);

  if (!entries || entries.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center text-sm text-slate-500">
        No work orders for this day
      </div>
    );
  }

  const formatTime = (dateString) => {
    if (!dateString) return '';
    try {
      const date = parseISO(dateString);
      if (isNaN(date.getTime())) return '';
      return format(date, 'HH:mm');
    } catch (e) {
      console.warn('Error formatting time in ticker:', dateString);
      return '';
    }
  };

  const teamColorClasses = {
    gray: 'bg-gray-100 text-gray-800 border-gray-300',
    red: 'bg-red-100 text-red-800 border-red-300',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    green: 'bg-green-100 text-green-800 border-green-300',
    blue: 'bg-blue-100 text-blue-800 border-blue-300',
    indigo: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    purple: 'bg-purple-100 text-purple-800 border-purple-300',
    pink: 'bg-pink-100 text-pink-800 border-pink-300',
    orange: 'bg-orange-100 text-orange-800 border-orange-300',
    teal: 'bg-teal-100 text-teal-800 border-teal-300'
  };

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="text-xs font-semibold text-slate-700 mr-2">Today's Schedule:</div>
        
        {sortedAndGroupedEntries.map((group, groupIndex) => (
          <div key={group.teamId} className="flex items-center gap-1.5">
            {/* Team Badge */}
            <div className={cn(
              "px-2 py-0.5 rounded-md border font-semibold text-[10px]",
              teamColorClasses[group.teamColor] || teamColorClasses.gray
            )}>
              {group.teamName}
            </div>

            {/* Work Orders */}
            <div className="flex items-center gap-1">
              {group.entries.map((entry, entryIndex) => {
                const startTime = formatTime(entry.planned_start_time);
                
                return (
                  <div
                    key={entry.id}
                    className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-300 text-[10px]"
                  >
                    <span className="font-bold text-indigo-700">
                      {entry.work_order_number || 'N/A'}
                    </span>
                    {startTime && (
                      <span className="text-slate-500">
                        ({startTime})
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Separator */}
            {groupIndex < sortedAndGroupedEntries.length - 1 && (
              <div className="w-px h-4 bg-slate-300 mx-1" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}