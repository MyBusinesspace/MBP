import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Download,
  FileText,
  Calendar,
  Users,
  FolderKanban,
  Tag,
  CheckSquare,
  Settings,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { createPageUrl } from '@/utils';

export default function WorkOrderReportDialog({ 
  isOpen, 
  onClose, 
  teams = [],
  projects = [],
  categories = [],
  users = []
}) {
  const [filters, setFilters] = useState({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    teamIds: [],
    projectIds: [],
    categoryIds: [],
    statusFilter: [],
    userIds: [],
    includeNotes: true,
    includeContacts: true,
    groupBy: 'team',
    sortBy: 'time'
  });

  const handleExport = async () => {
    // Build URL with filters as query params
    const params = new URLSearchParams();
    params.set('startDate', filters.startDate);
    params.set('endDate', filters.endDate);
    if (filters.teamIds.length) params.set('teamIds', filters.teamIds.join(','));
    if (filters.projectIds.length) params.set('projectIds', filters.projectIds.join(','));
    if (filters.categoryIds.length) params.set('categoryIds', filters.categoryIds.join(','));
    if (filters.statusFilter.length) params.set('statusFilter', filters.statusFilter.join(','));
    if (filters.userIds.length) params.set('userIds', filters.userIds.join(','));
    params.set('groupBy', filters.groupBy);
    params.set('sortBy', filters.sortBy);
    if (filters.includeNotes) params.set('includeNotes', 'true');
    if (filters.includeContacts) params.set('includeContacts', 'true');

    // Open the HTML view in a new tab using createPageUrl
    window.open(createPageUrl(`WorkOrdersSummaryPDFView?${params.toString()}`), '_blank');
    onClose();
  };

  const handleTeamToggle = (teamId) => {
    setFilters(prev => ({
      ...prev,
      teamIds: prev.teamIds.includes(teamId)
        ? prev.teamIds.filter(id => id !== teamId)
        : [...prev.teamIds, teamId]
    }));
  };

  const handleProjectToggle = (projectId) => {
    setFilters(prev => ({
      ...prev,
      projectIds: prev.projectIds.includes(projectId)
        ? prev.projectIds.filter(id => id !== projectId)
        : [...prev.projectIds, projectId]
    }));
  };

  const handleCategoryToggle = (categoryId) => {
    setFilters(prev => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(categoryId)
        ? prev.categoryIds.filter(id => id !== categoryId)
        : [...prev.categoryIds, categoryId]
    }));
  };

  const handleStatusToggle = (status) => {
    setFilters(prev => ({
      ...prev,
      statusFilter: prev.statusFilter.includes(status)
        ? prev.statusFilter.filter(s => s !== status)
        : [...prev.statusFilter, status]
    }));
  };

  const handleUserToggle = (userId) => {
    setFilters(prev => ({
      ...prev,
      userIds: prev.userIds.includes(userId)
        ? prev.userIds.filter(id => id !== userId)
        : [...prev.userIds, userId]
    }));
  };

  const handleSelectAllTeams = () => {
    setFilters(prev => ({ ...prev, teamIds: teams.map(t => t.id) }));
  };

  const handleClearAllTeams = () => {
    setFilters(prev => ({ ...prev, teamIds: [] }));
  };

  const handleSelectAllProjects = () => {
    setFilters(prev => ({ ...prev, projectIds: projects.map(p => p.id) }));
  };

  const handleClearAllProjects = () => {
    setFilters(prev => ({ ...prev, projectIds: [] }));
  };

  const handleSelectAllCategories = () => {
    setFilters(prev => ({ ...prev, categoryIds: categories.map(c => c.id) }));
  };

  const handleClearAllCategories = () => {
    setFilters(prev => ({ ...prev, categoryIds: [] }));
  };

  const handleSelectAllStatus = () => {
    setFilters(prev => ({ ...prev, statusFilter: ['on_queue', 'ongoing', 'closed'] }));
  };

  const handleClearAllStatus = () => {
    setFilters(prev => ({ ...prev, statusFilter: [] }));
  };

  const handleSelectAllUsers = () => {
    setFilters(prev => ({ ...prev, userIds: users.map(u => u.id) }));
  };

  const handleClearAllUsers = () => {
    setFilters(prev => ({ ...prev, userIds: [] }));
  };

  const removeTeam = (teamId) => {
    setFilters(prev => ({ ...prev, teamIds: prev.teamIds.filter(id => id !== teamId) }));
  };

  const removeProject = (projectId) => {
    setFilters(prev => ({ ...prev, projectIds: prev.projectIds.filter(id => id !== projectId) }));
  };

  const removeCategory = (categoryId) => {
    setFilters(prev => ({ ...prev, categoryIds: prev.categoryIds.filter(id => id !== categoryId) }));
  };

  const removeStatus = (status) => {
    setFilters(prev => ({ ...prev, statusFilter: prev.statusFilter.filter(s => s !== status) }));
  };

  const removeUser = (userId) => {
    setFilters(prev => ({ ...prev, userIds: prev.userIds.filter(id => id !== userId) }));
  };

  // ✅ NUEVO: Labels para los valores de los selects
  const groupByLabels = {
    'team': 'Team',
    'project': 'Project',
    'date': 'Date'
  };

  const sortByLabels = {
    'time': 'Time',
    'team': 'Team',
    'project': 'Project'
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Generate Work Orders Report
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Date Range */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-600" />
              <h3 className="font-semibold text-sm">Date Range</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-600 mb-1 block">Start Date</label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-slate-600 mb-1 block">End Date</label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-slate-600" />
                <h3 className="font-semibold text-sm">Status</h3>
                <span className="text-xs text-slate-500">({filters.statusFilter.length} selected)</span>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleSelectAllStatus} className="h-7 text-xs">
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClearAllStatus} className="h-7 text-xs">
                  Clear
                </Button>
              </div>
            </div>
            
            {filters.statusFilter.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                {filters.statusFilter.map(status => (
                  <Badge key={status} variant="secondary" className="gap-1">
                    {status.replace('_', ' ')}
                    <X 
                      className="w-3 h-3 cursor-pointer hover:text-red-600" 
                      onClick={() => removeStatus(status)}
                    />
                  </Badge>
                ))}
              </div>
            )}
            
            <div className="flex flex-wrap gap-2">
              {['on_queue', 'ongoing', 'closed'].map(status => (
                <div
                  key={status}
                  onClick={() => handleStatusToggle(status)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all border ${
                    filters.statusFilter.includes(status)
                      ? 'bg-indigo-100 border-indigo-400'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Checkbox checked={filters.statusFilter.includes(status)} />
                  <span className="text-sm capitalize">{status.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Teams */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-600" />
                <h3 className="font-semibold text-sm">Teams</h3>
                <span className="text-xs text-slate-500">({filters.teamIds.length} selected)</span>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleSelectAllTeams} className="h-7 text-xs">
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClearAllTeams} className="h-7 text-xs">
                  Clear
                </Button>
              </div>
            </div>
            
            {filters.teamIds.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                {filters.teamIds.map(teamId => {
                  const team = teams.find(t => t.id === teamId);
                  return team ? (
                    <Badge key={teamId} variant="secondary" className="gap-1">
                      {team.name}
                      <X 
                        className="w-3 h-3 cursor-pointer hover:text-red-600" 
                        onClick={() => removeTeam(teamId)}
                      />
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
            
            <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
              {teams.map(team => (
                <div
                  key={team.id}
                  onClick={() => handleTeamToggle(team.id)}
                  className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer"
                >
                  <Checkbox checked={filters.teamIds.includes(team.id)} />
                  <span className="text-sm">{team.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Projects */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-slate-600" />
                <h3 className="font-semibold text-sm">Projects</h3>
                <span className="text-xs text-slate-500">({filters.projectIds.length} selected)</span>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleSelectAllProjects} className="h-7 text-xs">
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClearAllProjects} className="h-7 text-xs">
                  Clear
                </Button>
              </div>
            </div>
            
            {filters.projectIds.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 max-h-32 overflow-y-auto">
                {filters.projectIds.map(projectId => {
                  const project = projects.find(p => p.id === projectId);
                  return project ? (
                    <Badge key={projectId} variant="secondary" className="gap-1">
                      {project.name}
                      <X 
                        className="w-3 h-3 cursor-pointer hover:text-red-600" 
                        onClick={() => removeProject(projectId)}
                      />
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
            
            <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
              {projects.slice(0, 100).map(project => (
                <div
                  key={project.id}
                  onClick={() => handleProjectToggle(project.id)}
                  className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer"
                >
                  <Checkbox checked={filters.projectIds.includes(project.id)} />
                  <span className="text-sm">{project.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-slate-600" />
                <h3 className="font-semibold text-sm">Categories</h3>
                <span className="text-xs text-slate-500">({filters.categoryIds.length} selected)</span>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleSelectAllCategories} className="h-7 text-xs">
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClearAllCategories} className="h-7 text-xs">
                  Clear
                </Button>
              </div>
            </div>
            
            {filters.categoryIds.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                {filters.categoryIds.map(categoryId => {
                  const category = categories.find(c => c.id === categoryId);
                  return category ? (
                    <Badge key={categoryId} variant="secondary" className="gap-1">
                      {category.name}
                      <X 
                        className="w-3 h-3 cursor-pointer hover:text-red-600" 
                        onClick={() => removeCategory(categoryId)}
                      />
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
            
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <div
                  key={category.id}
                  onClick={() => handleCategoryToggle(category.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all border ${
                    filters.categoryIds.includes(category.id)
                      ? 'bg-indigo-100 border-indigo-400'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Checkbox checked={filters.categoryIds.includes(category.id)} />
                  <span className="text-sm">{category.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Users */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-600" />
                <h3 className="font-semibold text-sm">Users</h3>
                <span className="text-xs text-slate-500">({filters.userIds.length} selected)</span>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleSelectAllUsers} className="h-7 text-xs">
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClearAllUsers} className="h-7 text-xs">
                  Clear
                </Button>
              </div>
            </div>
            
            {filters.userIds.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 max-h-32 overflow-y-auto">
                {filters.userIds.map(userId => {
                  const user = users.find(u => u.id === userId);
                  return user ? (
                    <Badge key={userId} variant="secondary" className="gap-1">
                      {user.nickname || user.first_name || user.email}
                      <X 
                        className="w-3 h-3 cursor-pointer hover:text-red-600" 
                        onClick={() => removeUser(userId)}
                      />
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
            
            <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
              {users.filter(u => !u.archived).slice(0, 100).map(user => (
                <div
                  key={user.id}
                  onClick={() => handleUserToggle(user.id)}
                  className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer"
                >
                  <Checkbox checked={filters.userIds.includes(user.id)} />
                  <span className="text-sm">{user.nickname || user.first_name || user.email}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Report Options */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-600" />
              <h3 className="font-semibold text-sm">Report Options</h3>
            </div>
            
            <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div>
                <label className="text-xs text-slate-600 mb-2 block">Group By</label>
                <Select value={filters.groupBy} onValueChange={(value) => setFilters(prev => ({ ...prev, groupBy: value }))}>
                  <SelectTrigger>
                    <SelectValue>
                      {groupByLabels[filters.groupBy]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team">Team</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-slate-600 mb-2 block">Sort By</label>
                <Select value={filters.sortBy} onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}>
                  <SelectTrigger>
                    <SelectValue>
                      {sortByLabels[filters.sortBy]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="time">Time</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="includeNotes"
                  checked={filters.includeNotes}
                  onCheckedChange={(checked) => setFilters(prev => ({ ...prev, includeNotes: checked }))}
                />
                <label htmlFor="includeNotes" className="text-sm cursor-pointer">
                  Include work notes
                </label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="includeContacts"
                  checked={filters.includeContacts}
                  onCheckedChange={(checked) => setFilters(prev => ({ ...prev, includeContacts: checked }))}
                />
                <label htmlFor="includeContacts" className="text-sm cursor-pointer">
                  Include project contacts
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}