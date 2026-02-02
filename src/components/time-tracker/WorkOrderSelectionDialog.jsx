import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { format, parseISO, addHours } from 'date-fns';
import Avatar from '../Avatar';
import WorkOrderDetailsDialog from '../workorders/WorkOrderDetailsDialog';
import { TimeEntry } from '@/entities/all';
import { toast } from 'sonner';

export default function WorkOrderSelectionDialog({ 
  isOpen, 
  onClose, 
  workOrders,
  onSelectWorkOrder,
  activeWorkOrderId,
  title = "Select Work Order",
  currentUser,
  onWorkOrderCreated,
  projects = [],
  users = [],
  teams = [],
  customers = [],
  assets = [],
  categories = [],
  shiftTypes = []
}) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const getWOTicker = (wo) => {
    const project = projects?.find(p => p.id === wo.project_id);
    const customer = customers?.find(c => c.id === project?.customer_id);
    const firstWord = customer?.name?.split(' ')[0] || project?.name?.split(' ')[0] || 'N/A';
    return `${wo.work_order_number || 'N/A'} ${firstWord}`.trim();
  };

  const handleCreateComplete = async (woData) => {
    console.log('🎯 [WO Creation] Starting creation with data:', woData);
    
    setIsCreating(true);
    
    try {
      const now = new Date();
      const endTime = addHours(now, 1);
      
      const createdWO = await TimeEntry.create({
        ...woData,
        planned_start_time: now.toISOString(),
        planned_end_time: endTime.toISOString(),
        status: 'ongoing',
        employee_ids: [...new Set([...(woData.employee_ids || []), currentUser.id])]
      });
      
      console.log('✅ [WO Creation] WO created with ID:', createdWO.id);

      if (!createdWO || !createdWO.id) {
        console.error('❌ [WO Creation] WO created without ID!', createdWO);
        toast.error('Failed to create work order - no ID returned');
        return;
      }

      if (onWorkOrderCreated) {
        await onWorkOrderCreated();
      }

      setShowCreateDialog(false);
      onSelectWorkOrder(createdWO);
      toast.success('Work order created successfully');
      onClose();
    } catch (error) {
      console.error('❌ [WO Creation] Failed to create WO:', error);
      toast.error('Failed to create work order: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteWO = async (woId) => {
    try {
      console.log('🗑️ Deleting WO:', woId);
      await TimeEntry.delete(woId);
      toast.success('Work order deleted successfully');
      
      if (onWorkOrderCreated) {
        await onWorkOrderCreated();
      }
      
      setShowCreateDialog(false);
    } catch (error) {
      console.error('❌ Failed to delete WO:', error);
      toast.error('Failed to delete work order');
    }
  };

  const filteredWorkOrders = (workOrders || []).filter(wo => {
    if (!searchQuery) return true;
    
    const project = projects?.find(p => p.id === wo.project_id);
    const customer = customers?.find(c => c.id === project?.customer_id);
    const woTicker = getWOTicker(wo);
    
    const searchLower = searchQuery.toLowerCase();
    return (
      woTicker.toLowerCase().includes(searchLower) ||
      project?.name?.toLowerCase().includes(searchLower) ||
      customer?.name?.toLowerCase().includes(searchLower) ||
      wo.work_notes?.toLowerCase().includes(searchLower)
    );
  });

  const now = new Date();
  const endTime = addHours(now, 1);
  
  const emptyWO = {
    title: '',
    status: 'ongoing',
    project_id: '',
    planned_start_time: now.toISOString(),
    planned_end_time: endTime.toISOString(),
    employee_ids: currentUser ? [currentUser.id] : [],
    team_ids: currentUser?.team_id ? [currentUser.team_id] : [],
    equipment_ids: [],
    work_notes: '',
    work_order_category_id: '',
    shift_type_id: '',
    is_recurring: false,
    recurrence_type: 'daily',
    recurrence_end_date: ''
  };

  return (
    <>
      <Dialog open={isOpen && !showCreateDialog} onOpenChange={onClose}>
        <DialogContent className="max-w-md flex flex-col max-h-[80vh]">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <div className="flex-shrink-0 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search work orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {/* ✅ NUEVO: Botón de crear PRIMERO */}
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              disabled={isCreating}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Work Order
            </Button>

            {/* Mensajes cuando no hay WOs */}
            {filteredWorkOrders.length === 0 && searchQuery && (
              <div className="text-center py-8 text-slate-500">
                <p className="text-sm">No work orders found</p>
              </div>
            )}

            {filteredWorkOrders.length === 0 && !searchQuery && (
              <div className="text-center py-8">
                <p className="text-sm text-slate-500">No work orders scheduled for today</p>
              </div>
            )}

            {/* Lista de WOs existentes */}
            {filteredWorkOrders.map((wo) => {
              const project = projects?.find(p => p.id === wo.project_id);
              const woTicker = getWOTicker(wo);
              const isActive = wo.id === activeWorkOrderId;

              const assignedUserIds = wo.employee_ids || (wo.employee_id ? [wo.employee_id] : []);
              const assignedUsers = users?.filter(u => assignedUserIds.includes(u.id)) || [];

              return (
                <Button
                  key={wo.id}
                  onClick={() => onSelectWorkOrder(wo)}
                  disabled={isActive}
                  variant="outline"
                  className="w-full justify-start h-auto py-3"
                >
                  <div className="flex flex-col items-start gap-1 flex-1">
                    <div className="flex items-center gap-2 w-full">
                      <span className="font-bold text-sm">{woTicker}</span>
                      {isActive && (
                        <Badge className="bg-green-600 text-white text-[9px]">CURRENT</Badge>
                      )}
                      {wo.planned_start_time && wo.planned_end_time && (
                        <span className="text-xs text-slate-500 ml-auto">
                          {format(parseISO(wo.planned_start_time), 'HH:mm')} - {format(parseISO(wo.planned_end_time), 'HH:mm')}
                        </span>
                      )}
                    </div>
                    {project && (
                      <span className="text-xs text-slate-500">{project.name}</span>
                    )}
                    {wo.work_notes && (
                      <span className="text-xs text-slate-400 line-clamp-1">{wo.work_notes}</span>
                    )}
                    {assignedUsers.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        {assignedUsers.slice(0, 3).map((user) => (
                          <Avatar key={user.id} user={user} size="xs" />
                        ))}
                        {assignedUsers.length > 3 && (
                          <span className="text-[10px] text-slate-500">
                            +{assignedUsers.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <WorkOrderDetailsDialog
        isOpen={showCreateDialog}
        onClose={() => {
          if (!isCreating) {
            setShowCreateDialog(false);
          }
        }}
        entry={emptyWO}
        onSave={handleCreateComplete}
        onDelete={handleDeleteWO}
        projects={projects}
        users={users}
        teams={teams}
        customers={customers}
        assets={assets}
        categories={categories}
        shiftTypes={shiftTypes}
        isReadOnly={false}
        isCreating={true}
      />
    </>
  );
}