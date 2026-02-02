import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import { Crown, Star, Users as UsersIcon, Target, ChevronLeft, ChevronRight } from 'lucide-react';
import Avatar from '../Avatar';

const VIEW_SIZES = {
  compact: {
    userCard: 'w-[60px]',
    avatar: 'w-3 h-3',
    name: 'text-[6px]',
    role: 'text-[5px]',
    badge: 'text-[6px] px-0.5 py-0',
    icon: 'w-1.5 h-1.5',
    gap: 'gap-0.5',
    padding: 'p-0.5',
    cardPadding: 'p-0.5',
    groupWidth: 'w-[70px]',
    groupMinHeight: 'min-h-[50px]',
    cellWidth: 90,
    cellHeight: 110
  },
  normal: {
    userCard: 'w-[90px]',
    avatar: 'w-5 h-5',
    name: 'text-[8px]',
    role: 'text-[7px]',
    badge: 'text-[8px] px-1 py-0',
    icon: 'w-2 h-2',
    gap: 'gap-1',
    padding: 'p-1',
    cardPadding: 'p-0.5',
    groupWidth: 'w-[100px]',
    groupMinHeight: 'min-h-[70px]',
    cellWidth: 130,
    cellHeight: 150
  },
  large: {
    userCard: 'w-[110px]',
    avatar: 'w-6 h-6',
    name: 'text-[9px]',
    role: 'text-[8px]',
    badge: 'text-[9px] px-1.5 py-0.5',
    icon: 'w-2.5 h-2.5',
    gap: 'gap-1.5',
    padding: 'p-1.5',
    cardPadding: 'p-1',
    groupWidth: 'w-[120px]',
    groupMinHeight: 'min-h-[90px]',
    cellWidth: 160,
    cellHeight: 180
  }
};

function UserCard({ user, isLeader = false, isCEO = false, groupKey, isEditMode, editType, viewMode, handleSetLeader, getDynamicFullName, viewSize = 'normal' }) {
  const sizeConfig = VIEW_SIZES[viewSize];
  const canSetAsLeader = isEditMode && editType === 'users' && viewMode === 'team' && !isCEO && !isLeader && groupKey !== 'unassigned';
  
  return (
    <div className={cn(
      "rounded border-2 shadow-sm transition-all flex flex-col items-center justify-center relative",
      isCEO ? "border-yellow-400 bg-gradient-to-r from-yellow-50 to-orange-50 p-3" : sizeConfig.userCard,
      isCEO ? "" : sizeConfig.cardPadding,
      !isCEO && (isLeader ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-white')
    )}>
      <div className={cn("flex flex-col items-center text-center", isCEO ? "gap-2" : sizeConfig.gap)}>
        <Avatar 
          name={getDynamicFullName(user)} 
          src={user.avatar_url} 
          className={isCEO ? "w-10 h-10" : sizeConfig.avatar}
          isAdmin={user.role === 'admin' && !isCEO}
          isLeader={isCEO || isLeader}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-center gap-1">
            <h3 className={cn(
              "font-bold text-slate-900 truncate",
              isCEO ? "text-lg" : sizeConfig.name
            )}>
              {getDynamicFullName(user)}
            </h3>
            {isCEO && <Crown className="w-5 h-5 text-yellow-600 flex-shrink-0" />}
            {isLeader && !isCEO && <Star className={cn("text-blue-600 flex-shrink-0", sizeConfig.icon)} />}
          </div>
          {user.job_role && (
            <p className={cn(
              "text-gray-600 truncate",
              isCEO ? "text-xs" : sizeConfig.role
            )}>{user.job_role}</p>
          )}
        </div>
        {canSetAsLeader && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSetLeader(user.id, groupKey);
            }}
            className="absolute -top-1 -right-1 p-0.5 hover:bg-blue-100 rounded-full transition-colors flex-shrink-0 border-2 border-slate-200 bg-white"
            title="Set as leader"
          >
            <Star className={cn("text-gray-400 hover:text-blue-600", sizeConfig.icon)} />
          </button>
        )}
      </div>
    </div>
  );
}

function GroupContainer({ groupKey, group, isSelected, onClick, isEditMode, editType, handleSetLeader, getDynamicFullName, viewMode, viewSize = 'normal' }) {
  const sizeConfig = VIEW_SIZES[viewSize];
  
  const colorMap = {
    gray: 'bg-gray-100 text-gray-800 border-gray-300',
    red: 'bg-red-100 text-red-800 border-red-300',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    green: 'bg-green-100 text-green-800 border-green-300',
    blue: 'bg-blue-100 text-blue-800 border-blue-300',
    indigo: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    purple: 'bg-purple-100 text-purple-800 border-purple-300',
    pink: 'bg-pink-100 text-pink-800 border-pink-300',
    orange: 'bg-orange-100 text-orange-800 border-orange-300',
    teal: 'bg-teal-100 text-teal-800 border-teal-300',
    white: 'bg-white text-slate-800 border-slate-300'
  };
  
  const colorClass = colorMap[group.color] || colorMap.gray;
  const totalMembers = (group.leader ? 1 : 0) + (group.members?.length || 0);
  
  return (
    <div 
      className={cn(
        "flex flex-col rounded-lg border-2 bg-white shadow-sm h-full overflow-hidden",
        sizeConfig.groupWidth,
        sizeConfig.groupMinHeight,
        isSelected && editType === 'containers' && "ring-4 ring-blue-400 ring-offset-2",
        isEditMode && editType === 'containers' && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <div className={cn("flex items-center justify-between px-2 py-1 rounded-t-lg border-b-2 flex-shrink-0", colorClass)}>
        <Badge className={cn("border-0", colorClass, sizeConfig.badge)}>
          {group.name}
        </Badge>
        <span className={cn("font-bold", sizeConfig.badge)}>{totalMembers}</span>
      </div>
      
      <Droppable droppableId={`group-${groupKey}`} type="USER">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 overflow-y-auto custom-scrollbar",
              sizeConfig.padding,
              "flex flex-col",
              sizeConfig.gap,
              editType === 'users' && snapshot.isDraggingOver && 'bg-blue-50 border-2 border-blue-300 border-dashed'
            )}
          >
            {group.leader && (
              <Draggable 
                draggableId={`user-${group.leader.id}`}
                index={0} 
                isDragDisabled={!isEditMode || editType !== 'users'}
              >
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={snapshot.isDragging ? 'opacity-50' : ''}
                  >
                    <UserCard 
                      user={group.leader} 
                      isLeader={true} 
                      groupKey={groupKey}
                      isEditMode={isEditMode}
                      editType={editType}
                      viewMode={viewMode}
                      handleSetLeader={handleSetLeader}
                      getDynamicFullName={getDynamicFullName}
                      viewSize={viewSize}
                    />
                  </div>
                )}
              </Draggable>
            )}
            
            {group.members && group.members.length > 0 ? (
              group.members.map((user, index) => (
                <Draggable 
                  key={`user-${user.id}`}
                  draggableId={`user-${user.id}`}
                  index={group.leader ? index + 1 : index}
                  isDragDisabled={!isEditMode || editType !== 'users'}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={snapshot.isDragging ? 'opacity-50' : ''}
                    >
                      <UserCard 
                        user={user} 
                        groupKey={groupKey}
                        isEditMode={isEditMode}
                        editType={editType}
                        viewMode={viewMode}
                        handleSetLeader={handleSetLeader}
                        getDynamicFullName={getDynamicFullName}
                        viewSize={viewSize}
                      />
                    </div>
                  )}
                </Draggable>
              ))
            ) : !group.leader ? (
              <div className={cn("text-center text-gray-400", sizeConfig.role, "py-1")}>
                Empty
              </div>
            ) : null}
            
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export default function OrganizationChart({
  orgStructure,
  gridCols,
  gridRows,
  viewSize,
  viewMode,
  isEditMode,
  editType,
  selectedContainer,
  setSelectedContainer,
  showUnassigned,
  setShowUnassigned,
  handleCellClick,
  handleSetLeader,
  getDynamicFullName
}) {
  const sizeConfig = VIEW_SIZES[viewSize];
  
  const unassignedGroups = Object.entries(orgStructure.groups || {}).filter(([key, g]) => 
    (g.position_x === -1 || g.position_y === -1) && (g.members?.length > 0 || g.leader)
  );
  const chartGroups = Object.entries(orgStructure.groups || {}).filter(([_, g]) => g.position_x !== -1 && g.position_y !== -1);

  const grid = [];
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const groupInCell = chartGroups.find(([_, g]) => g.position_x === col && g.position_y === row);
      grid.push({ row, col, group: groupInCell });
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      <div className="flex">
        {/* Unassigned Area (Left) */}
        <div className={cn(
          "bg-gradient-to-b from-slate-100 to-slate-50 border-r-2 border-slate-300 transition-all duration-300 overflow-y-auto custom-scrollbar",
          showUnassigned ? "w-64 p-4" : "w-12 p-2"
        )}>
          <div className="flex items-center justify-between mb-4">
            {showUnassigned && (
              <h3 className="font-semibold text-slate-700 text-xs">
                {viewMode === 'team' ? 'Unassigned Teams' : 'Unassigned Departments'} ({unassignedGroups.length})
              </h3>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-8"
              onClick={() => setShowUnassigned(!showUnassigned)}
              title={showUnassigned ? "Collapse" : "Expand"}
            >
              {showUnassigned ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>

          {showUnassigned && (
            <div className="space-y-2">
              {unassignedGroups.map(([key, group]) => (
                <div key={`unassigned-${key}`}>
                  <GroupContainer
                    groupKey={key}
                    group={group}
                    isSelected={selectedContainer === key}
                    onClick={() => {
                      if (isEditMode && editType === 'containers') {
                        setSelectedContainer(selectedContainer === key ? null : key);
                      }
                    }}
                    isEditMode={isEditMode}
                    editType={editType}
                    handleSetLeader={handleSetLeader}
                    getDynamicFullName={getDynamicFullName}
                    viewMode={viewMode}
                    viewSize={viewSize}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chart Area with Dynamic Grid */}
        <div className="flex-1 p-6 bg-gradient-to-b from-slate-50 to-white overflow-auto custom-scrollbar">
          {orgStructure.ceo ? (
            <div className="flex flex-col items-center">
              <div className="mb-6 z-10">
                <UserCard 
                  user={orgStructure.ceo} 
                  isCEO={true}
                  getDynamicFullName={getDynamicFullName}
                  viewSize={viewSize}
                />
              </div>

              <div className="w-px h-7 bg-gray-300 mb-6 z-10"></div>

              {/* Dynamic Grid */}
              <div 
                className="grid gap-2"
                style={{
                  gridTemplateColumns: `repeat(${gridCols}, ${sizeConfig.cellWidth}px)`,
                  gridAutoRows: `${sizeConfig.cellHeight}px`
                }}
              >
                {grid.map(({ row, col, group }) => {
                  const cellId = `cell-${col}-${row}`;
                  const canPlaceHere = isEditMode && editType === 'containers' && selectedContainer;
                  
                  return (
                    <div
                      key={cellId}
                      className={cn(
                        "relative rounded-lg transition-all",
                        canPlaceHere && "hover:border-2 hover:border-blue-400 hover:bg-blue-50 cursor-pointer border-2 border-dashed border-slate-300 animate-pulse"
                      )}
                      style={{ minHeight: `${sizeConfig.cellHeight}px` }}
                      onClick={() => canPlaceHere && handleCellClick(col, row)}
                    >
                      {group ? (
                        <GroupContainer
                          groupKey={group[0]}
                          group={group[1]}
                          isSelected={selectedContainer === group[0]}
                          onClick={() => {
                            if (isEditMode && editType === 'containers') {
                              setSelectedContainer(selectedContainer === group[0] ? null : group[0]);
                            }
                          }}
                          isEditMode={isEditMode}
                          editType={editType}
                          handleSetLeader={handleSetLeader}
                          getDynamicFullName={getDynamicFullName}
                          viewMode={viewMode}
                          viewSize={viewSize}
                        />
                      ) : (
                        canPlaceHere && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex flex-col items-center text-blue-500">
                              <Target className="w-6 h-6 mb-1" />
                              <span className="text-xs font-medium">Click to place</span>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
              
              {isEditMode && (
                <div className="mt-4 text-xs text-slate-500 text-center">
                  Grid: {gridCols} × {gridRows} ({gridCols * gridRows} cells)
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <UsersIcon className="w-16 h-16 mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold">No organizational data</h3>
              <p className="text-xs mt-2">Add users and assign roles to build the organization chart</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { VIEW_SIZES };