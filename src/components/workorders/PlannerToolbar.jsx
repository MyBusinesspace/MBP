import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Users,
  Search,
  AlertCircle,
  CheckSquare,
  Printer,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PlannerToolbar({
  viewMode,
  onViewModeChange,
  currentDateLabel,
  onNavigatePrev,
  onNavigateNext,
  onNavigateToday,
  todayLabel,
  viewBy,
  onViewByChange,
  searchQuery,
  onSearchChange,
  onShowFilters,
  onShowTeams,
  onCreateWO,
  visibleOverlapsCount = 0,
  onShowOverlapPanel,
  timeRange,
  onTimeRangeChange,
  onToggleMultiSelect,
  isMultiSelectMode = false,
  viewPeriod,
  onViewPeriodChange,
  onPrintDay,
  onDayNavigatePrev,
  onDayNavigateNext,
  selectedDayLabel,
}) {
  return (
    <div className="flex items-center justify-between gap-1.5 p-2 border-b border-slate-200 bg-white rounded-lg shadow-sm mb-2 overflow-x-auto">
      {/* Left section */}
      <div className="flex items-center gap-1.5 flex-nowrap flex-shrink-0">
        <div className="flex items-center gap-0.5 bg-slate-100 rounded-md p-0.5 flex-shrink-0">
          <Button 
            variant={viewMode === 'day' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => onViewModeChange('day')}
            className={cn("h-7 px-2 text-[11px]", viewMode === 'day' && "bg-indigo-600 hover:bg-indigo-700 text-white")}
          >
            Day
          </Button>
          <Button 
            variant={viewMode === 'week' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => onViewModeChange('week')}
            className={cn("h-7 px-2 text-[11px]", viewMode === 'week' && "bg-indigo-600 hover:bg-indigo-700 text-white")}
          >
            Week
          </Button>
          <Button 
            variant={viewMode === 'month' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => onViewModeChange('month')}
            className={cn("h-7 px-2 text-[11px]", viewMode === 'month' && "bg-indigo-600 hover:bg-indigo-700 text-white")}
          >
            Month
          </Button>

        </div>

        <div className="flex items-center gap-1 border-l border-slate-200 pl-2 flex-shrink-0">
          <span className="text-[10px] text-slate-500 mr-1">View by:</span>
          <Select value={viewBy} onValueChange={onViewByChange}>
            <SelectTrigger className="w-[85px] h-7 text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="project">Project</SelectItem>
              <SelectItem value="team">Team</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {viewMode !== 'list' && (
          <div className="flex items-center gap-1 border-l border-slate-200 pl-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={onNavigatePrev} className="h-7 w-7 p-0">
              <ChevronLeft className="w-3 h-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={onNavigateToday} className="h-7 px-2 text-[11px] whitespace-nowrap">
              {todayLabel}
            </Button>
            <Button variant="outline" size="sm" onClick={onNavigateNext} className="h-7 w-7 p-0">
              <ChevronRight className="w-3 h-3" />
            </Button>
            <div className="text-xs font-semibold text-slate-700 ml-1 whitespace-nowrap">
              {currentDateLabel}
            </div>
          </div>
        )}
        
        {viewMode === 'week' && onDayNavigatePrev && onDayNavigateNext && (
          <div className="flex items-center gap-1 border-l border-slate-200 pl-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={onDayNavigatePrev} className="h-7 w-7 p-0">
              <ChevronLeft className="w-3 h-3" />
            </Button>
            <div className="text-xs font-semibold text-slate-700 px-2 whitespace-nowrap">
              Day
            </div>
            <Button variant="outline" size="sm" onClick={onDayNavigateNext} className="h-7 w-7 p-0">
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-1.5 flex-nowrap flex-shrink-0">




        {(viewMode === 'week' || viewMode === 'day') && onPrintDay && (
          <Button variant="outline" size="sm" onClick={onPrintDay} className="h-7 px-2 text-[11px] gap-1">
            <Printer className="w-3 h-3" />
            Print Day
          </Button>
        )}

        {viewMode === 'day' && timeRange && onTimeRangeChange && (
          <div className="flex items-center gap-0.5 bg-slate-100 rounded-md p-0.5 border border-slate-200">
            <Button
              variant={timeRange === '24h' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onTimeRangeChange('24h')}
              className={cn("h-7 px-2 text-[11px]", timeRange === '24h' && "bg-indigo-600 hover:bg-indigo-700 text-white")}
            >
              24h
            </Button>
            <Button
              variant={timeRange === '7-19' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onTimeRangeChange('7-19')}
              className={cn("h-7 px-2 text-[11px]", timeRange === '7-19' && "bg-indigo-600 hover:bg-indigo-700 text-white")}
            >
              7-19h
            </Button>
          </div>
        )}

        {viewMode !== 'list' && (
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
            <Input
              placeholder="Search work orders..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-7 h-7 text-[11px] w-36"
            />
          </div>
        )}
        

        
        {viewMode !== 'list' && (
          <Button variant="outline" size="sm" onClick={onShowFilters} className="h-7 px-2 text-[11px]">
            <Filter className="w-3 h-3 mr-1" />
            Filters
          </Button>
        )}

        {(viewMode === 'week' || viewMode === 'day') && onPrintDay && (
          <Button variant="outline" size="sm" onClick={onPrintDay} className="h-7 px-2 text-[11px] gap-1">
            <Printer className="w-3 h-3" />
            Print
          </Button>
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={onShowOverlapPanel}
          className={cn(
            "h-7 px-2 text-[11px]",
            visibleOverlapsCount > 0 
              ? "border-orange-300 bg-orange-50 hover:bg-orange-100" 
              : "border-slate-200 bg-slate-50 hover:bg-slate-100"
          )}
        >
          <AlertCircle className={cn("w-3 h-3 mr-1", visibleOverlapsCount > 0 ? "text-orange-600" : "text-slate-400")} />
          {visibleOverlapsCount}
        </Button>

        <Button variant="outline" size="sm" onClick={onShowTeams} className="h-7 px-2 text-[11px]">
          <Users className="w-3 h-3 mr-1" />
          Teams
        </Button>

        <Button size="sm" onClick={onCreateWO} className="h-7 px-2 text-[11px] bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-3 h-3 mr-1" />
          Schedule Order
        </Button>
        <Button variant="outline" size="sm" onClick={onCreateWO} className="h-7 px-2 text-[11px]">
          <Plus className="w-3 h-3 mr-1" />
          + Create Working Order
        </Button>
      </div>
    </div>
  );
}