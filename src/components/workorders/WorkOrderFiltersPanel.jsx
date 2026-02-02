import React, { useState, useMemo, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Search, Filter, CheckSquare } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function WorkOrderFiltersPanel({
  isOpen = false,
  onClose,
  filters,
  onFiltersChange,
  projects = [],
  teams = [],
  users = [],
  categories = [],
  shiftTypes = [],
  isMultiSelectMode,
  onToggleMultiSelect,
}) {
  const [localFilters, setLocalFilters] = useState(filters);
  const [searchProject, setSearchProject] = useState('');
  const [searchTeam, setSearchTeam] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [searchCategory, setSearchCategory] = useState('');

  useEffect(() => {
    if (isOpen) {
      console.log('📊 Filter Panel Opened - Resetting searches');
      console.log('  - categories prop:', categories?.length || 0);
      setSearchProject('');
      setSearchTeam('');
      setSearchUser('');
      setSearchCategory('');
    }
  }, [isOpen, categories]);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const filteredProjects = useMemo(() => {
    if (!searchProject) return projects;
    return projects.filter(p => 
      p.name?.toLowerCase().includes(searchProject.toLowerCase()) ||
      p.client_name?.toLowerCase().includes(searchProject.toLowerCase())
    );
  }, [projects, searchProject]);

  const filteredTeams = useMemo(() => {
    if (!searchTeam) return teams;
    return teams.filter(t => 
      t.name?.toLowerCase().includes(searchTeam.toLowerCase())
    );
  }, [teams, searchTeam]);

  const filteredUsers = useMemo(() => {
    if (!searchUser) return users;
    return users.filter(u => 
      u.full_name?.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.nickname?.toLowerCase().includes(searchUser.toLowerCase())
    );
  }, [users, searchUser]);

  const filteredCategories = useMemo(() => {
    const safeCats = Array.isArray(categories) ? categories : [];
    
    console.log('[FILTERS PANEL] 🔍 Filtering categories:', {
      total: safeCats.length,
      searchCategory,
      hasSearch: !!searchCategory && searchCategory.trim() !== '',
      allCategories: safeCats.map(c => c.name)
    });
    
    if (!searchCategory || searchCategory.trim() === '') {
      console.log('[FILTERS PANEL]   ✅ No search, returning all:', safeCats.length, 'categories');
      return safeCats;
    }
    
    const filtered = safeCats.filter(c => 
      c.name?.toLowerCase().includes(searchCategory.toLowerCase())
    );
    
    console.log('[FILTERS PANEL]   ✅ Filtered result:', filtered.length, 'categories');
    return filtered;
  }, [categories, searchCategory]);

  useEffect(() => {
    console.log('[FILTERS PANEL] 🎯 filteredCategories changed:', filteredCategories.length);
    console.log('[FILTERS PANEL] 🎯 Category names:', filteredCategories.map(c => c.name));
  }, [filteredCategories]);

  const handleToggleProject = (projectId) => {
    setLocalFilters(prev => {
      const project_ids = prev.project_ids.includes(projectId)
        ? prev.project_ids.filter(id => id !== projectId)
        : [...prev.project_ids, projectId];
      return { ...prev, project_ids };
    });
  };

  const handleToggleTeam = (teamId) => {
    setLocalFilters(prev => {
      const team_ids = prev.team_ids.includes(teamId)
        ? prev.team_ids.filter(id => id !== teamId)
        : [...prev.team_ids, teamId];
      return { ...prev, team_ids };
    });
  };

  const handleToggleUser = (userId) => {
    setLocalFilters(prev => {
      const user_ids = prev.user_ids.includes(userId)
        ? prev.user_ids.filter(id => id !== userId)
        : [...prev.user_ids, userId];
      return { ...prev, user_ids };
    });
  };

  const handleToggleCategory = (categoryId) => {
    setLocalFilters(prev => {
      const category_ids = prev.category_ids.includes(categoryId)
        ? prev.category_ids.filter(id => id !== categoryId)
        : [...prev.category_ids, categoryId];
      return { ...prev, category_ids };
    });
  };

  const handleToggleShiftType = (shiftTypeId) => {
    setLocalFilters(prev => {
      const shift_type_ids = prev.shift_type_ids.includes(shiftTypeId)
        ? prev.shift_type_ids.filter(id => id !== shiftTypeId)
        : [...prev.shift_type_ids, shiftTypeId];
      return { ...prev, shift_type_ids };
    });
  };

  const handleToggleStatus = (status) => {
    setLocalFilters(prev => {
      const statuses = prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status];
      return { ...prev, status: statuses };
    });
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters = {
      project_ids: [],
      team_ids: [],
      user_ids: [],
      category_ids: [],
      shift_type_ids: [],
      status: [],
      search: '',
      show_closed: false,
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  const activeFilterCount = 
    localFilters.project_ids.length +
    localFilters.team_ids.length +
    localFilters.user_ids.length +
    localFilters.category_ids.length +
    localFilters.shift_type_ids.length +
    localFilters.status.length +
    (localFilters.search ? 1 : 0) +
    (localFilters.show_closed ? 1 : 0);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-md flex flex-col p-0 h-screen"
        style={{ maxHeight: '100vh', display: 'flex', flexDirection: 'column' }}
      >
        <SheetHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-600" />
              <SheetTitle>Filters</SheetTitle>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFilterCount}
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          {onToggleMultiSelect && (
            <div className="flex items-center justify-between pt-4">
              <Label htmlFor="multi-select" className="text-sm font-medium">Multi-Select Mode</Label>
              <div className="flex items-center gap-2">
                <Switch
                  id="multi-select"
                  checked={isMultiSelectMode}
                  onCheckedChange={onToggleMultiSelect}
                />
                {isMultiSelectMode && (
                  <CheckSquare className="w-4 h-4 text-indigo-600" />
                )}
              </div>
            </div>
          )}
        </SheetHeader>

        <div 
          className="flex-1 px-6 py-4"
          style={{ 
            flex: 1,
            overflowY: 'auto',
            minHeight: 0,
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <div className="space-y-6 pb-20">
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search work orders..."
                  value={localFilters.search}
                  onChange={(e) => setLocalFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-9"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-sm font-semibold">Status</Label>
              <div className="space-y-2">
                {['open', 'closed'].map(status => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${status}`}
                      checked={localFilters.status.includes(status)}
                      onCheckedChange={() => handleToggleStatus(status)}
                    />
                    <Label htmlFor={`status-${status}`} className="text-sm font-normal capitalize cursor-pointer">
                      {status}
                    </Label>
                  </div>
                ))}
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="show-closed"
                  checked={localFilters.show_closed}
                  onCheckedChange={(checked) => setLocalFilters(prev => ({ ...prev, show_closed: checked }))}
                />
                <Label htmlFor="show-closed" className="text-sm font-normal">
                  Show closed work orders
                </Label>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-sm font-semibold">
                Projects
                {localFilters.project_ids.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {localFilters.project_ids.length}
                  </Badge>
                )}
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search projects..."
                  value={searchProject}
                  onChange={(e) => setSearchProject(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2">
                {filteredProjects.map(project => (
                  <div key={project.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`project-${project.id}`}
                      checked={localFilters.project_ids.includes(project.id)}
                      onCheckedChange={() => handleToggleProject(project.id)}
                    />
                    <Label htmlFor={`project-${project.id}`} className="text-sm font-normal cursor-pointer flex-1 truncate">
                      {project.name}
                      {project.client_name && (
                        <span className="text-slate-500 ml-1">({project.client_name})</span>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-sm font-semibold">
                Teams
                {localFilters.team_ids.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {localFilters.team_ids.length}
                  </Badge>
                )}
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search teams..."
                  value={searchTeam}
                  onChange={(e) => setSearchTeam(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2">
                {filteredTeams.map(team => (
                  <div key={team.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`team-${team.id}`}
                      checked={localFilters.team_ids.includes(team.id)}
                      onCheckedChange={() => handleToggleTeam(team.id)}
                    />
                    <Label htmlFor={`team-${team.id}`} className="text-sm font-normal cursor-pointer flex-1 truncate">
                      {team.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-sm font-semibold">
                Users
                {localFilters.user_ids.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {localFilters.user_ids.length}
                  </Badge>
                )}
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search users..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2">
                {filteredUsers.map(user => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`user-${user.id}`}
                      checked={localFilters.user_ids.includes(user.id)}
                      onCheckedChange={() => handleToggleUser(user.id)}
                    />
                    <Label htmlFor={`user-${user.id}`} className="text-sm font-normal cursor-pointer flex-1 truncate">
                      {user.nickname || user.full_name || user.email}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* ✅ CATEGORÍAS - FIX NUCLEAR */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-lg">
                📂 Categories ({filteredCategories.length})
                {localFilters.category_ids.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {localFilters.category_ids.length} selected
                  </Badge>
                )}
              </Label>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search category..."
                  value={searchCategory}
                  onChange={(e) => {
                    console.log('[FILTERS PANEL] 🔍 Search changed:', e.target.value);
                    setSearchCategory(e.target.value);
                  }}
                  className="pl-9"
                />
              </div>
              
              {/* ✅ SUPER FIX: Estilos inline + className + debugging visual */}
              <div 
                style={{
                  minHeight: '250px',
                  maxHeight: '400px',
                  overflowY: 'scroll',
                  border: '3px solid #3b82f6',
                  borderRadius: '8px',
                  padding: '12px',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  WebkitOverflowScrolling: 'touch',
                  position: 'relative',
                  zIndex: 1
                }}
                className="categories-container"
              >
                {console.log('[FILTERS PANEL] 🎨 Rendering categories container. Count:', filteredCategories.length)}
                
                {/* ✅ Marcador visual de debugging */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '2px 6px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  borderRadius: '0 0 0 4px'
                }}>
                  {filteredCategories.length} items
                </div>
                
                {filteredCategories.length === 0 ? (
                  <div className="text-center py-12" style={{ padding: '48px 16px' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                      {categories?.length === 0 ? '📭' : '🔍'}
                    </div>
                    <div className="text-sm text-slate-500">
                      {categories?.length === 0 
                        ? 'No categories available' 
                        : `No categories matching "${searchCategory}"`}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredCategories.map((category, idx) => {
                      console.log('[FILTERS PANEL]   - Rendering category:', idx, category.name);
                      return (
                        <div 
                          key={category.id} 
                          className="flex items-center space-x-2 py-2 px-2 hover:bg-blue-50 rounded transition-colors"
                          style={{
                            backgroundColor: localFilters.category_ids.includes(category.id) ? '#dbeafe' : 'transparent',
                            borderLeft: localFilters.category_ids.includes(category.id) ? '3px solid #3b82f6' : 'none',
                            paddingLeft: localFilters.category_ids.includes(category.id) ? '6px' : '8px'
                          }}
                        >
                          <Checkbox
                            id={`category-${category.id}`}
                            checked={localFilters.category_ids.includes(category.id)}
                            onCheckedChange={() => {
                              console.log('[FILTERS PANEL] 📌 Category toggled:', category.name);
                              handleToggleCategory(category.id);
                            }}
                          />
                          <Label 
                            htmlFor={`category-${category.id}`} 
                            className="text-sm font-medium cursor-pointer flex-1"
                            style={{ fontSize: '14px', lineHeight: '20px' }}
                          >
                            {category.name}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-sm font-semibold">
                Shift Types
                {localFilters.shift_type_ids.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {localFilters.shift_type_ids.length}
                  </Badge>
                )}
              </Label>
              <div className="space-y-2">
                {shiftTypes.map(shiftType => (
                  <div key={shiftType.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`shift-${shiftType.id}`}
                      checked={localFilters.shift_type_ids.includes(shiftType.id)}
                      onCheckedChange={() => handleToggleShiftType(shiftType.id)}
                    />
                    <Label htmlFor={`shift-${shiftType.id}`} className="text-sm font-normal cursor-pointer flex-1 truncate">
                      {shiftType.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t px-6 py-4 flex items-center gap-2 flex-shrink-0 bg-white">
          <Button variant="outline" onClick={handleReset} className="flex-1">
            Reset
          </Button>
          <Button onClick={handleApply} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
            Apply Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}