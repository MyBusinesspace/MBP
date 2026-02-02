import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Users,
  Search,
  X,
  CheckSquare,
  Calendar as CalendarIcon
} from 'lucide-react';

export default function UnifiedToolbar({
  // View mode
  viewMode,
  onViewModeChange,
  
  // Navigation
  currentLabel,
  onNavigatePrev,
  onNavigateNext,
  onNavigateToday,
  todayLabel = "Today",
  
  // View by selector
  viewBy,
  onViewByChange,
  
  // Search
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search work orders...",
  
  // Action buttons
  onShowFilters,
  onShowTeams,
  onCreateWO,
  
  // Multi-select
  isMultiSelectMode,
  
  // Extra controls (per view)
  extraLeftControls,
  extraRightControls
}) {
  return (
    <div className="flex-shrink-0 bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Row 1: View Tabs + View By */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        {/* Left: View Tabs */}
        {onViewModeChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">VIEWS:</span>
            <Tabs value={viewMode} onValueChange={onViewModeChange}>
              <TabsList className="bg-gradient-to-r from-indigo-50 to-purple-50 p-1.5 h-10 shadow-sm border border-indigo-200">
                <TabsTrigger value="week" className="text-sm px-4 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-indigo-700 font-bold">Week</TabsTrigger>
                <TabsTrigger value="month" className="text-sm px-4 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-indigo-700 font-bold">Month</TabsTrigger>
                <TabsTrigger value="day" className="text-sm px-4 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-indigo-700 font-bold">Day</TabsTrigger>
                <TabsTrigger value="list" className="text-sm px-4 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-indigo-700 font-bold">List</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* Right: View By */}
        {onViewByChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 font-medium">View by:</span>
            <Select value={viewBy} onValueChange={onViewByChange}>
              <SelectTrigger className="w-28 h-9">
                <SelectValue>
                  {viewBy === 'project' ? 'Project' : viewBy === 'team' ? 'Team' : 'User'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="team">Team</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Row 2: Navigation + Extra Controls + Actions */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200">
        {/* Left: Navigation + Extra Controls */}
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <Button variant="ghost" size="sm" onClick={onNavigatePrev} className="h-9 w-9 p-0">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <Button
            variant="default"
            size="sm"
            onClick={onNavigateToday}
            className="bg-indigo-600 hover:bg-indigo-700 h-9 px-3 text-sm font-semibold"
          >
            {todayLabel}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="pointer-events-none h-9 px-3 text-sm font-medium"
          >
            <CalendarIcon className="w-4 h-4 mr-2" />
            {currentLabel}
          </Button>
          
          <Button variant="ghost" size="sm" onClick={onNavigateNext} className="h-9 w-9 p-0">
            <ChevronRight className="w-4 h-4" />
          </Button>

          {/* Extra Left Controls */}
          {extraLeftControls && (
            <>
              <div className="w-px h-6 bg-slate-300 mx-1" />
              {extraLeftControls}
            </>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Extra Right Controls */}
          {extraRightControls}
          
          {/* Common Actions */}
          {onShowFilters && (
            <Button variant="outline" size="sm" onClick={onShowFilters} className="h-9 text-sm gap-1.5">
              <Filter className="w-4 h-4" />
              Filters
            </Button>
          )}
          
          {onShowTeams && (
            <Button variant="outline" size="sm" onClick={onShowTeams} className="h-9 text-sm gap-1.5">
              <Users className="w-4 h-4" />
              Teams
            </Button>
          )}
          
          {onCreateWO && (
            <>
              <Button
                onClick={() => onCreateWO(null, new Date())}
                className="bg-indigo-600 hover:bg-indigo-700 h-9 text-sm gap-1.5"
                size="sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Schedule Order</span>
                <span className="sm:hidden">Schedule</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCreateWO(null, new Date())}
                className="h-9 text-sm gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">+ Create Working Order</span>
                <span className="sm:hidden">+ WO</span>
              </Button>
            </>
          )}

          {/* Multi-select */}
          {!isMultiSelectMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (window.workOrdersToggleMultiSelect) {
                  window.workOrdersToggleMultiSelect();
                }
              }}
              className="h-9 text-sm gap-1.5"
            >
              <CheckSquare className="w-4 h-4" />
              Select
            </Button>
          )}
        </div>
      </div>

      {/* Row 3: Search Bar */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-10 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 hover:bg-slate-100 rounded p-0.5"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}