import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Team, User, Department, OrganizationChartConfig } from '@/entities/all';
import { useData } from '../components/DataProvider';
import { useDebounce } from '../components/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Loader2, Users as UsersIcon, GripVertical, Settings, Search, Pencil, Download, Edit, RotateCcw, ZoomIn, ZoomOut, Maximize2, Move, User as UserIcon, Clock, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { assignUsersToCompany } from '@/functions/assignUsersToCompany';

import InviteUsersDialog from '../components/users/InviteUsersDialog';
import UsersSettingsPanel from '../components/users/UsersSettingsPanel';
import { toast } from 'sonner';
import UserDetailsPanel from '../components/users/UserDetailsPanel';
import { DragDropContext } from '@hello-pangea/dnd';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import DepartmentManager from '../components/users/DepartmentManager';
import DocumentMatrixTab from '../components/users/DocumentMatrixTab';

import UserTable from '../components/users/UserTable';
import OrganizationChart from '../components/users/OrganizationChart';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { TableSkeleton } from '../components/skeletons/PageSkeleton';

const workerTypes = ['Full-time', 'Part-time', 'Contractor', 'Intern', 'Temporary'];

export default function UsersPage() {
  const { teams, currentUser, loading: dataLoading, loadUsers, loadDepartments, loadBranches, users, currentCompany } = useData();
  const navigate = useNavigate();

  // Initialize localLoading based on whether we already have data in the cache
  const [localLoading, setLocalLoading] = useState(!users || users.length === 0);
  const [allUsers, setAllUsers] = useState(users || []);
  const [departments, setDepartments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewingUser, setViewingUser] = useState(null);
  const [deletingUsers, setDeletingUsers] = useState(new Set());
  const [updatingUsers, setUpdatingUsers] = useState(new Set());
  const [orderedTeams, setOrderedTeams] = useState([]);
  const [orderedActiveUsers, setOrderedActiveUsers] = useState([]);
  const [orderedArchivedUsers, setOrderedArchivedUsers] = useState([]);
  const [currentTab, setCurrentTab] = useState('users');
  const [userViewMode, setUserViewMode] = useState('active');
  const [sortBy, setSortBy] = useState('employee_number');
  const [keepAdminsOnTop, setKeepAdminsOnTop] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  // All columns enabled by default
  const allDefaultColumns = ['user', 'employee_number', 'job_role', 'department', 'team', 'worker_type', 'company'];
  
  const [visibleColumns, setVisibleColumns] = useState(() => {
    // Always return all columns - no localStorage override
    return allDefaultColumns;
  });

  const [showTeamDialog, setShowTeamDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [teamFormData, setTeamFormData] = useState({
    name: '',
    color: 'blue',
    avatar_code: '',
    sort_order: 0,
  });

  // Organization Chart states
  const [isEditMode, setIsEditMode] = useState(false);
  const [editType, setEditType] = useState('containers'); // 'containers' or 'users'
  const [viewMode, setViewMode] = useState('team'); // 'team' or 'department'
  const [viewSize, setViewSize] = useState('normal'); // 'compact', 'normal', 'large'
  const [orgStructure, setOrgStructure] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [showUnassigned, setShowUnassigned] = useState(true);
  const [selectedContainer, setSelectedContainer] = useState(null); // The ID of the group selected from the unassigned list
  const chartRef = useRef(null);
  const [gridCols, setGridCols] = useState(() => {
    try {
      const stored = localStorage.getItem('orgChart_gridCols');
      return stored ? parseInt(stored) : 6;
    } catch {
      return 6;
    }
  });
  const [gridRows, setGridRows] = useState(() => {
    try {
      const stored = localStorage.getItem('orgChart_gridRows');
      return stored ? parseInt(stored) : 5;
    } catch {
      return 5;
    }
  });
  const [showConfigHistory, setShowConfigHistory] = useState(false);
  const [configHistory, setConfigHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);



  // Cargar datos específicos de esta página - OPTIMIZADO
  useEffect(() => {
    const loadPageData = async () => {
      if (allUsers.length === 0) {
        setLocalLoading(true);
      }

      try {
        // ✅ FASE 1: Solo usuarios
        const usersData = await loadUsers();
        setAllUsers(usersData || []);
        setLocalLoading(false);
        
        // ✅ FASE 2: Background
        Promise.all([
          loadDepartments(),
          loadBranches()
        ]).then(([depsData, branchesData]) => {
          setDepartments(depsData || []);
          setCompanies(branchesData || []);
        }).catch(console.error);
        
      } catch (error) {
        console.error('[UsersPage] Failed to load data:', error);
        setLocalLoading(false);
      }
    };

    if (!dataLoading) {
      loadPageData();
    }
  }, [dataLoading, loadUsers, loadDepartments]);

  const availableColumns = useMemo(() => ([
    { id: 'user', label: 'User' },
    { id: 'employee_number', label: 'Employee #' },
    { id: 'job_role', label: 'Job Role' },
    { id: 'department', label: 'Department' },
    { id: 'team', label: 'Team' },
    { id: 'worker_type', label: 'Worker Type' },
    { id: 'company', label: 'Company' }
  ]), []);

  const activeUsers = useMemo(() => {
    return (allUsers || []).filter(user => !user.archived);
  }, [allUsers]);

  const archivedUsers = useMemo(() => {
    return (allUsers || []).filter(user => user.archived);
  }, [allUsers]);

  const adminLeader = useMemo(() => {
    const admins = (allUsers || []).filter(u => u.role === 'admin' && !u.archived);
    if (admins.length === 0) return null;
    return admins.reduce((oldest, current) => {
      const oldestDate = new Date(oldest.created_date);
      const currentDate = new Date(current.created_date);
      return currentDate < oldestDate ? current : oldest;
    });
  }, [allUsers]);

  const isAdminLeader = currentUser?.id === adminLeader?.id;

  const canDeleteAdmins = useMemo(() => {
    if (!currentUser) return false;
    if (isAdminLeader) return true;
    return currentUser.can_delete_admins === true;
  }, [currentUser, isAdminLeader]);

  useEffect(() => {
    if (teams && teams.length > 0) {
      setOrderedTeams([...teams].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
    } else if (teams && teams.length === 0) {
      setOrderedTeams([]);
    }
  }, [teams]);

  useEffect(() => {
    if (activeUsers && activeUsers.length > 0) {
      setOrderedActiveUsers([...activeUsers].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
    } else if (activeUsers && activeUsers.length === 0) {
      setOrderedActiveUsers([]);
    }
  }, [activeUsers]);

  useEffect(() => {
    if (archivedUsers && archivedUsers.length > 0) {
      setOrderedArchivedUsers([...archivedUsers].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
    } else if (archivedUsers && archivedUsers.length === 0) {
      setOrderedArchivedUsers([]);
    }
  }, [archivedUsers]);

  useEffect(() => {
    if (!dataLoading && !localLoading && currentUser && currentUser.role !== 'admin') {
      navigate(createPageUrl(`user-details?id=${currentUser.id}`), { replace: true });
    }
  }, [currentUser, dataLoading, localLoading, navigate]);
  
  const isAdmin = currentUser?.role === 'admin';



  const getDynamicFullName = (user) => {
    if (!user) return 'Unknown User';
    if (user.nickname && user.nickname.trim() !== '') {
      return user.nickname;
    }
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    return `${firstName} ${lastName}`.trim() || user.full_name || 'Unknown User';
  };

  const memberCounts = useMemo(() => {
    const counts = {};
    // ✅ Only count active (non-archived) users in teams
    (allUsers || []).forEach(user => {
      if (user.team_id && !user.archived) {
        counts[user.team_id] = (counts[user.team_id] || 0) + 1;
      }
    });
    return counts;
  }, [allUsers]);

  const getDepartmentColor = useCallback((deptName) => {
    if (!deptName) return 'bg-slate-100 text-slate-800';
    const dept = departments.find(d => d.name === deptName);
    if (!dept || !dept.color) return 'bg-slate-100 text-slate-800';
    
    const colorMap = {
      white: 'bg-white border-slate-300 text-slate-800',
      gray: 'bg-gray-100 text-gray-800',
      red: 'bg-red-100 text-red-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      green: 'bg-green-100 text-green-800',
      blue: 'bg-blue-100 text-blue-800',
      indigo: 'bg-indigo-100 text-indigo-800',
      purple: 'bg-purple-100 text-purple-800',
      pink: 'bg-pink-100 text-pink-800',
      orange: 'bg-orange-100 text-orange-800',
      teal: 'bg-teal-100 text-teal-800'
    };
    
    return colorMap[dept.color] || 'bg-slate-100 text-slate-800';
  }, [departments]);

  const getDepartmentRowBackgroundColor = useCallback((deptName) => {
    if (!deptName) return '';
    const dept = departments.find(d => d.name === deptName);
    if (!dept || !dept.color) return '';

    const rowColorMap = {
      white: 'bg-white',
      gray: 'bg-gray-50',
      red: 'bg-red-50',
      yellow: 'bg-yellow-50',
      green: 'bg-green-50',
      blue: 'bg-blue-50',
      indigo: 'bg-indigo-50',
      purple: 'bg-purple-50',
      pink: 'bg-pink-50',
      orange: 'bg-orange-50',
      teal: 'bg-teal-50'
    };

    return rowColorMap[dept.color] || '';
  }, [departments]);

  const handleDepartmentsChanged = useCallback(async () => {
    try {
      const data = await loadDepartments(true);
      setDepartments(data || []);
    } catch (error) {
      console.error('Failed to load departments:', error);
      toast.error('Failed to reload departments');
    }
  }, [loadDepartments]);

  const handleSettingsSuccess = useCallback(async (showToast = false) => {
    try {
      const [updatedUsers, updatedDepts] = await Promise.all([
        loadUsers(true),
        loadDepartments(true)
      ]);
      
      setAllUsers(updatedUsers || []);
      setDepartments(updatedDepts || []);
      if (showToast) {
        toast.success('Settings updated successfully');
      }
    } catch (error) {
      console.error('Failed to reload data after settings update:', error);
      toast.error('Failed to apply settings changes');
    }
  }, [loadUsers, loadDepartments]);

  const sortUsers = useCallback((usersList) => {
    let sorted = [...usersList];
    
    switch (sortBy) {
      case 'manual':
        sorted.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        break;
      case 'job_role':
        sorted.sort((a, b) => {
          const roleA = a.job_role || '';
          const roleB = b.job_role || '';
          return roleA.localeCompare(roleB);
        });
        break;
      case 'employee_number':
        sorted.sort((a, b) => {
          const numA = (a.employee_number || '').toString();
          const numB = (b.employee_number || '').toString();
          // Sort in descending order (higher numbers first)
          return numB.localeCompare(numA, undefined, { numeric: true, sensitivity: 'base' });
        });
        break;
      case 'department':
        sorted.sort((a, b) => {
          const deptA = a.department || 'ZZZ';
          const deptB = b.department || 'ZZZ';
          return deptA.localeCompare(deptB);
        });
        break;
      case 'name':
      default:
        sorted.sort((a, b) => {
          const nameA = getDynamicFullName(a);
          const nameB = getDynamicFullName(b);
          return nameA.localeCompare(nameB);
        });
    }

    if (keepAdminsOnTop) {
      sorted = [
        ...sorted.filter(u => u.role === 'admin'),
        ...sorted.filter(u => u.role !== 'admin')
      ];
    }

    return sorted;
  }, [sortBy, keepAdminsOnTop]);

  const sortedActiveUsers = useMemo(() => sortUsers(orderedActiveUsers), [orderedActiveUsers, sortBy, keepAdminsOnTop, sortUsers]);
  const sortedArchivedUsers = useMemo(() => sortUsers(orderedArchivedUsers), [orderedArchivedUsers, sortBy, keepAdminsOnTop, sortUsers]);

  const filteredActiveUsers = useMemo(() => {
    if (!debouncedSearchTerm) return sortedActiveUsers;
    const term = debouncedSearchTerm.toLowerCase();
    return sortedActiveUsers.filter(user => {
      const fullName = getDynamicFullName(user).toLowerCase();
      const email = (user.email || '').toLowerCase();
      const jobRole = (user.job_role || '').toLowerCase();
      const empNumber = (user.employee_number || '').toLowerCase();
      const department = (user.department || '').toLowerCase();
      const workerType = (user.worker_type || '').toLowerCase();
      return fullName.includes(term) || email.includes(term) || jobRole.includes(term) || empNumber.includes(term) || department.includes(term) || workerType.includes(term);
    });
  }, [sortedActiveUsers, debouncedSearchTerm]);

  const filteredArchivedUsers = useMemo(() => {
    if (!debouncedSearchTerm) return sortedArchivedUsers;
    const term = debouncedSearchTerm.toLowerCase();
    return sortedArchivedUsers.filter(user => {
      const fullName = getDynamicFullName(user).toLowerCase();
      const email = (user.email || '').toLowerCase();
      const jobRole = (user.job_role || '').toLowerCase();
      const empNumber = (user.employee_number || '').toLowerCase();
      const department = (user.department || '').toLowerCase();
      const workerType = (user.worker_type || '').toLowerCase();
      return fullName.includes(term) || email.includes(term) || jobRole.includes(term) || empNumber.includes(term) || department.includes(term) || workerType.includes(term);
    });
  }, [sortedArchivedUsers, debouncedSearchTerm]);

  // Organization Chart functions
  const buildOrgStructure = useCallback(() => {
    if (!allUsers || allUsers.length === 0) return { ceo: null, groups: {} };
    
    const activeUsersList = allUsers.filter(u => !u.archived && !u.is_ghost);
    
    let ceo = activeUsersList.find(u => u.role === 'admin' && u.job_role?.toLowerCase().includes('ceo'));
    if (!ceo) {
      ceo = activeUsersList.find(u => u.role === 'admin');
    }
    if (!ceo && activeUsersList.length > 0) {
      ceo = activeUsersList[0];
    }

    if (!ceo) return { ceo: null, groups: {} };

    const structure = {
      ceo: ceo,
      groups: {}
    };

    const otherUsers = activeUsersList.filter(u => u.id !== ceo.id);
    
    if (viewMode === 'team') {
      if (teams && Array.isArray(teams)) {
        teams.forEach((team) => {
          const teamUsers = otherUsers.filter(u => u.team_id === team.id);
          const teamLeader = teamUsers.find(u => u.is_team_leader);
          const members = teamUsers.filter(u => !u.is_team_leader);
          
          structure.groups[team.id] = {
            id: team.id,
            name: team.name,
            color: team.color,
            position_x: team.chart_position_x !== undefined && team.chart_position_x !== null ? team.chart_position_x : -1,
            position_y: team.chart_position_y !== undefined && team.chart_position_y !== null ? team.chart_position_y : -1,
            leader: teamLeader || null,
            members: members
          };
        });
      }
      
      const unassigned = otherUsers.filter(u => !u.team_id);
      if (unassigned.length > 0) {
        structure.groups['unassigned'] = {
          id: 'unassigned',
          name: 'Unassigned',
          color: 'gray',
          position_x: -1,
          position_y: -1,
          leader: null,
          members: unassigned
        };
      }
    } else { // viewMode === 'department'
      if (departments && Array.isArray(departments)) {
        departments.forEach((dept) => {
          const deptUsers = otherUsers.filter(u => u.department === dept.name);
          const deptLeader = deptUsers.find(u => u.role === 'admin'); // Assuming admin is department leader for now
          const members = deptUsers.filter(u => u.role !== 'admin');
          
          structure.groups[dept.id] = {
            id: dept.id,
            name: dept.name,
            color: dept.color,
            position_x: dept.chart_position_x !== undefined && dept.chart_position_x !== null ? dept.chart_position_x : -1,
            position_y: dept.chart_position_y !== undefined && dept.chart_position_y !== null ? dept.chart_position_y : -1,
            leader: deptLeader || null,
            members: members
          };
        });
      }
      
      const noDept = otherUsers.filter(u => !u.department);
      if (noDept.length > 0) {
        structure.groups['no-dept'] = {
          id: 'no-dept',
          name: 'No Department',
          color: 'gray',
          position_x: -1,
          position_y: -1,
          leader: null,
          members: noDept
        };
      }
    }

    return structure;
  }, [allUsers, teams, departments, viewMode]);

  useEffect(() => {
    if (allUsers && allUsers.length > 0) {
      const structure = buildOrgStructure();
      setOrgStructure(structure);
    }
  }, [allUsers, teams, departments, viewMode, buildOrgStructure]);

  useEffect(() => {
    localStorage.setItem('orgChart_gridCols', gridCols.toString());
    localStorage.setItem('orgChart_gridRows', gridRows.toString());
  }, [gridCols, gridRows]);

  const batchUpdateUsers = async (updates) => {
    const BATCH_SIZE = 5;
    const DELAY_MS = 200;
    
    const batches = [];
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      batches.push(updates.slice(i, i + BATCH_SIZE));
    }
    
    for (const batch of batches) {
      await Promise.all(
        batch.map(({ id, data }) => User.update(id, data))
      );
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }
  };

  const handleGridSizeChange = async (newCols, newRows) => {
    const cols = Math.max(3, Math.min(100, parseInt(newCols) || 3));
    const rows = Math.max(3, Math.min(100, parseInt(newRows) || 3));
    
    setGridCols(cols);
    setGridRows(rows);
    
    const newStructure = JSON.parse(JSON.stringify(orgStructure));
    
    const affectedGroups = Object.entries(orgStructure.groups || {}).filter(([_, g]) => {
      return g.position_x !== -1 && g.position_y !== -1 && 
             (g.position_x >= cols || g.position_y >= rows);
    });
    
    if (affectedGroups.length > 0) {
      try {
        setIsSaving(true);
        
        for (const [groupKey, group] of affectedGroups) {
          if (newStructure.groups[groupKey]) {
            newStructure.groups[groupKey].position_x = -1;
            newStructure.groups[groupKey].position_y = -1;
          }

          if (group.id !== 'unassigned' && group.id !== 'no-dept') {
            if (viewMode === 'team') {
              await Team.update(group.id, { 
                chart_position_x: -1,
                chart_position_y: -1
              });
            } else {
              await Department.update(group.id, { 
                chart_position_x: -1,
                chart_position_y: -1
              });
            }
          }
        }
        
        setOrgStructure(newStructure);
        await handleSettingsSuccess(); // Reload data from backend to ensure state consistency
        toast.success(`Grid resized to ${cols}×${rows}. ${affectedGroups.length} container(s) moved to unassigned area.`);
      } catch (error) {
        console.error('Error updating containers:', error);
        toast.error('Failed to update container positions');
        await handleSettingsSuccess();
      } finally {
        setIsSaving(false);
      }
    } else {
      toast.success(`Grid resized to ${cols}×${rows}`);
    }
  };

  const handleCellClick = async (col, row) => {
    if (!isEditMode || editType !== 'containers' || !selectedContainer) return;
    
    try {
      setIsSaving(true);
      
      const newStructure = JSON.parse(JSON.stringify(orgStructure));
      if (newStructure.groups[selectedContainer]) {
        newStructure.groups[selectedContainer].position_x = col;
        newStructure.groups[selectedContainer].position_y = row;
        
        setOrgStructure(newStructure);
        setSelectedContainer(null);
        toast.success('Container positioned locally. Click "Save Config" to save permanently.');
      }
    } catch (error) {
      console.error('Error moving container:', error);
      toast.error('Failed to move container');
      await handleSettingsSuccess();
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ UNIFIED DRAG END HANDLER
  const handleUnifiedDragEnd = async (result) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index && result.source.droppableId === result.destination.droppableId) return;

    const sourceId = result.source.droppableId;
    
    // Route to appropriate handler based on droppableId pattern
    if (sourceId.startsWith('users-')) {
      // User table drag
      const isArchived = sourceId === 'users-archived';
      await handleUserTableDragEnd(result, isArchived);
    } else if (sourceId.startsWith('group-')) {
      // Organization chart drag
      await handleOrgChartDragEnd(result);
    }
  };

  const handleUserTableDragEnd = async (result, isArchived = false) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return; // Dropped in the same position within the same list

    setSortBy('manual'); // Sorting by manual when reordering.

    const usersList = isArchived ? orderedArchivedUsers : orderedActiveUsers;
    const setUsersList = isArchived ? setOrderedArchivedUsers : setOrderedActiveUsers;

    const items = Array.from(usersList);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const itemsWithNewOrder = items.map((item, index) => ({
      ...item,
      sort_order: index
    }));

    setUsersList(itemsWithNewOrder);

    try {
      const updates = [];
      
      for (let i = 0; i < itemsWithNewOrder.length; i++) {
        // Only update if the sort_order actually changed to avoid unnecessary DB writes
        if (itemsWithNewOrder[i].sort_order !== usersList.find(u => u.id === itemsWithNewOrder[i].id)?.sort_order) {
            updates.push({ id: itemsWithNewOrder[i].id, data: { sort_order: itemsWithNewOrder[i].sort_order } });
        }
      }

      if (updates.length > 0) {
        await batchUpdateUsers(updates);
        toast.success('Users reordered successfully');
      }
    } catch (error) {
      
      toast.error('Failed to reorder users');
      setUsersList(usersList); // Revert to original order on error
    }
  };

  const handleOrgChartDragEnd = async (result) => {
    if (!isEditMode || editType !== 'users') return;
    
    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    
    const userId = draggableId.replace('user-', '');
    const sourceGroupKey = source.droppableId.replace('group-', '');
    const targetGroupKey = destination.droppableId.replace('group-', '');
    
    if (sourceGroupKey === targetGroupKey) return; // Only interested in moving between groups
    
    try {
      setIsSaving(true);
      
      const newStructure = JSON.parse(JSON.stringify(orgStructure));
      const sourceGroup = newStructure.groups[sourceGroupKey];
      const targetGroup = newStructure.groups[targetGroupKey];
      
      if (!sourceGroup || !targetGroup) return;
      
      let movedUser = null;
      // Check if user is a leader in source group
      if (sourceGroup.leader && sourceGroup.leader.id === userId) {
        movedUser = { ...sourceGroup.leader };
        sourceGroup.leader = null; // Remove leader from source group
      } else {
        // Find user in members array of source group
        const userIndex = sourceGroup.members.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
          movedUser = { ...sourceGroup.members[userIndex] };
          sourceGroup.members.splice(userIndex, 1); // Remove from members list
        }
      }
      
      if (!movedUser) return; // User not found in source group
      
      // Add user to target group members (reset leader status)
      movedUser.is_team_leader = false; 
      targetGroup.members.push(movedUser);
      
      setOrgStructure(newStructure); // Update local state immediately for visual feedback
      
      // Update user in the backend
      if (viewMode === 'team') {
        const newTeamId = targetGroupKey === 'unassigned' ? null : targetGroupKey;
        await User.update(userId, { 
          team_id: newTeamId,
          is_team_leader: false // Ensure user is not leader in new team by default
        });
        toast.success('User moved to new team');
      } else { // viewMode === 'department'
        const newDepartment = targetGroupKey === 'no-dept' ? null : targetGroup.name;
        await User.update(userId, { 
          department: newDepartment
        });
        toast.success('User moved to new department');
      }
      
    } catch (error) {
      console.error('Error moving user:', error);
      toast.error('Failed to move user');
      await handleSettingsSuccess(); // Reload all data to ensure consistency
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetLeader = async (userId, groupKey) => {
    if (!isEditMode) return; // Removed viewMode !== 'team' from here as per outline

    try {
      setIsSaving(true);
      
      if (viewMode === 'team') { // Now check viewMode here
        const newStructure = JSON.parse(JSON.stringify(orgStructure));
        const group = newStructure.groups[groupKey];
        
        if (!group) return;
        
        // This button is only shown if the user IS NOT already a leader, as per UserCard 'canSetAsLeader'
        // So, this will always be a promotion action.
        
        const userIndexInMembers = group.members.findIndex(u => u.id === userId);
        if (userIndexInMembers === -1) {
            toast.error('User not found in this group to promote.');
            return;
        }

        const userToPromote = { ...group.members[userIndexInMembers] };
        group.members.splice(userIndexInMembers, 1); // Remove from members

        // Demote existing leader if any
        if (group.leader) {
            const previousLeader = { ...group.leader, is_team_leader: false };
            group.members.push(previousLeader);
            await User.update(previousLeader.id, { is_team_leader: false });
        }

        // Promote new leader
        const newLeader = { ...userToPromote, is_team_leader: true };
        group.leader = newLeader;
        
        setOrgStructure(newStructure);
        await User.update(userId, { is_team_leader: true });
        
        toast.success('Team leader updated');
      }
      
    } catch (error) {
      console.error('Error setting leader:', error);
      toast.error('Failed to set leader');
      await handleSettingsSuccess();
    } finally {
      setIsSaving(false);
    }
  };

  const downloadAsImage = () => {
    window.print();
    toast.success('Print dialog opened');
  };

  const resetStructure = async () => {
    const confirmReset = window.confirm('Are you sure you want to reset the organization chart layout? All manual positions will be cleared.');
    if (!confirmReset) return;

    try {
      setIsSaving(true);
      
      // Reset positions for all teams/departments
      if (viewMode === 'team' && teams) {
        for (const team of teams) {
          await Team.update(team.id, { 
            chart_position_x: -1,
            chart_position_y: -1
          });
        }
      } else if (viewMode === 'department' && departments) {
        for (const dept of departments) {
          await Department.update(dept.id, { 
            chart_position_x: -1,
            chart_position_y: -1
          });
        }
      }
      
      await handleSettingsSuccess(); // Reload data to reflect changes
      toast.success('Organization chart reset successfully');
      
    } catch (error) {
      console.error('Error resetting chart:', error);
      toast.error('Failed to reset chart');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveConfiguration = async () => {
    try {
      setIsSaving(true);
      
      const positionedGroups = Object.entries(orgStructure.groups || {}).filter(([_, g]) => 
        g.position_x !== -1 && g.position_y !== -1 && g.id !== 'unassigned' && g.id !== 'no-dept'
      );
      
      // Update existing team/department entities with current chart positions
      for (const [, group] of positionedGroups) {
        if (viewMode === 'team') {
          await Team.update(group.id, {
            chart_position_x: group.position_x,
            chart_position_y: group.position_y
          });
        } else { // viewMode === 'department'
          await Department.update(group.id, {
            chart_position_x: group.position_x,
            chart_position_y: group.position_y
          });
        }
      }
      
      // Create a new history record
      const positionsData = positionedGroups.map(([groupKey, group]) => ({
        group_id: group.id,
        group_name: group.name,
        position_x: group.position_x,
        position_y: group.position_y
      }));
      
      await OrganizationChartConfig.create({
        config_name: `Config ${new Date().toLocaleString()}`,
        view_mode: viewMode,
        grid_cols: gridCols,
        grid_rows: gridRows,
        positions: positionsData,
        is_active: true, // Mark this as the active configuration
        saved_at: new Date().toISOString()
      });
      
      toast.success('Chart configuration saved successfully!');
      await handleSettingsSuccess(); // Reload data to get latest config and positions
      if (showConfigHistory) {
        await loadConfigHistory();
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const loadConfigHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const configs = await OrganizationChartConfig.filter({ view_mode: viewMode }, '-created_date');
      setConfigHistory(configs || []);
    } catch (error) {
      console.error('Failed to load config history:', error);
      toast.error('Failed to load configuration history');
    } finally {
      setLoadingHistory(false);
    }
  }, [viewMode]);

  useEffect(() => {
    if (showConfigHistory && currentTab === 'organization') {
      loadConfigHistory();
    }
  }, [showConfigHistory, currentTab, loadConfigHistory]);

  const handleRestoreConfig = async (config) => {
    const confirmRestore = window.confirm(`Restore configuration "${config.config_name}" from ${new Date(config.saved_at).toLocaleString()}? This will overwrite the current layout.`);
    if (!confirmRestore) return;

    try {
      setIsSaving(true);
      
      // First, clear all existing chart positions for relevant entities
      if (viewMode === 'team' && teams) {
        for (const team of teams) {
          await Team.update(team.id, { 
            chart_position_x: -1,
            chart_position_y: -1
          });
        }
      } else if (viewMode === 'department' && departments) {
        for (const dept of departments) {
          await Department.update(dept.id, { 
            chart_position_x: -1,
            chart_position_y: -1
          });
        }
      }
      
      // Then, apply positions from the selected configuration
      for (const pos of config.positions) {
        if (viewMode === 'team') {
          await Team.update(pos.group_id, {
            chart_position_x: pos.position_x,
            chart_position_y: pos.position_y
          });
        } else { // viewMode === 'department'
          await Department.update(pos.group_id, {
            chart_position_x: pos.position_x,
            chart_position_y: pos.position_y
          });
        }
      }
      
      // Apply grid size from the configuration
      if (config.grid_cols && config.grid_rows) {
        setGridCols(config.grid_cols);
        setGridRows(config.grid_rows);
      }
      
      await handleSettingsSuccess(); // Reload all data
      toast.success('Configuration restored successfully!');
      setShowConfigHistory(false);
    } catch (error) {
      console.error('Error restoring configuration:', error);
      toast.error('Failed to restore configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfig = async (configId) => {
    const confirmDelete = window.confirm('Permanently delete this configuration version? This action cannot be undone.');
    if (!confirmDelete) return;

    try {
      await OrganizationChartConfig.delete(configId);
      toast.success('Configuration deleted');
      await loadConfigHistory(); // Reload history after deletion
    } catch (error) {
      console.error('Error deleting configuration:', error);
      toast.error('Failed to delete configuration');
    }
  };

  const handleSaveTeam = async () => {
    if (!teamFormData.name.trim()) {
      toast.error('Team name cannot be empty.');
      return;
    }

    setIsProcessing(true);
    try {
      if (editingTeam) {
        await Team.update(editingTeam.id, teamFormData);
        toast.success('Team updated successfully.');
      } else {
        const maxSortOrder = orderedTeams.length > 0 ? Math.max(...orderedTeams.map(t => t.sort_order || 0)) : -1;
        await Team.create({ ...teamFormData, sort_order: maxSortOrder + 1 });
        toast.success('Team created successfully.');
      }
      setShowTeamDialog(false);
      setEditingTeam(null);
      setTeamFormData({ name: '', color: 'blue', avatar_code: '', sort_order: 0 }); // Reset form
      await handleSettingsSuccess(); // Refresh all data including teams
    } catch (error) {
      console.error('Error saving team:', error);
      toast.error('Failed to save team.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteTeam = async (teamId) => {
    const team = orderedTeams.find(t => t.id === teamId);
    if (!team) return;

    const confirmDelete = window.confirm(`⚠️ Permanently delete team "${team.name}"? This cannot be undone.`);
    if (!confirmDelete) return;

    setIsProcessing(true);
    try {
      await Team.delete(teamId);
      toast.success(`Team "${team.name}" deleted successfully.`);
      await handleSettingsSuccess(); // Refresh all data including teams
    } catch (error) {
      console.error('Error deleting team:', error);
      toast.error('Failed to delete team.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateUser = async (id, field, value) => {
    setUpdatingUsers(prev => new Set(prev).add(id));
    
    // Convert empty string or "null" string to actual null for database storage
    const valueToStore = (value === '' || value === 'null') ? null : value;

    const updateUser = (user) => user.id === id ? { ...user, [field]: valueToStore } : user;
    
    setOrderedActiveUsers(prev => prev.map(updateUser));
    setOrderedArchivedUsers(prev => prev.map(updateUser));
    
    try {
      await User.update(id, { [field]: valueToStore });
      // Only reload if changing team or department (affects org chart)
      if (field === 'team_id' || field === 'department') {
        await handleSettingsSuccess(false); 
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
      await handleSettingsSuccess(false);
    } finally {
      setUpdatingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleAssignUnassigned = async () => {
    const confirmAssign = window.confirm("Assign all unassigned users to 'Redcrane'? This process may take a few seconds.");
    if (!confirmAssign) return;

    try {
      setIsProcessing(true);
      const response = await assignUsersToCompany({});
      
      if (response.data && (response.data.success || response.data.message)) {
        toast.success(response.data.message || 'Users assigned successfully');
        await handleSettingsSuccess(); // Reloads users and depts
      } else {
        toast.error('Failed to assign users');
      }
    } catch (error) {
      console.error('Error assigning users:', error);
      toast.error('Error assigning users');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInviteSuccess = async () => {
    await handleSettingsSuccess();
  };

  const handleSelectUser = (userId, isSelected) => {
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

  const handleSelectAllUsers = (usersList, isSelected) => {
    if (isSelected) {
      const selectableUsers = usersList.filter(user => {
        if (user.id === currentUser?.id && !user.archived) return false;
        if (user.is_ghost) return false;
        return isAdmin; // Only admins can select users
      });
      const allIds = new Set(selectableUsers.map(u => u.id));
      setSelectedUsers(allIds);
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleArchiveUsers = async () => {
    if (selectedUsers.size === 0) return;

    if (selectedUsers.has(currentUser?.id)) {
      toast.error('You cannot archive yourself as an admin.');
      return;
    }

    const confirmArchive = window.confirm(`Archive ${selectedUsers.size} user${selectedUsers.size > 1 ? 's' : ''}?`);
    if (!confirmArchive) return;

    setIsProcessing(true);
    try {
      const userIdsToArchive = Array.from(selectedUsers);
      const usersToMove = allUsers.filter(u => userIdsToArchive.includes(u.id));
      const archivedDate = new Date().toISOString();

      setOrderedActiveUsers(prev => prev.filter(u => !userIdsToArchive.includes(u.id)));
      setOrderedArchivedUsers(prev => {
        const newArchived = [
          ...prev,
          ...usersToMove.map(u => ({ ...u, archived: true, archived_date: archivedDate }))
        ];
        return newArchived.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      });
      
      for (const userId of userIdsToArchive) {
        await User.update(userId, { archived: true, archived_date: archivedDate });
      }
      
      toast.success(`Successfully archived ${userIdsToArchive.length} user${userIdsToArchive.length > 1 ? 's' : ''}`);
      setSelectedUsers(new Set());
      await handleSettingsSuccess(); // Reload all user data to ensure consistency
    } catch (error) {
      console.error('Error archiving users:', error);
      toast.error('Failed to archive users');
      await handleSettingsSuccess(); // Reload all user data to ensure consistency
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestoreUsers = async () => {
    if (selectedUsers.size === 0) return;

    setIsProcessing(true);
    try {
      const userIdsToRestore = Array.from(selectedUsers);
      const usersToMove = allUsers.filter(u => userIdsToRestore.includes(u.id) && !u.is_ghost);
      
      if (usersToMove.length === 0) {
        toast.error('No users available to restore.');
        setIsProcessing(false);
        return;
      }

      setOrderedArchivedUsers(prev => prev.filter(u => !userIdsToRestore.includes(u.id)));
      setOrderedActiveUsers(prev => {
        const newActive = [
          ...prev,
          ...usersToMove.map(u => ({ ...u, archived: false }))
        ];
        return newActive.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      });
      
      for (const user of usersToMove) {
        await User.update(user.id, { archived: false });
      }
      
      toast.success(`Successfully restored ${usersToMove.length} user${usersToMove.length > 1 ? 's' : ''}`);
      setSelectedUsers(new Set());
      await handleSettingsSuccess(); // Reload all user data to ensure consistency
    } catch (error) {
      console.error('Error restoring users:', error);
      toast.error('Failed to restore users');
      await handleSettingsSuccess(); // Reload all user data to ensure consistency
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteUsers = async () => {
    if (selectedUsers.size === 0) return;

    if (selectedUsers.has(currentUser?.id)) {
      toast.error('You cannot delete yourself as an admin.');
      return;
    }

    const usersToDelete = Array.from(selectedUsers).map(id => allUsers.find(u => u.id === id)).filter(Boolean);

    for (const user of usersToDelete) {
      if (user.role === 'admin') {
        if (!canDeleteAdmins) {
          toast.error(`You do not have permission to delete admin user: ${getDynamicFullName(user)}`);
          return;
        }
        if (user.id === adminLeader?.id) {
          toast.error('Cannot delete the Admin Leader.');
          return;
        }
      }
    }

    const confirmDelete = window.confirm(`⚠️ Permanently delete ${selectedUsers.size} user${selectedUsers.size > 1 ? 's' : ''}? This cannot be undone.`);
    if (!confirmDelete) return;

    setIsProcessing(true);
    try {
      const userIds = Array.from(selectedUsers);
      let deletedCount = 0;
      for (const userId of userIds) {
        try {
          await User.delete(userId);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete user ${userId}:`, error);
          toast.error(`Failed to delete user: ${getDynamicFullName(allUsers.find(u => u.id === userId))}`);
        }
      }
      if (deletedCount > 0) {
        toast.success(`Successfully deleted ${deletedCount} user${deletedCount > 0 ? 's' : ''}`);
      }
      setSelectedUsers(new Set());
      await handleSettingsSuccess(); // Reload all user data to ensure consistency
    } catch (error) {
      console.error('Error deleting users:', error);
      toast.error('Failed to delete users');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSingleUser = async (userToDelete) => {
    if (userToDelete.id === currentUser?.id) {
      toast.error('You cannot delete yourself.');
      return;
    }

    if (userToDelete.role === 'admin') {
      if (!canDeleteAdmins) {
        toast.error('You do not have permission to delete admin users.');
        return;
      }
      if (userToDelete.id === adminLeader?.id) {
        toast.error('Cannot delete the Admin Leader.');
        return;
      }
    }

    const confirmDelete = window.confirm(`⚠️ Permanently delete user "${getDynamicFullName(userToDelete)}"? This cannot be undone.`);
    if (!confirmDelete) return;

    setDeletingUsers(prev => new Set(prev).add(userToDelete.id));
    try {
      await User.delete(userToDelete.id);
      toast.success(`User deleted successfully.`);
      await handleSettingsSuccess(); // Reload all user data to ensure consistency
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error('Failed to delete user.');
    } finally {
      setDeletingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userToDelete.id);
        return newSet;
      });
    }
  };

  const handleUserClick = (userId) => {
    const user = allUsers.find(u => u.id === userId);
    if (user) {
      setViewingUser(user);
    }
  };

  const handleColumnToggle = (columnId) => {
    if (columnId === 'user') return; 

    const newColumns = visibleColumns.includes(columnId)
      ? visibleColumns.filter(id => id !== columnId)
      : [...visibleColumns, columnId];
    
    const finalColumns = [...new Set(['user', ...newColumns])];
    
    setVisibleColumns(finalColumns);
    localStorage.setItem('usersVisibleColumns', JSON.stringify(finalColumns));
  };

  if (dataLoading || localLoading) { 
    return (
      <div className="p-4 md:p-6 space-y-6">
        <TableSkeleton rows={12} columns={7} />
      </div>
    );
  }

  // Render the UserTable with all required props
  const renderUserTable = (users, isArchived = false) => (
    <UserTable
      users={users}
      isArchived={isArchived}
      isAdmin={isAdmin}
      sortBy={sortBy}
      currentUser={currentUser}
      selectedUsers={selectedUsers}
      setSelectedUsers={setSelectedUsers}
      visibleColumns={visibleColumns}
      orderedTeams={orderedTeams}
      departments={departments}
      companies={companies}
      allUsers={allUsers}
      adminLeader={adminLeader}
      updatingUsers={updatingUsers}
      getDynamicFullName={getDynamicFullName}
      getDepartmentColor={getDepartmentColor}
      getDepartmentRowBackgroundColor={getDepartmentRowBackgroundColor}
      handleUserClick={handleUserClick}
      handleUpdateUser={handleUpdateUser}
      handleArchiveUsers={handleArchiveUsers}
      handleRestoreUsers={handleRestoreUsers}
      handleDeleteUsers={handleDeleteUsers}
      isProcessing={isProcessing}
      workerTypes={workerTypes}
    />
  );

  return (
    <DragDropContext onDragEnd={handleUnifiedDragEnd}>
      <div className="p-4 md:p-6 space-y-6">
        {/* Top Card - Header */}
        <Card className="p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentCompany?.users_tab_icon_url ? (
                <img src={currentCompany.users_tab_icon_url} alt="Users" className="w-10 h-10 object-contain" />
              ) : (
                <div className="p-2 bg-rose-100 rounded-lg">
                  <UsersIcon className="w-5 h-5 text-rose-600" />
                </div>
              )}
              <h1 className="text-xl font-bold text-slate-900 header-express">Users & Teams</h1>
            </div>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setShowSettingsDialog(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            )}
          </div>
        </Card>

        {/* Bottom Card - Main Content */}
        <div className="w-full bg-white rounded-xl shadow-lg border border-slate-200">
          <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
              <TabsTrigger 
                value="users" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent"
              >
                Users
              </TabsTrigger>
              <TabsTrigger 
                value="documents"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent"
              >
                Document Matrix
              </TabsTrigger>
              <TabsTrigger 
                value="organization"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent"
              >
                Organization Chart
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="m-0 p-0">
              <Tabs value={userViewMode} onValueChange={setUserViewMode} className="w-full">
                <div className="px-6 pt-6 pb-2 bg-white border-b border-slate-100">
                  <TabsList className="w-auto justify-start bg-slate-100 p-1 rounded-lg">
                    <TabsTrigger value="active" className="rounded-md px-3 py-1.5 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">Active Users ({filteredActiveUsers.length})</TabsTrigger>
                    <TabsTrigger value="archived" className="rounded-md px-3 py-1.5 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">Archived ({filteredArchivedUsers.length})</TabsTrigger>
                    <TabsTrigger value="teams" className="rounded-md px-3 py-1.5 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">Teams ({orderedTeams.length})</TabsTrigger>
                    <TabsTrigger value="departments" className="rounded-md px-3 py-1.5 text-xs font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">Departments ({departments.length})</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="active" className="m-0 p-4 space-y-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex-1 min-w-[200px] relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Search users by name, email, job role, employee #, department, or worker type..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-9"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2 ml-auto">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Settings className="w-4 h-4 mr-2" />
                            Columns
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {availableColumns.map(col => (
                            <DropdownMenuItem
                              key={col.id}
                              onSelect={(e) => e.preventDefault()}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Checkbox
                                id={`col-toggle-${col.id}`}
                                checked={visibleColumns.includes(col.id)}
                                onCheckedChange={() => handleColumnToggle(col.id)}
                                disabled={col.id === 'user'}
                              />
                              <label htmlFor={`col-toggle-${col.id}`} className="flex-1 cursor-pointer">{col.label}</label>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {isAdmin && (
                        <Button onClick={() => setShowInviteDialog(true)} size="sm" className="bg-green-600 hover:bg-green-700">
                          <Plus className="w-4 h-4 mr-2" />
                          New User
                        </Button>
                      )}
                    </div>
                  </div>

                  {departments.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap pb-3 border-b border-slate-200">
                      <span className="text-xs text-slate-500 font-medium">Departments:</span>
                      {departments.map(dept => {
                        const colorClasses = getDepartmentColor(dept.name);
                        return (
                          <div 
                            key={dept.id} 
                            className={`px-2 py-1 rounded text-xs font-medium ${colorClasses}`}
                          >
                            {dept.name}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600">Sort by:</span>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-48 h-9">
                          <SelectValue>
                            {sortBy === 'manual' && (
                              <div className="flex items-center gap-2">
                                <GripVertical className="w-3 h-3" />
                                Drag and Drop
                              </div>
                            )}
                            {sortBy === 'name' && 'User Name'}
                            {sortBy === 'job_role' && 'Job Role'}
                            {sortBy === 'employee_number' && 'Employee Number'}
                            {sortBy === 'department' && 'Department'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">
                            <div className="flex items-center gap-2">
                              <GripVertical className="w-3 h-3" />
                              Drag and Drop
                            </div>
                          </SelectItem>
                          <SelectItem value="name">User Name</SelectItem>
                          <SelectItem value="job_role">Job Role</SelectItem>
                          <SelectItem value="employee_number">Employee Number</SelectItem>
                          <SelectItem value="department">Department</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="keep-admins-top"
                        checked={keepAdminsOnTop}
                        onCheckedChange={setKeepAdminsOnTop}
                        className="h-4 w-4"
                      />
                      <label 
                        htmlFor="keep-admins-top" 
                        className="text-xs text-slate-600 cursor-pointer select-none"
                      >
                        Keep admins on top
                      </label>
                    </div>

                    {sortBy !== 'manual' && (
                      <div className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                        ⚠️ Drag & drop disabled while sorted
                      </div>
                    )}
                  </div>


                  {renderUserTable(filteredActiveUsers)}
                </TabsContent>

                <TabsContent value="archived" className="m-0 p-4 space-y-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex-1 min-w-[200px] relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Search archived users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-9"
                      />
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4 mr-2" />
                          Columns
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {availableColumns.map(col => (
                          <DropdownMenuItem
                            key={col.id}
                            onSelect={(e) => e.preventDefault()}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Checkbox
                              id={`col-toggle-archived-${col.id}`}
                              checked={visibleColumns.includes(col.id)}
                              onCheckedChange={() => handleColumnToggle(col.id)}
                              disabled={col.id === 'user'}
                            />
                            <label htmlFor={`col-toggle-archived-${col.id}`} className="flex-1 cursor-pointer">{col.label}</label>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600">Sort by:</span>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-48 h-9">
                          <SelectValue>
                            {sortBy === 'manual' && (
                              <div className="flex items-center gap-2">
                                <GripVertical className="w-3 h-3" />
                                Drag and Drop
                              </div>
                            )}
                            {sortBy === 'name' && 'User Name'}
                            {sortBy === 'job_role' && 'Job Role'}
                            {sortBy === 'employee_number' && 'Employee Number'}
                            {sortBy === 'department' && 'Department'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">
                            <div className="flex items-center gap-2">
                              <GripVertical className="w-3 h-3" />
                              Drag and Drop
                            </div>
                          </SelectItem>
                          <SelectItem value="name">User Name</SelectItem>
                          <SelectItem value="job_role">Job Role</SelectItem>
                          <SelectItem value="employee_number">Employee Number</SelectItem>
                          <SelectItem value="department">Department</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="keep-admins-top-archived"
                        checked={keepAdminsOnTop}
                        onCheckedChange={setKeepAdminsOnTop}
                        className="h-4 w-4"
                      />
                      <label 
                        htmlFor="keep-admins-top-archived" 
                        className="text-xs text-slate-600 cursor-pointer select-none"
                      >
                        Keep admins on top
                      </label>
                    </div>

                    {sortBy !== 'manual' && (
                      <div className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                        ⚠️ Drag & drop disabled while sorted
                      </div>
                    )}
                  </div>


                  {renderUserTable(filteredArchivedUsers, true)}
                </TabsContent>

                <TabsContent value="teams" className="m-0 p-6">
                  <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold">Teams</h2>
                      <Button 
                        onClick={() => {
                          setEditingTeam(null);
                          setTeamFormData({ name: '', color: 'blue', avatar_code: '', sort_order: orderedTeams.length });
                          setShowTeamDialog(true);
                        }}
                        className="gap-2"
                        disabled={!isAdmin}
                      >
                        <Plus className="w-4 h-4" />
                        New Team
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {orderedTeams.map((team) => (
                        <div
                          key={team.id}
                          className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0",
                            {
                              'bg-gray-600': team.color === 'gray',
                              'bg-red-600': team.color === 'red',
                              'bg-yellow-600': team.color === 'yellow',
                              'bg-green-600': team.color === 'green',
                              'bg-blue-600': team.color === 'blue',
                              'bg-indigo-600': team.color === 'indigo',
                              'bg-purple-600': team.color === 'purple',
                              'bg-pink-600': team.color === 'pink'
                            }
                          )}>
                            {team.avatar_code || team.name.substring(0, 2).toUpperCase()}
                          </div>

                          <div className="flex-1">
                            <div className="font-medium">{team.name}</div>
                            {team.avatar_code && (
                              <div className="text-xs text-slate-500">Code: {team.avatar_code}</div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {memberCounts[team.id] || 0} members
                            </Badge>
                            {isAdmin && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingTeam(team);
                                    setTeamFormData({
                                      name: team.name,
                                      color: team.color || 'blue',
                                      avatar_code: team.avatar_code || '',
                                      sort_order: team.sort_order || 0
                                    });
                                    setShowTeamDialog(true);
                                  }}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteTeam(team.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {showTeamDialog && (
                      <Dialog open={showTeamDialog} onOpenChange={setShowTeamDialog}>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>
                              {editingTeam ? 'Edit Team' : 'New Team'}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="text-xs font-medium">Team Name</label>
                              <Input
                                value={teamFormData.name}
                                onChange={(e) => setTeamFormData({...teamFormData, name: e.target.value})}
                                placeholder="e.g., Service Team 1"
                              />
                            </div>

                            <div>
                              <label className="text-xs font-medium">Avatar Code</label>
                              <Input
                                value={teamFormData.avatar_code}
                                onChange={(e) => setTeamFormData({...teamFormData, avatar_code: e.target.value.toUpperCase().slice(0, 3)})}
                                placeholder="e.g., S1, OP, MNT"
                                maxLength={3}
                              />
                              <p className="text-xs text-slate-500 mt-1">
                                Short code (max 3 characters) displayed in work orders
                              </p>
                            </div>

                            <div>
                              <label className="text-xs font-medium">Color</label>
                              <div className="grid grid-cols-4 gap-2 mt-2">
                                {['gray', 'red', 'yellow', 'green', 'blue', 'indigo', 'purple', 'pink'].map(color => (
                                  <button
                                    key={color}
                                    onClick={() => setTeamFormData({...teamFormData, color})}
                                    className={cn(
                                      "h-10 rounded-lg border-2 transition-all",
                                      teamFormData.color === color ? "border-slate-900 scale-105" : "border-slate-200",
                                      {
                                        'bg-gray-500': color === 'gray',
                                        'bg-red-500': color === 'red',
                                        'bg-yellow-500': color === 'yellow',
                                        'bg-green-500': color === 'green',
                                        'bg-blue-500': color === 'blue',
                                        'bg-indigo-500': color === 'indigo',
                                        'bg-purple-500': color === 'purple',
                                        'bg-pink-500': color === 'pink'
                                      }
                                    )}
                                  />
                                ))}
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                              <Button variant="outline" onClick={() => setShowTeamDialog(false)}>
                                Cancel
                              </Button>
                              <Button onClick={handleSaveTeam} disabled={isProcessing}>
                                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                {editingTeam ? 'Update' : 'Create'}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="departments" className="m-0 p-6">
                  <DepartmentManager 
                    onDepartmentsChanged={handleDepartmentsChanged}
                    key={currentTab} 
                  />
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* New Organization Chart Tab */}
            <TabsContent value="documents" className="m-0 p-6">
              <DocumentMatrixTab 
                users={allUsers} 
                currentUser={currentUser}
                isAdmin={isAdmin} 
              />
            </TabsContent>

            <TabsContent value="organization" className="m-0 p-6 space-y-6">
              {currentUser?.role !== 'admin' ? (
                <div className="flex flex-col items-center justify-center h-96 text-slate-500">
                  <UsersIcon className="w-12 h-12 mb-4 text-slate-400" />
                  <h2 className="text-xl font-semibold">Access Restricted</h2>
                  <p className="mt-2">Only administrators can view the organization chart.</p>
                </div>
              ) : (
                <>
                  {/* Organization Chart Controls */}
                  <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">Organization Chart</h2>
                        <p className="text-xs text-slate-600 mt-1">
                          {allUsers ? allUsers.filter(u => !u.archived && !u.is_ghost).length : 0} active members • {Object.keys(orgStructure.groups || {}).length} groups
                        </p>
                      </div>
                      
                      <div className="flex gap-2 flex-wrap items-center">
                        <Select value={viewMode} onValueChange={setViewMode}>
                          <SelectTrigger className="w-40 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="team">By Team</SelectItem>
                            <SelectItem value="department">By Department</SelectItem>
                          </SelectContent>
                        </Select>

                        {isEditMode && (
                          <>
                            <div className="flex items-center gap-2 border rounded-md px-3 py-1 bg-slate-50">
                              <span className="text-xs text-slate-600 font-medium">Grid:</span>
                              <input
                                type="number"
                                min="3"
                                max="100"
                                value={gridCols}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val)) {
                                    setGridCols(val);
                                  }
                                }}
                                onBlur={(e) => handleGridSizeChange(e.target.value, gridRows)}
                                className="w-14 h-7 text-xs text-center border rounded px-1"
                              />
                              <span className="text-xs text-slate-500">×</span>
                              <input
                                type="number"
                                min="3"
                                max="100"
                                value={gridRows}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val)) {
                                    setGridRows(val);
                                  }
                                }}
                                onBlur={(e) => handleGridSizeChange(gridCols, e.target.value)}
                                className="w-14 h-7 text-xs text-center border rounded px-1"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleGridSizeChange(6, 5)}
                                className="h-7 text-xs px-2"
                                title="Reset to default 6×5"
                                disabled={isSaving}
                              >
                                Reset
                              </Button>
                            </div>

                            <Button
                              onClick={handleSaveConfiguration}
                              size="sm"
                              disabled={isSaving}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              {isSaving ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Download className="w-4 h-4 mr-2" />
                                  Save Config
                                </>
                              )}
                            </Button>
                          </>
                        )}

                        <div className="flex border rounded-md">
                          <Button
                            variant={viewSize === 'compact' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewSize('compact')}
                            className="rounded-r-none h-9 px-3"
                          >
                            <ZoomOut className="w-4 h-4" />
                          </Button>
                          <Button
                            variant={viewSize === 'normal' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewSize('normal')}
                            className="rounded-none h-9 px-3 border-l border-r"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant={viewSize === 'large' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewSize('large')}
                            className="rounded-l-none h-9 px-3"
                          >
                            <ZoomIn className="w-4 h-4" />
                          </Button>
                        </div>

                        {isEditMode && (
                          <div className="flex border rounded-md">
                            <Button
                              variant={editType === 'containers' ? 'default' : 'ghost'}
                              size="sm"
                              onClick={() => {
                                setEditType('containers');
                                setSelectedContainer(null);
                              }}
                              className="rounded-r-none h-9 px-3"
                              disabled={isSaving}
                            >
                              <Move className="w-4 h-4 mr-1" />
                              Containers
                            </Button>
                            <Button
                              variant={editType === 'users' ? 'default' : 'ghost'}
                              size="sm"
                              onClick={() => {
                                setEditType('users');
                                setSelectedContainer(null);
                              }}
                              className="rounded-l-none h-9 px-3 border-l"
                              disabled={isSaving}
                            >
                              <UserIcon className="w-4 h-4 mr-1" />
                              Users
                            </Button>
                          </div>
                        )}
                        
                        <Button
                          variant={isEditMode ? "default" : "outline"}
                          onClick={() => {
                            setIsEditMode(!isEditMode);
                            setSelectedContainer(null); // Clear selection when toggling edit mode
                          }}
                          size="sm"
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Edit className="w-4 h-4 mr-2" />
                          )}
                          {isEditMode ? 'Editing...' : 'Edit Mode'}
                        </Button>

                        <Button 
                          onClick={() => setShowConfigHistory(!showConfigHistory)} 
                          variant="outline" 
                          size="sm"
                        >
                          <Clock className="w-4 h-4 mr-2" />
                          History
                        </Button>
                        
                        <Button onClick={resetStructure} variant="outline" size="sm" disabled={isSaving}>
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Reset Layout
                        </Button>
                        
                        <Button onClick={downloadAsImage} variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Print Chart
                        </Button>
                      </div>
                    </div>
                  </div>

                  {showConfigHistory && (
                    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-slate-900">Configuration History ({viewMode === 'team' ? 'Teams' : 'Departments'})</h2>
                        <Button variant="ghost" size="sm" onClick={() => setShowConfigHistory(false)} disabled={isSaving}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      {loadingHistory ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                        </div>
                      ) : configHistory.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                          No saved configurations yet for this view mode.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                          {configHistory.map((config) => (
                            <div 
                              key={config.id} 
                              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors gap-2"
                            >
                              <div className="flex-1">
                                <h3 className="font-semibold text-slate-900">{config.config_name || `Configuration ${config.id.substring(0, 8)}`}</h3>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-600">
                                  <span>📅 {new Date(config.saved_at || config.created_date).toLocaleString()}</span>
                                  <span>📐 Grid: {config.grid_cols}×{config.grid_rows}</span>
                                  <span>📍 {config.positions?.length || 0} positioned containers</span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRestoreConfig(config)}
                                  disabled={isSaving}
                                >
                                  <RotateCcw className="w-4 h-4 mr-1" />
                                  Restore
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteConfig(config.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  disabled={isSaving}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Organization Chart Display */}
                  <div ref={chartRef}>
                    <OrganizationChart
                      orgStructure={orgStructure}
                      gridCols={gridCols}
                      gridRows={gridRows}
                      viewSize={viewSize}
                      viewMode={viewMode}
                      isEditMode={isEditMode}
                      editType={editType}
                      selectedContainer={selectedContainer}
                      setSelectedContainer={setSelectedContainer}
                      showUnassigned={showUnassigned}
                      setShowUnassigned={setShowUnassigned}
                      handleCellClick={handleCellClick}
                      handleSetLeader={handleSetLeader}
                      getDynamicFullName={getDynamicFullName}
                    />
                  </div>

                  {isEditMode && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-800 mb-2">Edit Mode Active</h3>
                      {editType === 'containers' ? (
                        <ul className="text-xs text-blue-700 space-y-1">
                          <li>• <strong>Container Mode:</strong> Click a {viewMode === 'team' ? 'team' : 'department'} on the left to select it</li>
                          <li>• Then click an empty cell in the grid to place it there</li>
                          <li>• Click a positioned container to select it and move it to another cell</li>
                          <li>• Adjust grid size (3×3 to 100×100) using the Grid controls above</li>
                          <li>• Click <strong className="text-green-700">"Save Config"</strong> button (green) to permanently save all positions and create a new history version</li>
                          <li>• Switch to User Mode to move employees between containers</li>
                        </ul>
                      ) : (
                        <ul className="text-xs text-blue-700 space-y-1">
                          <li>• <strong>User Mode:</strong> Drag users between {viewMode === 'team' ? 'teams' : 'departments'}</li>
                          <li>• You can move users from containers in the left sidebar to containers in the grid</li>
                          <li>• You can also move users between containers in the grid</li>
                          {viewMode === 'team' && <li>• Click the star icon on a user card to set/demote them as team leader</li>}
                          <li>• Switch to Container Mode to reorganize the layout</li>
                        </ul>
                      )}
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <InviteUsersDialog
          isOpen={showInviteDialog}
          onClose={() => setShowInviteDialog(false)}
          onSuccess={handleInviteSuccess}
        />

        <UsersSettingsPanel
          isOpen={showSettingsDialog}
          onClose={() => setShowSettingsDialog(false)}
          adminLeader={adminLeader}
          currentUser={currentUser}
          isAdminLeader={isAdminLeader}
          allUsers={allUsers}
          onSuccess={handleSettingsSuccess}
        />

        {viewingUser && (
          <UserDetailsPanel
            user={viewingUser}
            isOpen={!!viewingUser}
            onClose={() => setViewingUser(null)}
            onUpdate={handleSettingsSuccess}
          />
        )}
      </div>
    </DragDropContext>
  );
}