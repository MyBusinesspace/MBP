import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, GripVertical, Ghost, Archive, RotateCcw, Trash2, X } from 'lucide-react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import Avatar from '../Avatar';
import StackedAvatars from '../shared/StackedAvatars';

export default function UserTable({
  users,
  isArchived = false,
  isAdmin,
  sortBy,
  currentUser,
  selectedUsers,
  setSelectedUsers,
  visibleColumns,
  orderedTeams,
  departments,
  companies,
  allUsers,
  adminLeader,
  updatingUsers,
  getDynamicFullName,
  getDepartmentColor,
  getDepartmentRowBackgroundColor,
  handleUserClick,
  handleUpdateUser,
  handleArchiveUsers,
  handleRestoreUsers,
  handleDeleteUsers,
  isProcessing = false,
  workerTypes = ['Full-time', 'Part-time', 'Contractor', 'Intern', 'Temporary']
}) {
  let colSpanCount = visibleColumns.length;
  if (isAdmin && sortBy === 'manual') colSpanCount++;
  if (isAdmin) colSpanCount++; // For checkbox column
  
  const dragHandleOffset = (isAdmin && sortBy === 'manual') ? 48 : 0;
  const checkboxOffset = isAdmin ? 40 : 0;
  const userColumnStickyLeft = dragHandleOffset + checkboxOffset;

  const handleSelectUser = (userId, isSelected) => {
    if (!setSelectedUsers) return;
    setSelectedUsers(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (isSelected) {
        newSelected.add(userId);
      } else {
        newSelected.delete(userId);
      }
      return newSelected;
    });
  };

  const handleSelectAll = (checked) => {
    if (!setSelectedUsers) return;
    if (checked) {
      const selectableUsers = users.filter(user => {
        if (user.id === currentUser?.id && !isArchived) return false;
        if (user.is_ghost) return false;
        return true;
      });
      setSelectedUsers(new Set(selectableUsers.map(u => u.id)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const selectableUsersCount = users.filter(user => {
    if (user.id === currentUser?.id && !isArchived) return false;
    if (user.is_ghost) return false;
    return true;
  }).length;

  const allSelected = selectedUsers && selectedUsers.size > 0 && selectedUsers.size === selectableUsersCount;

  return (
    <div className="overflow-x-auto relative">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 hover:bg-slate-50 border-0">
            {isAdmin && sortBy === 'manual' && (
              <TableHead className="w-12 py-2 px-4 h-7 sticky left-0 bg-slate-50 z-40 border-r border-slate-200"></TableHead>
            )}
            {isAdmin && (
              <TableHead className={`w-10 py-2 px-2 h-7 sticky left-[${dragHandleOffset}px] bg-slate-50 z-40`}>
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  className="h-4 w-4"
                />
              </TableHead>
            )}
            {visibleColumns.includes('user') && (
              <TableHead className={`py-1 px-2 text-xs text-slate-700 font-semibold min-w-[220px] max-w-[280px] h-7 sticky left-[${userColumnStickyLeft}px] bg-slate-50 z-40 border-r border-slate-200`}>
                User
              </TableHead>
            )}
            {visibleColumns.includes('employee_number') && (
              <TableHead className="py-1 px-2 text-xs text-slate-700 font-semibold h-7 min-w-[100px] max-w-[140px]">
                Employee #
              </TableHead>
            )}
            {visibleColumns.includes('job_role') && (
              <TableHead className="py-1 px-2 text-xs text-slate-700 font-semibold h-7 min-w-[130px] max-w-[180px]">
                Job Role
              </TableHead>
            )}
            {visibleColumns.includes('department') && (
              <TableHead className="py-1 px-2 text-xs text-slate-700 font-semibold h-7 min-w-[130px] max-w-[200px]">
                Department
              </TableHead>
            )}
            {visibleColumns.includes('team') && (
              <TableHead className="py-1 px-2 text-xs text-slate-700 font-semibold h-7 min-w-[130px] max-w-[220px]">
                Team
              </TableHead>
            )}
            {visibleColumns.includes('worker_type') && (
              <TableHead className="py-1 px-2 text-xs text-slate-700 font-semibold h-7 min-w-[130px] max-w-[180px]">
                Worker Type
              </TableHead>
            )}
            {visibleColumns.includes('company') && (
              <TableHead className="py-1 px-2 text-xs text-slate-700 font-semibold h-7 min-w-[150px] max-w-[200px]">
                Company
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <Droppable droppableId={`users-${isArchived ? 'archived' : 'active'}`}>
          {(provided) => (
            <TableBody ref={provided.innerRef} {...provided.droppableProps}>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colSpanCount} className="h-18 text-center text-slate-500">
                    {isArchived ? 'No archived users found.' : 'No users found.'}
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user, index) => {
                  const dynamicName = getDynamicFullName(user);
                  const rowBgClass = getDepartmentRowBackgroundColor(user.department);
                  const isUserAdmin = user.role === 'admin';
                  const isUserLeader = user.id === adminLeader?.id;
                  const isPending = user.status === 'Pending';
                  const isGhost = user.is_ghost;
                  
                  const team = orderedTeams.find((t) => t.id === user.team_id);
                  // ✅ Filter archived users from team members
                  const teamMembers = team ? allUsers.filter(u => u.team_id === team.id && !u.archived) : [];
                  const company = companies.find((c) => c.id === user.company_id);

                  return (
                    <Draggable key={user.id} draggableId={user.id} index={index} isDragDisabled={!isAdmin || sortBy !== 'manual'}>
                      {(provided, snapshot) => (
                        <TableRow 
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          onClick={() => handleUserClick(user.id)}
                          className={`
                            hover:bg-slate-100 border-b border-slate-100 cursor-pointer
                            ${snapshot.isDragging ? 'bg-slate-200 shadow-lg' : ''}
                            ${rowBgClass}
                            ${selectedUsers && selectedUsers.has(user.id) ? 'bg-indigo-50' : ''}
                          `}
                          style={{ height: '28px', ...provided.draggableProps.style }}
                        >
                          {isAdmin && sortBy === 'manual' && (
                            <TableCell className={`py-1 px-4 sticky left-0 ${rowBgClass || 'bg-white'} z-40 border-r border-slate-200`} onClick={(e) => e.stopPropagation()}>
                              <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                <GripVertical className="w-4 h-4 text-slate-400" />
                              </div>
                            </TableCell>
                          )}
                          {isAdmin && (
                            <TableCell 
                              className={`py-1 px-2 sticky left-[${dragHandleOffset}px] ${rowBgClass || 'bg-white'} z-40`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Checkbox
                                checked={selectedUsers && selectedUsers.has(user.id)}
                                onCheckedChange={(checked) => handleSelectUser(user.id, checked)}
                                disabled={user.id === currentUser?.id && !isArchived || isGhost}
                                className="h-4 w-4"
                              />
                            </TableCell>
                          )}
                          {visibleColumns.includes('user') && (
                            <TableCell className={`py-1 px-2 sticky left-[${userColumnStickyLeft}px] ${rowBgClass || 'bg-white'} z-40 min-w-[220px] max-w-[280px] border-r border-slate-200`}>
                              <div className="flex items-center gap-2">
                                <Avatar 
                                  name={dynamicName} 
                                  src={user.avatar_url} 
                                  isAdmin={isUserAdmin && !isUserLeader}
                                  isLeader={isUserLeader}
                                  adminRoleType={user.admin_role_type}
                                  isPending={isPending && !isUserAdmin}
                                  className="h-7 w-7"
                                />
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  <span className={`font-medium text-xs ${isGhost ? 'text-slate-500 italic' : 'text-slate-900'} truncate`}>
                                    {dynamicName}
                                  </span>
                                  {isGhost && <Ghost className="w-4 h-4 text-slate-400 flex-shrink-0" title="Ghost User" />}
                                  {isPending && !isGhost && !isUserAdmin && (
                                    <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-300 py-0 px-1.5 flex-shrink-0">
                                      Pending
                                    </Badge>
                                  )}
                                  {isUserLeader && (
                                    <Badge variant="outline" className="text-[10px] bg-yellow-50 text-yellow-700 border-yellow-300 py-0 px-1.5 flex-shrink-0">
                                      Leader
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                          )}
                          {visibleColumns.includes('employee_number') && (
                            <TableCell className="py-1 px-2 text-slate-600 text-xs min-w-[100px] max-w-[140px]">
                              <div className="overflow-hidden">
                                <p className="font-mono truncate">{user.employee_number || '-'}</p>
                              </div>
                            </TableCell>
                          )}
                          {visibleColumns.includes('job_role') && (
                            <TableCell className="py-1 px-2 text-slate-600 text-xs min-w-[130px] max-w-[180px]">
                              <div className="overflow-hidden">
                                <p className="truncate">
                                  {isGhost ? <span className="italic text-slate-400">Deleted User</span> : (user.job_role || '-')}
                                </p>
                              </div>
                            </TableCell>
                          )}
                          {visibleColumns.includes('department') && (
                            <TableCell className="py-1 px-2 min-w-[130px] max-w-[200px]" onClick={(e) => {
                              if (isAdmin && !isGhost) {
                                e.stopPropagation();
                              }
                            }}>
                              {isAdmin && !isGhost ? (
                                <Select
                                  value={user.department || ''}
                                  onValueChange={(val) => handleUpdateUser(user.id, 'department', val)}
                                  disabled={updatingUsers.has(user.id)}
                                >
                                  <SelectTrigger className="bg-transparent border-none p-0 pr-5 focus:ring-0 focus:ring-offset-0 h-6 w-full">
                                    <SelectValue asChild>
                                      <div className="overflow-hidden flex items-center">
                                        {updatingUsers.has(user.id) ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          user.department ? <span className="text-xs font-medium truncate block">{user.department}</span> : <span className="text-slate-500 text-xs truncate block">No department</span>
                                        )}
                                      </div>
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={null}>No Department</SelectItem>
                                    {departments.map(dep => (
                                      <SelectItem key={dep.id} value={dep.name}>
                                        <Badge className={getDepartmentColor(dep.name)}>{dep.name}</Badge>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <div className="overflow-hidden">
                                  {user.department ? <span className="text-xs font-medium truncate block">{user.department}</span> : <span className="text-slate-500 text-xs truncate block">No department</span>}
                                </div>
                              )}
                            </TableCell>
                          )}
                          {visibleColumns.includes('team') && (
                            <TableCell className="py-1 px-2 min-w-[130px] max-w-[220px]" onClick={(e) => {
                              if (isAdmin && !isGhost) {
                                e.stopPropagation();
                              }
                            }}>
                              {isAdmin && !isGhost ? (
                                <Select
                                  value={user.team_id || ''}
                                  onValueChange={(val) => handleUpdateUser(user.id, 'team_id', val)}
                                  disabled={updatingUsers.has(user.id)}
                                >
                                  <SelectTrigger className="bg-transparent border-none p-0 focus:ring-0 focus:ring-offset-0 h-6 w-full text-left">
                                    <SelectValue asChild>
                                      <div className="flex items-center gap-2 overflow-hidden">
                                        {updatingUsers.has(user.id) ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : team ? (
                                          <>
                                            <span className="truncate text-xs">{team.name}</span>
                                            <StackedAvatars users={teamMembers} size="xs" />
                                          </>
                                        ) : (
                                          <span className="text-slate-400 text-xs">No team</span>
                                        )}
                                      </div>
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={null}>No Team</SelectItem>
                                    {orderedTeams.map((t) => (
                                      <SelectItem key={t.id} value={t.id}>
                                        {t.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <div className="flex items-center gap-2 overflow-hidden">
                                  {team ? (
                                    <>
                                      <span className="truncate text-xs">{team.name}</span>
                                      <StackedAvatars users={teamMembers} size="xs" />
                                    </>
                                  ) : (
                                    <span className="text-slate-400 text-xs">No team</span>
                                  )}
                                </div>
                              )}
                            </TableCell>
                          )}
                          {visibleColumns.includes('worker_type') && (
                            <TableCell className="py-1 px-2 min-w-[130px] max-w-[180px]" onClick={(e) => {
                              if (isAdmin && !isGhost) {
                                e.stopPropagation();
                              }
                            }}>
                              {isAdmin && !isGhost ? (
                                <Select
                                  value={user.worker_type || ''}
                                  onValueChange={(val) => handleUpdateUser(user.id, 'worker_type', val)}
                                  disabled={updatingUsers.has(user.id)}
                                >
                                  <SelectTrigger className="bg-transparent border-none p-0 focus:ring-0 focus:ring-offset-0 h-6 w-full text-left">
                                    <SelectValue asChild>
                                      <div className="flex items-center gap-2 overflow-hidden">
                                        {updatingUsers.has(user.id) ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          user.worker_type ? <span className="text-xs truncate">{user.worker_type}</span> : <span className="text-slate-400 text-xs">Not set</span>
                                        )}
                                      </div>
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={null}>Not Set</SelectItem>
                                    {workerTypes.map(type => (
                                      <SelectItem key={type} value={type}>{type}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <div className="overflow-hidden">
                                  <span className="text-xs truncate">{user.worker_type || 'Not set'}</span>
                                </div>
                              )}
                            </TableCell>
                          )}
                          {visibleColumns.includes('company') && (
                            <TableCell className="py-1 px-2 min-w-[150px] max-w-[200px]" onClick={(e) => {
                              if (isAdmin && !isGhost) {
                                e.stopPropagation();
                              }
                            }}>
                              {isAdmin && !isGhost ? (
                                <Select
                                  value={user.company_id || ''}
                                  onValueChange={(val) => handleUpdateUser(user.id, 'company_id', val)}
                                  disabled={updatingUsers.has(user.id)}
                                >
                                  <SelectTrigger className="bg-transparent border-none p-0 focus:ring-0 focus:ring-offset-0 h-6 w-full text-left">
                                    <SelectValue asChild>
                                      <div className="flex items-center gap-2 overflow-hidden">
                                        {updatingUsers.has(user.id) ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          company ? <span className="truncate text-xs">{company.name}</span> : <span className="text-slate-400 text-xs">No company</span>
                                        )}
                                      </div>
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={null}>No Company</SelectItem>
                                    {companies.map((c) => (
                                      <SelectItem key={c.id} value={c.id}>
                                        {c.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <div className="overflow-hidden">
                                  {company ? <span className="truncate text-xs">{company.name}</span> : <span className="text-slate-400 text-xs">No company</span>}
                                </div>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      )}
                    </Draggable>
                  );
                })
              )}
              {provided.placeholder}
            </TableBody>
          )}
        </Droppable>
      </Table>

      {/* Multi-select Action Bar */}
      {isAdmin && selectedUsers && selectedUsers.size > 0 && (
        <div className="sticky bottom-0 left-0 right-0 bg-slate-800 text-white px-4 py-3 flex items-center justify-between rounded-b-lg">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{selectedUsers.size} user{selectedUsers.size > 1 ? 's' : ''} selected</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedUsers(new Set())}
              className="text-white hover:bg-slate-700 h-8"
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {!isArchived && handleArchiveUsers && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleArchiveUsers}
                disabled={isProcessing}
                className="bg-transparent border-slate-600 text-white hover:bg-slate-700 h-8"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Archive className="w-4 h-4 mr-2" />}
                Archive
              </Button>
            )}
            {isArchived && handleRestoreUsers && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestoreUsers}
                disabled={isProcessing}
                className="bg-transparent border-slate-600 text-white hover:bg-slate-700 h-8"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                Restore
              </Button>
            )}
            {handleDeleteUsers && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteUsers}
                disabled={isProcessing}
                className="bg-transparent border-red-500 text-red-400 hover:bg-red-500/20 h-8"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Delete
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}