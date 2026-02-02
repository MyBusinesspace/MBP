import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Users, GripVertical, AlertTriangle, ArrowRight } from 'lucide-react';
import Avatar from '../Avatar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { User } from '@/entities/all';

export default function TeamUserReassignment({ 
  isOpen, 
  onClose, 
  teams = [], 
  users = [], 
  onUserReassigned 
}) {
  const [pendingChanges, setPendingChanges] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Group users by team
  const usersByTeam = teams.reduce((acc, team) => {
    acc[team.id] = users.filter(u => u.team_id === team.id && !u.archived);
    return acc;
  }, {});

  // Users without team
  const unassignedUsers = users.filter(u => !u.team_id && !u.archived);

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    const sourceTeamId = source.droppableId;
    const destTeamId = destination.droppableId;

    if (sourceTeamId === destTeamId) return;

    const userId = draggableId;
    const user = users.find(u => u.id === userId);
    const sourceTeam = teams.find(t => t.id === sourceTeamId);
    const destTeam = teams.find(t => t.id === destTeamId);

    if (!user) return;

    // Show confirmation dialog
    setConfirmDialog({
      userId,
      user,
      sourceTeamId: sourceTeamId === 'unassigned' ? null : sourceTeamId,
      destTeamId: destTeamId === 'unassigned' ? null : destTeamId,
      sourceTeamName: sourceTeam?.name || 'Unassigned',
      destTeamName: destTeam?.name || 'Unassigned'
    });
  };

  const confirmReassignment = async () => {
    if (!confirmDialog) return;

    setIsSaving(true);
    try {
      const { userId, destTeamId } = confirmDialog;
      
      // Update user's team_id permanently
      await User.update(userId, { team_id: destTeamId || null });
      
      toast.success(`User moved to ${confirmDialog.destTeamName} permanently`);
      
      // Notify parent to refresh data
      if (onUserReassigned) {
        onUserReassigned(userId, destTeamId);
      }
      
      setConfirmDialog(null);
    } catch (error) {
      console.error('Failed to reassign user:', error);
      toast.error('Failed to reassign user');
    } finally {
      setIsSaving(false);
    }
  };

  const TeamColumn = ({ team, teamUsers, droppableId }) => (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden min-w-[200px] flex-1">
      <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">{team?.name || 'Unassigned'}</span>
          <Badge variant="secondary" className="text-[10px] h-5">
            {teamUsers.length}
          </Badge>
        </div>
      </div>
      
      <Droppable droppableId={droppableId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "p-2 min-h-[150px] max-h-[300px] overflow-y-auto transition-colors",
              snapshot.isDraggingOver && "bg-indigo-50"
            )}
          >
            {teamUsers.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-4">
                Drop users here
              </div>
            ) : (
              <div className="space-y-1">
                {teamUsers.map((user, index) => (
                  <Draggable key={user.id} draggableId={user.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={provided.draggableProps.style}
                        className={cn(
                          "flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-md cursor-grab active:cursor-grabbing",
                          snapshot.isDragging && "shadow-xl border-indigo-400 bg-indigo-50"
                        )}
                      >
                        <GripVertical className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <Avatar user={user} size="xs" />
                        <span className="text-xs font-medium text-slate-700 truncate flex-1">
                          {user.nickname || user.first_name || user.full_name}
                        </span>
                      </div>
                    )}
                  </Draggable>
                ))}
              </div>
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col z-[200]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Reassign Users Between Teams
            </DialogTitle>
            <DialogDescription>
              Drag and drop users to move them permanently between teams. This change is global and will affect all work orders.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="flex gap-3 overflow-x-auto pb-4">
                {teams.map(team => (
                  <TeamColumn
                    key={team.id}
                    team={team}
                    teamUsers={usersByTeam[team.id] || []}
                    droppableId={team.id}
                  />
                ))}
                
                {unassignedUsers.length > 0 && (
                  <TeamColumn
                    team={{ name: 'Unassigned' }}
                    teamUsers={unassignedUsers}
                    droppableId="unassigned"
                  />
                )}
              </div>
            </DragDropContext>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent className="max-w-md z-[210]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              Confirm Team Change
            </DialogTitle>
          </DialogHeader>

          {confirmDialog && (
            <div className="py-4">
              <p className="text-sm text-slate-600 mb-4">
                You are about to permanently move this user to a different team. This change is global and will affect all future work orders.
              </p>
              
              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar user={confirmDialog.user} size="sm" />
                  <span className="font-medium text-slate-900">
                    {confirmDialog.user?.nickname || confirmDialog.user?.full_name}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    {confirmDialog.sourceTeamName}
                  </Badge>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {confirmDialog.destTeamName}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setConfirmDialog(null)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmReassignment}
              disabled={isSaving}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isSaving ? 'Moving...' : 'Confirm Move'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}