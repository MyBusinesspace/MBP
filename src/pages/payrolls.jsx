import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useData } from '@/components/DataProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import {
  DollarSign,
  Users,
  FileText,
  Settings,
  Plus,
  RefreshCw,
  Loader2,
  Calendar as CalendarIcon,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { PayrollRun, PayStub, EmployeePayrollProfile } from '@/entities/all';
import PayrollRunsList from '@/components/payrolls/PayrollRunsList';
import PayrollRunDialog from '@/components/payrolls/PayrollRunDialog';
import EmployeePayrollList from '@/components/payrolls/EmployeePayrollList';
import EmployeePayrollDialog from '@/components/payrolls/EmployeePayrollDialog';
import PaySlipsView from '@/components/payrolls/PaySlipsView';
import PayrollReports from '@/components/payrolls/PayrollReports';
import PayrollSettings from '@/components/payrolls/PayrollSettings';
import PayrollRunDetailsSheet from '@/components/payrolls/PayrollRunDetailsSheet';
import LeaveAbsencesView from '@/components/payrolls/LeaveAbsencesView'; // New import
import { cn } from '@/lib/utils';

export default function PayrollsPage() {
  const { currentUser, loadUsers, currentCompany, currentBranch } = useData();

  // States
  const [activeTab, setActiveTab] = useState('runs');
  const [payrollRuns, setPayrollRuns] = useState([]);
  const [payStubs, setPayStubs] = useState([]);
  const [employeeProfiles, setEmployeeProfiles] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showRunDialog, setShowRunDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);
  const [selectedRun, setSelectedRun] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);

  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      console.log('📥 Loading payroll data...');
      console.log('🏢 Current branch:', currentBranch?.id);
      
      // First try to load payroll runs for current branch
      let runsData = [];
      if (currentBranch?.id) {
        runsData = await PayrollRun.filter({ branch_id: currentBranch.id }, '-created_date', 1000);
      }
      
      // If no runs for this branch, load all runs (legacy data without branch_id)
      if (!runsData || runsData.length === 0) {
        console.log('⚠️ No payroll runs for this branch, loading all (legacy)');
        runsData = await PayrollRun.list('-created_date', 1000);
      }
      
      const [stubsData, profilesData, usersData] = await Promise.all([
        PayStub.list('-created_date', 1000),
        EmployeePayrollProfile.list('employee_id', 1000),
        loadUsers()
      ]);

      console.log('✅ Loaded payroll runs:', runsData?.length || 0);
      console.log('✅ Loaded pay stubs:', stubsData?.length || 0);
      console.log('✅ Loaded employee profiles:', profilesData?.length || 0);
      console.log('✅ Loaded users:', usersData?.length || 0);

      setPayrollRuns(runsData || []);
      setPayStubs(stubsData || []);
      setEmployeeProfiles(profilesData || []);
      setUsers(usersData || []);
    } catch (error) {
      console.error('❌ Failed to load payroll data:', error);
      toast.error('Failed to load payroll data');
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [loadUsers, currentBranch]);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser, loadData]);

  const usersWithoutProfile = useMemo(() => {
    if (!users || !employeeProfiles) return [];
    
    return users.filter(user => {
      if (user.archived) return false;
      const hasProfile = employeeProfiles.some(p => p.employee_id === user.id);
      return !hasProfile;
    });
  }, [users, employeeProfiles]);

  const handleCreateRun = () => {
    setSelectedRun(null);
    setShowRunDialog(true);
  };

  const handleEditRun = async (run) => {
    try {
      // Reload the run from database to ensure we have all fields including other_payments_details
      const freshRun = await PayrollRun.filter({ id: run.id });
      console.log('🔍 Fresh run from DB:', freshRun[0]);
      console.log('🔍 Has other_payments_details?', freshRun[0]?.other_payments_details);
      if (freshRun && freshRun[0]) {
        setSelectedRun(freshRun[0]);
        setShowRunDialog(true);
      } else {
        toast.error('Failed to load payroll run details');
      }
    } catch (error) {
      console.error('Failed to load payroll run:', error);
      toast.error('Failed to load payroll run');
    }
  };

  const handleViewRunDetails = (run) => {
    setSelectedRun(run);
    setShowDetailsSheet(true);
  };

  const handleSaveRun = async (runData) => {
    try {
      let savedRun;
      
      // Add branch_id to new payroll runs
      const dataWithBranch = currentBranch?.id ? { ...runData, branch_id: currentBranch.id } : runData;
      
      if (selectedRun?.id) {
        savedRun = await PayrollRun.update(selectedRun.id, dataWithBranch);
        toast.success('Payroll run updated successfully');
      } else {
        savedRun = await PayrollRun.create(dataWithBranch);
        toast.success('Payroll run created successfully');
      }
      
      await loadData();
      setShowRunDialog(false);
      setSelectedRun(null);
      
      return savedRun;
    } catch (error) {
      console.error('Failed to save payroll run:', error);
      toast.error('Failed to save payroll run');
      throw error;
    }
  };

  const handleDeleteRun = async (runId) => {
    const confirmed = confirm('Are you sure you want to delete this payroll run?');
    if (!confirmed) return;
    
    try {
      await PayrollRun.delete(runId);
      await loadData();
      toast.success('Payroll run deleted successfully');
    } catch (error) {
      console.error('Failed to delete payroll run:', error);
      toast.error('Failed to delete payroll run');
    }
  };

  const handleDuplicateRun = async (run) => {
    try {
      // Generate next payrun number
      const existingNumbers = payrollRuns
        .map(r => r.payrun_number)
        .filter(Boolean)
        .map(n => {
          const match = n.match(/PR-(\d+)\/(\d+)/);
          return match ? parseInt(match[1]) : 0;
        });
      const maxNum = Math.max(0, ...existingNumbers);
      const currentYear = new Date().getFullYear().toString().slice(-2);
      const newPayrunNumber = `PR-${String(maxNum + 1).padStart(2, '0')}/${currentYear}`;

      // Get original pay stubs to copy
      const originalStubs = payStubs.filter(s => s.payroll_run_id === run.id);
      
      // Calculate totals from original stubs
      const totalGross = originalStubs.reduce((sum, s) => sum + (s.gross_pay || 0), 0);
      const totalDed = originalStubs.reduce((sum, s) => sum + (s.deductions || 0), 0);
      const totalNet = originalStubs.reduce((sum, s) => sum + (s.net_pay || 0), 0);

      // Create new run with copied data as Draft
      const newRun = await PayrollRun.create({
        payrun_number: newPayrunNumber,
        period_start_date: run.period_start_date,
        period_end_date: run.period_end_date,
        pay_date: run.pay_date,
        status: 'Draft',
        total_gross_pay: totalGross,
        total_deductions: totalDed,
        total_payroll_cost: totalNet,
        employee_payments: totalNet,
        other_payments: run.other_payments || 0,
        employee_count: originalStubs.length,
        branch_id: currentBranch?.id || run.branch_id
      });

      // Duplicate all pay stubs from the original run
      for (const stub of originalStubs) {
        await PayStub.create({
          payroll_run_id: newRun.id,
          employee_id: stub.employee_id,
          gross_pay: stub.gross_pay || 0,
          deductions: stub.deductions || 0,
          net_pay: stub.net_pay || 0,
          pay_method: stub.pay_method,
          status: 'Pending',
          data_snapshot: stub.data_snapshot || {},
          notes: stub.notes
        });
      }

      await loadData();
      
      // Open the duplicated run for editing
      const updatedRuns = await PayrollRun.filter({ id: newRun.id });
      if (updatedRuns[0]) {
        setSelectedRun(updatedRuns[0]);
        setShowRunDialog(true);
      }
      
      toast.success(`Payroll run duplicated as ${newPayrunNumber} - Please update the dates`);
    } catch (error) {
      console.error('Failed to duplicate payroll run:', error);
      toast.error('Failed to duplicate payroll run');
      throw error;
    }
  };

  const handleCreateProfile = () => {
    setSelectedProfile(null);
    setShowProfileDialog(true);
  };

  const handleEditProfile = (profile) => {
    setSelectedProfile(profile);
    setShowProfileDialog(true);
  };

  const handleSaveProfile = async (profileData) => {
    try {
      if (selectedProfile?.id) {
        await EmployeePayrollProfile.update(selectedProfile.id, profileData);
        toast.success('Employee profile updated successfully');
      } else {
        await EmployeePayrollProfile.create(profileData);
        toast.success('Employee profile created successfully');
      }
      await loadData();
      setShowProfileDialog(false);
      setSelectedProfile(null);
    } catch (error) {
      console.error('Failed to save employee profile:', error);
      toast.error('Failed to save employee profile');
    }
  };

  const handleDeleteProfile = async (profileId) => {
    const confirmed = confirm('Are you sure you want to delete this employee profile?');
    if (!confirmed) return;
    
    try {
      await EmployeePayrollProfile.delete(profileId);
      await loadData();
      toast.success('Employee profile deleted successfully');
    } catch (error) {
      console.error('Failed to delete employee profile:', error);
      toast.error('Failed to delete employee profile');
    }
  };

  const stats = useMemo(() => {
    const activeRuns = payrollRuns.filter(r => r.status !== 'Paid');
    const totalCost = payrollRuns
      .filter(r => r.status === 'Paid')
      .reduce((sum, r) => sum + (r.total_payroll_cost || 0), 0);
    
    const activeUsers = users.filter(u => !u.archived);
    const totalEmployees = activeUsers.length;
    const employeesWithProfiles = employeeProfiles.length;
    const employeesWithoutProfiles = usersWithoutProfile.length;
    
    const pendingPaySlips = payStubs.filter(s => s.status === 'Pending').length;

    return {
      activeRuns: activeRuns.length,
      totalCost,
      totalEmployees,
      employeesWithProfiles,
      employeesWithoutProfiles,
      pendingPaySlips
    };
  }, [payrollRuns, payStubs, employeeProfiles, users, usersWithoutProfile]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <Card className="mb-6 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {currentCompany?.payroll_tab_icon_url ? (
              <img src={currentCompany.payroll_tab_icon_url} alt="Payroll" className="w-10 h-10 object-contain" />
            ) : (
              <div className="p-2 bg-yellow-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-yellow-600" />
              </div>
            )}
            <h1 className="text-xl font-bold text-slate-900">Payroll Management</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('settings')}
            className={cn(activeTab === 'settings' && "bg-slate-100")}
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </Card>

      <div className="mb-6 flex items-center gap-3 text-xs text-slate-500">
        <span>{stats.activeRuns} runs</span>
        <span>•</span>
        <span>${stats.totalCost.toLocaleString()} paid</span>
        <span>•</span>
        <span>{stats.totalEmployees} employees</span>
        <span>•</span>
        <span>{stats.pendingPaySlips} pending</span>
      </div>

      {/* Alert para usuarios sin perfil */}
      {usersWithoutProfile.length > 0 && activeTab === 'employees' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Badge className="bg-yellow-100 text-yellow-800 mt-0.5">
                {usersWithoutProfile.length}
              </Badge>
              <div className="flex-1">
                <div className="font-medium text-sm text-yellow-900">
                  Employees Without Payroll Profile
                </div>
                <div className="text-sm text-yellow-700 mt-1">
                  {usersWithoutProfile.slice(0, 5).map(u => u.nickname || u.full_name).join(', ')}
                  {usersWithoutProfile.length > 5 && ` and ${usersWithoutProfile.length - 5} more`}
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex items-center justify-between sticky top-0 z-10 bg-slate-50 py-2">
            <TabsList className="bg-white border border-slate-200">
              <TabsTrigger value="runs" className="gap-2">
                <CalendarIcon className="w-4 h-4" />
                Payroll Runs
              </TabsTrigger>
              <TabsTrigger value="employees" className="gap-2">
                <Users className="w-4 h-4" />
                Employees
              </TabsTrigger>
              <TabsTrigger value="stubs" className="gap-2">
                <FileText className="w-4 h-4" />
                Pay Slips
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                Reports
              </TabsTrigger>
              <TabsTrigger value="leave" className="gap-2">
                <CalendarIcon className="w-4 h-4" />
                Leave & Absences
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>

              {activeTab === 'runs' && (
                <Button onClick={handleCreateRun} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Payroll Run
                </Button>
              )}

              {activeTab === 'employees' && (
                <Button onClick={handleCreateProfile} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Employee Profile
                </Button>
              )}
            </div>
          </div>

          <TabsContent value="runs" className="space-y-4">
            <PayrollRunsList
              runs={payrollRuns}
              users={users}
              onEditRun={handleEditRun}
              onDeleteRun={handleDeleteRun}
              onRefresh={loadData}
              onViewDetails={handleViewRunDetails}
              onDuplicateRun={handleDuplicateRun}
            />
          </TabsContent>

          <TabsContent value="employees" className="space-y-4">
            <EmployeePayrollList
              profiles={employeeProfiles}
              users={users}
              onEditProfile={handleEditProfile}
              onDeleteProfile={handleDeleteProfile}
              onRefresh={loadData}
            />
          </TabsContent>

          <TabsContent value="stubs" className="space-y-4">
            <PaySlipsView
              payStubs={payStubs}
              users={users}
              payrollRuns={payrollRuns}
              onRefresh={loadData}
            />
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <PayrollReports
              payrollRuns={payrollRuns}
              payStubs={payStubs}
              employeeProfiles={employeeProfiles}
              users={users}
            />
          </TabsContent>

          <TabsContent value="leave" className="space-y-4">
            <LeaveAbsencesView
              users={users}
              currentUser={currentUser}
              onRefresh={loadData}
            />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <PayrollSettings
              onRefresh={loadData}
            />
          </TabsContent>
        </Tabs>

      {/* Dialogs */}
      {showRunDialog && (
        <PayrollRunDialog
          isOpen={showRunDialog}
          run={selectedRun}
          users={users}
          employeeProfiles={employeeProfiles}
          onSave={handleSaveRun}
          onClose={() => {
            setShowRunDialog(false);
            setSelectedRun(null);
          }}
        />
      )}

      {showProfileDialog && (
        <EmployeePayrollDialog
          isOpen={showProfileDialog}
          profile={selectedProfile}
          users={users}
          onSave={handleSaveProfile}
          onClose={() => {
            setShowProfileDialog(false);
            setSelectedProfile(null);
          }}
        />
      )}

      {/* Pay Run Details Sheet */}
      {showDetailsSheet && selectedRun && (
        <PayrollRunDetailsSheet
          isOpen={showDetailsSheet}
          onClose={() => {
            setShowDetailsSheet(false);
            setSelectedRun(null);
          }}
          payrollRun={selectedRun}
          payStubs={payStubs.filter(s => s.payroll_run_id === selectedRun.id)}
          users={users}
          onRefresh={loadData}
        />
      )}
    </div>
  );
}