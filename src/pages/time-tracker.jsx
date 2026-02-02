import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppSettings, TimesheetEntry, TimeEntry } from '@/entities/all';
import { useData } from '../components/DataProvider';
import DigitalClock from '../components/time-tracker/DigitalClock';
import WorkOrderSelectionDialog from '../components/time-tracker/WorkOrderSelectionDialog';
import ClockOutPhotoDialog from '../components/time-tracker/ClockOutPhotoDialog';
import EditTimesheetDialog from '../components/time-tracker/EditTimesheetDialog';
import WorkOrderStatusDialog from '../components/time-tracker/WorkOrderStatusDialog';
import GoogleMapsLocations from '../components/time-tracker/GoogleMapsLocations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import Avatar from '../components/Avatar';
import {
  MapPin,
  Clock,
  Calendar,
  Briefcase,
  Settings,
  ChevronRight,
  Check,
  X,
  Edit3,
  Building2
} from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay, isWithinInterval, addDays, subDays } from 'date-fns';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import TimeTrackerSettingsPanel from '../components/time-tracker/TimeTrackerSettingsPanel';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ✅ Componente separado para filas expandibles
function EmployeeTimesheetRow({ employee, timesheets, todayWorkOrders, projects, departments, isWorking, isAdmin, onApprove, onReject, onEditAndApprove, hoursSettings }) {
  const [expanded, setExpanded] = useState(false);
  const [editingTimesheetId, setEditingTimesheetId] = useState(null);
  const [editedClockIn, setEditedClockIn] = useState('');
  const [editedClockOut, setEditedClockOut] = useState('');
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    if (!isWorking) return;
    
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);
    
    return () => clearInterval(interval);
  }, [isWorking]);

  const calculateHoursIfMissing = (timesheet) => {
    let totalMinutes = timesheet.total_duration_minutes || 0;
    
    if (timesheet.is_active && timesheet.clock_in_time) {
      const clockIn = new Date(timesheet.clock_in_time).getTime();
      const now = currentTime;
      totalMinutes = Math.floor((now - clockIn) / 60000);
    }

    if (timesheet.regular_hours_calculated !== undefined && timesheet.regular_hours_calculated !== null && !timesheet.is_active) {
      return timesheet;
    }

    const totalHours = totalMinutes / 60;
    const regularHoursPerDay = hoursSettings.regular_hours_per_day || 8;
    const nonPayableOvertimeHours = hoursSettings.non_payable_overtime_hours || 0;

    let regularHours = 0;
    let nonPayableOT = 0;
    let paidOT = 0;

    if (totalHours <= regularHoursPerDay) {
      regularHours = totalHours;
    } else {
      regularHours = regularHoursPerDay;
      const extraHours = totalHours - regularHoursPerDay;

      if (extraHours <= nonPayableOvertimeHours) {
        nonPayableOT = extraHours;
      } else {
        nonPayableOT = nonPayableOvertimeHours;
        paidOT = extraHours - nonPayableOvertimeHours;
      }
    }

    return {
      ...timesheet,
      total_duration_minutes: totalMinutes,
      regular_hours_calculated: regularHours,
      overtime_hours_non_paid_calculated: nonPayableOT,
      overtime_hours_paid_calculated: paidOT
    };
  };

  const enrichedTimesheets = timesheets.map(ts => calculateHoursIfMissing(ts));
  const totalMinutes = enrichedTimesheets.reduce((sum, ts) => sum + (ts.total_duration_minutes || 0), 0);
  const totalRegularHours = enrichedTimesheets.reduce((sum, ts) => sum + (ts.regular_hours_calculated || 0), 0);
  const totalOvertimePaid = enrichedTimesheets.reduce((sum, ts) => sum + (ts.overtime_hours_paid_calculated || 0), 0);
  const totalOvertimeNonPaid = enrichedTimesheets.reduce((sum, ts) => sum + (ts.overtime_hours_non_paid_calculated || 0), 0);

  const getStatusBadge = (status) => {
    const badges = {
      active: { bg: 'bg-green-500', text: 'Active', icon: null },
      completed: { bg: 'bg-slate-500', text: 'Completed', icon: null },
      pending_approval: { bg: 'bg-yellow-500', text: 'Pending', icon: <Clock className="w-3 h-3" /> },
      approved: { bg: 'bg-green-600', text: 'Approved', icon: <Check className="w-3 h-3" /> },
      rejected: { bg: 'bg-red-600', text: 'Rejected', icon: <X className="w-3 h-3" /> }
    };
    const badge = badges[status] || badges.completed;
    return <Badge className={`${badge.bg} text-white text-[10px] py-0 px-2 flex items-center gap-1`}>{badge.icon}{badge.text}</Badge>;
  };

  const handleStartEdit = (timesheet) => {
    setEditingTimesheetId(timesheet.id);
    setEditedClockIn(format(parseISO(timesheet.clock_in_time), "yyyy-MM-dd'T'HH:mm"));
    setEditedClockOut(timesheet.clock_out_time ? format(parseISO(timesheet.clock_out_time), "yyyy-MM-dd'T'HH:mm") : '');
  };

  const handleCancelEdit = () => {
    setEditingTimesheetId(null);
    setEditedClockIn('');
    setEditedClockOut('');
  };

  const handleSaveEdit = (timesheet) => {
    onEditAndApprove(timesheet, editedClockIn, editedClockOut);
    handleCancelEdit();
  };

  return (
    <>
      <tr className={cn("hover:bg-slate-50 cursor-pointer border-b border-slate-100", isWorking && "bg-green-50 hover:bg-green-100")} onClick={() => setExpanded(!expanded)}>
        <td className="px-2 py-1.5"><ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} /></td>
        <td className="px-2 py-1.5">
          <div className="flex items-center gap-2">
            <Avatar user={employee} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{employee?.nickname || employee?.first_name || 'Unknown'}</p>
              <p className="text-xs text-slate-500 truncate">{employee?.job_role || '-'}</p>
            </div>
          </div>
        </td>
        <td className="px-2 py-1.5">
          {(() => {
            const activeTimesheet = timesheets.find(ts => ts.is_active);
            if (!activeTimesheet) {
              return <span className="text-xs text-slate-400">-</span>;
            }
            
            if (activeTimesheet.timesheet_type === 'office_work') {
              const dept = activeTimesheet.department_id ? departments.find(d => d.id === activeTimesheet.department_id) : null;
              return (
                <div className="flex items-center gap-1.5">
                  <Badge className="bg-blue-500 text-white text-xs py-0 px-2">Office</Badge>
                  <span className="text-xs text-slate-700">{dept?.name || '-'}</span>
                </div>
              );
            } else {
              const activeSegment = (activeTimesheet.work_order_segments || []).find(seg => !seg.end_time);
              const wo = activeSegment ? todayWorkOrders.find(w => w.id === activeSegment.work_order_id) : null;
              const project = wo ? projects.find(p => p.id === wo.project_id) : null;
              return (
                <div className="flex items-center gap-1.5">
                  <Badge className="bg-green-500 text-white text-xs py-0 px-2">Field</Badge>
                  <span className="text-xs text-slate-700 truncate max-w-[200px]" title={project?.name}>{project?.name || wo?.work_order_number || '-'}</span>
                </div>
              );
            }
          })()}
        </td>
        <td className="px-2 py-1.5">
          <div className="text-sm">
            <div className="font-medium text-green-600">{totalRegularHours.toFixed(2)}h</div>
            {totalOvertimeNonPaid > 0 && <div className="text-[10px] text-orange-500">+{totalOvertimeNonPaid.toFixed(2)}h (unpaid)</div>}
          </div>
        </td>
        <td className="px-2 py-1.5">{totalOvertimePaid > 0 ? <div className="text-sm font-medium text-orange-600">{totalOvertimePaid.toFixed(2)}h</div> : <span className="text-xs text-slate-400">-</span>}</td>
        <td className="px-2 py-1.5"><div className="text-sm font-medium text-slate-900">{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</div></td>
        <td className="px-2 py-1.5"><Badge variant="outline" className="text-xs">{timesheets.length}</Badge></td>
        <td className="px-2 py-1.5">
          <div className="flex gap-1">
            {timesheets.filter(ts => ts.status === 'pending_approval').length > 0 && <Badge className="bg-yellow-500 text-white text-[10px]">{timesheets.filter(ts => ts.status === 'pending_approval').length} Pending</Badge>}
            {timesheets.filter(ts => ts.status === 'approved').length > 0 && <Badge className="bg-green-600 text-white text-[10px]">{timesheets.filter(ts => ts.status === 'approved').length} ✓</Badge>}
            {timesheets.filter(ts => ts.status === 'rejected').length > 0 && <Badge className="bg-red-600 text-white text-[10px]">{timesheets.filter(ts => ts.status === 'rejected').length} ✗</Badge>}
          </div>
        </td>
      </tr>

      {expanded && enrichedTimesheets.map(timesheet => {
        const segments = timesheet.work_order_segments || [];
        const needsApproval = timesheet.status === 'pending_approval';
        const isRejected = timesheet.status === 'rejected';
        const isApproved = timesheet.status === 'approved';
        const isEditing = editingTimesheetId === timesheet.id;

        return (
          <tr key={timesheet.id} className={`${needsApproval ? 'bg-yellow-50/50' : isRejected ? 'bg-red-50/50' : 'bg-slate-50/50'}`}>
            <td colSpan="8" className="px-2 py-2">
              <div className="ml-8 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm flex-1">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${timesheet.is_active ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></div>
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <Input type="datetime-local" value={editedClockIn} onChange={(e) => setEditedClockIn(e.target.value)} className="h-7 text-xs w-40" onClick={(e) => e.stopPropagation()} />
                        <span className="text-slate-500">-</span>
                        <Input type="datetime-local" value={editedClockOut} onChange={(e) => e.target.value === '' ? setEditedClockOut('') : setEditedClockOut(e.target.value)} className="h-7 text-xs w-40" onClick={(e) => e.stopPropagation()} />
                      </div>
                    ) : (
                      <>
                        <span className="font-medium">{format(parseISO(timesheet.clock_in_time), 'HH:mm')}{timesheet.clock_out_time && ` - ${format(parseISO(timesheet.clock_out_time), 'HH:mm')}`}</span>
                        <span className="text-slate-500 text-xs">({timesheet.total_duration_minutes ? `${Math.floor(timesheet.total_duration_minutes / 60)}h ${timesheet.total_duration_minutes % 60}m` : 'In progress'})</span>
                        {timesheet.total_duration_minutes > 0 && (
                          <span className="text-xs text-slate-600 ml-2">
                            [Reg: {timesheet.regular_hours_calculated?.toFixed(2) || 0}h
                            {timesheet.overtime_hours_non_paid_calculated > 0 && `, Unpaid OT: ${timesheet.overtime_hours_non_paid_calculated.toFixed(2)}h`}
                            {timesheet.overtime_hours_paid_calculated > 0 && `, Paid OT: ${timesheet.overtime_hours_paid_calculated.toFixed(2)}h`}]
                          </span>
                        )}
                      </>
                    )}
                    {timesheet.clock_in_address && !isEditing && <span className="text-xs text-slate-500 truncate max-w-xs">📍 {timesheet.clock_in_address.split(',')[0]}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {!isEditing && getStatusBadge(timesheet.status)}
                    {isAdmin && needsApproval && !isEditing && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-6 px-2 text-xs bg-blue-50 hover:bg-blue-100 border-blue-300" onClick={(e) => { e.stopPropagation(); handleStartEdit(timesheet); }}><Edit3 className="w-3 h-3 mr-1" />Edit</Button>
                        <Button size="sm" variant="outline" className="h-6 px-2 text-xs bg-green-50 hover:bg-green-100 border-green-300" onClick={(e) => { e.stopPropagation(); onApprove(timesheet); }}><Check className="w-3 h-3 mr-1" />Approve</Button>
                        <Button size="sm" variant="outline" className="h-6 px-2 text-xs bg-red-50 hover:bg-red-100 border-red-300" onClick={(e) => { e.stopPropagation(); onReject(timesheet); }}><X className="w-3 h-3 mr-1" />Reject</Button>
                      </div>
                    )}
                    {isEditing && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }}>Cancel</Button>
                        <Button size="sm" className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700" onClick={(e) => { e.stopPropagation(); handleSaveEdit(timesheet); }}><Check className="w-3 h-3 mr-1" />Save & Approve</Button>
                      </div>
                    )}
                  </div>
                </div>
                {timesheet.was_edited && timesheet.notes && (
                  <div className="ml-4 pl-3 border-l-2 border-yellow-400 text-xs bg-yellow-50 p-2 rounded">
                    <span className="font-semibold text-yellow-800">Employee note: </span>
                    <span className="text-yellow-700">{timesheet.notes}</span>
                  </div>
                )}
                {timesheet.approval_notes && (
                  <div className={`ml-4 pl-3 border-l-2 ${isApproved ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'} text-xs p-2 rounded`}>
                    <span className={`font-semibold ${isApproved ? 'text-green-800' : 'text-red-800'}`}>Admin note: </span>
                    <span className={isApproved ? 'text-green-700' : 'text-red-700'}>{timesheet.approval_notes}</span>
                  </div>
                )}
                {timesheet.timesheet_type === 'field_work' && segments.map((segment, idx) => {
                  const wo = todayWorkOrders.find(w => w.id === segment.work_order_id);
                  const project = wo ? projects.find(p => p.id === wo.project_id) : null;
                  return (
                    <div key={idx} className="ml-4 pl-3 border-l-2 border-slate-200 text-xs text-slate-600 py-0.5">
                      <span className="font-semibold text-slate-900">{wo?.work_order_number || 'N/A'}</span>
                      {project && <span className="text-slate-600"> - {project.name}</span>}
                      <span className="text-slate-400 ml-2">
                        {format(parseISO(segment.start_time), 'HH:mm')}
                        {segment.end_time && ` - ${format(parseISO(segment.end_time), 'HH:mm')}`}
                        {segment.duration_minutes && ` (${Math.floor(segment.duration_minutes / 60)}h ${segment.duration_minutes % 60}m)`}
                      </span>
                    </div>
                  );
                })}
                {timesheet.timesheet_type === 'office_work' && (
                  <div className="ml-4 pl-3 border-l-2 border-blue-200 text-xs text-blue-600 py-0.5">
                    <span className="font-semibold text-blue-900">Office Work</span>
                  </div>
                )}
              </div>
            </td>
          </tr>
        );
      })}
    </>
  );
}

export default function TimeTrackerPage() {
  const { currentUser, actualUser, currentCompany, users: cachedUsers, projects: cachedProjects, customers: cachedCustomers, departments: cachedDepartments, loadUsers, loadProjects, loadCustomers, loadAssets, loadWorkOrderCategories, loadShiftTypes, loadDepartments } = useData();

  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [shiftTypes, setShiftTypes] = useState([]);
  
  const departments = useMemo(() => {
    return Array.isArray(cachedDepartments) ? cachedDepartments : [];
  }, [cachedDepartments]);

  const [activeTimesheet, setActiveTimesheet] = useState(null);
  const [todayTimesheets, setTodayTimesheets] = useState([]);
  const [allActiveTimesheets, setAllActiveTimesheets] = useState([]);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [workType, setWorkType] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [gpsError, setGpsError] = useState(false);
  const [gpsErrorMessage, setGpsErrorMessage] = useState('');
  const [currentAddress, setCurrentAddress] = useState(null);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [settings, setSettings] = useState({
    track_gps: true,
    require_photo_clock_in: false,
    require_photo_clock_out: false,
    require_photo_switch: false,
    alarm_enabled: true,
    alarm_minutes_before: 5
  });
  const [hoursSettings, setHoursSettings] = useState({
    regular_hours_per_day: 8,
    non_payable_overtime_hours: 0,
    overtime_multiplier: 1.5,
    tracking_interval_minutes: 30
  });

  const [showWorkOrderDialog, setShowWorkOrderDialog] = useState(false);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  const [clockInLoading, setClockInLoading] = useState(false);
  const [switchLoading, setSwitchLoading] = useState(false);

  const [pendingPhotoAction, setPendingPhotoAction] = useState(null);
  const [pendingSwitchPhoto, setPendingSwitchPhoto] = useState(null);
  const [todayWorkOrders, setTodayWorkOrders] = useState([]);

  const [loading, setLoading] = useState(true);

  const [viewFilter, setViewFilter] = useState('all');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState([]);
  const [activeTab, setActiveTab] = useState('timesheets');

  const trackingIntervalRef = React.useRef(null);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (!settings.track_gps) {
      console.log('🎯 [GPS] Tracking disabled in settings');
      setGpsError(false);
      setGpsErrorMessage('');
      setCurrentLocation(null);
      setCurrentAddress(null);
      return;
    }

    console.log('📍 [GPS] Attempting to get and watch location...');
    
    if (!navigator.geolocation) {
      console.error('❌ [GPS] Geolocation not supported by browser');
      setGpsError(true);
      setGpsErrorMessage('Your browser does not support location services.');
      return;
    }

    const successCallback = async (position) => {
      console.log('✅ [GPS] Location obtained:', position.coords);
      const newLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      setCurrentLocation(newLocation);
      setGpsError(false);
      setGpsErrorMessage('');

      try {
        const response = await base44.functions.invoke('reverseGeocode', {
          lat: newLocation.lat,
          lon: newLocation.lng
        });
        if (response.data?.address) {
          console.log('📍 [GPS] Address:', response.data.address);
          setCurrentAddress(response.data.address);
        } else {
          setCurrentAddress(null);
        }
      } catch (error) {
        console.warn('⚠️ [GPS] Could not get address (non-critical):', error.message);
        setCurrentAddress(null);
      }
    };

    const errorCallback = (error) => {
      console.warn('⚠️ [GPS] Location not available:', error.message, 'Code:', error.code);
      setCurrentLocation(null);
      setCurrentAddress(null);
      setGpsError(true);
      
      switch(error.code) {
        case error.PERMISSION_DENIED:
          setGpsErrorMessage('Location access denied. Please enable location permissions in your browser/device settings.');
          break;
        case error.POSITION_UNAVAILABLE:
          setGpsErrorMessage('Location information unavailable. Please check your device settings.');
          break;
        case error.TIMEOUT:
          setGpsErrorMessage('Location request timed out. Please try again.');
          break;
        default:
          setGpsErrorMessage(`Unable to get your location: ${error.message}. Please enable location services.`);
      }
    };

    const watchId = navigator.geolocation.watchPosition(successCallback, errorCallback, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000
    });

    return () => {
      if (watchId) {
        console.log('🛑 [GPS] Clearing watch position');
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [settings.track_gps]);

  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      loadData(true);
    }, 120000);
    return () => clearInterval(interval);
  }, [selectedDate, currentUser]);

  useEffect(() => {
    console.log('🎯 [GPS Tracking] Setting up auto-tracking...', {
      isActive: !!activeTimesheet,
      trackingInterval: hoursSettings.tracking_interval_minutes || 30
    });

    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current);
      trackingIntervalRef.current = null;
    }

    const trackingIntervalMinutes = hoursSettings.tracking_interval_minutes || 30;

    if (!activeTimesheet || !settings.track_gps || trackingIntervalMinutes === 0 || activeTimesheet.timesheet_type !== 'field_work') {
      console.log('🎯 [GPS Tracking] Not setting up - no active timesheet, tracking disabled, interval is 0, or not field work');
      return;
    }
    
    console.log(`🎯 [GPS Tracking] Starting auto-tracking every ${trackingIntervalMinutes} minutes`);

    const sendTrackingPoint = async () => {
      if (!activeTimesheet || !currentLocation) {
        console.log('⚠️ [GPS Tracking] Skipping - no active timesheet or location');
        return;
      }

      try {
        console.log('📍 [GPS Tracking] Sending tracking point:', currentLocation);
        
        const trackingPoints = activeTimesheet.live_tracking_points ? [...activeTimesheet.live_tracking_points] : [];
        trackingPoints.push({
          timestamp: new Date().toISOString(),
          lat: currentLocation.lat,
          lon: currentLocation.lng
        });

        await TimesheetEntry.update(activeTimesheet.id, {
          live_tracking_points: trackingPoints
        });

        console.log('✅ [GPS Tracking] Point saved successfully');
      } catch (error) {
        console.error('❌ [GPS Tracking] Failed to send tracking point:', error);
      }
    };

    sendTrackingPoint();

    const intervalMs = trackingIntervalMinutes * 60 * 1000;
    trackingIntervalRef.current = setInterval(sendTrackingPoint, intervalMs);

    return () => {
      if (trackingIntervalRef.current) {
        console.log('🛑 [GPS Tracking] Stopping auto-tracking');
        clearInterval(trackingIntervalRef.current);
        trackingIntervalRef.current = null;
      }
    };
  }, [activeTimesheet, currentLocation, settings.track_gps, hoursSettings.tracking_interval_minutes]);

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      console.log('🔄 [TimeTracker] Loading data... isAdmin:', isAdmin, 'currentUser.role:', currentUser?.role);

      const loadPromises = [
        isAdmin ? loadUsers(true).catch(err => {
          console.error('❌ Failed to load users:', err);
          return [];
        }) : loadUsers(true).catch(err => {
          console.error('❌ Failed to load users:', err);
          return [];
        }),
        loadProjects().catch(err => {
          console.error('❌ Failed to load projects:', err);
          return [];
        }),
        loadCustomers().catch(err => {
          console.error('❌ Failed to load customers:', err);
          return [];
        }),
        AppSettings.list('setting_key', 1000).catch(err => {
          console.error('❌ Failed to load settings:', err);
          return [];
        }),
        base44.entities.Team.list('sort_order', 1000).catch(err => {
          console.error('❌ Failed to load teams:', err);
          return [];
        }),
        loadDepartments().catch(err => {
          console.error('❌ Failed to load departments:', err);
          return [];
        })
      ];

      const [usersData, projectsData, customersData, allSettingsData, teamsData, departmentsData] = await Promise.all(loadPromises);

      console.log('📊 [TimeTracker] Raw loaded data:', {
        usersCount: usersData?.length || 0,
        projectsCount: projectsData?.length || 0,
        customersCount: customersData?.length || 0,
        isAdmin
      });

      const validUsers = Array.isArray(usersData) && usersData.length > 0 ? usersData : [];
      
      if (validUsers.length === 0 && currentUser) {
        console.warn('⚠️ [TimeTracker] No users loaded from backend, using current user as fallback');
        setUsers([currentUser]);
      } else {
        console.log('✅ [TimeTracker] Setting', validUsers.length, 'users to state');
        setUsers(validUsers);
      }

      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setCustomers(Array.isArray(customersData) ? customersData : []);

      const trackGPS = allSettingsData.find(s => s.setting_key === 'track_gps');
      const requirePhotoIn = allSettingsData.find(s => s.setting_key === 'require_photo_clock_in');
      const requirePhotoOut = allSettingsData.find(s => s.setting_key === 'require_photo_clock_out');
      const requirePhotoSwitch = allSettingsData.find(s => s.setting_key === 'require_photo_switch');
      const alarmEnabled = allSettingsData.find(s => s.setting_key === 'alarm_enabled');
      const alarmMinutes = allSettingsData.find(s => s.setting_key === 'alarm_minutes_before');

      setSettings({
        track_gps: trackGPS ? trackGPS.setting_value === 'true' : true,
        require_photo_clock_in: requirePhotoIn ? requirePhotoIn.setting_value === 'true' : false,
        require_photo_clock_out: requirePhotoOut ? requirePhotoOut.setting_value === 'true' : false,
        require_photo_switch: requirePhotoSwitch ? requirePhotoSwitch.setting_value === 'true' : false,
        alarm_enabled: alarmEnabled ? alarmEnabled.setting_value === 'true' : true,
        alarm_minutes_before: alarmMinutes ? parseInt(alarmMinutes.setting_value) : 5
      });

      const tempHoursSettings = {};
      allSettingsData.forEach(setting => {
        if (setting.setting_key.startsWith('timesheet_hours_')) {
          const key = setting.setting_key.replace('timesheet_hours_', '');
          const parsedValue = parseFloat(setting.setting_value);
          if (!isNaN(parsedValue)) {
            tempHoursSettings[key] = parsedValue;
          }
        }
      });
      const trackingInterval = allSettingsData.find(s => s.setting_key === 'timesheet_hours_tracking_interval_minutes');
      if (trackingInterval) {
        tempHoursSettings.tracking_interval_minutes = parseInt(trackingInterval.setting_value);
      }
      setHoursSettings(prev => ({ ...prev, ...tempHoursSettings }));

      setTeams(teamsData);

      let timesheetsData = [];
      let workOrdersData = [];

      try {
        timesheetsData = isAdmin 
          ? await TimesheetEntry.list('-updated_date', 300)
          : await TimesheetEntry.filter({ employee_id: currentUser.id });
      } catch (error) {
        console.error('❌ [TimeTracker] Failed to load timesheets:', error);
        if (!silent) toast.error('Failed to load timesheets. Please refresh the page.');
        timesheetsData = [];
      }

      try {
        workOrdersData = await TimeEntry.list('-updated_date', 500);
      } catch (error) {
        console.error('❌ [TimeTracker] Failed to load work orders:', error);
        if (!silent) toast.error('Failed to load work orders. Please refresh the page.');
        workOrdersData = [];
      }

      const activeSheet = timesheetsData.find(ts => ts.is_active && ts.status === 'active' && ts.employee_id === currentUser.id);
      setActiveTimesheet(activeSheet);
      if (activeSheet) {
        setWorkType(activeSheet.timesheet_type);
        setSelectedDepartment(activeSheet.department_id || null);
      } else {
        setWorkType(null);
        setSelectedDepartment(null);
      }


      const dayStart = startOfDay(selectedDate);
      const dayEnd = endOfDay(selectedDate);

      const activeSheets = timesheetsData.filter(ts => {
        if (!ts.clock_in_time || ts.status === 'completed') return false;
        const clockInDate = new Date(ts.clock_in_time);
        return isWithinInterval(clockInDate, { start: dayStart, end: dayEnd }) && ts.is_active;
      });
      setAllActiveTimesheets(activeSheets);

      const daySheets = timesheetsData.filter(ts => {
        if (!ts.clock_in_time) return false;
        const clockInDate = new Date(ts.clock_in_time);
        return isWithinInterval(clockInDate, { start: dayStart, end: dayEnd });
      });

      setTodayTimesheets(isAdmin ? daySheets : daySheets.filter(ts => ts.employee_id === currentUser.id));

      const dayWOs = workOrdersData.filter(wo => {
        if (wo.status === 'closed') return false;
        if (!wo.planned_start_time) return false;
        const woDate = new Date(wo.planned_start_time);
        return isWithinInterval(woDate, { start: dayStart, end: dayEnd });
      });
      setTodayWorkOrders(dayWOs);

      if (!silent) {
        Promise.all([
          loadAssets().catch(err => {
            console.error('❌ Failed to load assets:', err);
            return [];
          }),
          loadWorkOrderCategories().catch(err => {
            console.error('❌ Failed to load categories:', err);
            return [];
          }),
          loadShiftTypes().catch(err => {
            console.error('❌ Failed to load shift types:', err);
            return [];
          })
        ]).then(([assetsData, categoriesData, shiftTypesData]) => {
          setAssets(assetsData || []);
          setCategories(categoriesData || []);
          setShiftTypes(shiftTypesData || []);
        }).catch(error => {
          console.error('Failed to load secondary data:', error);
        });
      }

    } catch (error) {
      console.error('❌ [TimeTracker] Critical error loading data:', error);
      if (!silent) {
        toast.error('Network error. Please check your connection and refresh the page.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleClockIn = async () => {
    if (clockInLoading) return;

    if (!workType) {
      toast.error('Please select work type (Work Order or Office Work)');
      return;
    }

    if (workType === 'office_work' && !selectedDepartment) {
      toast.error('Please select a department first');
      return;
    }

    if (workType === 'field_work' && !selectedWorkOrder) {
      toast.error('Please select a work order');
      return;
    }

    console.log('🔵 CLOCK IN STARTED:', {
      workType,
      selectedWorkOrder: selectedWorkOrder?.work_order_number,
      selectedDepartment: selectedDepartment,
      requirePhoto: settings.require_photo_clock_in,
      hasLocation: !!currentLocation
    });

    setClockInLoading(true);

    try {
      if (settings.require_photo_clock_in) {
        console.log('📸 Photo required - showing dialog');
        setShowPhotoDialog(true);
        setPendingPhotoAction('clockin');
        setClockInLoading(false);
        return;
      }

      await performClockIn(null);
    } catch (error) {
      console.error('❌ Clock in error:', error);
      toast.error('Failed to clock in');
      setClockInLoading(false);
    }
  };

  const handleSelectWorkOrder = useCallback(() => {
    console.log('🎯 Opening work order selector');
    setShowWorkOrderDialog(true);
  }, []);

  const handleClearWorkOrder = useCallback(() => {
    console.log('🔙 Clearing selected work order');
    setSelectedWorkOrder(null);
  }, []);

  const performClockIn = async (photoUrl) => {
    try {
      console.log('🔵 [performClockIn] Starting clock in with:', {
        currentUserId: currentUser?.id,
        workType,
        selectedWorkOrderId: selectedWorkOrder?.id,
        selectedDepartmentId: selectedDepartment,
        photoUrl: !!photoUrl,
        location: currentLocation,
        address: currentAddress
      });

      if (!currentUser?.id) {
        console.error('❌ [performClockIn] No current user ID!');
        toast.error('User not found - please refresh the page');
        return;
      }

      if (workType === 'field_work' && !selectedWorkOrder?.id) {
        console.error('❌ [performClockIn] No work order selected for field work!');
        toast.error('Please select a work order first');
        return;
      }

      if (workType === 'office_work' && !selectedDepartment) {
        console.error('❌ [performClockIn] No department selected for office work!');
        toast.error('Please select a department first');
        return;
      }

      const clockInData = {
        employee_id: currentUser.id,
        timesheet_type: workType,
        clock_in_time: new Date().toISOString(),
        clock_in_photo_url: photoUrl || undefined,
        is_active: true,
        status: 'active',
        live_tracking_points: []
      };

      if (workType === 'office_work') {
        clockInData.department_id = selectedDepartment;
      }

      if (workType === 'field_work') {
         clockInData.work_order_segments = [{
           work_order_id: selectedWorkOrder.id,
           start_time: new Date().toISOString(),
           end_time: null,
           duration_minutes: null
         }];
         // Ensure the current user is part of the WO assignment for traceability
         try {
           const wo = await TimeEntry.get(selectedWorkOrder.id);
           const currentIds = Array.isArray(wo.employee_ids) ? wo.employee_ids : [];
           if (!currentIds.includes(currentUser.id)) {
             await TimeEntry.update(selectedWorkOrder.id, {
               employee_ids: [...currentIds, currentUser.id]
             });
           }
         } catch (e) {
           console.warn('[performClockIn] Could not ensure assignment on WO:', e?.message || e);
         }
       }

      if (currentLocation) {
        clockInData.clock_in_coords = {
          lat: currentLocation.lat,
          lon: currentLocation.lng
        };
        console.log('📍 [performClockIn] GPS coords:', clockInData.clock_in_coords);
      } else {
        console.warn('⚠️ [performClockIn] No GPS location available');
      }

      if (currentAddress) {
        clockInData.clock_in_address = currentAddress;
        console.log('📍 [performClockIn] Address:', currentAddress);
      }

      // Reflect clock-in on the Work Order (sets start_time and location) and let automation assign N number
if (workType === 'field_work' && selectedWorkOrder?.id) {
  try {
    const woUpdate = {
      start_time: new Date().toISOString(),
      is_active: true,
      updated_by: currentUser?.email || 'unknown'
    };
    if (currentLocation) {
      woUpdate.start_coords = { lat: currentLocation.lat, lon: currentLocation.lng };
    }
    if (currentAddress) {
      woUpdate.start_address = currentAddress;
    }
    await TimeEntry.update(selectedWorkOrder.id, woUpdate);
  } catch (e) {
    console.warn('⚠️ [performClockIn] Failed to update work order start time:', e?.message || e);
  }
}
const newTimesheet = await TimesheetEntry.create(clockInData);

      console.log('✅ [performClockIn] Timesheet created:', {
        timesheetId: newTimesheet.id,
        employeeId: newTimesheet.employee_id,
        timesheetType: newTimesheet.timesheet_type,
        departmentId: newTimesheet.department_id,
        clockInTime: newTimesheet.clock_in_time,
        hasCoords: !!newTimesheet.clock_in_coords,
        coords: newTimesheet.clock_in_coords
      });

      setActiveTimesheet(newTimesheet);
      setSelectedWorkOrder(null);
      setSelectedDepartment(null);
      setWorkType(workType);
      setShowPhotoDialog(false);
      setPendingPhotoAction(null);
      toast.success(`Clocked in successfully (${workType === 'office_work' ? 'Office Work' : 'Field Work'})`);
      await loadData();
    } catch (error) {
      console.error('❌ [performClockIn] Clock in error:', error);
      toast.error('Failed to clock in: ' + error.message);
    } finally {
      setClockInLoading(false);
    }
  };

  const handleSwitch = async () => {
    if (switchLoading || !activeTimesheet) return;

    if (activeTimesheet.timesheet_type !== 'field_work') {
      toast.error('Work order switching is only available for field work');
      return;
    }

    console.log('🔄 SWITCH WO STARTED');

    setSwitchLoading(true);

    try {
      setPendingPhotoAction('switch');

      if (settings.require_photo_switch) {
        console.log('📸 Photo required for switch - showing dialog');
        setShowPhotoDialog(true);
        setSwitchLoading(false);
        return;
      }

      console.log('📋 Opening WO selector for switch (no photo required)');
      setShowWorkOrderDialog(true);
      setSwitchLoading(false);
    } catch (error) {
      console.error('❌ Switch error:', error);
      toast.error('Failed to switch work order');
      setPendingPhotoAction(null);
      setSwitchLoading(false);
    }
  };

  const performSwitch = async (newWorkOrder, photoUrl) => {
    try {
      console.log('🔄 [performSwitch] Starting switch to WO:', newWorkOrder.work_order_number);

      const now = new Date().toISOString();
      const updatedSegments = [...(activeTimesheet.work_order_segments || [])];

      const activeSegmentIndex = updatedSegments.findIndex(seg => !seg.end_time);
      if (activeSegmentIndex !== -1) {
        const activeSegment = updatedSegments[activeSegmentIndex];
        const startTime = new Date(activeSegment.start_time);
        const endTime = new Date(now);
        const durationMinutes = Math.round((endTime - startTime) / 60000);

        console.log('⏹️ [performSwitch] Closing previous segment:', {
          work_order_id: activeSegment.work_order_id,
          duration_minutes: durationMinutes
        });

        updatedSegments[activeSegmentIndex] = {
          ...activeSegment,
          end_time: now,
          duration_minutes: durationMinutes
        };
      }

      updatedSegments.push({
        work_order_id: newWorkOrder.id,
        start_time: now,
        end_time: null,
        duration_minutes: null
      });

      // Ensure the current user is part of the WO assignment for the new WO
      try {
        const wo = await TimeEntry.get(newWorkOrder.id);
        const currentIds = Array.isArray(wo.employee_ids) ? wo.employee_ids : [];
        if (!currentIds.includes(currentUser.id)) {
          await TimeEntry.update(newWorkOrder.id, { employee_ids: [...currentIds, currentUser.id] });
        }
      } catch (e) {
        console.warn('[performSwitch] Could not ensure assignment on new WO:', e?.message || e);
      }

      console.log('▶️ [performSwitch] Created new segment for WO:', newWorkOrder.work_order_number);

      const switchPhotos = activeTimesheet.switch_photo_urls ? [...activeTimesheet.switch_photo_urls] : [];
      if (photoUrl) {
        switchPhotos.push(photoUrl);
      }

      await TimesheetEntry.update(activeTimesheet.id, {
        work_order_segments: updatedSegments,
        switch_photo_urls: switchPhotos
      });

      // Reflect switch on Work Orders: close previous WO segment and start new WO
      try {
        // 1) Close previous WO
        const prevSeg = activeTimesheet.work_order_segments?.find(seg => !seg.end_time);
        if (prevSeg?.work_order_id) {
          const prevUpdate = {
            end_time: now,
            duration_minutes: updatedSegments.find(s => s.work_order_id === prevSeg.work_order_id && s.end_time === now)?.duration_minutes || null,
            is_active: false,
            updated_by: currentUser?.email || 'unknown'
          };
          if (currentLocation) prevUpdate.end_coords = { lat: currentLocation.lat, lon: currentLocation.lng };
          if (currentAddress) prevUpdate.end_address = currentAddress;
          await TimeEntry.update(prevSeg.work_order_id, prevUpdate);
        }

        // 2) Start new WO
        if (newWorkOrder?.id) {
          const newUpdate = {
            start_time: now,
            is_active: true,
            updated_by: currentUser?.email || 'unknown'
          };
          if (currentLocation) newUpdate.start_coords = { lat: currentLocation.lat, lon: currentLocation.lng };
          if (currentAddress) newUpdate.start_address = currentAddress;
          await TimeEntry.update(newWorkOrder.id, newUpdate);
        }
      } catch (e) {
        console.warn('⚠️ [performSwitch] Failed to sync work order times:', e?.message || e);
      }

      console.log('✅ [performSwitch] Switch completed successfully');

      setShowPhotoDialog(false);
      setPendingPhotoAction(null);
      setPendingSwitchPhoto(null);
      setShowWorkOrderDialog(false);
      setSwitchLoading(false);

      toast.success('Work order switched successfully');

      await loadData();
    } catch (error) {
      console.error('❌ [performSwitch] Switch error:', error);
      toast.error('Failed to switch work order');
      setSwitchLoading(false);
    }
  };

  const handleOpenEditDialog = () => {
    setShowEditDialog(true);
  };

  const handleClockOut = async () => {
    if (!activeTimesheet) return;

    console.log('🔴 CLOCK OUT STARTED');

    try {
      const isTeamLeader = currentUser?.is_team_leader;
      const isAdminUser = currentUser?.role === 'admin';

      if (activeTimesheet.timesheet_type === 'field_work' && (isTeamLeader || isAdminUser)) {
        const activeSegment = (activeTimesheet.work_order_segments || []).find(seg => !seg.end_time);
        if (activeSegment) {
          const currentWO = todayWorkOrders.find(wo => wo.id === activeSegment.work_order_id);
          if (currentWO) {
            console.log('👔 Team leader/admin detected - showing status dialog');
            setShowStatusDialog(true);
            return;
          }
        }
      }

      if (settings.require_photo_clock_out) {
        console.log('📸 Photo required for clock out - showing dialog');
        setShowPhotoDialog(true);
        setPendingPhotoAction('clockout');
        return;
      }

      await performClockOut(null);
    } catch (error) {
      console.error('❌ Clock out error:', error);
      toast.error('Failed to clock out');
    }
  };

  const handleStatusUpdate = async (newStatus, notes) => {
    try {
      const activeSegment = (activeTimesheet.work_order_segments || []).find(seg => !seg.end_time);
      if (activeSegment) {
        const currentWO = todayWorkOrders.find(wo => wo.id === activeSegment.work_order_id);
        if (currentWO) {
          await TimeEntry.update(currentWO.id, {
            status: newStatus,
            work_notes: notes ? `${currentWO.work_notes || ''}\n\n[${format(new Date(), 'yyyy-MM-dd HH:mm')}] ${notes}`.trim() : currentWO.work_notes
          });
          toast.success('Work order status updated');
        }
      }

      setShowStatusDialog(false);

      if (settings.require_photo_clock_out) {
        setShowPhotoDialog(true);
        setPendingPhotoAction('clockout');
        return;
      }

      await performClockOut(null);
    } catch (error) {
      console.error('❌ Status update error:', error);
      toast.error('Failed to update status');
    }
  };

  const performClockOut = async (photoUrl) => {
    try {
      const now = new Date().toISOString();
      
      const updateData = {
        clock_out_time: now,
        clock_out_coords: currentLocation ? { lat: currentLocation.lat, lon: currentLocation.lng } : undefined,
        clock_out_photo_url: photoUrl || undefined,
        clock_out_address: currentAddress || undefined,
        is_active: false,
        status: 'completed'
      };

      if (activeTimesheet.timesheet_type === 'field_work') {
        const updatedSegments = [...(activeTimesheet.work_order_segments || [])];

        const activeSegmentIndex = updatedSegments.findIndex(seg => !seg.end_time);
        if (activeSegmentIndex !== -1) {
          const activeSegment = updatedSegments[activeSegmentIndex];
          const startTime = new Date(activeSegment.start_time);
          const endTime = new Date(now);
          const durationMinutes = Math.round((endTime - startTime) / 60000);

          updatedSegments[activeSegmentIndex] = {
            ...activeSegment,
            end_time: now,
            duration_minutes: durationMinutes
          };
        }

        updateData.work_order_segments = updatedSegments;
      }

      const clockInTime = new Date(activeTimesheet.clock_in_time);
      const clockOutTime = new Date(now);
      const totalDuration = Math.round((clockOutTime - clockInTime) / 60000);
      updateData.total_duration_minutes = totalDuration;

      await TimesheetEntry.update(activeTimesheet.id, updateData);

      // Reflect clock-out on the Work Order (sets end_time, duration, and location)
      if (activeTimesheet.timesheet_type === 'field_work') {
        try {
          // Try to get the WO id from the segment we just closed
          let workOrderId = null;
          const closingSegment = Array.isArray(updateData.work_order_segments)
            ? updateData.work_order_segments.find(seg => seg && seg.end_time === now)
            : null;
          if (closingSegment?.work_order_id) {
            workOrderId = closingSegment.work_order_id;
          } else if (Array.isArray(activeTimesheet.work_order_segments) && activeTimesheet.work_order_segments.length > 0) {
            workOrderId = activeTimesheet.work_order_segments[activeTimesheet.work_order_segments.length - 1]?.work_order_id || null;
          }
          if (workOrderId) {
            const woUpdate = {
              end_time: now,
              duration_minutes: updateData.total_duration_minutes || 0,
              is_active: false,
              updated_by: currentUser?.email || 'unknown'
            };
            // Ensure the current user is assigned as well, in case they clocked out as admin
            try {
              const wo = await TimeEntry.get(workOrderId);
              const currentIds = Array.isArray(wo.employee_ids) ? wo.employee_ids : [];
              if (!currentIds.includes(currentUser.id)) {
                await TimeEntry.update(workOrderId, { employee_ids: [...currentIds, currentUser.id] });
              }
            } catch (e) {
              console.warn('[performClockOut] Could not ensure assignment on WO:', e?.message || e);
            }
            if (currentLocation) {
              woUpdate.end_coords = { lat: currentLocation.lat, lon: currentLocation.lng };
            }
            if (currentAddress) {
              woUpdate.end_address = currentAddress;
            }
            await TimeEntry.update(workOrderId, woUpdate);
          }
        } catch (e) {
          console.warn('⚠️ [performClockOut] Failed to update work order end time:', e?.message || e);
        }
      }

      setActiveTimesheet(null);
      setWorkType(null);
      setSelectedDepartment(null);
      setShowPhotoDialog(false);
      setPendingPhotoAction(null);
      setShowEditDialog(false);
      toast.success('Clocked out successfully');
      await loadData();
    } catch (error) {
      console.error('❌ Clock out error:', error);
      toast.error('Failed to clock out');
    }
  };

  const handlePhotoComplete = async (photoUrl) => {
    console.log('📸 Photo complete:', { action: pendingPhotoAction, photoUrl });

    if (pendingPhotoAction === 'clockin') {
      await performClockIn(photoUrl);
    } else if (pendingPhotoAction === 'clockout') {
      await performClockOut(photoUrl);
    } else if (pendingPhotoAction === 'switch') {
      console.log('📸 [handlePhotoComplete] Photo captured for switch, opening WO selector');
      setPendingSwitchPhoto(photoUrl);
      setShowPhotoDialog(false);
      setShowWorkOrderDialog(true);
    }
  };

  const handleWorkOrderSelect = async (workOrder) => {
    console.log('🎯 [handleWorkOrderSelect] Work order selected:', workOrder.work_order_number, 'pendingPhotoAction:', pendingPhotoAction);

    if (pendingPhotoAction === 'switch') {
      console.log('🔄 [handleWorkOrderSelect] Executing switch to WO:', workOrder.work_order_number);
      await performSwitch(workOrder, pendingSwitchPhoto);
    } else {
      console.log('✅ [handleWorkOrderSelect] Selecting WO for clock in');
      setSelectedWorkOrder(workOrder);
      setShowWorkOrderDialog(false);
      await handleClockIn();
    }
  };

  const handleWorkOrderCreated = async () => {
    await loadData();
  };

  const handleEditTimesheet = async (editData) => {
    try {
      await TimesheetEntry.update(activeTimesheet.id, {
        clock_in_time: editData.clock_in_time,
        clock_out_time: editData.clock_out_time,
        is_active: false,
        status: 'pending_approval',
        was_edited: true,
        notes: editData.notes
      });

      setActiveTimesheet(null);
      setWorkType(null);
      setSelectedDepartment(null);
      toast.success('Timesheet edit submitted for approval');
      await loadData();
    } catch (error) {
      console.error('❌ Edit timesheet error:', error);
      toast.error('Failed to submit edit');
    }
  };

  const handleApproveTimesheet = async (timesheet) => {
    try {
      const notes = prompt('Add approval notes (optional):');

      await TimesheetEntry.update(timesheet.id, {
        status: 'approved',
        approval_notes: notes || 'Approved by admin'
      });

      toast.success('Timesheet approved');
      await loadData();
    } catch (error) {
      console.error('❌ Failed to approve timesheet:', error);
      toast.error('Failed to approve timesheet');
    }
  };

  const handleRejectTimesheet = async (timesheet) => {
    try {
      const notes = prompt('Add rejection reason (required):');

      if (!notes || notes.trim().length === 0) {
        toast.error('Rejection reason is required');
        return;
      }

      await TimesheetEntry.update(timesheet.id, {
        status: 'rejected',
        approval_notes: notes
      });

      toast.success('Timesheet rejected');
      await loadData();
    } catch (error) {
      console.error('❌ Failed to reject timesheet:', error);
      toast.error('Failed to reject timesheet');
    }
  };

  const handleEditAndApprove = async (timesheet, newClockIn, newClockOut) => {
    try {
      if (!newClockIn) {
        toast.error('Clock in time is required');
        return;
      }

      const clockInTime = parseISO(newClockIn);
      let clockOutTime = null;
      let totalDuration = 0;

      if (newClockOut) {
        clockOutTime = parseISO(newClockOut);
        totalDuration = Math.round((clockOutTime - clockInTime) / 60000);
      } else {
        clockOutTime = new Date();
        totalDuration = Math.round((clockOutTime - clockInTime) / 60000);
      }

      await TimesheetEntry.update(timesheet.id, {
        clock_in_time: clockInTime.toISOString(),
        clock_out_time: clockOutTime.toISOString(),
        total_duration_minutes: totalDuration,
        is_active: false,
        status: 'approved',
        approval_notes: 'Edited and approved by admin'
      });

      toast.success('Timesheet edited and approved');
      await loadData();
    } catch (error) {
      console.error('❌ Failed to edit and approve timesheet:', error);
      toast.error('Failed to edit and approve timesheet');
    }
  };

  const activeSegment = useMemo(() => {
    if (!activeTimesheet || activeTimesheet.timesheet_type !== 'field_work' || !activeTimesheet.work_order_segments) return null;
    return activeTimesheet.work_order_segments.find(seg => !seg.end_time);
  }, [activeTimesheet]);

  const activeWO = useMemo(() => {
    if (!activeSegment) return null;
    return todayWorkOrders.find(wo => wo.id === activeSegment.work_order_id);
  }, [activeSegment, todayWorkOrders]);

  const getWorkOrderInfo = (wo) => {
    if (!wo) return null;
    const project = projects.find(p => p.id === wo.project_id);
    const customer = project ? customers.find(c => c.id === project.customer_id) : null;
    const firstWord = customer?.name?.split(' ')[0] || project?.name?.split(' ')[0] || 'N/A';
    return `${wo.work_order_number || 'N/A'} ${firstWord}`.trim();
  };

  const filteredEmployeesWithStatus = useMemo(() => {
    console.log('🔍 [TimeTracker] Building employee list:', {
      totalUsersInState: users.length,
      isAdmin,
      currentUserRole: currentUser?.role,
      currentUserId: currentUser?.id,
      viewFilter
    });

    if (!Array.isArray(users) || users.length === 0) {
      console.warn('⚠️ [TimeTracker] Users array is empty or invalid');
      return [];
    }

    const usersToShow = isAdmin
      ? users.filter(u => !u.archived)
      : users.filter(u => u.id === currentUser?.id);

    console.log('👥 [TimeTracker] Users to show:', usersToShow.length, 'isAdmin:', isAdmin, 'viewFilter:', viewFilter);

    let filteredUsers = usersToShow;

    if (viewFilter === 'users' && selectedUserIds.length > 0) {
      filteredUsers = usersToShow.filter(u => selectedUserIds.includes(u.id));
    } else if (viewFilter === 'teams' && selectedTeamIds.length > 0) {
      filteredUsers = usersToShow.filter(u => selectedTeamIds.includes(u.team_id));
    }

    return filteredUsers.map(user => {
      const userTimesheets = todayTimesheets.filter(ts => ts.employee_id === user.id);
      const hasActiveTimesheet = userTimesheets.some(ts => ts.is_active);

      return {
        ...user,
        timesheets: userTimesheets,
        isWorking: hasActiveTimesheet,
        totalMinutes: userTimesheets.reduce((sum, ts) => sum + (ts.total_duration_minutes || 0), 0)
      };
    });
  }, [users, todayTimesheets, isAdmin, currentUser, viewFilter, selectedUserIds, selectedTeamIds]);


  const filteredLocations = useMemo(() => {
    const locations = [];

    console.log('🗺️ [Map] Building locations list...', {
      hasCurrentLocation: !!currentLocation,
      hasActiveTimesheet: !!activeTimesheet,
      activeTimesheetType: activeTimesheet?.timesheet_type,
      todayTimesheetsCount: todayTimesheets.length,
      usersCount: users.length,
      currentUserId: currentUser?.id,
      viewFilter,
      selectedUserIds,
      selectedTeamIds
    });

    if (currentLocation && settings.track_gps) {
      locations.push({
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        type: 'current',
        time: new Date().toISOString(),
        address: currentAddress,
        user: currentUser
      });
      console.log('🗺️ [Map] ✅ Added current location:', currentLocation);
    }

    if (!Array.isArray(users) || users.length === 0) {
      console.warn('⚠️ [Map] No users available yet - showing only current location');
      console.log('🗺️ [Map] Total locations (current only):', locations.length);
      return locations;
    }

    let timesheetsToShow = isAdmin
      ? todayTimesheets
      : todayTimesheets.filter(ts => ts.employee_id === currentUser?.id);

    if (viewFilter === 'users' && selectedUserIds.length > 0) {
      timesheetsToShow = timesheetsToShow.filter(ts => selectedUserIds.includes(ts.employee_id));
    } else if (viewFilter === 'teams' && selectedTeamIds.length > 0) {
      const teamUserIds = users.filter(u => selectedTeamIds.includes(u.team_id)).map(u => u.id);
      timesheetsToShow = timesheetsToShow.filter(ts => teamUserIds.includes(ts.employee_id));
    }

    console.log('🗺️ [Map] Timesheets to process (all types):', timesheetsToShow.length);

    timesheetsToShow.forEach((ts, idx) => {
      const employee = users.find(u => u.id === ts.employee_id);

      if (!employee) {
        console.warn(`⚠️ [Map] Employee not found for timesheet ${ts.id} (employee_id: ${ts.employee_id})`);
      }

      if (ts.clock_in_coords) {
        const hasLat = ts.clock_in_coords.lat !== undefined && ts.clock_in_coords.lat !== null;
        const hasLon = (ts.clock_in_coords.lon !== undefined && ts.clock_in_coords.lon !== null) ||
                       (ts.clock_in_coords.lng !== undefined && ts.clock_in_coords.lng !== null);
        
        console.log(`🗺️ [Map] Timesheet #${idx + 1} clock_in validation:`, {
          hasLat,
          hasLon,
          lat: ts.clock_in_coords.lat,
          lon: ts.clock_in_coords.lon,
          lng: ts.clock_in_coords.lng
        });

        if (hasLat && hasLon) {
          const location = {
            lat: ts.clock_in_coords.lat,
            lng: ts.clock_in_coords.lon || ts.clock_in_coords.lng,
            type: 'clock_in',
            time: ts.clock_in_time,
            address: ts.clock_in_address,
            user: employee || { id: ts.employee_id, first_name: 'Unknown', nickname: 'Unknown' }
          };
          locations.push(location);
          console.log(`🗺️ [Map] ✅ Added clock_in location #${idx + 1}:`, location);
        } else {
          console.warn(`⚠️ [Map] Timesheet #${idx + 1} has clock_in_coords but missing lat or lon:`, ts.clock_in_coords);
        }
      } else {
        console.warn(`⚠️ [Map] Timesheet #${idx + 1} has NO clock_in_coords`);
      }

      if (ts.clock_out_coords) {
        const hasLat = ts.clock_out_coords.lat !== undefined && ts.clock_out_coords.lat !== null;
        const hasLon = (ts.clock_out_coords.lon !== undefined && ts.clock_out_coords.lon !== null) ||
                       (ts.clock_out_coords.lng !== undefined && ts.clock_out_coords.lng !== null);
        
        if (hasLat && hasLon) {
          const location = {
            lat: ts.clock_out_coords.lat,
            lng: ts.clock_out_coords.lon || ts.clock_out_coords.lng,
            type: 'clock_out',
            time: ts.clock_out_time,
            address: ts.clock_out_address,
            user: employee || { id: ts.employee_id, first_name: 'Unknown', nickname: 'Unknown' }
          };
          locations.push(location);
          console.log(`🗺️ [Map] ✅ Added clock_out location #${idx + 1}:`, location);
        }
      }

      if (ts.timesheet_type === 'field_work' && Array.isArray(ts.live_tracking_points) && ts.live_tracking_points.length > 0) {
        console.log(`🗺️ [Map] Processing ${ts.live_tracking_points.length} tracking points for timesheet ${ts.id}`);
        
        ts.live_tracking_points.forEach((point, pointIdx) => {
          if (point.lat && (point.lon || point.lng)) {
            const location = {
              lat: point.lat,
              lng: point.lon || point.lng,
              type: 'tracking',
              time: point.timestamp,
              address: null,
              user: employee || { id: ts.employee_id, first_name: 'Unknown', nickname: 'Unknown' }
            };
            locations.push(location);
            if (pointIdx === 0) {
              console.log(`🗺️ [Map] ✅ Added tracking point #${pointIdx + 1}/${ts.live_tracking_points.length}:`, location);
            }
          }
        });
        console.log(`🗺️ [Map] ✅ Added all ${ts.live_tracking_points.length} tracking points for timesheet ${ts.id}`);
      }
    });

    console.log('🗺️ [Map] ✅ TOTAL LOCATIONS BUILT:', locations.length);

    return locations;
  }, [todayTimesheets, users, currentLocation, currentAddress, currentUser, activeTimesheet, isAdmin, viewFilter, selectedUserIds, selectedTeamIds, settings.track_gps]);

  const assignedWorkOrders = useMemo(() => {
    if (!currentUser) return [];

    let filteredWOs = [];

    if (isAdmin) {
      filteredWOs = todayWorkOrders;
    } else {
      filteredWOs = todayWorkOrders.filter(wo => {
        const employeeIds = wo.employee_ids || (wo.employee_id ? [wo.employee_id] : []);
        return employeeIds.includes(currentUser.id);
      });
    }

    const sorted = [...filteredWOs].sort((a, b) => {
      const numA = parseInt(a.work_order_number?.replace(/\D/g, '') || '0');
      const numB = parseInt(b.work_order_number?.replace(/\D/g, '') || '0');
      return numA - numB;
    });

    return sorted;
  }, [todayWorkOrders, currentUser, isAdmin]);

  const totalAssignedWorkOrders = useMemo(() => {
    if (!currentUser) return 0;

    if (isAdmin) {
      return todayWorkOrders.length;
    }

    return todayWorkOrders.filter(wo => {
      const employeeIds = wo.employee_ids || (wo.employee_id ? [wo.employee_id] : []);
      return employeeIds.includes(currentUser.id);
    }).length;
  }, [todayWorkOrders, currentUser, isAdmin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading Time Tracker...</p>
          <p className="text-xs text-slate-400 mt-2">If this takes too long, please refresh the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {settings.track_gps && gpsError && (
        <div className="bg-red-600 text-white px-4 py-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span className="text-sm font-medium">GPS Disabled - {gpsErrorMessage}</span>
            </div>
            <button onClick={() => window.location.reload()} className="text-xs bg-white text-red-600 px-3 py-1 rounded font-semibold hover:bg-red-50">
              Retry
            </button>
          </div>
        </div>
      )}

      <Card className="mx-4 mt-3 p-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${currentCompany?.time_tracker_tab_icon_url ? '' : 'bg-blue-100'}`}>
              {currentCompany?.time_tracker_tab_icon_url ? (
                <img src={currentCompany.time_tracker_tab_icon_url} alt="Time Tracker" className="w-8 h-8 object-contain" />
              ) : (
                <Clock className="w-4 h-4 text-blue-600" />
              )}
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Time Tracker</h1>
              <p className="text-[10px] text-slate-500">Track employee time and manage attendance</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowSettingsPanel(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </Card>

      <div className="p-3 bg-gradient-to-br from-rose-50 to-orange-50">
        <Card className="mb-3 p-4 bg-white shadow-md">
          <div className="flex items-stretch gap-4">
            {activeTimesheet ? (
              <>
                <DigitalClock
                  isActive={!!activeTimesheet}
                  startTime={activeTimesheet?.clock_in_time}
                  currentSegmentStartTime={activeSegment?.start_time}
                  compact={false}
                />
                <div className="flex gap-2 items-center">
                  {activeTimesheet.timesheet_type === 'field_work' && (
                    <Button onClick={handleSwitch} disabled={switchLoading} className="h-full px-6 bg-yellow-600 hover:bg-yellow-500 font-bold text-sm">⇄ SWITCH</Button>
                  )}
                  <div className="flex flex-col gap-0.5 items-center">
                  <div className="text-[10px] font-bold text-center text-slate-700">
                    {activeTimesheet.timesheet_type === 'office_work' ? 'Office' : 'Field'}
                  </div>
                  <Button onClick={handleOpenEditDialog} className="h-12 px-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold text-sm shadow-lg rounded-lg flex items-center gap-2 min-w-[100px]">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span>Stop</span>
                  </Button>
                  <div className="text-[10px] font-bold text-center text-slate-700 truncate max-w-[100px]">
                    {activeTimesheet.timesheet_type === 'office_work' 
                      ? departments.find(d => d.id === activeTimesheet.department_id)?.name || '—'
                      : activeWO 
                        ? (activeWO.title || projects.find(p => p.id === activeWO.project_id)?.name || '—')
                        : '—'}
                  </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-3 justify-center">
                  {!selectedDepartment ? (
                    <Select value={selectedDepartment || ''} onValueChange={(val) => { setSelectedDepartment(val); setWorkType('office_work'); setSelectedWorkOrder(null); }}>
                      <SelectTrigger className="h-16 px-4 bg-green-600 hover:bg-green-700 text-white border-0 font-bold text-sm min-w-[280px]">
                        <div className="flex flex-col items-start gap-0.5">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            <span>Clock In (Select Department)</span>
                          </div>
                          <span className="text-[10px] text-green-100 font-normal">For Office Staff</span>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex gap-2">
                      <div className="flex flex-col items-start gap-1 border-2 border-green-300 bg-green-50 rounded-lg px-4 py-3 min-w-[200px]">
                        <span className="text-xs text-green-600 font-semibold">Department:</span>
                        <span className="text-sm font-bold text-green-900">{departments.find(d => d.id === selectedDepartment)?.name}</span>
                      </div>
                      <Button 
                        onClick={() => { setSelectedDepartment(null); setWorkType(null); }} 
                        variant="outline" 
                        size="sm" 
                        className="h-16"
                      >
                        Change
                      </Button>
                      <Button 
                        onClick={handleClockIn} 
                        disabled={clockInLoading} 
                        className="h-16 px-6 bg-green-700 hover:bg-green-800 font-bold text-sm"
                      >
                        {clockInLoading ? 'Starting...' : 'Start Working'}
                      </Button>
                    </div>
                  )}
                  {selectedWorkOrder ? (
                    <div className="flex gap-2 items-center">
                      <div className="flex flex-col items-start gap-1 border-2 border-indigo-300 bg-indigo-50 rounded-lg px-4 py-3 min-w-[280px]">
                        <span className="text-xs text-indigo-600 font-semibold">Selected Work Order:</span>
                        <span className="text-sm font-bold text-indigo-900">{getWorkOrderInfo(selectedWorkOrder)}</span>
                      </div>
                      <Button onClick={handleClearWorkOrder} variant="outline" size="sm" className="h-16">
                        Clear
                      </Button>
                      <Button onClick={handleClockIn} disabled={clockInLoading} className="h-16 px-6 bg-indigo-700 hover:bg-indigo-800 font-bold text-sm">
                        Start Working
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={() => { setWorkType('field_work'); setSelectedDepartment(null); setShowWorkOrderDialog(true); }} disabled={clockInLoading} className="h-16 px-4 bg-indigo-600 hover:bg-indigo-700 font-bold text-sm min-w-[280px] flex flex-col items-start gap-0.5">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        <span>Clock In (Select Project)</span>
                      </div>
                      <span className="text-[10px] text-indigo-100 font-normal">For on field workers</span>
                    </Button>
                  )}
                </div>
                <DigitalClock
                  isActive={!!activeTimesheet}
                  startTime={activeTimesheet?.clock_in_time}
                  currentSegmentStartTime={activeSegment?.start_time}
                  compact={false}
                />
              </>
            )}


          </div>
        </Card>

        <Card className="overflow-hidden mb-3">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-semibold">GPS Locations</span>
              </div>
              <span className="text-xs text-slate-500">{filteredLocations.length} location{filteredLocations.length !== 1 ? 's' : ''}</span>
            </div>
            {filteredLocations.length > 0 ? (
              <GoogleMapsLocations locations={filteredLocations} />
            ) : (
              <div className="h-[350px] flex items-center justify-center bg-slate-100">
                <div className="text-center">
                  <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No GPS locations tracked</p>
                </div>
              </div>
            )}
          </Card>

        <Card className="overflow-hidden">
            {isAdmin && (
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <Select value={viewFilter} onValueChange={setViewFilter}>
                    <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Filter" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Employees</SelectItem>
                      <SelectItem value="users">By User</SelectItem>
                      <SelectItem value="teams">By Team</SelectItem>
                    </SelectContent>
                  </Select>
                  {viewFilter === 'users' && (
                    <Select value={selectedUserIds[0] || ''} onValueChange={(v) => setSelectedUserIds(v ? [v] : [])}>
                      <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Select User" /></SelectTrigger>
                      <SelectContent>{users.filter(u => !u.archived).map(u => <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                  {viewFilter === 'teams' && (
                    <Select value={selectedTeamIds[0] || ''} onValueChange={(v) => setSelectedTeamIds(v ? [v] : [])}>
                      <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Select Team" /></SelectTrigger>
                      <SelectContent>{teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                </div>



                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setSelectedDate(prev => subDays(prev, 1))}>
                    <ChevronRight className="w-3 h-3 rotate-180" />
                  </Button>
                  <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 border rounded text-xs font-medium">
                    <Calendar className="w-3 h-3" />
                    <span>{format(selectedDate, 'MMM d')}</span>
                  </div>
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setSelectedDate(prev => addDays(prev, 1))} disabled={format(selectedDate, 'yyyy-MM-dd') >= format(new Date(), 'yyyy-MM-dd')}>
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-2 py-1 text-left text-xs font-semibold text-slate-700 w-8"></th>
                    <th className="px-2 py-1 text-left text-xs font-semibold text-slate-700">Employee</th>
                    <th className="px-2 py-1 text-left text-xs font-semibold text-slate-700">Current Work</th>
                    <th className="px-2 py-1 text-left text-xs font-semibold text-slate-700">Reg. Hours</th>
                    <th className="px-2 py-1 text-left text-xs font-semibold text-slate-700">Overtime</th>
                    <th className="px-2 py-1 text-left text-xs font-semibold text-slate-700">Total</th>
                    <th className="px-2 py-1 text-left text-xs font-semibold text-slate-700">Sessions</th>
                    <th className="px-2 py-1 text-left text-xs font-semibold text-slate-700">Approvals</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployeesWithStatus.map((employee) => (
                    <EmployeeTimesheetRow
                      key={employee.id}
                      employee={employee}
                      timesheets={employee.timesheets}
                      todayWorkOrders={todayWorkOrders}
                      projects={projects}
                      departments={departments}
                      isWorking={employee.isWorking}
                      isAdmin={isAdmin}
                      onApprove={handleApproveTimesheet}
                      onReject={handleRejectTimesheet}
                      onEditAndApprove={handleEditAndApprove}
                      hoursSettings={hoursSettings}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            {filteredEmployeesWithStatus.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                <Clock className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">No timesheets found</p>
              </div>
            )}
          </Card>
      </div>

      <WorkOrderSelectionDialog
        isOpen={showWorkOrderDialog}
        onClose={() => {
          setShowWorkOrderDialog(false);
          if (pendingPhotoAction === 'switch') {
            setPendingPhotoAction(null);
            setSwitchLoading(false);
            setPendingSwitchPhoto(null);
          }
        }}
        workOrders={totalAssignedWorkOrders > 0 ? todayWorkOrders.filter(wo => {
          if (isAdmin) return true;
          const employeeIds = wo.employee_ids || (wo.employee_id ? [wo.employee_id] : []);
          return employeeIds.includes(currentUser.id);
        }).sort((a, b) => {
          const numA = parseInt(a.work_order_number?.replace(/\D/g, '') || '0');
          const numB = parseInt(b.work_order_number?.replace(/\D/g, '') || '0');
          return numA - numB;
        }) : []}
        onSelectWorkOrder={handleWorkOrderSelect}
        activeWorkOrderId={activeWO?.id}
        title={pendingPhotoAction === 'switch' ? 'Switch to Work Order' : 'Select Work Order'}
        currentUser={currentUser}
        onWorkOrderCreated={handleWorkOrderCreated}
        projects={projects}
        users={users}
        teams={teams}
        customers={customers}
        assets={assets}
        categories={categories}
        shiftTypes={shiftTypes}
      />

      <ClockOutPhotoDialog
        isOpen={showPhotoDialog}
        onClose={() => {
          setShowPhotoDialog(false);
          setPendingPhotoAction(null);
          setPendingSwitchPhoto(null);
          setClockInLoading(false);
          setSwitchLoading(false);
        }}
        onComplete={handlePhotoComplete}
        actionType={pendingPhotoAction}
        workOrder={activeWO}
      />

      <EditTimesheetDialog
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        activeTimesheet={activeTimesheet}
        onSwitch={handleSwitch}
        onClockOut={handleClockOut}
        onEdit={handleEditTimesheet}
        allWorkOrders={todayWorkOrders}
        projects={projects}
        customers={customers}
      />

      <WorkOrderStatusDialog
        isOpen={showStatusDialog}
        onClose={() => setShowStatusDialog(false)}
        onConfirm={handleStatusUpdate}
        workOrder={activeWO}
        currentStatus={activeWO?.status}
      />

      <TimeTrackerSettingsPanel
        isOpen={showSettingsPanel}
        onClose={() => {
          setShowSettingsPanel(false);
          loadData();
        }}
        onRefresh={loadData}
      />
    </div>
  );
}