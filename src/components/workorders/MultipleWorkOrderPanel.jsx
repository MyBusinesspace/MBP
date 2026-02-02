import React, { useState, useEffect, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Trash2, Calendar as CalendarIcon, Save, X, Users, Camera, Upload, RefreshCw, Info, Loader2, AlertTriangle, Wrench, ChevronDown } from 'lucide-react';
import { format, parseISO, differenceInDays, addDays, startOfDay, addWeeks, addMonths, addYears } from 'date-fns';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProjectCombobox from './ProjectCombobox';
import Avatar from '../Avatar';
import DynamicChecklist from './DynamicChecklist';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function MultipleWorkOrderPanel({
  isOpen = false,
  onClose,
  onSave,
  projects = [],
  users = [],
  teams = [],
  customers = [],
  assets = [],
  clientEquipments = [],
  categories = [],
  shiftTypes = [],
  isReadOnly = false,
  onRefreshData,
}) {
  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeUsers = Array.isArray(users) ? users : [];
  const safeTeams = Array.isArray(teams) ? teams : [];
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeShiftTypes = Array.isArray(shiftTypes) ? shiftTypes : [];
  const safeAssets = Array.isArray(assets) ? assets : [];
  const safeClientEquipments = Array.isArray(clientEquipments) ? clientEquipments : [];

  const allEquipment = useMemo(() => [
    ...safeAssets.map(a => ({ ...a, type: 'Asset', label: a.name })),
    ...safeClientEquipments.map(e => ({ ...e, type: 'Client', label: e.name }))
  ], [safeAssets, safeClientEquipments]);

  const [equipmentSearch, setEquipmentSearch] = useState('');

  const [workOrders, setWorkOrders] = useState([
    {
      id: Date.now(),
      title: '',
      project_id: '',
      work_order_category_id: '',
      shift_type_id: '',
      status: 'ongoing',
      work_notes: '',
      work_description_items: [],
      work_done_items: [],
      spare_parts_items: [],
      work_pending_items: [],
      spare_parts_pending_items: [],
      job_completion_status: '',
      client_feedback_comments: '',
      client_representative_name: '',
      client_representative_phone: '',
      planned_start_time: new Date().toISOString(),
      planned_end_time: new Date().toISOString(),
      employee_ids: [],
      team_ids: [],
      equipment_ids: [],
      file_urls: [],
      is_repeating: false,
      recurrence_type: 'daily',
      recurrence_end_date: '',
      recurrence_interval: 1,
      skip_weekends: false
    }
  ]);

  const [expandedTeams, setExpandedTeams] = useState({});
  const [uploadingPhotos, setUploadingPhotos] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showNoTeamWarning, setShowNoTeamWarning] = useState(false);
  const [pendingWorkOrders, setPendingWorkOrders] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      setWorkOrders([
        {
          id: Date.now(),
          title: '',
          project_id: '',
          work_order_category_id: '',
          shift_type_id: '',
          status: 'ongoing',
          work_notes: '',
          work_description_items: [],
          work_done_items: [],
          spare_parts_items: [],
          work_pending_items: [],
          spare_parts_pending_items: [],
          job_completion_status: '',
          client_feedback_comments: '',
          client_representative_name: '',
          client_representative_phone: '',
          planned_start_time: now.toISOString(),
          planned_end_time: now.toISOString(),
          employee_ids: [],
          team_ids: [],
          equipment_ids: [],
          file_urls: [],
          is_repeating: false,
          recurrence_type: 'daily',
          recurrence_end_date: '',
          recurrence_interval: 1,
          skip_weekends: false
        }
      ]);
      setShowNoTeamWarning(false);
      setPendingWorkOrders(null);
    }
  }, [isOpen]);

  const calculateRecurringWorkOrders = (wo) => {
    if (!wo.is_repeating || !wo.planned_start_time || !wo.recurrence_end_date) {
      return 0;
    }

    if (typeof wo.planned_start_time !== 'string' || wo.planned_start_time.trim() === '') {
      return 0;
    }
    if (typeof wo.recurrence_end_date !== 'string' || wo.recurrence_end_date.trim() === '') {
      return 0;
    }

    try {
      const startDate = startOfDay(parseISO(wo.planned_start_time));
      const recurrenceEndDate = startOfDay(parseISO(wo.recurrence_end_date));
      
      if (isNaN(startDate.getTime()) || isNaN(recurrenceEndDate.getTime())) {
        console.warn('Invalid dates in calculateRecurringWorkOrders for WO:', wo.id, 'startDate:', wo.planned_start_time, 'endDate:', wo.recurrence_end_date);
        return 0;
      }
      
      if (recurrenceEndDate < startDate) {
        return 0;
      }

      let count = 0;
      let currentDate = new Date(startDate);
      const maxIterations = 365 * 5; 

      while (currentDate <= recurrenceEndDate && count < maxIterations) {
        count++;

        const interval = Math.max(1, wo.recurrence_interval || 1);
        if (wo.recurrence_type === 'daily') {
          currentDate = addDays(currentDate, interval);
        } else if (wo.recurrence_type === 'weekly') {
          currentDate = addWeeks(currentDate, interval);
        } else if (wo.recurrence_type === 'monthly') {
          currentDate = addMonths(currentDate, interval);
        } else if (wo.recurrence_type === 'yearly') {
          currentDate = addYears(currentDate, interval);
        } else {
          currentDate = addDays(currentDate, 1);
        }
      }

      return count;
    } catch (error) {
      console.error('Error calculating recurring work orders:', error, 'WO:', wo);
      return 0;
    }
  };

  const calculateMultiDayWorkOrders = (wo) => {
    if (wo.is_repeating || !wo.planned_start_time || !wo.planned_end_time) return 1;
    
    if (typeof wo.planned_start_time !== 'string' || wo.planned_start_time.trim() === '') {
      return 1;
    }
    if (typeof wo.planned_end_time !== 'string' || wo.planned_end_time.trim() === '') {
      return 1;
    }
    
    try {
      const startDate = startOfDay(parseISO(wo.planned_start_time));
      const endDate = startOfDay(parseISO(wo.planned_end_time));
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.warn('Invalid dates in calculateMultiDayWorkOrders for WO:', wo.id, 'startDate:', wo.planned_start_time, 'endDate:', wo.planned_end_time);
        return 1;
      }
      
      if (endDate < startDate) return 1; 

      const totalDays = differenceInDays(endDate, startDate) + 1;
      
      if (wo.skip_weekends) {
        let workDays = 0;
        for (let i = 0; i < totalDays; i++) {
          workDays++;
        }
        return workDays;
      }
      
      return totalDays;
    } catch (error) {
      console.error('Error calculating multi-day work orders:', error, 'WO:', wo);
      return 1;
    }
  };

  const calculateTotalWorkOrders = (wo) => {
    if (wo.is_repeating && wo.recurrence_end_date && wo.planned_start_time) {
      return calculateRecurringWorkOrders(wo);
    }
    return calculateMultiDayWorkOrders(wo);
  };

  const addWorkOrder = () => {
    const now = new Date();
    setWorkOrders([
      ...workOrders,
      {
        id: Date.now(),
        title: '',
        project_id: '',
        work_order_category_id: '',
        shift_type_id: '',
        status: 'ongoing',
        work_notes: '',
        work_description_items: [],
        work_done_items: [],
        spare_parts_items: [],
        work_pending_items: [],
        spare_parts_pending_items: [],
        job_completion_status: '',
        client_feedback_comments: '',
        client_representative_name: '',
        client_representative_phone: '',
        planned_start_time: now.toISOString(),
        planned_end_time: now.toISOString(),
        employee_ids: [],
        team_ids: [],
        equipment_ids: [],
        file_urls: [],
        is_repeating: false,
        recurrence_type: 'daily',
        recurrence_end_date: '',
        recurrence_interval: 1,
        skip_weekends: false
      }
    ]);
  };

  const removeWorkOrder = (id) => {
    setWorkOrders(workOrders.filter(wo => wo.id !== id));
  };

  const updateWorkOrder = (id, field, value) => {
    console.log('🔵 updateWorkOrder:', { id, field, value });
    setWorkOrders(prev => prev.map(wo => 
      wo.id === id ? { ...wo, [field]: value } : wo
    ));
  };

  const processAndSaveWorkOrders = async (workOrdersToProcess) => {
    setIsCreating(true);

    try {
      const expandedWorkOrders = [];
      
      for (const wo of workOrdersToProcess) {
        const { id, ...woData } = wo;
        
        console.log('📦 [SAVE WO] Processing:', {
          id: wo.id,
          project_id: wo.project_id,
          team_ids: wo.team_ids,
          employee_ids: wo.employee_ids,
          title: wo.title,
          status: wo.status
        });

        if (!wo.planned_start_time || wo.planned_start_time.trim() === '') {
            console.warn(`Skipping WO ${wo.id} due to empty planned_start_time.`);
            continue;
        }
        if (wo.is_repeating && (!wo.recurrence_end_date || wo.recurrence_end_date.trim() === '')) {
            console.warn(`Skipping recurring WO ${wo.id} due to empty recurrence_end_date.`);
            continue;
        }

        const originalPlannedStartTime = parseISO(wo.planned_start_time);
        const originalPlannedEndTime = wo.planned_end_time ? parseISO(wo.planned_end_time) : null;
        
        const startTimeHours = originalPlannedStartTime.getHours();
        const startTimeMinutes = originalPlannedStartTime.getMinutes();
        
        const endTimeHours = originalPlannedEndTime ? originalPlannedEndTime.getHours() : startTimeHours + 8; 
        const endTimeMinutes = originalPlannedEndTime ? originalPlannedEndTime.getMinutes() : startTimeMinutes;

        if (wo.is_repeating && wo.recurrence_end_date && wo.planned_start_time) {
          let currentRecurrenceDate = startOfDay(originalPlannedStartTime);
          const recurrenceEndDate = startOfDay(parseISO(wo.recurrence_end_date));
          const interval = Math.max(1, wo.recurrence_interval || 1);

          while (currentRecurrenceDate <= recurrenceEndDate) {
            let targetDate = new Date(currentRecurrenceDate);
            let notes = woData.work_notes || '';
            const dayOfWeek = targetDate.getDay(); 

            if (wo.skip_weekends && dayOfWeek === 0) { 
              targetDate = addDays(currentRecurrenceDate, -1); 
              notes = notes ? `${notes}\n[Moved from Sunday ${format(currentRecurrenceDate, 'MMM d, yyyy')}]` : `[Moved from Sunday ${format(currentRecurrenceDate, 'MMM d, yyyy')}]`;
            }

            const newStartTime = new Date(targetDate);
            newStartTime.setHours(startTimeHours, startTimeMinutes, 0, 0);

            const newEndTime = new Date(targetDate);
            newEndTime.setHours(endTimeHours, endTimeMinutes, 0, 0);

            if (originalPlannedEndTime && originalPlannedStartTime.toDateString() === originalPlannedEndTime.toDateString() && newEndTime <= newStartTime) {
                newEndTime.setDate(newEndTime.getDate() + 1);
            }
            if (originalPlannedEndTime && differenceInDays(originalPlannedEndTime, originalPlannedStartTime) > 0) {
                newEndTime.setDate(newEndTime.getDate() + differenceInDays(originalPlannedEndTime, originalPlannedStartTime));
            }
            
            expandedWorkOrders.push({
              ...woData,
              planned_start_time: newStartTime.toISOString(),
              planned_end_time: newEndTime.toISOString(),
              work_notes: notes,
              is_repeating: false,
              recurrence_type: null,
              recurrence_end_date: null,
              recurrence_interval: null,
              skip_weekends: false
            });

            if (wo.recurrence_type === 'daily') {
              currentRecurrenceDate = addDays(currentRecurrenceDate, interval);
            } else if (wo.recurrence_type === 'weekly') {
              currentRecurrenceDate = addWeeks(currentRecurrenceDate, interval);
            } else if (wo.recurrence_type === 'monthly') {
              currentRecurrenceDate = addMonths(currentRecurrenceDate, interval);
            } else if (wo.recurrence_type === 'yearly') {
              currentRecurrenceDate = addYears(currentRecurrenceDate, interval);
            } else {
              currentRecurrenceDate = addDays(currentRecurrenceDate, 1); 
            }
          }
          console.log(`📅 Expanded Recurring WO "${wo.title || 'Untitled'}" into ${expandedWorkOrders.length} Work Orders so far.`);

        } else {
          const startDate = startOfDay(originalPlannedStartTime);
          const endDate = originalPlannedEndTime ? startOfDay(originalPlannedEndTime) : startDate;
          const totalDaysDiff = differenceInDays(endDate, startDate);

          for (let i = 0; i <= totalDaysDiff; i++) {
            const currentDay = addDays(startDate, i);
            let targetDay = new Date(currentDay);
            let notes = woData.work_notes || '';
            const dayOfWeek = targetDay.getDay(); 

            if (wo.skip_weekends && dayOfWeek === 0) { 
              targetDay = addDays(currentDay, -1); 
              notes = notes ? `${notes}\n[Moved from Sunday ${format(currentDay, 'MMM d, yyyy')}]` : `[Moved from Sunday ${format(currentDay, 'MMM d, yyyy')}]`;
            }

            const newStartTime = new Date(targetDay);
            newStartTime.setHours(startTimeHours, startTimeMinutes, 0, 0);
            
            const newEndTime = new Date(targetDay);
            newEndTime.setHours(endTimeHours, endTimeMinutes, 0, 0);

            if (originalPlannedEndTime && originalPlannedStartTime.toDateString() === originalPlannedEndTime.toDateString() && newEndTime <= newStartTime) {
                newEndTime.setDate(newEndTime.getDate() + 1);
            }
            if (originalPlannedEndTime && differenceInDays(originalPlannedEndTime, originalPlannedStartTime) > 0) {
                newEndTime.setDate(newEndTime.getDate() + differenceInDays(originalPlannedEndTime, originalPlannedStartTime));
            }
            
            expandedWorkOrders.push({
              ...woData,
              planned_start_time: newStartTime.toISOString(),
              planned_end_time: newEndTime.toISOString(),
              work_notes: notes,
              is_repeating: false,
              recurrence_type: null,
              recurrence_end_date: null,
              recurrence_interval: null,
              skip_weekends: false
            });
          }
          console.log(`📅 Expanded Multi-day WO "${wo.title || 'Untitled'}" into ${expandedWorkOrders.length} Work Orders so far.`);
        }
      }

      console.log('📤 Sending to onSave:', expandedWorkOrders.length, 'work orders');
      console.log('📦 Sample WO data:', expandedWorkOrders[0]);
      
      await onSave(expandedWorkOrders);
      toast.success(`${expandedWorkOrders.length} work orders created successfully!`); 
      onClose(); 
    } catch (error) {
      console.error('❌ onSave failed:', error);
      toast.error(`Failed to create work orders: ${error.message || 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSubmit = async () => {
    if (isCreating) {
      console.warn('⚠️ Already creating work orders, ignoring...');
      return;
    }

    console.log('💾 handleSubmit called');
    console.log('📦 workOrders:', workOrders);
    
    const validWorkOrders = workOrders.filter(wo => {
      const hasProject = !!wo.project_id;
      const hasStartTime = !!wo.planned_start_time;
      const hasTeamOrUsers = (wo.team_ids && wo.team_ids.length > 0) || (wo.employee_ids && wo.employee_ids.length > 0);
      
      return hasProject && hasStartTime && hasTeamOrUsers;
    });

    const woWithoutTeams = workOrders.filter(wo => {
      const hasProject = !!wo.project_id;
      const hasStartTime = !!wo.planned_start_time;
      const hasNoTeamOrUsers = (!wo.team_ids || wo.team_ids.length === 0) && (!wo.employee_ids || wo.employee_ids.length === 0);
      
      return hasProject && hasStartTime && hasNoTeamOrUsers;
    });
    
    if (validWorkOrders.length === 0) {
      const firstWO = workOrders[0];
      const missing = [];
      if (!firstWO.project_id) missing.push('Project');
      if (!firstWO.planned_start_time) missing.push('Start Date & Time');
      if ((!firstWO.team_ids || firstWO.team_ids.length === 0) && (!firstWO.employee_ids || firstWO.employee_ids.length === 0)) missing.push('Team or Users');
      
      toast.error(`❌ Cannot create work orders. Missing required fields: ${missing.join(', ')}. Please fill all required fields marked with *.`, {
        duration: 5000
      });
      return;
    }

    if (validWorkOrders.length < workOrders.length) {
      const invalidCount = workOrders.length - validWorkOrders.length;
      toast.warning(`⚠️ ${invalidCount} work order(s) skipped (missing Project, Start Time, or Team/Users)`, {
        duration: 4000
      });
    }

    if (woWithoutTeams.length > 0) {
      setPendingWorkOrders(validWorkOrders); 
      setShowNoTeamWarning(true);
      return; 
    }

    await processAndSaveWorkOrders(validWorkOrders);
  };

  const handleDateChange = (id, field, date) => {
    if (!date) {
      updateWorkOrder(id, field, '');
      return;
    }

    const currentValue = workOrders.find(wo => wo.id === id)?.[field];
    let newDateTime;

    if (currentValue) {
      try {
        const currentDateTime = new Date(currentValue);
        newDateTime = new Date(date);
        newDateTime.setHours(currentDateTime.getHours(), currentDateTime.getMinutes(), 0, 0);
      } catch {
        newDateTime = new Date(date);
        newDateTime.setHours(8, 0, 0, 0);
      }
    } else {
      newDateTime = new Date(date);
      newDateTime.setHours(8, 0, 0, 0);
    }

    updateWorkOrder(id, field, newDateTime.toISOString());
  };

  const handleTimeChange = (id, field, time) => {
    if (!time) return;

    const wo = workOrders.find(w => w.id === id);
    if (!wo) return;

    const [hours, minutes] = time.split(':').map(Number);
    let newDateTime;

    if (wo[field]) {
      newDateTime = new Date(wo[field]);
    } else if (field === 'planned_end_time' && wo.planned_start_time) {
      newDateTime = new Date(wo.planned_start_time);
    } else {
      newDateTime = new Date();
    }

    const year = newDateTime.getFullYear();
    const month = newDateTime.getMonth();
    const day = newDateTime.getDate();
    
    newDateTime = new Date(year, month, day, hours, minutes, 0, 0);
    updateWorkOrder(id, field, newDateTime.toISOString());
  };

  const handleShiftTypeChange = (woId, shiftTypeId) => {
    console.log('🔄 handleShiftTypeChange:', { woId, shiftTypeId });
    
    const selectedShift = safeShiftTypes.find(s => s.id === shiftTypeId);
    console.log('  - Selected shift:', selectedShift);
    
    const wo = workOrders.find(w => w.id === woId);
    if (!wo) {
      console.error('  - Work order not found!');
      return;
    }
    
    if (selectedShift && selectedShift.start_time && selectedShift.end_time) {
      let startDate;
      if (wo.planned_start_time) {
        startDate = new Date(wo.planned_start_time);
      } else {
        startDate = new Date();
      }

      let endDate;
      if (wo.planned_end_time) {
        endDate = new Date(wo.planned_end_time);
      } else {
        endDate = new Date(startDate); 
      }

      const [startHours, startMinutes] = selectedShift.start_time.split(':').map(Number);
      const startDateTime = new Date(startDate);
      startDateTime.setHours(startHours, startMinutes, 0, 0);

      const [endHours, endMinutes] = selectedShift.end_time.split(':').map(Number);
      const endDateTime = new Date(endDate); 
      endDateTime.setHours(endHours, endMinutes, 0, 0);

      const isSameDay = startDate.toDateString() === endDate.toDateString();
      if (isSameDay && endDateTime <= startDateTime) {
        endDateTime.setDate(endDateTime.getDate() + 1);
      }

      console.log('  - Updating times:', {
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString()
      });

      setWorkOrders(prev => prev.map(w => 
        w.id === woId ? {
          ...w,
          shift_type_id: shiftTypeId,
          planned_start_time: startDateTime.toISOString(),
          planned_end_time: endDateTime.toISOString()
        } : w
      ));
    } else {
      setWorkOrders(prev => prev.map(w => 
        w.id === woId ? {
          ...w,
          shift_type_id: shiftTypeId
        } : w
      ));
    }
  };

  const handleTeamToggle = (woId, teamId) => {
    const wo = workOrders.find(w => w.id === woId);
    if (!wo) return;

    const currentTeamIds = wo.team_ids || [];
    const currentEmployeeIds = wo.employee_ids || [];
    
    const isSelected = currentTeamIds.includes(teamId);
    const teamUsers = safeUsers.filter(u => u.team_id === teamId).map(u => u.id);

    if (isSelected) {
      updateWorkOrder(woId, 'team_ids', currentTeamIds.filter(id => id !== teamId));
      updateWorkOrder(woId, 'employee_ids', currentEmployeeIds.filter(id => !teamUsers.includes(id)));
      setExpandedTeams(prev => ({ ...prev, [`${woId}-${teamId}`]: false }));
    } else {
      updateWorkOrder(woId, 'team_ids', [...currentTeamIds, teamId]);
      updateWorkOrder(woId, 'employee_ids', [...new Set([...currentEmployeeIds, ...teamUsers])]);
      setExpandedTeams(prev => ({ ...prev, [`${woId}-${teamId}`]: true }));
    }
  };

  const handleUserToggle = (woId, userId) => {
    const wo = workOrders.find(w => w.id === woId);
    if (!wo) return;

    const currentEmployeeIds = wo.employee_ids || [];
    const currentTeamIds = wo.team_ids || [];
    
    const newEmployeeIds = currentEmployeeIds.includes(userId)
      ? currentEmployeeIds.filter(id => id !== userId)
      : [...currentEmployeeIds, userId];
    
    const user = safeUsers.find(u => u.id === userId);
    let newTeamIds = [...currentTeamIds];
    
    if (user && user.team_id && !currentEmployeeIds.includes(userId)) {
      if (!newTeamIds.includes(user.team_id)) {
        newTeamIds.push(user.team_id);
        console.log(`✅ [MULTI WO PANEL] Auto-assigned team ${user.team_id} for user ${userId}`);
        toast.success(`Team automatically assigned for ${user.nickname || user.first_name || 'user'}`, {
          duration: 2000
        });
      }
    } else if (user && user.team_id && currentEmployeeIds.includes(userId)) {
      const otherUsersFromSameTeam = newEmployeeIds.filter(id => {
        const otherUser = safeUsers.find(u => u.id === id);
        return otherUser && otherUser.team_id === user.team_id;
      });
      
      if (otherUsersFromSameTeam.length === 0) {
        newTeamIds = newTeamIds.filter(id => id !== user.team_id);
        console.log(`🗑️ [MULTI WO PANEL] Auto-removed team ${user.team_id} - no more users from this team`);
      }
    }
    
    updateWorkOrder(woId, 'employee_ids', newEmployeeIds);
    updateWorkOrder(woId, 'team_ids', newTeamIds);
  };

  const toggleTeamExpansion = (woId, teamId) => {
    const key = `${woId}-${teamId}`;
    setExpandedTeams(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePhotoUpload = async (woId, files) => {
    if (!files || files.length === 0) return;
    
    const wo = workOrders.find(w => w.id === woId);
    if (!wo || !wo.project_id) {
      toast.error('Please select a project first to upload photos');
      return;
    }

    const project = safeProjects.find(p => p.id === wo.project_id);
    if (!project) {
      toast.error('Project not found');
      return;
    }

    setUploadingPhotos(prev => ({ ...prev, [woId]: true }));

    try {
      const uploadedUrls = [];
      
      for (const file of files) {
        const date = format(new Date(), 'yyyy-MM-dd_HHmmss');
        const projectName = project.name.replace(/[^a-zA-Z0-9]/g, '_');
        const fileExtension = file.name.split('.').pop();
        const fileName = `${date}_${projectName}.${fileExtension}`;
        
        const formData = new FormData();
        formData.append('file', file, fileName);
        
        const { file_url } = await base44.integrations.Core.UploadFile({ file: formData.get('file') });
        uploadedUrls.push(file_url);
      }

      const currentUrls = wo.file_urls || [];
      updateWorkOrder(woId, 'file_urls', [...currentUrls, ...uploadedUrls]);
      
      toast.success(`${uploadedUrls.length} photo(s) uploaded successfully`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photos');
    } finally {
      setUploadingPhotos(prev => ({ ...prev, [woId]: false }));
    }
  };

  const handleRemovePhoto = (woId, photoUrl) => {
    const wo = workOrders.find(w => w.id === woId);
    if (!wo) return;

    const updatedUrls = (wo.file_urls || []).filter(url => url !== photoUrl);
    updateWorkOrder(woId, 'file_urls', updatedUrls);
  };

  const handleEquipmentToggle = (woId, equipmentId) => {
    const wo = workOrders.find(w => w.id === woId);
    if (!wo) return;

    const currentEquipmentIds = wo.equipment_ids || [];
    const isSelected = currentEquipmentIds.includes(equipmentId);

    if (isSelected) {
      updateWorkOrder(woId, 'equipment_ids', currentEquipmentIds.filter(id => id !== equipmentId));
    } else {
      updateWorkOrder(woId, 'equipment_ids', [...currentEquipmentIds, equipmentId]);
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full sm:max-w-[600px] p-0 flex flex-col" hideCloseButton>
          <SheetHeader className="px-6 py-3 border-b flex-shrink-0 bg-[#A2231D]">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-lg font-bold text-white">
                  Create Work Orders
                </SheetTitle>
                {onRefreshData && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setIsRefreshing(true);
                      try {
                        await onRefreshData();
                        toast.success('Projects refreshed!');
                      } catch (error) {
                        console.error('Failed to refresh projects:', error);
                        toast.error('Failed to refresh projects.');
                      } finally {
                        setIsRefreshing(false);
                      }
                    }}
                    disabled={isRefreshing}
                    className="h-7 gap-1.5 text-xs bg-white/20 hover:bg-white/30 text-white border-white/30"
                  >
                    <RefreshCw className={cn("w-3 h-3", isRefreshing && "animate-spin")} />
                    Refresh
                  </Button>
                )}
              </div>
              <p className="text-xs text-white/80">
                💡 Created a new project? Click "Refresh" to see it here
              </p>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {workOrders.map((wo, index) => {
              const missingProject = !wo.project_id;
              const missingStartTime = !wo.planned_start_time;
              const missingTeam = (!wo.team_ids || wo.team_ids.length === 0) && (!wo.employee_ids || wo.employee_ids.length === 0);
              const hasErrors = missingProject || missingStartTime || missingTeam;
              
              const totalWOCount = calculateTotalWorkOrders(wo);
              const isMultiDayNonRepeating = !wo.is_repeating && totalWOCount > 1; 
              const isRepeating = wo.is_repeating && totalWOCount > 0;

              return (
                <div 
                  key={wo.id} 
                  className={cn(
                    "p-4 rounded-lg bg-white shadow-sm",
                    hasErrors ? "border-2 border-red-300" : "border-2 border-slate-300"
                  )}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-slate-900 text-lg">Work Order #{index + 1}</h3>
                      {hasErrors && (
                        <Badge variant="destructive" className="text-xs">
                          Missing required fields
                        </Badge>
                      )}
                      {isMultiDayNonRepeating && !hasErrors && (
                        <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                          Will create {totalWOCount} Work Orders (1 per day){wo.skip_weekends ? ' - Sundays → Saturday' : ''}
                        </Badge>
                      )}
                      {isRepeating && !hasErrors && (
                        <Badge className="text-xs bg-purple-100 text-purple-700 border-purple-300">
                          🔁 Will create {totalWOCount} Work Orders ({wo.recurrence_type}){wo.skip_weekends ? ' - Sundays → Saturday' : ''}
                        </Badge>
                      )}
                    </div>
                    {workOrders.length > 1 && !isReadOnly && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeWorkOrder(wo.id)}
                        disabled={isCreating}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    )}
                  </div>

                  {hasErrors && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-red-900 mb-1">
                            Required fields missing:
                          </div>
                          <ul className="text-xs text-red-700 list-disc list-inside space-y-1">
                            {missingProject && <li>Select a <strong>Project</strong></li>}
                            {missingStartTime && <li>Set a <strong>Start Date & Time</strong></li>}
                            {missingTeam && <li>Assign at least one <strong>Team</strong> or some <strong>Users</strong></li>}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {(isMultiDayNonRepeating || isRepeating) && !hasErrors && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-blue-900 mb-1">
                            {isRepeating ? 'Repeating Work Order' : 'Multi-Day Work Order'}
                          </div>
                          <p className="text-xs text-blue-700">
                            This will create <strong>{totalWOCount} separate Work Orders</strong>
                            {isRepeating ? (
                              <>
                                {' '}({wo.recurrence_type} every {wo.recurrence_interval || 1} {wo.recurrence_type === 'daily' ? 'day(s)' : wo.recurrence_type === 'weekly' ? 'week(s)' : wo.recurrence_type === 'monthly' ? 'month(s)' : 'year(s)'} from{' '}
                                {wo.planned_start_time && format(parseISO(wo.planned_start_time), 'MMM d')} until{' '}
                                {wo.recurrence_end_date && format(parseISO(wo.recurrence_end_date), 'MMM d, yyyy')}).
                              </>
                            ) : (
                              <>
                                {' '}(one for each day from{' '}
                                {wo.planned_start_time && format(parseISO(wo.planned_start_time), 'MMM d')} to{' '}
                                {wo.planned_end_time && format(parseISO(wo.planned_end_time), 'MMM d')}).
                              </>
                            )}
                            {wo.skip_weekends && ' Sundays will be moved to Saturday.'}
                            {' '}Each Work Order can be signed/justified independently.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-6">
                    {/* 1. General Information */}
                    <div className="rounded-xl border border-red-400 bg-white shadow-sm mt-0">
                      <div className="bg-red-50 px-4 py-3 border-b border-red-200 rounded-t-xl">
                        <h3 className="text-sm font-semibold text-red-900">1. General Information</h3>
                      </div>
                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                            <Label>Title</Label>
                            <Input
                                value={wo.title}
                                onChange={(e) => updateWorkOrder(wo.id, 'title', e.target.value)}
                                placeholder="Work order title..."
                                disabled={isReadOnly || isCreating}
                            />
                            </div>

                            <div>
                            <Label className={cn(missingProject && "text-red-600 font-bold")}>
                                Project <span className="text-red-500">*</span>
                                {missingProject && <span className="ml-1 text-xs">(Required)</span>}
                            </Label>
                            <ProjectCombobox
                                projects={safeProjects}
                                customers={safeCustomers}
                                selectedProjectId={wo.project_id}
                                onSelectProject={(projectId) => {
                                console.log('🎯 Project selected:', projectId);
                                if (projectId !== wo.project_id) {
                                    updateWorkOrder(wo.id, 'equipment_ids', []);
                                }
                                updateWorkOrder(wo.id, 'project_id', projectId);
                                }}
                                disabled={isReadOnly || isCreating}
                            />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                            <Label>Category</Label>
                            <Select
                                value={wo.work_order_category_id || ''}
                                onValueChange={(value) => {
                                updateWorkOrder(wo.id, 'work_order_category_id', value);
                                }}
                                disabled={isReadOnly || isCreating}
                            >
                                <SelectTrigger>
                                <SelectValue>
                                    {(() => {
                                    if (!wo.work_order_category_id) return 'Category';
                                    const selectedCat = safeCategories.find(c => c.id === wo.work_order_category_id);
                                    return selectedCat?.name || 'Category';
                                    })()}
                                </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                {safeCategories.map(cat => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                    {cat.name}
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            </div>

                            <div>
                            <Label>Shift Type (auto-fills times)</Label>
                            <Select
                                value={wo.shift_type_id || ''}
                                onValueChange={(value) => {
                                handleShiftTypeChange(wo.id, value);
                                }}
                                disabled={isReadOnly || isCreating}
                            >
                                <SelectTrigger>
                                <SelectValue>
                                    {(() => {
                                    if (!wo.shift_type_id) return 'Shift';
                                    const selectedShift = safeShiftTypes.find(s => s.id === wo.shift_type_id);
                                    if (!selectedShift) return 'Shift';
                                    return (
                                        <>
                                        {selectedShift.name}
                                        {selectedShift.start_time && selectedShift.end_time && (
                                            <span className="text-xs text-slate-500 ml-2">
                                            ({selectedShift.start_time} - {selectedShift.end_time})
                                            </span>
                                        )}
                                        </>
                                    );
                                    })()}
                                </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                {safeShiftTypes.map(shift => (
                                    <SelectItem key={shift.id} value={shift.id}>
                                    {shift.name}
                                    {shift.start_time && shift.end_time && (
                                        <span className="text-xs text-slate-500 ml-2">
                                        ({shift.start_time} - {shift.end_time})
                                        </span>
                                    )}
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                            <Label className={cn(missingStartTime && "text-red-600 font-bold")}>
                                Start Date <span className="text-red-500">*</span>
                            </Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                    "w-full justify-start text-left font-normal h-9 text-xs",
                                    !wo.planned_start_time && "text-slate-400",
                                    missingStartTime && "border-red-300 bg-red-50"
                                    )}
                                    disabled={isReadOnly || isCreating}
                                >
                                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                                    {wo.planned_start_time 
                                    ? format(parseISO(wo.planned_start_time), 'MMM d, yyyy')
                                    : 'Pick date'}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={wo.planned_start_time ? parseISO(wo.planned_start_time) : undefined}
                                    onSelect={(date) => handleDateChange(wo.id, 'planned_start_time', date)}
                                />
                                </PopoverContent>
                            </Popover>
                            </div>

                            <div>
                            <Label className={cn(missingStartTime && "text-red-600 font-bold")}>
                                Start Time <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                type="time"
                                value={wo.planned_start_time ? format(parseISO(wo.planned_start_time), 'HH:mm') : ''}
                                onChange={(e) => handleTimeChange(wo.id, 'planned_start_time', e.target.value)}
                                disabled={isReadOnly || isCreating}
                                className={cn("h-9 text-xs", missingStartTime && "border-red-300 bg-red-50")}
                            />
                            </div>

                            <div>
                            <Label className="text-xs">
                                End Date
                            </Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                    "w-full justify-start text-left font-normal h-9 text-xs",
                                    !wo.planned_end_time && "text-slate-400"
                                    )}
                                    disabled={isReadOnly || isCreating || wo.is_repeating}
                                >
                                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                                    {wo.planned_end_time 
                                    ? format(parseISO(wo.planned_end_time), 'MMM d, yyyy')
                                    : 'Pick date'}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={wo.planned_end_time ? parseISO(wo.planned_end_time) : undefined}
                                    onSelect={(date) => handleDateChange(wo.id, 'planned_end_time', date)}
                                />
                                </PopoverContent>
                            </Popover>
                            </div>

                            <div>
                            <Label className="text-xs">End Time</Label>
                            <div className="flex gap-1">
                                <Input
                                type="time"
                                value={wo.planned_end_time ? format(parseISO(wo.planned_end_time), 'HH:mm') : ''}
                                onChange={(e) => handleTimeChange(wo.id, 'planned_end_time', e.target.value)}
                                disabled={isReadOnly || isCreating || wo.is_repeating}
                                className="flex-1 h-9 text-xs"
                                />
                                {wo.planned_start_time && !isReadOnly && !wo.is_repeating && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="px-1.5 h-9 text-xs" disabled={isCreating}>
                                        +H
                                    </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(hours => (
                                        <DropdownMenuItem
                                        key={hours}
                                        onClick={() => {
                                            const startTime = new Date(wo.planned_start_time);
                                            const endTime = new Date(startTime.getTime() + hours * 60 * 60 * 1000);
                                            updateWorkOrder(wo.id, 'planned_end_time', endTime.toISOString());
                                        }}
                                        >
                                        +{hours}h
                                        </DropdownMenuItem>
                                    ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                )}
                            </div>
                            </div>
                        </div>

                        <div>
                            <Label>Status</Label>
                            <Select
                                value={wo.status || 'ongoing'}
                                onValueChange={(value) => {
                                updateWorkOrder(wo.id, 'status', value);
                                }}
                                disabled={isReadOnly || isCreating}
                            >
                                <SelectTrigger>
                                <SelectValue>
                                    {wo.status === 'ongoing' && 'Ongoing'}
                                    {wo.status === 'closed' && 'Closed'}
                                    {!wo.status && 'Select status'}
                                </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                <SelectItem value="ongoing">Ongoing</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                            <div className="flex items-center justify-between mb-2">
                                <Label className="text-sm">Repeat this work order</Label>
                                <Switch
                                checked={wo.is_repeating || false}
                                onCheckedChange={(checked) => {
                                    updateWorkOrder(wo.id, 'is_repeating', checked);
                                }}
                                disabled={isReadOnly || isCreating}
                                />
                            </div>

                            {wo.is_repeating && (
                                <div className="space-y-3 mt-3">
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                    <Label className="text-xs">Recurrence Pattern</Label>
                                    <Select
                                        value={wo.recurrence_type || 'daily'}
                                        onValueChange={(value) => {
                                        updateWorkOrder(wo.id, 'recurrence_type', value);
                                        }}
                                        disabled={isReadOnly || isCreating}
                                    >
                                        <SelectTrigger className="h-8 text-xs">
                                        <SelectValue>
                                            {wo.recurrence_type === 'daily' && 'Daily'}
                                            {wo.recurrence_type === 'weekly' && 'Weekly'}
                                            {wo.recurrence_type === 'monthly' && 'Monthly'}
                                            {wo.recurrence_type === 'yearly' && 'Yearly'}
                                            {!wo.recurrence_type && 'Select pattern'}
                                        </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                        <SelectItem value="daily">Daily</SelectItem>
                                        <SelectItem value="weekly">Weekly</SelectItem>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                        <SelectItem value="yearly">Yearly</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    </div>
                                    <div>
                                    <Label className="text-xs">Every</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={wo.recurrence_interval || 1}
                                        onChange={(e) => {
                                        const value = parseInt(e.target.value);
                                        updateWorkOrder(wo.id, 'recurrence_interval', isNaN(value) || value < 1 ? 1 : value);
                                        }}
                                        disabled={isReadOnly || isCreating}
                                        className="h-8 text-xs"
                                    />
                                    </div>

                                    <div>
                                    <Label className="text-xs">Repeat until</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                            "w-full justify-start text-left font-normal h-8 text-xs",
                                            !wo.recurrence_end_date && "text-slate-400"
                                            )}
                                            disabled={isReadOnly || isCreating}
                                        >
                                            <CalendarIcon className="mr-2 h-3 w-3" />
                                            {wo.recurrence_end_date 
                                            ? format(parseISO(wo.recurrence_end_date), 'MMM d, yyyy')
                                            : 'End date'}
                                        </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={wo.recurrence_end_date ? parseISO(wo.recurrence_end_date) : undefined}
                                            onSelect={(date) => {
                                            if (date) {
                                                const endOfDay = new Date(date);
                                                endOfDay.setHours(23, 59, 59, 999);
                                                updateWorkOrder(wo.id, 'recurrence_end_date', endOfDay.toISOString());
                                            }
                                            }}
                                        />
                                        </PopoverContent>
                                    </Popover>
                                    </div>
                                </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                id={`skip-weekends-${wo.id}`}
                                checked={wo.skip_weekends || false}
                                onCheckedChange={(checked) => {
                                    updateWorkOrder(wo.id, 'skip_weekends', checked);
                                }}
                                disabled={isReadOnly || isCreating}
                                />
                                <Label htmlFor={`skip-weekends-${wo.id}`} className="text-sm font-normal cursor-pointer flex-1">
                                Skip Sundays - Move to Saturday with note
                                </Label>
                            </div>
                        </div>
                      </div>
                    </div>

                    {/* 2. Assigned Resources */}
                    <div className="rounded-xl border border-red-400 bg-white shadow-sm mt-6">
                        <div className="bg-red-50 px-4 py-3 border-b border-red-200 rounded-t-xl">
                            <h3 className="text-sm font-semibold text-red-900">2. Assigned Resources</h3>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <Label className={cn(
                                    "flex items-center gap-2 mb-2",
                                    missingTeam && "text-red-600 font-bold"
                                )}>
                                    <Users className="w-4 h-4" />
                                    Teams & Users <span className="text-red-500">*</span>
                                    {missingTeam && <span className="ml-1 text-xs">(Required if no users selected)</span>}
                                </Label>
                                
                                <div className={cn(
                                    "border rounded-lg bg-slate-50",
                                    missingTeam ? "border-red-300 bg-red-50" : "border-slate-200"
                                )}>
                                    <div className="p-3 border-b bg-white">
                                    <div className="text-xs font-semibold text-slate-700 mb-2">
                                        Select Teams {missingTeam && <span className="text-red-600">(Required if no users selected)</span>}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {safeTeams.map(team => {
                                        const isSelected = (wo.team_ids || []).includes(team.id);
                                        const teamUsers = safeUsers.filter(u => u.team_id === team.id);
                                        
                                        return (
                                            <Badge
                                            key={team.id}
                                            variant={isSelected ? "default" : "outline"}
                                            className={cn(
                                                "cursor-pointer transition-all px-3 py-1.5",
                                                isSelected && "bg-indigo-600 text-white"
                                            )}
                                            onClick={() => !isReadOnly && !isCreating && handleTeamToggle(wo.id, team.id)}
                                            >
                                            <Users className="w-3 h-3 mr-1" />
                                            {team.name}
                                            <span className="ml-1 text-xs opacity-75">({teamUsers.length})</span>
                                            </Badge>
                                        );
                                        })}
                                    </div>
                                    </div>

                                    <div className="p-3">
                                    <div className="text-xs font-semibold text-slate-700 mb-2">
                                        Selected Users ({(wo.employee_ids || []).length})
                                    </div>
                                    {(wo.employee_ids || []).length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                        {(wo.employee_ids || []).map(userId => {
                                            const user = safeUsers.find(u => u.id === userId);
                                            if (!user) return null;
                                            
                                            const userName = user.nickname || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.full_name || user.email;
                                            
                                            return (
                                            <div
                                                key={userId}
                                                className="flex items-center gap-2 pl-2 pr-3 py-1 bg-blue-100 border border-blue-300 rounded-full"
                                            >
                                                <Avatar user={user} size="xs" />
                                                <span className="text-xs font-medium text-blue-900">{userName}</span>
                                                {!isReadOnly && (
                                                <button
                                                    onClick={() => handleUserToggle(wo.id, userId)}
                                                    className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                                                    disabled={isCreating}
                                                >
                                                    <X className="w-3 h-3 text-blue-700" />
                                                </button>
                                                )}
                                            </div>
                                            );
                                        })}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-slate-500 italic">
                                        No users selected. Click teams above to assign users, or select individual users.
                                        </div>
                                    )}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <Label className="flex items-center gap-2 mb-2">
                                    <Wrench className="w-4 h-4" />
                                    Equipment
                                </Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-between font-normal" disabled={isReadOnly || isCreating || !wo.project_id}>
                                        <span className={cn("truncate", !wo.project_id && "text-slate-400")}>
                                        {!wo.project_id 
                                            ? "Select project first" 
                                            : (wo.equipment_ids || []).length > 0
                                            ? `${(wo.equipment_ids || []).length} equipment selected`
                                            : "Select equipment..."}
                                        </span>
                                        <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                                    </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0" align="start">
                                    <div className="p-2 border-b">
                                        <Input
                                        placeholder="Search equipment..."
                                        value={equipmentSearch}
                                        onChange={(e) => setEquipmentSearch(e.target.value)}
                                        className="h-8 text-xs"
                                        />
                                    </div>
                                    <div className="max-h-[200px] overflow-y-auto p-1">
                                        {allEquipment
                                        .filter(eq => eq.project_id === wo.project_id)
                                        .filter(eq => eq.label.toLowerCase().includes(equipmentSearch.toLowerCase()))
                                        .map(eq => (
                                            <div
                                            key={eq.id}
                                            className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded cursor-pointer"
                                            onClick={() => handleEquipmentToggle(wo.id, eq.id)}
                                            >
                                            <Checkbox
                                                checked={(wo.equipment_ids || []).includes(eq.id)}
                                                onCheckedChange={() => handleEquipmentToggle(wo.id, eq.id)}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm truncate">{eq.label}</div>
                                                <div className="text-[10px] text-slate-500">{eq.type}</div>
                                            </div>
                                            </div>
                                        ))}
                                        {allEquipment.filter(eq => eq.project_id === wo.project_id).length === 0 ? (
                                        <div className="p-2 text-center text-xs text-slate-500">No equipment assigned to this project</div>
                                        ) : allEquipment.filter(eq => eq.project_id === wo.project_id && eq.label.toLowerCase().includes(equipmentSearch.toLowerCase())).length === 0 && (
                                        <div className="p-2 text-center text-xs text-slate-500">No equipment found</div>
                                        )}
                                    </div>
                                    </PopoverContent>
                                </Popover>
                                {(wo.equipment_ids || []).length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                    {wo.equipment_ids.map(id => {
                                        const eq = allEquipment.find(e => e.id === id);
                                        if (!eq) return null;
                                        return (
                                        <Badge key={id} variant="secondary" className="flex items-center gap-1">
                                            {eq.label}
                                            <button
                                            onClick={() => handleEquipmentToggle(wo.id, id)}
                                            className="ml-1 hover:text-red-600"
                                            disabled={isReadOnly || isCreating}
                                            >
                                            <X className="w-3 h-3" />
                                            </button>
                                        </Badge>
                                        );
                                    })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 3. Order Instructions */}
                    <div className="rounded-xl border border-red-400 bg-white shadow-sm mt-6">
                      <div className="bg-red-50 px-4 py-3 border-b border-red-200 rounded-t-xl">
                        <h3 className="text-sm font-semibold text-red-900">
                          3. Order instructions from management
                        </h3>
                      </div>
                      <div className="p-4">
                        <DynamicChecklist
                          items={wo.work_description_items}
                          onChange={(items) => updateWorkOrder(wo.id, 'work_description_items', items)}
                          placeholder="Add instruction..."
                          disabled={isReadOnly || isCreating}
                        />
                      </div>
                    </div>

                    {/* 4. Site Report */}
                    <div className="rounded-xl border border-red-400 bg-white shadow-sm mt-6">
                      <div className="bg-red-50 px-4 py-3 border-b border-red-200 rounded-t-xl">
                        <h3 className="text-sm font-semibold text-red-900">
                          4. Site Report
                        </h3>
                      </div>
                      <div className="p-4 space-y-6">
                        
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 block">
                                Work done on site (To fill for workers)
                            </label>
                            <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
                              <Tabs defaultValue="work_done">
                                <div className="bg-slate-50 border-b border-slate-200 px-4 py-2">
                                  <TabsList className="bg-white w-full">
                                    <TabsTrigger value="work_done" className="text-xs flex-1">Describe here the work done</TabsTrigger>
                                    <TabsTrigger value="spare_parts" className="text-xs flex-1">Spare part installed/released</TabsTrigger>
                                  </TabsList>
                                </div>
                                
                                <TabsContent value="work_done" className="p-4">
                                  <DynamicChecklist
                                    items={wo.work_done_items}
                                    onChange={(items) => updateWorkOrder(wo.id, 'work_done_items', items)}
                                    placeholder="Describe work done..."
                                    disabled={isReadOnly || isCreating}
                                  />
                                </TabsContent>
                                
                                <TabsContent value="spare_parts" className="p-4">
                                  <DynamicChecklist
                                    items={wo.spare_parts_items}
                                    onChange={(items) => updateWorkOrder(wo.id, 'spare_parts_items', items)}
                                    placeholder="List spare part..."
                                    disabled={isReadOnly || isCreating}
                                  />
                                </TabsContent>
                              </Tabs>
                            </div>

                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                              <Tabs defaultValue="work_pending">
                                <div className="bg-slate-50 border-b border-slate-200 px-4 py-2">
                                  <TabsList className="bg-white w-full">
                                    <TabsTrigger value="work_pending" className="text-xs flex-1">Work pending to do</TabsTrigger>
                                    <TabsTrigger value="spare_parts_pending" className="text-xs flex-1">Spare part pending to install</TabsTrigger>
                                  </TabsList>
                                </div>
                                
                                <TabsContent value="work_pending" className="p-4">
                                  <DynamicChecklist
                                    items={wo.work_pending_items}
                                    onChange={(items) => updateWorkOrder(wo.id, 'work_pending_items', items)}
                                    placeholder="List pending work..."
                                    disabled={isReadOnly || isCreating}
                                  />
                                </TabsContent>
                                
                                <TabsContent value="spare_parts_pending" className="p-4">
                                  <DynamicChecklist
                                    items={wo.spare_parts_pending_items}
                                    onChange={(items) => updateWorkOrder(wo.id, 'spare_parts_pending_items', items)}
                                    placeholder="List pending spare part..."
                                    disabled={isReadOnly || isCreating}
                                  />
                                </TabsContent>
                              </Tabs>
                            </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-slate-700 mb-2 block">
                            Job Status
                          </Label>
                          <Select
                            value={wo.job_completion_status}
                            onValueChange={(value) => updateWorkOrder(wo.id, 'job_completion_status', value)}
                            disabled={isReadOnly || isCreating}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select status..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="All done">All done</SelectItem>
                              <SelectItem value="Pending more work">Pending more work</SelectItem>
                              <SelectItem value="Safe to use">Safe to use</SelectItem>
                              <SelectItem value="Unsafe to use">Unsafe to use</SelectItem>
                              <SelectItem value="Others">Others</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                      </div>
                    </div>

                    {/* 6. Client Approval */}
                    <div className="rounded-xl border border-red-400 bg-white shadow-sm mt-6">
                      <div className="bg-red-50 px-4 py-3 border-b border-red-200 rounded-t-xl">
                        <h3 className="text-sm font-semibold text-red-900">
                          6. Client Approval
                        </h3>
                      </div>
                      <div className="p-4 space-y-4">
                        <div>
                          <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                            Comments from the client
                          </Label>
                          <Textarea
                            value={wo.client_feedback_comments || ''}
                            onChange={(e) => updateWorkOrder(wo.id, 'client_feedback_comments', e.target.value)}
                            placeholder="Enter client comments..."
                            className="min-h-[80px]"
                            disabled={isReadOnly || isCreating}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                              Client responsible signature
                            </Label>
                            <Input
                              value={wo.client_representative_name || ''}
                              onChange={(e) => updateWorkOrder(wo.id, 'client_representative_name', e.target.value)}
                              placeholder="Name / Signature"
                              disabled={isReadOnly || isCreating}
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                              Mobile
                            </Label>
                            <Input
                              value={wo.client_representative_phone || ''}
                              onChange={(e) => updateWorkOrder(wo.id, 'client_representative_phone', e.target.value)}
                              placeholder="Mobile number"
                              type="tel"
                              disabled={isReadOnly || isCreating}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Photos & Documents */}
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm mt-6">
                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 rounded-t-xl">
                            <Label className="flex items-center gap-2">
                                <Camera className="w-4 h-4" />
                                Photos & Documents
                                {wo.file_urls && wo.file_urls.length > 0 && (
                                <Badge variant="secondary" className="ml-2">
                                    {wo.file_urls.length} file{wo.file_urls.length !== 1 ? 's' : ''}
                                </Badge>
                                )}
                            </Label>
                        </div>
                        <div className="p-4">
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 bg-slate-50">
                                {!isReadOnly && (
                                <div className="mb-3">
                                    <label className="cursor-pointer block">
                                    <div className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                                        <Upload className="w-4 h-4 text-slate-600" />
                                        <span className="text-sm font-medium text-slate-700">
                                        {uploadingPhotos[wo.id] ? 'Uploading...' : 'Upload Photos'}
                                        </span>
                                    </div>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                        const files = Array.from(e.target.files);
                                        handlePhotoUpload(wo.id, files);
                                        e.target.value = '';
                                        }}
                                        disabled={uploadingPhotos[wo.id] || !wo.project_id || isCreating}
                                    />
                                    </label>
                                    {!wo.project_id && (
                                    <p className="text-xs text-orange-600 mt-2">
                                        ⚠️ Please select a project first to upload photos
                                    </p>
                                    )}
                                    <p className="text-xs text-slate-500 mt-2">
                                    Photos will be saved as: date_projectName.fileExtension
                                    </p>
                                </div>
                                )}

                                {wo.file_urls && wo.file_urls.length > 0 ? (
                                <div className="grid grid-cols-3 gap-2">
                                    {wo.file_urls.map((url, idx) => (
                                    <div key={idx} className="relative group">
                                        <img
                                        src={url}
                                        alt={`Photo ${idx + 1}`}
                                        className="w-full h-24 object-cover rounded-lg border border-slate-200"
                                        />
                                        {!isReadOnly && (
                                        <button
                                            onClick={() => handleRemovePhoto(wo.id, url)}
                                            className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            disabled={isCreating}
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                        )}
                                    </div>
                                    ))}
                                </div>
                                ) : (
                                <div className="text-center py-4">
                                    <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                    <p className="text-xs text-slate-500">No photos uploaded yet</p>
                                </div>
                                )}
                            </div>
                        </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {!isReadOnly && (
              <Button
                variant="outline"
                onClick={addWorkOrder}
                className="w-full border-dashed border-2 h-12"
                disabled={isCreating}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Another Work Order
              </Button>
            )}
          </div>

          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-white flex-shrink-0">
            <div />
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose} disabled={isCreating}>
                Cancel
              </Button>
              {!isReadOnly && (
                <Button 
                  onClick={handleSubmit} 
                  className="bg-indigo-600 hover:bg-indigo-700"
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Create {workOrders.reduce((total, wo) => total + calculateTotalWorkOrders(wo), 0)} Work Order{workOrders.reduce((total, wo) => total + calculateTotalWorkOrders(wo), 0) !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={showNoTeamWarning} onOpenChange={setShowNoTeamWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Work Orders Without Teams
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600 mt-2">
              Some work orders don't have teams or users assigned. 
              <strong className="text-slate-900"> Work orders without teams won't appear in Team or User views.</strong>
              <br /><br />
              Do you want to create them anyway?
            </DialogDescription>
          </DialogHeader>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 my-4">
            <div className="text-sm text-orange-900">
              <strong>⚠️ Important:</strong> Work orders without teams will only be visible in:
              <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                <li>Project View</li>
                <li>List View</li>
                <li>Month View (all work orders)</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNoTeamWarning(false);
                setPendingWorkOrders(null);
              }}
              disabled={isCreating}
            >
              Cancel - Assign Teams First
            </Button>
            <Button
              onClick={async () => {
                setShowNoTeamWarning(false);
                if (pendingWorkOrders) {
                  await processAndSaveWorkOrders(pendingWorkOrders);
                  setPendingWorkOrders(null);
                }
              }}
              className="bg-orange-600 hover:bg-orange-700"
              disabled={isCreating}
            >
              {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Without Teams'
                )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}