
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { X, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function WorkOrderFiltersTab({
  isOpen,
  onClose,
  filters = {},
  onFilterChange,
  categories = [],
  categoryCounts = {},
  projectCategories = [],
  projectCategoryCounts = {},
  userTeamOptions = [],
  projectOptions = [],
  allWorkOrderCount = 0
}) {
  const [searchQueries, setSearchQueries] = useState({
    status: '',
    categories: '',
    projectCategories: '',
    userTeam: '',
    project: ''
  });

  const [expandedSections, setExpandedSections] = useState({
    status: true,
    categories: false,
    projectCategories: false,
    userTeam: false,
    project: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const updateSearchQuery = (section, value) => {
    setSearchQueries(prev => ({
      ...prev,
      [section]: value
    }));
  };

  const statusOptions = [
    { id: 'all', label: 'All Work Orders', count: allWorkOrderCount },
    { id: 'active', label: 'Active (Ongoing + Queue)', count: 0 },
    { id: 'on_queue', label: 'On Queue', count: 0 },
    { id: 'ongoing', label: 'Ongoing', count: 0 },
    { id: 'closed', label: 'Closed', count: 0 }
  ];

  // ✅ FIX: Búsqueda por TODAS las palabras
  const matchesAllWords = (searchText, query) => {
    if (!query) return true;
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const text = searchText.toLowerCase();
    return queryWords.every(word => text.includes(word));
  };

  const filteredCategories = useMemo(() => {
    if (!searchQueries.categories) return categories;
    
    return categories.filter(cat => {
      const searchText = [
        cat.name,
        cat.description
      ].filter(Boolean).join(' ');
      
      return matchesAllWords(searchText, searchQueries.categories);
    });
  }, [categories, searchQueries.categories]);

  const filteredProjectCategories = useMemo(() => {
    if (!searchQueries.projectCategories) return projectCategories;
    
    return projectCategories.filter(cat => {
      const searchText = [
        cat.name,
        cat.description
      ].filter(Boolean).join(' ');
      
      return matchesAllWords(searchText, searchQueries.projectCategories);
    });
  }, [projectCategories, searchQueries.projectCategories]);

  const filteredUserTeamOptions = useMemo(() => {
    if (!searchQueries.userTeam) return userTeamOptions;
    
    return userTeamOptions.filter(opt => {
      const searchText = [
        opt.label,
        opt.type,
        opt.email,
        opt.jobRole
      ].filter(Boolean).join(' ');
      
      return matchesAllWords(searchText, searchQueries.userTeam);
    });
  }, [userTeamOptions, searchQueries.userTeam]);

  const filteredProjectOptions = useMemo(() => {
    if (!searchQueries.project) return projectOptions;
    
    return projectOptions.filter(proj => {
      const searchText = [
        proj.name,
        proj.customerName,
        proj.description,
        proj.address,
        proj.location_name,
        proj.contact_person,
        proj.notes,
        proj.phone
      ].filter(Boolean).join(' ');
      
      return matchesAllWords(searchText, searchQueries.project);
    });
  }, [projectOptions, searchQueries.project]);

  const handleStatusChange = (statusId) => {
    onFilterChange({ ...filters, status: statusId });
  };

  const handleCategoryToggle = (categoryId) => {
    const currentCategories = filters.categories || [];
    const newCategories = currentCategories.includes(categoryId)
      ? currentCategories.filter(id => id !== categoryId)
      : [...currentCategories, categoryId];
    onFilterChange({ ...filters, categories: newCategories });
  };

  const handleProjectCategoryToggle = (categoryId) => {
    const currentProjectCategories = filters.projectCategories || [];
    const newProjectCategories = currentProjectCategories.includes(categoryId)
      ? currentProjectCategories.filter(id => id !== categoryId)
      : [...currentProjectCategories, categoryId];
    onFilterChange({ ...filters, projectCategories: newProjectCategories });
  };

  const handleUserTeamChange = (optionId) => {
    onFilterChange({ 
      ...filters, 
      userTeam: filters.userTeam === optionId ? '' : optionId 
    });
  };

  const handleProjectChange = (projectId) => {
    onFilterChange({ 
      ...filters, 
      project: filters.project === projectId ? '' : projectId 
    });
  };

  const clearAllFilters = () => {
    onFilterChange({
      status: 'all',
      categories: [],
      projectCategories: [],
      userTeam: '',
      project: ''
    });
    setSearchQueries({
      status: '',
      categories: '',
      projectCategories: '',
      userTeam: '',
      project: ''
    });
  };

  const activeFiltersCount = 
    (filters.categories?.length || 0) +
    (filters.projectCategories?.length || 0) +
    (filters.userTeam ? 1 : 0) +
    (filters.project ? 1 : 0) +
    (filters.status && filters.status !== 'all' ? 1 : 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Filters</h3>
          {activeFiltersCount > 0 && (
            <p className="text-sm text-slate-500">
              {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} active
            </p>
          )}
        </div>
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-xs"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Filters Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          
          {/* Status Filter */}
          <div className="border border-slate-200 rounded-lg">
            <button
              onClick={() => toggleSection('status')}
              className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">Status</span>
                {filters.status && filters.status !== 'all' && (
                  <Badge variant="secondary" className="h-5 text-[10px]">1</Badge>
                )}
              </div>
              {expandedSections.status ? (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {expandedSections.status && (
              <div className="p-3 pt-0 space-y-1">
                {statusOptions.map(option => (
                  <button
                    key={option.id}
                    onClick={() => handleStatusChange(option.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-2 rounded text-sm hover:bg-slate-50 transition-colors",
                      filters.status === option.id && "bg-indigo-50 text-indigo-700 font-medium"
                    )}
                  >
                    <span>{option.label}</span>
                    {option.count > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        {option.count}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* WO Categories Filter */}
          <div className="border border-slate-200 rounded-lg">
            <button
              onClick={() => toggleSection('categories')}
              className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">WO Categories</span>
                {filters.categories && filters.categories.length > 0 && (
                  <Badge variant="secondary" className="h-5 text-[10px]">
                    {filters.categories.length}
                  </Badge>
                )}
              </div>
              {expandedSections.categories ? (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {expandedSections.categories && (
              <div className="p-3 pt-0 space-y-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                  <Input
                    placeholder="Search categories..."
                    value={searchQueries.categories}
                    onChange={(e) => updateSearchQuery('categories', e.target.value)}
                    className="pl-7 h-8 text-xs"
                  />
                  {searchQueries.categories && (
                    <button
                      onClick={() => updateSearchQuery('categories', '')}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                    >
                      <X className="w-3 h-3 text-slate-400" />
                    </button>
                  )}
                </div>

                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {filteredCategories.map(cat => {
                    const isSelected = filters.categories?.includes(cat.id);
                    const count = categoryCounts[cat.id] || 0;
                    
                    return (
                      <button
                        key={cat.id}
                        onClick={() => handleCategoryToggle(cat.id)}
                        className={cn(
                          "w-full flex items-center justify-between p-2 rounded text-sm hover:bg-slate-50 transition-colors",
                          isSelected && "bg-indigo-50 text-indigo-700"
                        )}
                      >
                        <span className="truncate">{cat.name}</span>
                        {count > 0 && (
                          <Badge variant="outline" className="text-[10px] ml-2 flex-shrink-0">
                            {count}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                  
                  {filteredCategories.length === 0 && (
                    <div className="text-xs text-slate-500 text-center py-4">
                      No categories found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Project Categories Filter */}
          <div className="border border-slate-200 rounded-lg">
            <button
              onClick={() => toggleSection('projectCategories')}
              className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">Project Categories</span>
                {filters.projectCategories && filters.projectCategories.length > 0 && (
                  <Badge variant="secondary" className="h-5 text-[10px]">
                    {filters.projectCategories.length}
                  </Badge>
                )}
              </div>
              {expandedSections.projectCategories ? (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {expandedSections.projectCategories && (
              <div className="p-3 pt-0 space-y-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                  <Input
                    placeholder="Search project categories..."
                    value={searchQueries.projectCategories}
                    onChange={(e) => updateSearchQuery('projectCategories', e.target.value)}
                    className="pl-7 h-8 text-xs"
                  />
                  {searchQueries.projectCategories && (
                    <button
                      onClick={() => updateSearchQuery('projectCategories', '')}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                    >
                      <X className="w-3 h-3 text-slate-400" />
                    </button>
                  )}
                </div>

                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {filteredProjectCategories.map(cat => {
                    const isSelected = filters.projectCategories?.includes(cat.id);
                    const count = projectCategoryCounts[cat.id] || 0;
                    
                    return (
                      <button
                        key={cat.id}
                        onClick={() => handleProjectCategoryToggle(cat.id)}
                        className={cn(
                          "w-full flex items-center justify-between p-2 rounded text-sm hover:bg-slate-50 transition-colors",
                          isSelected && "bg-indigo-50 text-indigo-700"
                        )}
                      >
                        <span className="truncate">{cat.name}</span>
                        {count > 0 && (
                          <Badge variant="outline" className="text-[10px] ml-2 flex-shrink-0">
                            {count}
                          </Badge>
                        )}
                      </button>
                    );
                  })}

                  {filteredProjectCategories.length === 0 && (
                    <div className="text-xs text-slate-500 text-center py-4">
                      No project categories found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User/Team Filter */}
          <div className="border border-slate-200 rounded-lg">
            <button
              onClick={() => toggleSection('userTeam')}
              className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">Users & Teams</span>
                {filters.userTeam && (
                  <Badge variant="secondary" className="h-5 text-[10px]">1</Badge>
                )}
              </div>
              {expandedSections.userTeam ? (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {expandedSections.userTeam && (
              <div className="p-3 pt-0 space-y-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                  <Input
                    placeholder="Search users & teams..."
                    value={searchQueries.userTeam}
                    onChange={(e) => updateSearchQuery('userTeam', e.target.value)}
                    className="pl-7 h-8 text-xs"
                  />
                  {searchQueries.userTeam && (
                    <button
                      onClick={() => updateSearchQuery('userTeam', '')}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                    >
                      <X className="w-3 h-3 text-slate-400" />
                    </button>
                  )}
                </div>

                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {filteredUserTeamOptions.map(option => {
                    const isSelected = filters.userTeam === option.id;
                    
                    return (
                      <button
                        key={option.id}
                        onClick={() => handleUserTeamChange(option.id)}
                        className={cn(
                          "w-full flex items-center justify-between p-2 rounded text-sm hover:bg-slate-50 transition-colors",
                          isSelected && "bg-indigo-50 text-indigo-700"
                        )}
                      >
                        <span className="truncate">{option.label}</span>
                        <Badge variant="outline" className="text-[10px] ml-2 flex-shrink-0">
                          {option.count}
                        </Badge>
                      </button>
                    );
                  })}

                  {filteredUserTeamOptions.length === 0 && (
                    <div className="text-xs text-slate-500 text-center py-4">
                      No users or teams found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Project Filter */}
          <div className="border border-slate-200 rounded-lg">
            <button
              onClick={() => toggleSection('project')}
              className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">Projects</span>
                {filters.project && (
                  <Badge variant="secondary" className="h-5 text-[10px]">1</Badge>
                )}
              </div>
              {expandedSections.project ? (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {expandedSections.project && (
              <div className="p-3 pt-0 space-y-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                  <Input
                    placeholder="Search projects by all fields..."
                    value={searchQueries.project}
                    onChange={(e) => updateSearchQuery('project', e.target.value)}
                    className="pl-7 h-8 text-xs"
                  />
                  {searchQueries.project && (
                    <button
                      onClick={() => updateSearchQuery('project', '')}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                    >
                      <X className="w-3 h-3 text-slate-400" />
                    </button>
                  )}
                </div>

                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {filteredProjectOptions.map(project => {
                    const isSelected = filters.project === project.id;
                    
                    return (
                      <button
                        key={project.id}
                        onClick={() => handleProjectChange(project.id)}
                        className={cn(
                          "w-full flex items-center justify-between p-2 rounded text-sm hover:bg-slate-50 transition-colors text-left",
                          isSelected && "bg-indigo-50 text-indigo-700"
                        )}
                      >
                        <div className="truncate flex-1">
                          <div className="font-medium truncate">{project.name}</div>
                          {project.customerName && (
                            <div className="text-xs text-slate-500 truncate">{project.customerName}</div>
                          )}
                          {project.location_name && (
                            <div className="text-[10px] text-slate-400 truncate">{project.location_name}</div>
                          )}
                        </div>
                        <Badge variant="outline" className="text-[10px] ml-2 flex-shrink-0">
                          {project.count}
                        </Badge>
                      </button>
                    );
                  })}

                  {filteredProjectOptions.length === 0 && (
                    <div className="text-xs text-slate-500 text-center py-4">
                      No projects found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}
