import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

import {
  Save,
  Trash2,
  Calendar as CalendarIcon,
  Clock,
  Users as UsersIcon,
  X,
  ChevronDown,
  ChevronUp,
  File,
  Eye,
  Upload,
  Loader2,
  MapPin
} from 'lucide-react';
import { format, parseISO, addDays, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ProjectCombobox from './ProjectCombobox';

import CategoryCombobox from './CategoryCombobox';
import ShiftTypeCombobox from './ShiftTypeCombobox';
import Avatar from '../Avatar';
import TeamAvatar from '../shared/TeamAvatar';
import DynamicChecklist from './DynamicChecklist';
import TeamUserReassignment from './TeamUserReassignment';
import OrderDocumentMatrixTab from './OrderDocumentMatrixTab';
import { base44 } from '@/api/base44Client';
import { LeaveRequest } from '@/entities/all';
import WorkOrderPDFDialog from './WorkOrderPDFDialog';

// Category color mapping for header background
const categoryColorMap = {
  white: '#ffffff',
  gray: '#6b7280',
  red: '#A2231D',
  yellow: '#ca8a04',
  green: '#16a34a',
  blue: '#2563eb',
  indigo: '#4f46e5',
  purple: '#9333ea',
  pink: '#db2777',
  orange: '#ea580c',
  teal: '#0d9488'
};
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function WorkOrderDetailsDialog({
  isOpen = false,
  entry,
  onClose,
  onSave,
  onDelete,
  projects = [],
  users = [],
  teams = [],
  customers = [],
  assets = [],
  clientEquipments = [], // ✅ Added
  categories = [],
  shiftTypes = [],
  isReadOnly = false,
  isCreating = false,
  panelWidth = '40%',
  allEntries = [],
  isSaving = false,
  viewBy = 'team', // ✅ NUEVO: recibir viewBy desde el parent
  onSelectExistingWorkOrder,
  onCreateNewWorkOrder
}) {
  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeUsers = Array.isArray(users) ? users : [];
  const safeTeams = Array.isArray(teams) ? teams : [];
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const safeAssets = Array.isArray(assets) ? assets : [];
  const safeClientEquipments = Array.isArray(clientEquipments) ? clientEquipments : []; // ✅ Added
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeShiftTypes = Array.isArray(shiftTypes) ? shiftTypes : [];

  const [formData, setFormData] = useState({
    title: '',
    project_id: '',
    work_order_category_id: '',
    shift_type_id: '',
    status: 'open',
    task_status: '',
    work_notes: '',
    planned_start_time: new Date().toISOString(),
    planned_end_time: addDays(new Date(), 1).toISOString(),
    employee_ids: [],
    team_ids: [],
    equipment_ids: [],
    is_repeating: false,
    recurrence_type: 'daily',
    recurrence_end_date: '',
    skip_weekends: false,
    moved_from_sunday: false,
    file_urls: [],
    other_file_urls: [],
    work_description_items: [],
    work_done_items: [],
    spare_parts_items: [],
    work_pending_items: [],
    spare_parts_pending_items: [],
    job_completion_status: '',
    client_feedback_comments: '',
    client_representative_name: '',
    client_representative_phone: ''
  });

  const [expandedTeams, setExpandedTeams] = useState({});

  // Format WO number into 0019/26 regardless of stored pattern
  const formatWONumber = (n) => {
    if (!n) return '';
    const s = String(n).trim();
    if (/^\d{3,4}\/\d{2}$/i.test(s)) return s;
    const m2 = s.match(/^WO-(\d{3,4})\/(\d{2})$/i);
    if (m2) return `${m2[1]}/${m2[2]}`;
    const m3 = s.match(/^WR-(\d{4})-(\d{1,4})$/i);
    if (m3) return `${m3[2].padStart(4,'0')}/${m3[1].slice(-2)}`;
    const m4 = s.match(/^WO-(\d{4})-(\d{1,4})$/i);
    if (m4) return `${m4[2].padStart(4,'0')}/${m4[1].slice(-2)}`;
    return '-';
  };

  // Smart formatter: handles plain numbers and patterns like "N12" using the reference date for year
  const formatWONumberSmart = (n, refISO) => {
    if (!n) return '';
    const s = String(n).trim();
    const plain = s.match(/^(\d{1,4})$/);
    const nMatch = s.match(/^N(\d{1,6})$/i);
    const yy = (() => {
      if (!refISO) return new Date().getFullYear().toString().slice(-2);
      try { return new Date(refISO).getFullYear().toString().slice(-2); } catch { return new Date().getFullYear().toString().slice(-2); }
    })();
    if (plain) {
      return `${plain[1].padStart(4,'0')}/${yy}`;
    }
    if (nMatch) {
      const num = nMatch[1];
      if (num.length <= 4) {
        return `${num.padStart(4,'0')}/${yy}`;
      }
    }
    return formatWONumber(s);
  };
  // Entrada “viva” para reflejar start/end del time tracker al abrir
  const [liveEntry, setLiveEntry] = useState(entry);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [isUploadingOtherFiles, setIsUploadingOtherFiles] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [approvedLeaves, setApprovedLeaves] = useState([]);
  const [showTeamReassignment, setShowTeamReassignment] = useState(false);
  const [showPDFDialog, setShowPDFDialog] = useState(false);
  const [wrNumber, setWrNumber] = useState(null);
  const [woNumber, setWoNumber] = useState(null);
  // Creation mode enabled locally when user picks "+ Create new Working Order"
  const [createMode, setCreateMode] = useState(false);
  
  const sheetContentRef = useRef(null);
  const detailsTabRef = useRef(null);
  const documentsTabRef = useRef(null);
  const activityTabRef = useRef(null);

  // Eliminado logging pesado para mejorar rendimiento al abrir el panel
  useEffect(() => {}, []);

  // Load approved leaves
  useEffect(() => {
    LeaveRequest.filter({ status: 'approved' }).then(setApprovedLeaves).catch(console.error);
  }, []);

  // ✅ Helper: Check if user is available for a specific date/time range
  const isUserAvailableForDate = useCallback((userId, startDate, endDate = null) => {
    const user = safeUsers.find(u => u.id === userId);
    if (!user) return false;
    
    // ✅ Check if user is archived
    if (user.archived) {
      // If archived_date exists, check if the WO date is after archive date
      if (user.archived_date) {
        const archivedDate = new Date(user.archived_date);
        archivedDate.setHours(0, 0, 0, 0);
        const woDate = new Date(startDate);
        woDate.setHours(0, 0, 0, 0);
        if (woDate >= archivedDate) {
          return false; // User was archived before or on this date
        }
      } else {
        // No archived_date, consider user unavailable
        return false;
      }
    }
    
    // ✅ Check if user is on approved leave
    const woDateStr = format(new Date(startDate), 'yyyy-MM-dd');
    const onLeave = approvedLeaves.some(leave => {
      if (leave.employee_id !== userId) return false;
      return woDateStr >= leave.start_date && woDateStr <= leave.end_date;
    });
    
    return !onLeave;
  }, [safeUsers, approvedLeaves]);

  // Helper to check if user is on leave for the selected date
  const isUserOnLeaveForDate = (userId) => {
    if (!formData.planned_start_time) return false;
    const dateStr = format(new Date(formData.planned_start_time), 'yyyy-MM-dd');
    return approvedLeaves.some(leave => {
      if (leave.employee_id !== userId) return false;
      return dateStr >= leave.start_date && dateStr <= leave.end_date;
    });
  };

  // ✅ Helper: Check if user is archived for the selected date
  const isUserArchivedForDate = (userId) => {
    if (!formData.planned_start_time) return false;
    const user = safeUsers.find(u => u.id === userId);
    if (!user || !user.archived) return false;
    
    if (user.archived_date) {
      const archivedDate = new Date(user.archived_date);
      archivedDate.setHours(0, 0, 0, 0);
      const woDate = new Date(formData.planned_start_time);
      woDate.setHours(0, 0, 0, 0);
      return woDate >= archivedDate;
    }
    
    return user.archived;
  };

  useEffect(() => { setLiveEntry(entry); }, [entry]);

  useEffect(() => {
    if (isOpen && entry?.id) {
      (async () => {
        try {
          const rows = await base44.entities.TimeEntry.filter({ id: entry.id });
          if (Array.isArray(rows) && rows[0]) setLiveEntry(rows[0]);
        } catch (e) {
          // ignore
        }
      })();
    }
  }, [isOpen, entry?.id]);

  // Ensure WR exists with number for this order
  useEffect(() => {
    if (!entry?.id) { setWrNumber(null); return; }
    (async () => {
      try {
        let resolveBranchId = entry?.branch_id || null;
        if (!resolveBranchId) {
          try {
            const projLocal = (safeProjects || []).find(p => p.id === entry?.project_id);
            if (projLocal?.branch_id) {
              resolveBranchId = projLocal.branch_id;
            } else if (entry?.project_id) {
              const arrProj = await base44.entities.Project.filter({ id: entry.project_id }, '-updated_date', 1);
              if (Array.isArray(arrProj) && arrProj[0]?.branch_id) resolveBranchId = arrProj[0].branch_id;
            }
          } catch {}
        }
        const dateRef = entry?.start_time || entry?.planned_start_time || entry?.created_date || new Date().toISOString();
        let arr = await base44.entities.WorkingReport.filter({ time_entry_id: entry.id });
        arr = Array.isArray(arr) ? arr : [];
        // If no Clock In, do not create nor number WR; show existing only
        if (!entry?.start_time) {
          if (arr.length > 0) {
            const sorted = [...arr].sort((a,b) => {
              const ta = new Date(a.start_time || a.created_date || 0).getTime();
              const tb = new Date(b.start_time || b.created_date || 0).getTime();
              return tb - ta;
            });
            const latest = sorted[0];
            setWrNumber(latest?.report_number || null);
          } else {
            setWrNumber(null);
          }
          return;
        }
        if (arr.length === 0) {
          let code = null;
          if (resolveBranchId) {
            const res = await base44.functions.invoke('getNextWorkingReportNumber', { branch_id: resolveBranchId, date: dateRef });
            code = res?.data || null;
          }
          await base44.entities.WorkingReport.create({
            time_entry_id: entry.id,
            branch_id: resolveBranchId,
            report_number: code,
            start_time: entry?.start_time || null,
            end_time: entry?.end_time || null,
            duration_minutes: entry?.duration_minutes || null,
            team_ids: entry?.team_ids || [],
            employee_ids: entry?.employee_ids || [],
            status: 'draft'
          });
          setWrNumber(code);
        } else {
          const sorted = [...arr].sort((a,b) => {
            const ta = new Date(a.start_time || a.created_date || 0).getTime();
            const tb = new Date(b.start_time || b.created_date || 0).getTime();
            return tb - ta;
          });
          const latest = sorted[0];
          if (latest.report_number) setWrNumber(latest.report_number);
          else {
            let code = null;
            if (resolveBranchId) {
              const res = await base44.functions.invoke('getNextWorkingReportNumber', { branch_id: resolveBranchId, date: dateRef });
              code = res?.data || null;
            }
            await base44.entities.WorkingReport.update(latest.id, { report_number: code });
            setWrNumber(code);
          }
        }
      } catch { setWrNumber(null); }

      // Ensure a valid WO number exists; if invalid/missing, assign one now
      try {
        const rows = await base44.entities.TimeEntry.filter({ id: entry.id });
        const latestWO = rows?.[0] || entry;
        let current = latestWO?.work_order_number || null;
        const valid = /^\d{4}\/\d{2}$/.test(String(current || '').trim());
        if (!valid) {
          const branch = entry?.branch_id || selectedProject?.branch_id || null;
          if (branch) {
            const dateRef = entry?.created_date || entry?.planned_start_time || entry?.start_time || new Date().toISOString();
            const res = await base44.functions.invoke('getNextWorkOrderNumberAtomic', { branch_id: branch, date: dateRef });
            const won = typeof res.data === 'string' ? res.data : (res.data?.work_order_number || res.data?.number || null);
            if (won && /^\d{4}\/\d{2}$/.test(String(won))) {
              await base44.entities.TimeEntry.update(entry.id, { work_order_number: won });
              current = won;
            }
          }
        }
        setWoNumber(current || null);
      } catch { setWoNumber(null); }
    })();
  }, [entry?.id, entry?.project_id, isOpen, safeProjects]);

  useEffect(() => {
    if (entry) {
      const initialData = {
        ...entry,
        employee_ids: (() => {
          const ids = [...(entry.employee_ids || [])];
          if (entry.employee_id && !ids.includes(entry.employee_id)) ids.push(entry.employee_id);
          return ids;
        })(),
        team_ids: (() => {
          const ids = [...(entry.team_ids || [])];
          if (entry.team_id && !ids.includes(entry.team_id)) ids.push(entry.team_id);
          return ids;
        })(),
        equipment_ids: entry.equipment_ids || [],
        file_urls: entry.file_urls || [],
        other_file_urls: entry.other_file_urls || [],
        planned_start_time: entry.planned_start_time || new Date().toISOString(),
        planned_end_time: entry.planned_end_time || addDays(new Date(), 1).toISOString(),
        is_repeating: entry.is_repeating || false,
        recurrence_type: entry.recurrence_type || 'daily',
        recurrence_end_date: entry.recurrence_end_date || '',
        skip_weekends: entry.skip_weekends || false,
        moved_from_sunday: entry.moved_from_sunday || false,
        work_description_items: entry.work_description_items || [],
        work_done_items: entry.work_done_items || [],
        spare_parts_items: entry.spare_parts_items || [],
        work_pending_items: entry.work_pending_items || [],
        spare_parts_pending_items: entry.spare_parts_pending_items || [],
        job_completion_status: entry.job_completion_status || '',
        client_feedback_comments: entry.client_feedback_comments || '',
        client_representative_name: entry.client_representative_name || '',
        client_representative_phone: entry.client_representative_phone || ''
      };
      setFormData(initialData);
      const initialExpanded = {};
      (entry.team_ids || []).forEach(teamId => {
        initialExpanded[teamId] = true;
      });
      setExpandedTeams(initialExpanded);
    } else {
      const initialData = {
        title: '',
        project_id: '',
        work_order_category_id: '',
        shift_type_id: '',
        status: 'open',
        task_status: '',
        work_notes: '',
        planned_start_time: new Date().toISOString(),
        planned_end_time: addDays(new Date(), 1).toISOString(),
        employee_ids: [],
        team_ids: [],
        equipment_ids: [],
        is_repeating: false,
        recurrence_type: 'daily',
        recurrence_end_date: '',
        skip_weekends: false,
        moved_from_sunday: false,
        file_urls: [],
        other_file_urls: [],
        work_description_items: [],
        work_done_items: [],
        spare_parts_items: [],
        work_pending_items: [],
        spare_parts_pending_items: [],
        job_completion_status: '',
        client_feedback_comments: '',
        client_representative_name: '',
        client_representative_phone: ''
      };
      setFormData(initialData);
      setExpandedTeams({});
    }
  }, [entry, isOpen]);

  const selectedProject = safeProjects.find(p => p.id === formData.project_id);
  const selectedCustomer = selectedProject ? safeCustomers.find(c => c.id === selectedProject.customer_id) : null;



  const openWorkOrders = React.useMemo(() => {
  const list = Array.isArray(allEntries) ? allEntries : [];
  const filtered = list.filter(e => {
    const s = (e.status || '').toLowerCase();
    const ts = (e.task_status || '').toLowerCase();
    const isClosed = s === 'closed' || ts === 'closed' || ts === 'cancelled';
    const matchProject = !formData.project_id || e.project_id === formData.project_id;
    const notArchived = !e.archived;
    return !isClosed && matchProject && notArchived;
  });

    // Agrupar por (proyecto + título normalizado) y quedarse con la fecha de creación más antigua
    const groups = new Map();
    const norm = (s) => (s || '').trim().toLowerCase();

    filtered.forEach(e => {
      const key = `${e.project_id || ''}||${norm(e.title)}`;
      const created = e.created_date || e.updated_date || e.planned_start_time || null;
      if (!groups.has(key)) {
        groups.set(key, { first: e, earliest: created });
      } else {
        const g = groups.get(key);
        // Actualizar si encontramos una fecha más antigua
        if (created && g.earliest && new Date(created) < new Date(g.earliest)) {
          g.earliest = created;
          g.first = e; // conservar un id representativo
        }
        if (!g.earliest && created) {
          g.earliest = created;
        }
      }
    });

    // Devolver una lista deduplicada, conservando _earliest_created para mostrar
    return Array.from(groups.values()).map(g => ({ ...g.first, _earliest_created: g.earliest }));
  }, [allEntries, formData.project_id]);

  // ✅ NUEVA LÓGICA: Igual que LIST VIEW
  const getWorkOrderSequence = () => {
    if (!entry?.planned_start_time) {
      return null;
    }

    try {
      const entryDate = parseISO(entry.planned_start_time);
      
      // ✅ Usar el PRIMER team asignado (como list view)
      // Note: entry.team_id (singular) might be a legacy field or a computed one.
      // Prioritize entry.team_ids array for consistency with formData.
      const entryTeamId = entry.team_ids && entry.team_ids.length > 0 ? entry.team_ids[0] : null;

      if (!entryTeamId) return null;

      // ✅ Filtrar entries del MISMO DÍA y MISMO TEAM
      const dayEntries = (allEntries || []).filter(e => {
        if (!e.planned_start_time) return false;
        
        const eDate = parseISO(e.planned_start_time);
        if (!isSameDay(eDate, entryDate)) return false;
        
        // ✅ Comparar por PRIMER team
        const eTeamId = e.team_ids && e.team_ids.length > 0 ? e.team_ids[0] : null;
        return eTeamId === entryTeamId;
      });

      // ✅ Ordenar por HORA (cronológico)
      dayEntries.sort((a, b) => {
        const timeA = a.planned_start_time ? parseISO(a.planned_start_time).getTime() : 0;
        const timeB = b.planned_start_time ? parseISO(b.planned_start_time).getTime() : 0;
        return timeA - timeB;
      });

      const position = dayEntries.findIndex(e => e.id === entry.id) + 1;
      const total = dayEntries.length;

      return { position, total };
    } catch (error) {
      console.warn('Error calculating WO sequence:', error);
      return null;
    }
  };

  const woSequence = getWorkOrderSequence();

  const handleFileUpload = async (event, fileType = 'working_reports') => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    if (fileType === 'working_reports') {
      setIsUploadingFiles(true);
    } else {
      setIsUploadingOtherFiles(true);
    }

    try {
      const uploadedUrls = [];
      
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file }); 
        uploadedUrls.push(file_url);
      }

      if (fileType === 'working_reports') {
        setFormData(prev => ({
          ...prev,
          file_urls: [...(prev.file_urls || []), ...uploadedUrls]
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          other_file_urls: [...(prev.other_file_urls || []), ...uploadedUrls]
        }));
      }

      toast.success(`${files.length} file(s) uploaded successfully`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
    } finally {
      if (fileType === 'working_reports') {
        setIsUploadingFiles(false);
      } else {
        setIsUploadingOtherFiles(false);
      }
      event.target.value = '';
    }
  };

  const handleRemoveFile = (indexToRemove, fileType = 'working_reports') => {
    if (fileType === 'working_reports') {
      setFormData(prev => ({
        ...prev,
        file_urls: (prev.file_urls || []).filter((_, index) => index !== indexToRemove)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        other_file_urls: (prev.other_file_urls || []).filter((_, index) => index !== indexToRemove)
      }));
    }
    toast.success('File removed');
  };

  const handleSave = async () => {
    if (!formData.project_id) {
      toast.error('Please select a project');
      return;
    }

    if (!formData.planned_start_time) {
      toast.error('Please select a start time');
      return;
    }

    if (!formData.team_ids || formData.team_ids.length === 0) {
      toast.error('Please assign at least one team to this work order');
      return;
    }

    if (!formData.work_order_category_id) {
      toast.error('Please select a category');
      return;
    }
    
    onSave(formData);
  };

  const handleDelete = () => {
    if (!onDelete || typeof onDelete !== 'function') {
      console.error('❌ onDelete is not a function:', onDelete);
      toast.error('Delete function not available');
      return;
    }

    if (!entry?.id) {
      console.error('❌ No work order ID to delete');
      toast.error('Cannot delete: Work order ID not found');
      return;
    }

    if (window.confirm('Are you sure you want to delete this work order? This action cannot be undone.')) {
      console.log('🗑️ Deleting work order:', entry.id);
      onDelete(entry.id);
    }
  };

  const handleExportPDF = async () => {
    if (!entry?.id) return;
    
    // Prepare data for PDF
    const assignedAssets = projectAssets.filter(a => (entry.equipment_ids || []).includes(a.id));
    const assignedUsers = safeUsers.filter(u => (entry.employee_ids || []).includes(u.id));
    const assignedTeams = safeTeams.filter(t => (entry.team_ids || []).includes(t.id));
    const woCategory = safeCategories.find(c => c.id === entry.work_order_category_id);
    const shiftType = safeShiftTypes.find(s => s.id === entry.shift_type_id);
    
    // Get branch
    let branchData = null;
    if (entry.branch_id) {
      const { Branch } = await import('@/entities/all');
      branchData = await Branch.get(entry.branch_id);
    } else if (selectedProject?.branch_id) {
      const { Branch } = await import('@/entities/all');
      branchData = await Branch.get(selectedProject.branch_id);
    }
    
    setShowPDFDialog({
      workOrder: entry,
      project: selectedProject,
      customer: selectedCustomer,
      branch: branchData,
      assignedUsers,
      assignedTeams,
      assignedAssets,
      woCategory,
      shiftType
    });
  };

  // Get header background color from category
  const getHeaderBackgroundColor = () => {
    if (formData.work_order_category_id) {
      const category = safeCategories.find(c => c.id === formData.work_order_category_id);
      if (category && category.color) {
        return categoryColorMap[category.color] || '#A2231D';
      }
    }
    return '#A2231D'; // Default dark red
  };

  const handleDateTimeChange = (field, date) => {
    if (!date) {
      setFormData({ ...formData, [field]: '' });
      return;
    }

    const currentValue = formData[field];
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

    console.log('📅 Date changed:', {
      field,
      selectedDate: date,
      localDateTime: newDateTime.toString(),
      isoString: newDateTime.toISOString()
    });

    setFormData({ ...formData, [field]: newDateTime.toISOString() });
  };

  const handleTimeChange = (field, time) => {
    if (!time) return;

    const [hours, minutes] = time.split(':').map(Number);
    let newDateTime;

    if (formData[field]) {
      newDateTime = new Date(formData[field]);
    }
    else if (field === 'planned_end_time' && formData.planned_start_time) {
      newDateTime = new Date(formData.planned_start_time);
    }
    else {
      newDateTime = new Date();
    }

    const year = newDateTime.getFullYear();
    const month = newDateTime.getMonth();
    const day = newDateTime.getDate();

    newDateTime = new Date(year, month, day, hours, minutes, 0, 0);

    setFormData({ ...formData, [field]: newDateTime.toISOString() });
  };

  const handleShiftTypeChange = (shiftTypeId) => {
    const selectedShift = safeShiftTypes.find(s => s.id === shiftTypeId);

    if (selectedShift && selectedShift.start_time && selectedShift.end_time) {
      let baseDate;
      if (formData.planned_start_time) {
        baseDate = new Date(formData.planned_start_time);
      } else {
        baseDate = new Date();
      }

      const [startHours, startMinutes] = selectedShift.start_time.split(':').map(Number);
      const startDateTime = new Date(baseDate);
      startDateTime.setHours(startHours, startMinutes, 0, 0);

      const [endHours, endMinutes] = selectedShift.end_time.split(':').map(Number);
      const endDateTime = new Date(baseDate);
      endDateTime.setHours(endHours, endMinutes, 0, 0);

      if (endDateTime <= startDateTime) {
        endDateTime.setDate(endDateTime.getDate() + 1);
      }

      setFormData({
        ...formData,
        shift_type_id: shiftTypeId,
        planned_start_time: startDateTime.toISOString(),
        planned_end_time: endDateTime.toISOString()
      });
    } else {
      setFormData({ ...formData, shift_type_id: shiftTypeId });
    }
  };

  const projectAssets = useMemo(() => {
    // Fallback: todos los equipos (compañía + cliente)
    const allCombined = [...safeAssets, ...safeClientEquipments].filter(Boolean);

    // Si no hay proyecto seleccionado, mostrar todos los equipos para que siempre se pueda asignar
    if (!formData.project_id) return allCombined;
    
    const selectedProject = safeProjects.find(p => p.id === formData.project_id);
    
    // 1) Activos de la compañía vinculados al proyecto
    const companyAssets = safeAssets.filter(a => a.project_id === formData.project_id);
    
    // 2) Equipos del cliente vinculados al proyecto
    const clientEquipmentsByProjectId = safeClientEquipments.filter(e => e.project_id === formData.project_id);
    
    // 3) Equipos del cliente vinculados vía project.client_equipment_ids
    let clientEquipmentsByLink = [];
    if (selectedProject && Array.isArray(selectedProject.client_equipment_ids) && selectedProject.client_equipment_ids.length > 0) {
      const linkedEquipmentIds = selectedProject.client_equipment_ids;
      clientEquipmentsByLink = safeClientEquipments.filter(e => {
        const isLinked = linkedEquipmentIds.includes(e.id);
        const notAlreadyIncluded = !clientEquipmentsByProjectId.some(ce => ce.id === e.id);
        return isLinked && notAlreadyIncluded;
      });
    }

    // Combinar y desduplicar por id
    const combined = [...companyAssets, ...clientEquipmentsByProjectId, ...clientEquipmentsByLink];
    const unique = combined.filter((item, index, self) => index === self.findIndex(t => t.id === item.id));

    // Si no hay nada vinculado, NO mostrar ningún equipo
    return unique.length > 0 ? unique : [];
  }, [safeAssets, safeClientEquipments, formData.project_id, safeProjects]);

  const handleEquipmentToggle = (equipmentId) => {
    const currentEquipment = formData.equipment_ids || [];
    const newEquipment = currentEquipment.includes(equipmentId)
      ? currentEquipment.filter(id => id !== equipmentId)
      : [...currentEquipment, equipmentId];
    setFormData({ ...formData, equipment_ids: newEquipment });
  };

  const handleTeamToggle = (teamId) => {
    const currentTeamIds = formData.team_ids || [];
    const currentEmployeeIds = formData.employee_ids || [];

    const isSelected = currentTeamIds.includes(teamId);
    // ✅ Filter archived users AND users on leave for this date
    const teamUsers = safeUsers
      .filter(u => u.team_id === teamId && isUserAvailableForDate(u.id, formData.planned_start_time))
      .map(u => u.id);

    if (isSelected) {
      setFormData({
        ...formData,
        team_ids: currentTeamIds.filter(id => id !== teamId),
        employee_ids: currentEmployeeIds.filter(id => !teamUsers.includes(id))
      });
      setExpandedTeams(prev => ({ ...prev, [teamId]: false }));
    } else {
      setFormData({
        ...formData,
        team_ids: [...currentTeamIds, teamId],
        employee_ids: [...new Set([...currentEmployeeIds, ...teamUsers])]
      });
      setExpandedTeams(prev => ({ ...prev, [teamId]: true }));
    }
  };

  const handleUserToggle = (userId) => {
    const currentEmployeeIds = formData.employee_ids || [];
    const currentTeamIds = formData.team_ids || [];
    
    const isAddingUser = !currentEmployeeIds.includes(userId);
    const newEmployeeIds = isAddingUser
      ? [...currentEmployeeIds, userId]
      : currentEmployeeIds.filter(id => id !== userId);

    let newTeamIds = [...currentTeamIds];
    const user = safeUsers.find(u => u.id === userId);
    
    if (user && user.team_id) {
      if (isAddingUser) {
        // User is being added
        if (!newTeamIds.includes(user.team_id)) {
          newTeamIds.push(user.team_id);
          console.log(`✅ [AUTO-ASSIGN] Added team ${user.team_id} for user ${userId}`);
          toast.info(`Team automatically assigned for ${user.nickname || user.first_name || 'user'}`);
        }
      } else {
        // User is being removed
        // ✅ Filter available users (not archived, not on leave)
        const otherUsersFromSameTeam = newEmployeeIds.filter(id => {
          const otherUser = safeUsers.find(u => u.id === id);
          if (!otherUser || otherUser.team_id !== user.team_id) return false;
          return isUserAvailableForDate(id, formData.planned_start_time);
        });
        
        if (otherUsersFromSameTeam.length === 0 && newTeamIds.includes(user.team_id)) {
          // No more users from that team are selected, remove the team
          newTeamIds = newTeamIds.filter(id => id !== user.team_id);
          console.log(`🗑️ [AUTO-REMOVE] Removed team ${user.team_id} - no more users from this team are selected.`);
        }
      }
    }

    setFormData({ 
      ...formData, 
      employee_ids: newEmployeeIds,
      team_ids: newTeamIds
    });
  };

  const toggleTeamExpansion = (teamId) => {
    setExpandedTeams(prev => ({ ...prev, [teamId]: !prev[teamId] }));
  };

  const handleRemoveTeam = (teamId) => {
    // ✅ Filter available users (not archived, not on leave)
    const teamUsers = safeUsers
      .filter(u => u.team_id === teamId && isUserAvailableForDate(u.id, formData.planned_start_time))
      .map(u => u.id);
    setFormData({
      ...formData,
      team_ids: (formData.team_ids || []).filter(id => id !== teamId),
      employee_ids: (formData.employee_ids || []).filter(id => !teamUsers.includes(id))
    });
    setExpandedTeams(prev => ({ ...prev, [teamId]: false }));
  };

  const selectedTeams = safeTeams.filter(t => (formData.team_ids || []).includes(t.id));

  return (
  <>
  <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        ref={sheetContentRef}
        side="right"
        className="w-full sm:max-w-[600px] p-0 flex flex-col !overflow-y-auto"
        hideCloseButton
      >
        <SheetHeader className="px-6 py-3 border-b flex-shrink-0" style={{ backgroundColor: getHeaderBackgroundColor() }}>
          <div className="space-y-1.5">
            {/* Row 1: Title */}
            <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-bold text-white">
              Working Order Instructions
            </SheetTitle>
            <div className="flex items-center gap-2">
              {!isCreating && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPDF}
                  disabled={isGeneratingPDF}
                  className="h-8 gap-1.5 text-xs bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  {isGeneratingPDF ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Eye className="w-3 h-3" />
                  )}
                  View PDF
                </Button>
              )}
              <span className="text-xs text-white/80">Order status:</span>
              <Select
                value={formData.status || 'open'}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
                disabled={isReadOnly && !createMode}
              >
                <SelectTrigger className={cn(
                  "h-8 w-28 text-xs border-0",
                  formData.status === 'open' ? "bg-green-500 text-white" : "bg-slate-400 text-white"
                )}>
                  <SelectValue>
                    {formData.status === 'open' ? 'Open' : 'Closed'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            </div>
            
            {/* Row 2: Report number + meta */}
            {!isCreating && (
              <div className="text-white/90 space-y-0.5">
                <div className="text-sm font-medium">
                  Working order N: {(woNumber || entry?.work_order_number) ? formatWONumberSmart(woNumber || entry?.work_order_number, entry?.start_time || entry?.planned_start_time || entry?.created_date) : ''}
                </div>
                <div className="text-sm font-medium">
                  {`Working report N: ${wrNumber || '-'}`}
                </div>
                <div className="text-xs text-white/80">
                  {`Working Order: ${entry?.title || 'Untitled'}, created on ${
                    entry?.created_date ? format(new Date(entry.created_date), 'dd/MM/yy') : format(new Date(), 'dd/MM/yy')
                  }.`}
                </div>
                {formData.moved_from_sunday && (
                  <Badge variant="outline" className="bg-orange-500/30 text-orange-200 border-orange-400 text-[10px] h-5">
                    ⚠️ Moved from Sunday
                  </Badge>
                )}
              </div>
            )}

            {/* Row 3: Customer, Project, Category, Users */}
            {!isCreating && (
              <div className="text-xs text-white/80 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Order (equipment) first */}
                  {formData.equipment_ids && formData.equipment_ids.length > 0 && (() => {
                    const id = formData.equipment_ids[0];
                    const eq = safeAssets.find(a => a.id === id) || safeClientEquipments.find(e => e.id === id);
                    return eq ? (
                      <span className="font-medium text-white">Order: {eq.name}</span>
                    ) : null;
                  })()}
                  {selectedProject && (
                    <>
                      <span className="text-white/50">•</span>
                      <span>{selectedProject.name}</span>
                    </>
                  )}
                  {selectedCustomer && (
                    <>
                      <span className="text-white/50">•</span>
                      <span className="font-medium text-white">{selectedCustomer.name}</span>
                    </>
                  )}
                  {formData.work_order_category_id && (() => {
                    const category = safeCategories.find(c => c.id === formData.work_order_category_id);
                    return category ? (
                      <>
                        <span className="text-white/50">•</span>
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-white/20 border-white/40 text-white">
                          {category.name}
                        </Badge>
                      </>
                    ) : null;
                  })()}
                </div>
                {formData.employee_ids && formData.employee_ids.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-white/80">Workers assigned on this schedule:</span>
                      <span className="text-white/90">
                        {(formData.employee_ids || [])
                          .map(userId => {
                          const user = safeUsers.find(u => u.id === userId);
                          if (!user) return null;
                          const userName = user.nickname || user.first_name || user.full_name?.split(' ')[0] || user.email;
                          return userName;
                        })
                        .filter(Boolean)
                        .join(', ')
                      }
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </SheetHeader>
        <Tabs defaultValue="order" className="flex-1 flex flex-col min-h-0">
          <TabsList className="border-b border-slate-200 rounded-none bg-transparent p-0 h-auto flex-shrink-0 px-6">
            <TabsTrigger
              value="order"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-4 py-2"
            >
              Order
            </TabsTrigger>
            <TabsTrigger
              value="report"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-4 py-2"
            >
              Report
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-4 py-2"
            >
              Documents
            </TabsTrigger>
            {!isCreating && (
              <TabsTrigger
                value="activity"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent px-4 py-2"
              >
                Activity
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent 
            ref={detailsTabRef} 
            value="order" 
              className="p-6 space-y-6 mt-0 flex-1 overflow-y-auto min-h-0"

            // style={{ 
            //   overflowY: 'scroll',
            //   maxHeight: '100%',
            //   height: '100%',
            //   display: 'block'
            // }}
          >
            {/* Section: General Information */}
            <div className="rounded-xl border border-red-400 bg-white shadow-sm mt-0">
              <div className="bg-red-50 px-4 py-3 border-b border-red-200 rounded-t-xl">
                <h3 className="text-sm font-semibold text-red-900">
                  1. General Information
                </h3>
              </div>
              <div className="p-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Project <span className="text-red-500">*</span>
              </label>
              <ProjectCombobox
                projects={safeProjects}
                customers={safeCustomers}
                selectedProjectId={formData.project_id}
                onSelectProject={(projectId) => setFormData({ ...formData, project_id: projectId })}
                disabled={isReadOnly && !createMode}
              />
            </div>

            {/* 3) Optional: pick an open job order to edit instead of creating */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Working Orders
              </label>
              <Select
                value=""
                onValueChange={(val) => {
                  if (!val) return;
                  if (val === '__create_new__') {
                    // Enter local create mode and reset form
                    setCreateMode(true);
                    setFormData({
                      title: '',
                      project_id: '',
                      work_order_category_id: '',
                      shift_type_id: '',
                      status: 'open',
                      task_status: '',
                      work_notes: '',
                      planned_start_time: new Date().toISOString(),
                      planned_end_time: addDays(new Date(), 1).toISOString(),
                      employee_ids: [],
                      team_ids: [],
                      equipment_ids: [],
                      is_repeating: false,
                      recurrence_type: 'daily',
                      recurrence_end_date: '',
                      skip_weekends: false,
                      moved_from_sunday: false,
                      file_urls: [],
                      other_file_urls: [],
                      work_description_items: [],
                      work_done_items: [],
                      spare_parts_items: [],
                      work_pending_items: [],
                      spare_parts_pending_items: [],
                      job_completion_status: '',
                      client_feedback_comments: '',
                      client_representative_name: '',
                      client_representative_phone: ''
                    });
                    if (onCreateNewWorkOrder) onCreateNewWorkOrder();
                    return;
                  }
                  const existing = openWorkOrders.find(e => e.id === val);
                  if (existing && onSelectExistingWorkOrder) {
                    onSelectExistingWorkOrder(existing);
                  }
                }}
                disabled={isReadOnly && !createMode}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select or create a working order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__create_new__">+ Create new Working Order</SelectItem>
                  {openWorkOrders.map((wo) => {
                    const proj = safeProjects.find(p => p.id === wo.project_id);
                    const label = `${(wo.title || proj?.name || 'Untitled')} • ${wo._earliest_created ? 'created on ' + format(parseISO(wo._earliest_created), 'dd/MM/yy') : ''}`;
                    return (
                      <SelectItem key={wo.id} value={wo.id}>{label}</SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* 4) Title */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Title
              </label>
              <Input
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Write a short title for this work order"
                disabled={isReadOnly && !createMode}
              />
            </div>


            {/* Equipment Selector - only visible when project is selected */}
            {formData.project_id && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  Equipment / Assets
                </label>
                {projectAssets.length === 0 ? (
                  <div className="text-xs text-slate-500 p-2 bg-slate-50 rounded-lg border border-slate-200">
                    No equipment assigned to this project
                  </div>
                ) : (
                  <div className="space-y-0.5 max-h-[100px] overflow-y-auto border border-slate-200 rounded-lg p-1.5">
                    {projectAssets.map(asset => {
                      const isSelected = (formData.equipment_ids || []).includes(asset.id);
                      return (
                        <div
                          key={asset.id}
                          className={cn(
                            "flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 cursor-pointer transition-colors",
                            isSelected && "bg-indigo-50"
                          )}
                          onClick={() => !isReadOnly && handleEquipmentToggle(asset.id)}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              if (!isReadOnly) handleEquipmentToggle(asset.id);
                            }}
                            disabled={isReadOnly && !createMode}
                            className="h-3.5 w-3.5 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <span className="text-xs font-medium truncate">{asset.name}</span>
                            {(asset.category || asset.brand) && (
                              <span className="text-[10px] text-slate-400">{asset.category || asset.brand}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {formData.equipment_ids && formData.equipment_ids.length > 0 && (
                  <div className="mt-1 text-xs text-slate-600">
                    <div className="flex flex-wrap gap-1.5">
                      {formData.equipment_ids.map((id) => {
                        const eq = projectAssets.find(a => a.id === id) || safeAssets.find(a => a.id === id) || safeClientEquipments.find(e => e.id === id);
                        if (!eq) return null;
                        return (
                          <span key={id} className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded">
                            {eq.name}
                          </span>
                        );
                      })}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">{formData.equipment_ids.length} equipment selected</div>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Category of Work Order <span className="text-red-500">*</span>
              </label>
              <CategoryCombobox
                categories={safeCategories}
                selectedCategoryId={formData.work_order_category_id}
                onSelectCategory={(categoryId) => setFormData({ ...formData, work_order_category_id: categoryId })}
                disabled={isReadOnly && !createMode}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Choose shift time or select from the boxes below
              </label>
              <ShiftTypeCombobox
                shiftTypes={safeShiftTypes}
                selectedShiftTypeId={formData.shift_type_id}
                onSelectShiftType={handleShiftTypeChange}
                disabled={isReadOnly && !createMode}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Instructions planned time (start and finish)
              </label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">
                  Date <span className="text-red-500">*</span>
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-9 text-xs",
                        !formData.planned_start_time && "text-slate-400"
                      )}
                      disabled={isReadOnly && !createMode}
                    >
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                      {formData.planned_start_time
                        ? format(new Date(formData.planned_start_time), 'MMM d, yyyy')
                        : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.planned_start_time ? new Date(formData.planned_start_time) : undefined}
                      onSelect={(date) => handleDateTimeChange('planned_start_time', date)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">
                  Start Time
                </label>
                <div className="relative">
                 <Clock className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                 <Input
                   type="time"
                   value={formData.planned_start_time ? format(new Date(formData.planned_start_time), 'HH:mm') : ''}
                   onChange={(e) => handleTimeChange('planned_start_time', e.target.value)}
                   className="pl-7 h-9 text-xs"
                   disabled={isReadOnly && !createMode}
                 />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">
                  End Time
                </label>
                <div className="flex gap-1">
                  <div className="relative flex-1">
                    <Clock className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input
                      type="time"
                      value={formData.planned_end_time ? format(new Date(formData.planned_end_time), 'HH:mm') : ''}
                      onChange={(e) => handleTimeChange('planned_end_time', e.target.value)}
                      className="pl-7 h-9 text-xs"
                      disabled={isReadOnly && !createMode}
                    />
                  </div>
                  {formData.planned_start_time && !isReadOnly && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="px-1.5 h-9 text-xs"
                          type="button"
                        >
                          +H
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(hours => (
                          <DropdownMenuItem
                            key={hours}
                            onClick={() => {
                              const startTime = new Date(formData.planned_start_time);
                              const endTime = new Date(startTime.getTime() + hours * 60 * 60 * 1000);
                              setFormData({ ...formData, planned_end_time: endTime.toISOString() });
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
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                Instructions from Management
              </label>
              <DynamicChecklist
                items={formData.work_description_items}
                onChange={(items) => setFormData({ ...formData, work_description_items: items })}
                placeholder="Add instruction..."
                disabled={isReadOnly && !createMode}
                showSequence
              />
            </div>

            {/* Repeating Work Instructions */}
            <div className="space-y-3 p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Repeating Work Instructions
                  </label>
                  <p className="text-xs text-slate-500">Create multiple work orders automatically</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.is_repeating || false}
                  onChange={(e) => {
                    console.log('🔄 [EDIT WO] Toggling is_repeating:', e.target.checked);
                    setFormData({ ...formData, is_repeating: e.target.checked });
                  }}
                  disabled={isReadOnly && !createMode}
                  className="h-5 w-9 cursor-pointer"
                  style={{
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    backgroundColor: formData.is_repeating ? '#0f172a' : '#cbd5e1',
                    borderRadius: '9999px',
                    position: 'relative',
                    transition: 'background-color 0.2s'
                  }}
                />
              </div>

              {formData.is_repeating && (
                <>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                      Recurrence Pattern
                    </label>
                    <Select
                      value={formData.recurrence_type || 'daily'}
                      onValueChange={(value) => {
                        console.log('📝 [EDIT WO] Recurrence type changed:', value);
                        setFormData({ ...formData, recurrence_type: value });
                      }}
                      disabled={isReadOnly && !createMode}
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {formData.recurrence_type === 'daily' && 'Daily'}
                          {formData.recurrence_type === 'weekly' && 'Weekly'}
                          {formData.recurrence_type === 'monthly' && 'Monthly'}
                          {!formData.recurrence_type && 'Select pattern'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                      Repeat Until
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.recurrence_end_date && "text-slate-400"
                          )}
                          disabled={isReadOnly && !createMode}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.recurrence_end_date
                            ? format(new Date(formData.recurrence_end_date), 'MMM d, yyyy')
                            : 'Pick end date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.recurrence_end_date ? new Date(formData.recurrence_end_date) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const endOfDay = new Date(date);
                              endOfDay.setHours(23, 59, 59, 999);
                              console.log('📅 [EDIT WO] Recurrence end date set:', endOfDay.toISOString());
                              setFormData({ ...formData, recurrence_end_date: endOfDay.toISOString() });
                            }
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                    <input
                      type="checkbox"
                      id="skip-weekends-edit-section1"
                      checked={formData.skip_weekends || false}
                      onChange={(e) => {
                        console.log('☑️ [EDIT WO] Skip weekends changed:', e.target.checked);
                        setFormData({ ...formData, skip_weekends: e.target.checked });
                      }}
                      disabled={isReadOnly && !createMode}
                      className="h-4 w-4 cursor-pointer"
                    />
                    <Label htmlFor="skip-weekends-edit-section1" className="text-xs font-normal cursor-pointer">
                      Skip Sundays - Move to Saturday with note
                    </Label>
                  </div>
                </>
              )}
            </div>
              </div>
            </div>



            {/* Section: Assigned Resources */}
            <div className="rounded-xl border border-red-400 bg-white shadow-sm mt-6">
              <div className="bg-red-50 px-4 py-3 border-b border-red-200 rounded-t-xl">
                <h3 className="text-sm font-semibold text-red-900">
                  2. Assigned Resources
                </h3>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-700">
                      Assigned Teams <span className="text-red-500">*</span>
                    </label>
                    {!isReadOnly && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowTeamReassignment(true);
                        }}
                        className="text-xs h-7 gap-1"
                        type="button"
                      >
                        <UsersIcon className="w-3 h-3" />
                        Manage Teams
                      </Button>
                    )}
                  </div>

              {selectedTeams.length > 0 && (
                <div className="mb-3 space-y-2">
                  {/* ✅ Teams Display */}
                  <div className="flex flex-wrap gap-2">
                    {selectedTeams.map(team => (
                      <Badge
                        key={team.id}
                        variant="secondary"
                        className="text-xs px-2 py-1 gap-1 bg-indigo-100 text-indigo-700"
                      >
                        <UsersIcon className="w-3 h-3" />
                        {team.name}
                        {!isReadOnly && (
                          <button
                            onClick={() => handleRemoveTeam(team.id)}
                            className="ml-1 hover:bg-indigo-200 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </Badge>
                    ))}
                  </div>

                  {/* ✅ Assigned Users Display - filter out users on leave and archived */}
                  {(formData.employee_ids && formData.employee_ids.length > 0) && (() => {
                    const availableUsers = formData.employee_ids.filter(userId => 
                      isUserAvailableForDate(userId, formData.planned_start_time)
                    );
                    const unavailableCount = formData.employee_ids.length - availableUsers.length;
                    
                    return (
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="text-xs font-medium text-slate-600 mb-2 flex items-center justify-between">
                          <span>Assigned Users ({availableUsers.length})</span>
                          {unavailableCount > 0 && (
                            <span className="text-[10px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                              {unavailableCount} unavailable
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {formData.employee_ids.map(userId => {
                            const user = safeUsers.find(u => u.id === userId);
                            if (!user) return null;
                            const userName = user.nickname || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.full_name || user.email;
                            const isAvailable = isUserAvailableForDate(userId, formData.planned_start_time);
                            const onLeave = isUserOnLeaveForDate(userId);
                            const archived = isUserArchivedForDate(userId);
                            
                            return (
                              <div
                                key={userId}
                                className={cn(
                                  "flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded text-xs group hover:border-slate-300 transition-colors",
                                  !isAvailable && "opacity-50 border-amber-300 bg-amber-50"
                                )}
                              >
                                <Avatar user={user} size="xs" />
                                <span className="text-slate-700">{userName}</span>
                                {onLeave && (
                                  <span className="text-[8px] text-amber-600 bg-amber-100 px-1 py-0.5 rounded">
                                    🏖️
                                  </span>
                                )}
                                {archived && !onLeave && (
                                  <span className="text-[8px] text-slate-500 bg-slate-100 px-1 py-0.5 rounded">
                                    📦
                                  </span>
                                )}
                                {!isReadOnly && (
                                  <button
                                    onClick={() => handleUserToggle(userId)}
                                    className="ml-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded-full p-0.5 transition-opacity"
                                    title="Remove user"
                                  >
                                    <X className="w-3 h-3 text-red-600" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="border border-slate-200 rounded-lg p-2 max-h-[200px] overflow-y-auto">
                {safeTeams.length === 0 ? (
                  <div className="text-xs text-slate-500 text-center py-2">
                    No teams available
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1">
                    {safeTeams.map(team => {
                      const isSelected = (formData.team_ids || []).includes(team.id);
                      // ✅ Only show available users (not archived, not on leave)
                      const teamUsers = safeUsers.filter(u => 
                        u.team_id === team.id && 
                        isUserAvailableForDate(u.id, formData.planned_start_time)
                      );
                      const isExpanded = expandedTeams[team.id];

                      return (
                        <div key={team.id} className={cn("rounded", isExpanded && "col-span-2")}>
                          <div
                            className={cn(
                              "flex items-center gap-1.5 p-1.5 rounded transition-colors cursor-pointer",
                              isSelected ? "bg-indigo-50" : "hover:bg-slate-50"
                            )}
                            onClick={() => !isReadOnly && handleTeamToggle(team.id)}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                if (!isReadOnly) handleTeamToggle(team.id);
                              }}
                              disabled={isReadOnly && !createMode}
                              className="h-3.5 w-3.5 cursor-pointer"
                            />
                            <TeamAvatar team={team} size="xs" />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium truncate">{team.name}</div>
                            </div>
                            {isSelected && teamUsers.length > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTeamExpansion(team.id);
                                }}
                                className="p-0.5 hover:bg-indigo-100 rounded transition-colors"
                                disabled={isReadOnly && !createMode}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-3 h-3 text-slate-500" />
                                ) : (
                                  <ChevronDown className="w-3 h-3 text-slate-500" />
                                )}
                              </button>
                            )}
                          </div>

                          {isSelected && isExpanded && teamUsers.length > 0 && (
                            <div className="ml-5 mt-0.5 space-y-0.5 pl-2 border-l border-indigo-200">
                              {teamUsers.map(user => {
                                const isUserSelected = (formData.employee_ids || []).includes(user.id);
                                const userName = user.nickname || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.full_name || user.email;
                                const onLeave = isUserOnLeaveForDate(user.id);
                                const archived = isUserArchivedForDate(user.id);
                                const isUnavailable = onLeave || archived;

                                return (
                                  <div
                                    key={user.id}
                                    className={cn(
                                      "flex items-center gap-1.5 p-1 rounded cursor-pointer hover:bg-slate-50 transition-colors",
                                      isUserSelected && "bg-blue-50",
                                      isUnavailable && "opacity-50 cursor-not-allowed"
                                    )}
                                    onClick={() => !isReadOnly && !isUnavailable && handleUserToggle(user.id)}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isUserSelected}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        if (!isReadOnly && !isUnavailable) handleUserToggle(user.id);
                                      }}
                                      disabled={isReadOnly || isUnavailable}
                                      className="h-3 w-3 cursor-pointer"
                                    />
                                    <Avatar user={user} size="xs" />
                                    <span className="text-[10px]">{userName}</span>
                                    {onLeave && (
                                      <span className="text-[8px] text-amber-600 bg-amber-100 px-1 py-0.5 rounded ml-1">
                                        🏖️ Leave
                                      </span>
                                    )}
                                    {archived && !onLeave && (
                                      <span className="text-[8px] text-slate-500 bg-slate-100 px-1 py-0.5 rounded ml-1">
                                        📦 Archived
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

              </div>
            </div>




          </TabsContent>

          <TabsContent 
            ref={documentsTabRef} 
            value="report" 
            className="p-6 space-y-6 mt-0 flex-1"
          >
            {/* Section 3: Site Report */}
            <div className="rounded-xl border border-red-400 bg-white shadow-sm mt-6">
              <div className="bg-red-50 px-4 py-3 border-b border-red-200 rounded-t-xl">
                <h3 className="text-sm font-semibold text-red-900">
                  3. Site Report
                </h3>
                <p className="text-xs text-red-700 mt-0.5">To be filled from field workers</p>
              </div>
              <div className="p-4 space-y-6">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 block">
                    Task realized / Spare supplied
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
                          items={formData.work_done_items}
                          onChange={(items) => setFormData({ ...formData, work_done_items: items })}
                          placeholder="Describe work done..."
                          disabled={isReadOnly && !createMode}
                        />
                      </TabsContent>
                      <TabsContent value="spare_parts" className="p-4">
                        <DynamicChecklist
                          items={formData.spare_parts_items}
                          onChange={(items) => setFormData({ ...formData, spare_parts_items: items })}
                          placeholder="List spare part..."
                          disabled={isReadOnly && !createMode}
                        />
                      </TabsContent>
                    </Tabs>
                  </div>

                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 block">
                    Tasks Pending to do / Spare pending to supply (To fill for workers)
                  </label>
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
                          items={formData.work_pending_items}
                          onChange={(items) => setFormData({ ...formData, work_pending_items: items })}
                          placeholder="List pending work..."
                          disabled={isReadOnly && !createMode}
                        />
                      </TabsContent>
                      <TabsContent value="spare_parts_pending" className="p-4">
                        <DynamicChecklist
                          items={formData.spare_parts_pending_items}
                          onChange={(items) => setFormData({ ...formData, spare_parts_pending_items: items })}
                          placeholder="List pending spare part..."
                          disabled={isReadOnly && !createMode}
                        />
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>

                {/* Work Order Status */}
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-2 block">
                    Working Report Status
                  </Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => !isReadOnly && setFormData({ ...formData, status: 'open' })}
                      disabled={isReadOnly && !createMode}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border-2 transition-all text-sm font-medium",
                        formData.status === 'open' 
                          ? "border-green-500 bg-green-50 text-green-700" 
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      )}
                    >
                      <span className={cn(
                        "w-3 h-3 rounded-full",
                        formData.status === 'open' ? "bg-green-500" : "bg-slate-300"
                      )}></span>
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => !isReadOnly && setFormData({ ...formData, status: 'closed' })}
                      disabled={isReadOnly && !createMode}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border-2 transition-all text-sm font-medium",
                        formData.status === 'closed' 
                          ? "border-slate-500 bg-slate-100 text-slate-700" 
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      )}
                    >
                      <span className={cn(
                        "w-3 h-3 rounded-full",
                        formData.status === 'closed' ? "bg-slate-500" : "bg-slate-300"
                      )}></span>
                      Closed
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Section: Time Tracker Data */}
            <div className="rounded-xl border border-red-400 bg-white shadow-sm mt-6">
              <div className="bg-red-50 px-4 py-3 border-b border-red-200 rounded-t-xl">
                <h3 className="text-sm font-semibold text-red-900 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  4. Time Tracker Data
                </h3>
                <p className="text-xs text-red-700 mt-0.5">To be input from mobile app</p>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-slate-500">Clock In</Label>
                        <div className="text-sm font-medium">
                          {liveEntry?.start_time ? format(parseISO(liveEntry.start_time), 'MMM d, yyyy HH:mm') : '-'}
                        </div>
                        {liveEntry?.start_address && (
                          <div className="text-xs text-slate-500 mt-1 flex items-start gap-1">
                            <MapPin className="w-3 h-3 mt-0.5" /> {liveEntry.start_address}
                          </div>
                        )}
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Clock Out</Label>
                        <div className="text-sm font-medium">
                          {liveEntry?.end_time ? format(parseISO(liveEntry.end_time), 'MMM d, yyyy HH:mm') : '-'}
                        </div>
                        {liveEntry?.end_address && (
                          <div className="text-xs text-slate-500 mt-1 flex items-start gap-1">
                            <MapPin className="w-3 h-3 mt-0.5" /> {liveEntry.end_address}
                          </div>
                        )}
                  </div>
                </div>
                {liveEntry?.duration_minutes > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Total Duration</span>
                      <span className="text-sm font-bold text-slate-900">
                        {Math.floor(liveEntry.duration_minutes / 60)}h {liveEntry.duration_minutes % 60}m
                      </span>
                    </div>
                  </div>
                )}
                {liveEntry?.breaks && liveEntry.breaks.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <Label className="text-xs text-slate-500 mb-2 block">Breaks</Label>
                    <div className="space-y-1">
                      {liveEntry.breaks.map((brk, idx) => (
                        <div key={idx} className="text-xs flex justify-between bg-slate-50 p-1.5 rounded">
                          <span>
                            {brk.start_time ? format(parseISO(brk.start_time), 'HH:mm') : '?'} - 
                            {brk.end_time ? format(parseISO(brk.end_time), 'HH:mm') : '...'}
                          </span>
                          <span className="text-slate-500">
                            {brk.is_payable ? '(Payable)' : '(Unpaid)'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section 5: Client Approval */}
            <div className="rounded-xl border border-red-400 bg-white shadow-sm mt-6">
              <div className="bg-red-50 px-4 py-3 border-b border-red-200 rounded-t-xl">
                <h3 className="text-sm font-semibold text-red-900">
                  5. Client Approval
                </h3>
                <p className="text-xs text-red-700 mt-0.5">To be signed at finishing time</p>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                    Comments from the client
                  </Label>
                  <Textarea
                    value={formData.client_feedback_comments || ''}
                    onChange={(e) => setFormData({ ...formData, client_feedback_comments: e.target.value })}
                    placeholder="Enter client comments..."
                    className="min-h-[80px]"
                    disabled={isReadOnly && !createMode}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                      Client responsible signature
                    </Label>
                    <Input
                      value={formData.client_representative_name || ''}
                      onChange={(e) => setFormData({ ...formData, client_representative_name: e.target.value })}
                      placeholder="Name / Signature"
                      disabled={isReadOnly && !createMode}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                      Mobile
                    </Label>
                    <Input
                      value={formData.client_representative_phone || ''}
                      onChange={(e) => setFormData({ ...formData, client_representative_phone: e.target.value })}
                      placeholder="Mobile number"
                      type="tel"
                      disabled={isReadOnly && !createMode}
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent 
            value="documents" 
            className="p-6 space-y-6 mt-0 flex-1 overflow-y-auto"
          >
            <OrderDocumentMatrixTab
              entry={liveEntry || entry}
              formData={formData}
              setFormData={setFormData}
              onViewWorkingReport={handleExportPDF}
            />
          </TabsContent>

          <TabsContent 
            value="documents" 
            className="p-6 space-y-6 mt-0 flex-1 overflow-y-auto"
          >
            <Tabs defaultValue="list">
              <TabsList>
                <TabsTrigger value="list">List</TabsTrigger>
                <TabsTrigger value="matrix">Document Matrix</TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="mt-4 space-y-6">
                {/* Working Reports / Forms */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-slate-700">
                      📋 Working Reports / Forms
                    </label>
                    {!isReadOnly && (
                      <div>
                        <input
                          type="file"
                          id="file-upload-wo-reports"
                          multiple
                          onChange={(e) => handleFileUpload(e, 'working_reports')}
                          className="hidden"
                          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('file-upload-wo-reports').click()}
                          disabled={isUploadingFiles}
                          className="gap-2"
                        >
                          {isUploadingFiles ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              Upload Reports
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>

                  {(!formData.file_urls || formData.file_urls.length === 0) ? (
                    <div className="text-center py-8 border border-slate-200 rounded-lg bg-slate-50">
                      <File className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">No working reports uploaded</p>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="text-left p-3 text-sm font-semibold text-slate-700">Document</th>
                            <th className="text-left p-3 text-sm font-semibold text-slate-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.file_urls.map((fileUrl, index) => {
                            const fileName = fileUrl.split('/').pop() || `Report ${index + 1}`;

                            return (
                              <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="p-3 text-sm text-slate-900 font-medium truncate max-w-xs">
                                  {fileName}
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.open(fileUrl, '_blank')}
                                      className="gap-2"
                                    >
                                      <Eye className="w-4 h-4" />
                                      View
                                    </Button>
                                    {!isReadOnly && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveFile(index, 'working_reports')}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Other Photos / Documents */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-slate-700">
                      📷 Other Photos / Documents
                    </label>
                    {!isReadOnly && (
                      <div>
                        <input
                          type="file"
                          id="file-upload-wo-other"
                          multiple
                          onChange={(e) => handleFileUpload(e, 'other')}
                          className="hidden"
                          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('file-upload-wo-other').click()}
                          disabled={isUploadingOtherFiles}
                          className="gap-2"
                        >
                          {isUploadingOtherFiles ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              Upload Photos
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>

                  {(!formData.other_file_urls || formData.other_file_urls.length === 0) ? (
                    <div className="text-center py-8 border border-slate-200 rounded-lg bg-slate-50">
                      <File className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">No other documents uploaded</p>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="text-left p-3 text-sm font-semibold text-slate-700">Document</th>
                            <th className="text-left p-3 text-sm font-semibold text-slate-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.other_file_urls.map((fileUrl, index) => {
                            const fileName = fileUrl.split('/').pop() || `Document ${index + 1}`;

                            return (
                              <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="p-3 text-sm text-slate-900 font-medium truncate max-w-xs">
                                  {fileName}
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.open(fileUrl, '_blank')}
                                      className="gap-2"
                                    >
                                      <Eye className="w-4 h-4" />
                                      View
                                    </Button>
                                    {!isReadOnly && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveFile(index, 'other')}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="matrix" className="mt-4">
                <OrderDocumentMatrixTab
                  entry={liveEntry || entry}
                  formData={formData}
                  setFormData={setFormData}
                  onViewWorkingReport={handleExportPDF}
                />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent 
            ref={activityTabRef} 
            value="activity" 
            className="p-6 mt-0 flex-1"
            style={{ 
              overflowY: 'scroll',
              maxHeight: '100%',
              height: '100%',
              display: 'block'
            }}
          >
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-xs font-semibold">Date</TableHead>
                    <TableHead className="text-xs font-semibold">User</TableHead>
                    <TableHead className="text-xs font-semibold">Action</TableHead>
                    <TableHead className="text-xs font-semibold">Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entry?.activity_log && entry.activity_log.length > 0 ? (
                    [...entry.activity_log].reverse().map((log, index) => {
                      let displayName = log.user_name;
                      
                      if (!displayName && log.user_email) {
                        const user = safeUsers.find(u => u.email === log.user_email);
                        if (user) {
                          displayName = user.nickname || user.first_name || user.full_name || user.email;
                        } else {
                          displayName = log.user_email;
                        }
                      }
                      
                      if (!displayName) {
                        displayName = 'System';
                      }

                      return (
                        <TableRow key={index} className="hover:bg-slate-50">
                          <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                            {log.timestamp && format(parseISO(log.timestamp), 'dd MMM yyyy HH:mm')}
                          </TableCell>
                          <TableCell className="text-xs font-medium text-slate-900">
                            <div className="flex items-center gap-1">
                              {displayName}
                              {displayName === 'System' && (
                                <span className="text-[9px] text-slate-400 italic" title="Legacy work order - creator information not available">
                                  (legacy)
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className={cn(
                              "text-xs",
                              log.action === 'Created' && "bg-green-50 text-green-700 border-green-200",
                              log.action === 'Edited' && "bg-blue-50 text-blue-700 border-blue-200",
                              log.action === 'Copied' && "bg-purple-50 text-purple-700 border-purple-200",
                              log.action === 'Pasted' && "bg-purple-50 text-purple-700 border-purple-200",
                              log.action === 'Dropped' && "bg-indigo-50 text-indigo-700 border-indigo-200",
                              log.action === 'Archived' && "bg-slate-50 text-slate-700 border-slate-200"
                            )}>
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-slate-700">
                            {log.details || `${entry.work_order_number || 'Work order'} ${log.action.toLowerCase()}.`}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <>
                      {entry?.created_date && (() => {
                        let creatorName = 'System';
                        let isLegacy = true;
                        let creatorEmail = entry.created_by;
                        
                        if (creatorEmail) {
                          const user = safeUsers.find(u => u.email === creatorEmail);
                          if (user) {
                            creatorName = user.nickname || user.first_name || user.full_name || user.email;
                            isLegacy = false;
                          } else {
                            creatorName = creatorEmail;
                            isLegacy = false;
                          }
                        }

                        return (
                          <TableRow className="hover:bg-slate-50">
                            <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                              {format(parseISO(entry.created_date), 'dd MMM yyyy HH:mm')}
                            </TableCell>
                            <TableCell className="text-xs font-medium text-slate-900">
                              <div className="flex items-center gap-1">
                                {creatorName}
                                {isLegacy && (
                                  <span className="text-[9px] text-slate-400 italic" title="Legacy work order - creator information not available">
                                    (legacy)
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                Created
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-slate-700">
                              {entry.work_order_number ? `Work order ${entry.work_order_number} created.` : 'Work order created.'}
                            </TableCell>
                          </TableRow>
                        );
                      })()}
                      
                      {entry?.updated_date && entry?.created_date && entry.updated_date !== entry.created_date && (() => {
                        let updaterName = 'System';
                        let isLegacy = true;
                        let updaterEmail = entry.updated_by;
                        
                        if (updaterEmail) {
                          const user = safeUsers.find(u => u.email === updaterEmail);
                          if (user) {
                            updaterName = user.nickname || user.first_name || user.full_name || user.email;
                            isLegacy = false;
                          } else {
                            updaterName = updaterEmail;
                            isLegacy = false;
                          }
                        }

                        return (
                          <TableRow className="hover:bg-slate-50">
                            <TableCell className="text-xs text-slate-600 whitespace-nowrap">
                              {format(parseISO(entry.updated_date), 'dd MMM yyyy HH:mm')}
                            </TableCell>
                            <TableCell className="text-xs font-medium text-slate-900">
                              <div className="flex items-center gap-1">
                                {updaterName}
                                {isLegacy && (
                                  <span className="text-[9px] text-slate-400 italic" title="Legacy work order - editor information not available">
                                    (legacy)
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                Edited
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-slate-700">
                              {entry.work_order_number ? `Work order ${entry.work_order_number} updated.` : 'Work order updated.'}
                            </TableCell>
                          </TableRow>
                        );
                      })()}
                    </>
                  )}

                  {!entry?.activity_log?.length && !entry?.created_date && !entry?.updated_date && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-slate-500">
                        <Clock className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm">No activity recorded yet</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-white flex-shrink-0">
          {!isReadOnly && !isCreating && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSaving}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          )}

          {(isReadOnly || isCreating) && <div />}

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              {isReadOnly ? 'Close' : 'Cancel'}
            </Button>
            {!isReadOnly && (
              <Button
                onClick={handleSave}
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {isCreating ? 'Create' : 'Save Changes'}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Team Reassignment Dialog */}
        <TeamUserReassignment
          isOpen={showTeamReassignment}
          onClose={() => setShowTeamReassignment(false)}
          teams={safeTeams}
          users={safeUsers}
          onUserReassigned={(userId, newTeamId) => {
            // Refresh parent data if needed
            setShowTeamReassignment(false);
          }}
        />
        </SheetContent>
        </Sheet>

      {/* PDF Dialog */}
      {showPDFDialog && (
        <WorkOrderPDFDialog
          workOrder={showPDFDialog.workOrder}
          project={showPDFDialog.project}
          customer={showPDFDialog.customer}
          branch={showPDFDialog.branch}
          assignedUsers={showPDFDialog.assignedUsers}
          assignedTeams={showPDFDialog.assignedTeams}
          assignedAssets={showPDFDialog.assignedAssets}
          woCategory={showPDFDialog.woCategory}
          shiftType={showPDFDialog.shiftType}
          onClose={() => setShowPDFDialog(false)}
        />
      )}
    </>
  );
}