import React, { useState, useEffect } from 'react';
import { TimeEntry } from '@/entities/all';
import { base44 } from '@/api/base44Client';
import { useData } from '@/components/DataProvider';
import { toast } from 'sonner';
import DigitalClock from '@/components/time-tracker/DigitalClock';
import WorkOrderSelectionDialog from '@/components/time-tracker/WorkOrderSelectionDialog';
import ClockOutPhotoDialog from '@/components/time-tracker/ClockOutPhotoDialog';
import WorkOrderStatusDialog from '@/components/time-tracker/WorkOrderStatusDialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function TimeClockPage() {
  const { currentUser, loadProjects, loadCustomers, loadUsers, loadWorkOrderCategories, loadShiftTypes } = useData();

  const [activeTimesheet, setActiveTimesheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // ✅ Selected WO antes de Clock In/Switch
  const [selectedWO, setSelectedWO] = useState(null);
  
  const [showWOSelectionDialog, setShowWOSelectionDialog] = useState(false);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [photoAction, setPhotoAction] = useState(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [currentWOForStatus, setCurrentWOForStatus] = useState(null);

  const [settings, setSettings] = useState({
    require_photo_clock_in: false,
    require_photo_clock_out: false,
    require_photo_switch: false,
    track_gps: false
  });

  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [categories, setCategories] = useState([]);
  const [shiftTypes, setShiftTypes] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);

  useEffect(() => {
    if (currentUser) {
      initializePage();
    }
  }, [currentUser]);

  const initializePage = async () => {
    try {
      setLoading(true);

      const [
        projectsData,
        customersData,
        usersData,
        categoriesData,
        shiftTypesData,
        settingsData,
        timesheetData,
        workOrdersData
      ] = await Promise.all([
        loadProjects(),
        loadCustomers(),
        loadUsers(),
        loadWorkOrderCategories(),
        loadShiftTypes(),
        fetchSettings(),
        fetchActiveTimesheet(),
        fetchTodayWorkOrders()
      ]);

      setProjects(projectsData || []);
      setCustomers(customersData || []);
      setUsers(usersData || []);
      setCategories(categoriesData || []);
      setShiftTypes(shiftTypesData || []);
      setSettings(settingsData);
      setActiveTimesheet(timesheetData);
      setWorkOrders(workOrdersData || []);

      console.log('✅ Page initialized:', {
        projects: projectsData?.length,
        workOrders: workOrdersData?.length,
        activeTimesheet: !!timesheetData
      });

    } catch (error) {
      console.error('❌ Failed to initialize page:', error);
      toast.error('Failed to load time tracker');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await base44.functions.invoke('apiTimeTracker', {
        action: 'getSettings'
      }, {
        headers: { 'X-User-ID': currentUser.id }
      });

      return response.data?.data || {
        require_photo_clock_in: false,
        require_photo_clock_out: false,
        require_photo_switch: false,
        track_gps: false
      };
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      return {
        require_photo_clock_in: false,
        require_photo_clock_out: false,
        require_photo_switch: false,
        track_gps: false
      };
    }
  };

  const fetchActiveTimesheet = async () => {
    try {
      const response = await base44.functions.invoke('apiTimeTracker', {
        action: 'getActiveTimesheet'
      }, {
        headers: { 'X-User-ID': currentUser.id }
      });

      return response.data?.data || null;
    } catch (error) {
      console.error('Failed to fetch active timesheet:', error);
      return null;
    }
  };

  const fetchTodayWorkOrders = async () => {
    try {
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');

      const allWorkOrders = await TimeEntry.filter({
        status: { $in: ['on_queue', 'ongoing'] }
      });

      const userWorkOrders = allWorkOrders.filter(wo => {
        const isAssignedToUser = (wo.employee_ids || []).includes(currentUser.id);
        const isAssignedToUserTeam = currentUser.team_id && (wo.team_ids || []).includes(currentUser.team_id);
        const isToday = wo.planned_start_time && wo.planned_start_time.startsWith(todayStr);
        
        return (isAssignedToUser || isAssignedToUserTeam) && isToday;
      });

      console.log('📅 Today WOs:', userWorkOrders.length);

      return userWorkOrders;
    } catch (error) {
      console.error('Failed to fetch today work orders:', error);
      return [];
    }
  };

  const getCoordinates = () => {
    return new Promise((resolve) => {
      if (!settings.track_gps || !navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Failed to get location:', error);
          resolve(null);
        }
      );
    });
  };

  const getAddress = async (coords) => {
    if (!coords) return null;

    try {
      const response = await base44.functions.invoke('reverseGeocode', {
        latitude: coords.lat,
        longitude: coords.lon
      });

      return response.data?.address || null;
    } catch (error) {
      console.warn('Failed to get address:', error);
      return null;
    }
  };

  // ✅ Handler para abrir selector de WO (desde el reloj)
  const handleSelectWO = () => {
    console.log('🎯 Opening WO selection dialog...');
    setShowWOSelectionDialog(true);
  };

  // ✅ Handler cuando se selecciona un WO
  const handleWOSelected = (wo) => {
    console.log('✅ WO Selected:', wo);
    setSelectedWO(wo);
    setShowWOSelectionDialog(false);
  };

  // ✅ Clock In (con validación de WO seleccionado)
  const handleClockIn = async () => {
    if (!selectedWO) {
      toast.error('Please select a work order first');
      return;
    }

    if (settings.require_photo_clock_in) {
      setPhotoAction('clockin');
      setShowPhotoDialog(true);
    } else {
      await executeClockIn(null);
    }
  };

  const executeClockIn = async (photoUrl) => {
    try {
      setActionLoading(true);

      const coords = await getCoordinates();
      const address = coords ? await getAddress(coords) : null;

      const response = await base44.functions.invoke('apiTimeTracker', {
        action: 'clockIn',
        work_order_id: selectedWO.id,
        clock_in_coords: coords,
        clock_in_photo_url: photoUrl,
        clock_in_address: address
      }, {
        headers: { 'X-User-ID': currentUser.id }
      });

      if (response.data?.success) {
        toast.success('Clocked in successfully!');
        setActiveTimesheet(response.data.data);
        setSelectedWO(null);
      } else {
        throw new Error(response.data?.error || 'Failed to clock in');
      }
    } catch (error) {
      console.error('❌ Clock in failed:', error);
      toast.error(error.message || 'Failed to clock in');
    } finally {
      setActionLoading(false);
    }
  };

  // ✅ Switch WO
  const handleSwitch = () => {
    console.log('🔄 Opening WO selection for switch...');
    setShowWOSelectionDialog(true);
  };

  const handleSwitchWOSelected = (wo) => {
    console.log('✅ Switch WO Selected:', wo);
    setSelectedWO(wo);
    setShowWOSelectionDialog(false);

    if (settings.require_photo_switch) {
      setPhotoAction('switch');
      setShowPhotoDialog(true);
    } else {
      executeSwitch(null);
    }
  };

  const executeSwitch = async (photoUrl) => {
    try {
      setActionLoading(true);

      const response = await base44.functions.invoke('apiTimeTracker', {
        action: 'switchWorkOrder',
        work_order_id: selectedWO.id,
        switch_photo_url: photoUrl
      }, {
        headers: { 'X-User-ID': currentUser.id }
      });

      if (response.data?.success) {
        toast.success('Switched work order successfully!');
        setActiveTimesheet(response.data.data);
        setSelectedWO(null);
      } else {
        throw new Error(response.data?.error || 'Failed to switch');
      }
    } catch (error) {
      console.error('❌ Switch failed:', error);
      toast.error(error.message || 'Failed to switch work order');
    } finally {
      setActionLoading(false);
    }
  };

  // ✅ Clock Out
  const handleClockOut = () => {
    const activeSegment = activeTimesheet?.work_order_segments?.find(seg => !seg.end_time);
    const currentWO = activeSegment ? workOrders.find(wo => wo.id === activeSegment.work_order_id) : null;

    const isTeamLeader = currentUser?.is_team_leader || false;
    const isAdmin = currentUser?.role === 'admin';

    if ((isTeamLeader || isAdmin) && currentWO) {
      setCurrentWOForStatus(currentWO);
      setShowStatusDialog(true);
    } else {
      proceedToClockOut();
    }
  };

  const handleStatusConfirmed = async (newStatus, statusNotes) => {
    try {
      await TimeEntry.update(currentWOForStatus.id, {
        status: newStatus,
        work_notes: statusNotes ? `${currentWOForStatus.work_notes || ''}\n${statusNotes}`.trim() : currentWOForStatus.work_notes
      });

      setShowStatusDialog(false);
      setCurrentWOForStatus(null);
      proceedToClockOut();
    } catch (error) {
      console.error('Failed to update WO status:', error);
      toast.error('Failed to update work order status');
    }
  };

  const proceedToClockOut = () => {
    if (settings.require_photo_clock_out) {
      setPhotoAction('clockout');
      setShowPhotoDialog(true);
    } else {
      executeClockOut(null);
    }
  };

  const executeClockOut = async (photoUrl) => {
    try {
      setActionLoading(true);

      const coords = await getCoordinates();
      const address = coords ? await getAddress(coords) : null;

      const response = await base44.functions.invoke('apiTimeTracker', {
        action: 'clockOut',
        clock_out_coords: coords,
        clock_out_photo_url: photoUrl,
        clock_out_address: address
      }, {
        headers: { 'X-User-ID': currentUser.id }
      });

      if (response.data?.success) {
        toast.success('Clocked out successfully!');
        setActiveTimesheet(null);
      } else {
        throw new Error(response.data?.error || 'Failed to clock out');
      }
    } catch (error) {
      console.error('❌ Clock out failed:', error);
      toast.error(error.message || 'Failed to clock out');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePhotoComplete = async (photoUrl) => {
    setShowPhotoDialog(false);

    if (photoAction === 'clockin') {
      await executeClockIn(photoUrl);
    } else if (photoAction === 'switch') {
      await executeSwitch(photoUrl);
    } else if (photoAction === 'clockout') {
      await executeClockOut(photoUrl);
    }

    setPhotoAction(null);
  };

  const handleWorkOrderCreated = async () => {
    console.log('🔄 Refreshing work orders after creation...');
    const updatedWOs = await fetchTodayWorkOrders();
    setWorkOrders(updatedWOs);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Get current/selected WO info
  const activeSegment = activeTimesheet?.work_order_segments?.find(seg => !seg.end_time);
  const currentWO = activeSegment ? workOrders.find(wo => wo.id === activeSegment.work_order_id) : null;
  const currentProject = currentWO ? projects.find(p => p.id === currentWO.project_id) : null;
  const currentCustomer = currentProject ? customers.find(c => c.id === currentProject.customer_id) : null;

  // ✅ Info para mostrar en el reloj
  const activeWorkOrderInfo = currentWO
    ? `${currentWO.work_order_number || ''} - ${currentProject?.name || 'Unknown'}`
    : null;

  const selectedWorkOrderInfo = selectedWO && !activeTimesheet
    ? `${selectedWO.work_order_number || ''} - ${projects.find(p => p.id === selectedWO.project_id)?.name || 'Unknown'}`
    : null;

  const plannedStartTime = (currentWO?.planned_start_time || selectedWO?.planned_start_time)
    ? format(parseISO(currentWO?.planned_start_time || selectedWO.planned_start_time), 'HH:mm')
    : null;

  const plannedEndTime = (currentWO?.planned_end_time || selectedWO?.planned_end_time)
    ? format(parseISO(currentWO?.planned_end_time || selectedWO.planned_end_time), 'HH:mm')
    : null;

  console.log('🎨 Render state:', {
    activeTimesheet: !!activeTimesheet,
    selectedWO: !!selectedWO,
    workOrdersCount: workOrders.length,
    showWOSelectionDialog
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Time Clock</h1>
          <p className="text-slate-600 mt-1">Track your work hours</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Digital Clock */}
          <div className="space-y-6">
            {/* ✅ SIEMPRE mostrar DigitalClock */}
            <DigitalClock
              isActive={!!activeTimesheet}
              startTime={activeTimesheet?.clock_in_time}
              currentSegmentStartTime={activeSegment?.start_time}
              onClockIn={handleClockIn}
              onClockOut={handleClockOut}
              onSwitch={handleSwitch}
              onSelectWO={handleSelectWO}
              actionLoading={actionLoading}
              activeWorkOrderInfo={activeWorkOrderInfo}
              selectedWorkOrderInfo={selectedWorkOrderInfo}
              plannedStartTime={plannedStartTime}
              plannedEndTime={plannedEndTime}
            />

            {/* Selected WO Info Card (cuando hay WO seleccionado pero no activo) */}
            {selectedWO && !activeTimesheet && (
              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-slate-900">Selected Work Order</h3>
                  <button
                    onClick={() => setSelectedWO(null)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="font-medium text-blue-900">
                    {selectedWO.work_order_number || 'WO'}
                  </div>
                  <div className="text-sm text-blue-700 mt-1">
                    {projects.find(p => p.id === selectedWO.project_id)?.name || 'Unknown Project'}
                  </div>
                  {selectedWO.work_notes && (
                    <div className="text-xs text-blue-600 mt-2">
                      {selectedWO.work_notes}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Current Location */}
            {activeTimesheet && (
              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-indigo-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-1">Clock In Location</h3>
                    <p className="text-sm text-slate-600">
                      {activeTimesheet.clock_in_address || 'Location not available'}
                    </p>
                    {activeTimesheet.clock_in_time && (
                      <p className="text-xs text-slate-500 mt-1">
                        Started at {format(parseISO(activeTimesheet.clock_in_time), 'HH:mm')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Work Order Details */}
          <div className="space-y-6">
            {currentWO && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="font-bold text-lg mb-4">Current Work Order</h3>
                
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Work Order</div>
                    <div className="font-semibold text-slate-900">
                      {currentWO.work_order_number || 'N/A'}
                    </div>
                  </div>

                  {currentProject && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Project</div>
                      <div className="font-semibold text-slate-900">
                        {currentProject.name}
                      </div>
                    </div>
                  )}

                  {currentCustomer && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Customer</div>
                      <div className="text-slate-700">
                        {currentCustomer.name}
                      </div>
                    </div>
                  )}

                  {currentWO.work_notes && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Notes</div>
                      <div className="text-sm text-slate-700">
                        {currentWO.work_notes}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-xs text-slate-500 mb-1">Status</div>
                    <Badge
                      className={
                        currentWO.status === 'ongoing'
                          ? 'bg-blue-100 text-blue-700'
                          : currentWO.status === 'on_queue'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-slate-100 text-slate-700'
                      }
                    >
                      {currentWO.status}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Today's Schedule */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-lg mb-4">Today's Schedule</h3>
              
              {workOrders.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Calendar className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">No work orders scheduled for today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {workOrders.map((wo) => {
                    const project = projects.find(p => p.id === wo.project_id);
                    const isActive = currentWO?.id === wo.id;
                    const isSelected = selectedWO?.id === wo.id;

                    return (
                      <div
                        key={wo.id}
                        className={`p-3 rounded-lg border-2 transition-colors ${
                          isActive
                            ? 'bg-green-50 border-green-300'
                            : isSelected
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-semibold text-slate-900">
                            {wo.work_order_number || 'WO'}
                          </div>
                          {isActive && (
                            <Badge className="bg-green-600 text-white text-[10px]">
                              ACTIVE
                            </Badge>
                          )}
                          {isSelected && !isActive && (
                            <Badge className="bg-blue-600 text-white text-[10px]">
                              SELECTED
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-slate-700 mb-1">
                          {project?.name || 'Unknown Project'}
                        </div>
                        {wo.planned_start_time && wo.planned_end_time && (
                          <div className="text-xs text-slate-500">
                            {format(parseISO(wo.planned_start_time), 'HH:mm')} - {format(parseISO(wo.planned_end_time), 'HH:mm')}
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

      {/* Dialogs */}
      <WorkOrderSelectionDialog
        isOpen={showWOSelectionDialog}
        onClose={() => {
          console.log('❌ Closing WO selection dialog');
          setShowWOSelectionDialog(false);
        }}
        workOrders={workOrders}
        onSelectWorkOrder={activeTimesheet ? handleSwitchWOSelected : handleWOSelected}
        activeWorkOrderId={currentWO?.id}
        title={activeTimesheet ? "Switch to Work Order" : "Select Work Order"}
        currentUser={currentUser}
        onWorkOrderCreated={handleWorkOrderCreated}
        projects={projects}
        users={users}
        teams={teams}
        customers={customers}
        assets={[]}
        categories={categories}
        shiftTypes={shiftTypes}
      />

      <ClockOutPhotoDialog
        isOpen={showPhotoDialog}
        onClose={() => setShowPhotoDialog(false)}
        onComplete={handlePhotoComplete}
        actionType={photoAction}
        workOrder={currentWO}
      />

      <WorkOrderStatusDialog
        isOpen={showStatusDialog}
        onClose={() => {
          setShowStatusDialog(false);
          setCurrentWOForStatus(null);
        }}
        onConfirm={handleStatusConfirmed}
        workOrder={currentWOForStatus}
        currentStatus={currentWOForStatus?.status}
      />
    </div>
  );
}