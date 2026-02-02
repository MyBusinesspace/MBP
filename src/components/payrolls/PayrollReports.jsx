import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  Download,
  BarChart3,
  Filter,
  Clock,
  FileText,
  Building2
} from 'lucide-react';
import { format, parseISO, startOfYear, endOfYear } from 'date-fns';
import Avatar from '../Avatar';

export default function PayrollReports({ 
  payrollRuns = [], 
  payStubs = [], 
  employeeProfiles = [],
  users = []
}) {
  const [activeReportTab, setActiveReportTab] = useState('summary');
  const [dateRangeStart, setDateRangeStart] = useState(format(startOfYear(new Date()), 'yyyy-MM-dd'));
  const [dateRangeEnd, setDateRangeEnd] = useState(format(endOfYear(new Date()), 'yyyy-MM-dd'));
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  // Get unique departments
  const departments = useMemo(() => {
    const deptSet = new Set();
    users.forEach(user => {
      if (user.department) deptSet.add(user.department);
    });
    return Array.from(deptSet).sort();
  }, [users]);

  // Filter data based on selected filters
  const filteredData = useMemo(() => {
    const start = new Date(dateRangeStart);
    const end = new Date(dateRangeEnd);
    end.setHours(23, 59, 59, 999);

    const filteredRuns = payrollRuns.filter(run => {
      if (!run.period_start_date) return false;
      const runDate = new Date(run.period_start_date);
      const dateMatch = runDate >= start && runDate <= end;
      const statusMatch = selectedStatus === 'all' || run.status === selectedStatus;
      return dateMatch && statusMatch;
    });

    const filteredStubs = payStubs.filter(stub => {
      if (!stub.created_date) return false;
      const stubDate = new Date(stub.created_date);
      const dateMatch = stubDate >= start && stubDate <= end;
      const employeeMatch = selectedEmployee === 'all' || stub.employee_id === selectedEmployee;
      const statusMatch = selectedStatus === 'all' || stub.status === selectedStatus;
      
      // Department filter
      let departmentMatch = true;
      if (selectedDepartment !== 'all') {
        const user = users.find(u => u.id === stub.employee_id);
        departmentMatch = user?.department === selectedDepartment;
      }
      
      return dateMatch && employeeMatch && statusMatch && departmentMatch;
    });

    return { runs: filteredRuns, stubs: filteredStubs };
  }, [payrollRuns, payStubs, dateRangeStart, dateRangeEnd, selectedEmployee, selectedStatus, selectedDepartment, users]);

  // 1. PAYROLL SUMMARY BY DEPARTMENT
  const departmentSummary = useMemo(() => {
    const summary = {};

    filteredData.stubs.forEach(stub => {
      const user = users.find(u => u.id === stub.employee_id);
      const dept = user?.department || 'Unassigned';

      if (!summary[dept]) {
        summary[dept] = {
          department: dept,
          employee_count: new Set(),
          total_gross: 0,
          total_deductions: 0,
          total_net: 0
        };
      }

      summary[dept].employee_count.add(stub.employee_id);
      summary[dept].total_gross += stub.gross_pay || 0;
      summary[dept].total_deductions += stub.deductions || 0;
      summary[dept].total_net += stub.net_pay || 0;
    });

    return Object.values(summary).map(dept => ({
      ...dept,
      employee_count: dept.employee_count.size
    })).sort((a, b) => b.total_net - a.total_net);
  }, [filteredData.stubs, users]);

  // 2. YEAR-TO-DATE (YTD) EARNINGS PER EMPLOYEE
  const ytdReport = useMemo(() => {
    const ytdData = {};

    filteredData.stubs.forEach(stub => {
      if (!ytdData[stub.employee_id]) {
        const user = users.find(u => u.id === stub.employee_id);
        ytdData[stub.employee_id] = {
          employee_id: stub.employee_id,
          user,
          total_gross: 0,
          total_deductions: 0,
          total_net: 0,
          federal_tax: 0,
          state_tax: 0,
          social_security: 0,
          medicare: 0,
          other_deductions: 0,
          pay_stubs_count: 0
        };
      }

      const data = ytdData[stub.employee_id];
      data.total_gross += stub.gross_pay || 0;
      data.total_deductions += stub.deductions || 0;
      data.total_net += stub.net_pay || 0;
      data.pay_stubs_count += 1;

      // Parse deductions breakdown from data_snapshot
      if (stub.data_snapshot?.deductions_breakdown) {
        const breakdown = stub.data_snapshot.deductions_breakdown;
        data.federal_tax += breakdown.federal_tax || 0;
        data.state_tax += breakdown.state_tax || 0;
        data.social_security += breakdown.social_security || 0;
        data.medicare += breakdown.medicare || 0;
        data.other_deductions += (breakdown.health_insurance || 0) + (breakdown.retirement || 0);
      }
    });

    return Object.values(ytdData).sort((a, b) => b.total_gross - a.total_gross);
  }, [filteredData.stubs, users]);

  // 3. TAX LIABILITY REPORT
  const taxLiability = useMemo(() => {
    const taxes = {
      federal_tax: 0,
      state_tax: 0,
      social_security: 0,
      medicare: 0,
      total: 0
    };

    filteredData.stubs.forEach(stub => {
      if (stub.data_snapshot?.deductions_breakdown) {
        const breakdown = stub.data_snapshot.deductions_breakdown;
        taxes.federal_tax += breakdown.federal_tax || 0;
        taxes.state_tax += breakdown.state_tax || 0;
        taxes.social_security += breakdown.social_security || 0;
        taxes.medicare += breakdown.medicare || 0;
      }
    });

    taxes.total = taxes.federal_tax + taxes.state_tax + taxes.social_security + taxes.medicare;

    return taxes;
  }, [filteredData.stubs]);

  // 4. OVERTIME ANALYSIS REPORT
  const overtimeAnalysis = useMemo(() => {
    const analysis = {};

    filteredData.stubs.forEach(stub => {
      const hoursData = stub.data_snapshot?.hours_data;
      if (hoursData && hoursData.overtime_hours > 0) {
        if (!analysis[stub.employee_id]) {
          const user = users.find(u => u.id === stub.employee_id);
          analysis[stub.employee_id] = {
            employee_id: stub.employee_id,
            user,
            total_overtime_hours: 0,
            total_overtime_pay: 0,
            overtime_occurrences: 0
          };
        }

        const data = analysis[stub.employee_id];
        data.total_overtime_hours += hoursData.overtime_hours || 0;
        data.total_overtime_pay += stub.data_snapshot?.overtime_pay || 0;
        data.overtime_occurrences += 1;
      }
    });

    return Object.values(analysis).sort((a, b) => b.total_overtime_hours - a.total_overtime_hours);
  }, [filteredData.stubs, users]);

  const stats = useMemo(() => {
    const totalPaid = filteredData.runs
      .filter(r => r.status === 'Paid')
      .reduce((sum, r) => sum + (r.total_payroll_cost || 0), 0);

    const averageCostPerRun = filteredData.runs.length > 0 
      ? totalPaid / filteredData.runs.length 
      : 0;

    const averageNetPay = filteredData.stubs.length > 0
      ? filteredData.stubs.reduce((sum, s) => sum + (s.net_pay || 0), 0) / filteredData.stubs.length
      : 0;

    return {
      totalPaid,
      averageCostPerRun,
      runsCount: filteredData.runs.length,
      averageNetPay,
      totalEmployees: employeeProfiles.length,
      stubsCount: filteredData.stubs.length
    };
  }, [filteredData, employeeProfiles]);

  return (
    <div className="space-y-6">
      {/* Filters Card */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-slate-900">Report Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-2 block">
              Start Date
            </Label>
            <Input
              type="date"
              value={dateRangeStart}
              onChange={(e) => setDateRangeStart(e.target.value)}
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-slate-700 mb-2 block">
              End Date
            </Label>
            <Input
              type="date"
              value={dateRangeEnd}
              onChange={(e) => setDateRangeEnd(e.target.value)}
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-slate-700 mb-2 block">
              Employee
            </Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {users.filter(u => !u.archived).map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.nickname || user.full_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium text-slate-700 mb-2 block">
              Department
            </Label>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium text-slate-700 mb-2 block">
              Status
            </Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-white border-blue-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                ${stats.totalPaid.toLocaleString()}
              </div>
              <div className="text-sm text-slate-600">Total Paid (Filtered)</div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-white border-green-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                ${stats.averageCostPerRun.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div className="text-sm text-slate-600">Average Cost per Run</div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-white border-purple-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {stats.stubsCount}
              </div>
              <div className="text-sm text-slate-600">Pay Slips Generated</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Reports Tabs */}
      <Card className="p-6">
        <Tabs value={activeReportTab} onValueChange={setActiveReportTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="summary" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="department" className="gap-2">
              <Building2 className="w-4 h-4" />
              By Department
            </TabsTrigger>
            <TabsTrigger value="ytd" className="gap-2">
              <FileText className="w-4 h-4" />
              YTD Report
            </TabsTrigger>
            <TabsTrigger value="taxes" className="gap-2">
              <DollarSign className="w-4 h-4" />
              Tax Liability
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="summary" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  Overtime Analysis
                </h4>
                {overtimeAnalysis.length === 0 ? (
                  <p className="text-sm text-slate-500">No overtime recorded in selected period</p>
                ) : (
                  <div className="space-y-2">
                    {overtimeAnalysis.slice(0, 5).map(item => (
                      <div key={item.employee_id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar user={item.user} size="xs" />
                          <span className="text-sm font-medium">
                            {item.user?.nickname || item.user?.full_name}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-orange-600">
                            {item.total_overtime_hours.toFixed(1)}h
                          </div>
                          <div className="text-xs text-slate-500">
                            ${item.total_overtime_pay.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  Recent Payroll Runs
                </h4>
                <div className="space-y-2">
                  {filteredData.runs.slice(0, 5).map((run) => (
                    <div
                      key={run.id}
                      className="flex items-center justify-between p-2 bg-white rounded hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <div>
                          <div className="text-sm font-medium">
                            {run.period_start_date && format(parseISO(run.period_start_date), 'MMM d')} - 
                            {run.period_end_date && format(parseISO(run.period_end_date), 'MMM d')}
                          </div>
                          <div className="text-xs text-slate-500">
                            {run.employee_count || 0} employees
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-slate-900">
                          ${(run.total_payroll_cost || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-500">{run.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Department Summary Tab */}
          <TabsContent value="department" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Payroll Summary by Department</h3>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>

            {departmentSummary.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                No data available for selected filters
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left p-4 text-sm font-semibold text-slate-700">Department</th>
                      <th className="text-right p-4 text-sm font-semibold text-slate-700">Employees</th>
                      <th className="text-right p-4 text-sm font-semibold text-slate-700">Gross Pay</th>
                      <th className="text-right p-4 text-sm font-semibold text-slate-700">Deductions</th>
                      <th className="text-right p-4 text-sm font-semibold text-slate-700">Net Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departmentSummary.map((dept, idx) => (
                      <tr key={idx} className="border-b hover:bg-slate-50">
                        <td className="p-4 font-medium">{dept.department}</td>
                        <td className="p-4 text-right">{dept.employee_count}</td>
                        <td className="p-4 text-right font-medium">${dept.total_gross.toLocaleString()}</td>
                        <td className="p-4 text-right text-red-600">-${dept.total_deductions.toLocaleString()}</td>
                        <td className="p-4 text-right font-semibold text-green-600">${dept.total_net.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* YTD Report Tab */}
          <TabsContent value="ytd" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Year-to-Date Earnings & Deductions</h3>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>

            {ytdReport.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                No data available for selected filters
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="text-left p-3 font-semibold text-slate-700">Employee</th>
                        <th className="text-right p-3 font-semibold text-slate-700">Pay Slips</th>
                        <th className="text-right p-3 font-semibold text-slate-700">Gross Pay</th>
                        <th className="text-right p-3 font-semibold text-slate-700">Federal Tax</th>
                        <th className="text-right p-3 font-semibold text-slate-700">State Tax</th>
                        <th className="text-right p-3 font-semibold text-slate-700">FICA</th>
                        <th className="text-right p-3 font-semibold text-slate-700">Other</th>
                        <th className="text-right p-3 font-semibold text-slate-700">Net Pay</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ytdReport.map((employee) => (
                        <tr key={employee.employee_id} className="border-b hover:bg-slate-50">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Avatar user={employee.user} size="xs" />
                              <span className="font-medium">
                                {employee.user?.nickname || employee.user?.full_name}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-right">{employee.pay_stubs_count}</td>
                          <td className="p-3 text-right font-medium">${employee.total_gross.toLocaleString()}</td>
                          <td className="p-3 text-right text-red-600">${employee.federal_tax.toLocaleString()}</td>
                          <td className="p-3 text-right text-red-600">${employee.state_tax.toLocaleString()}</td>
                          <td className="p-3 text-right text-red-600">
                            ${(employee.social_security + employee.medicare).toLocaleString()}
                          </td>
                          <td className="p-3 text-right text-red-600">${employee.other_deductions.toLocaleString()}</td>
                          <td className="p-3 text-right font-semibold text-green-600">${employee.total_net.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Tax Liability Tab */}
          <TabsContent value="taxes" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Tax Liability Report</h3>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h4 className="font-semibold mb-4">Tax Breakdown</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <span className="text-sm font-medium">Federal Income Tax</span>
                    <span className="text-lg font-bold text-red-700">${taxLiability.federal_tax.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <span className="text-sm font-medium">State Income Tax</span>
                    <span className="text-lg font-bold text-orange-700">${taxLiability.state_tax.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium">Social Security</span>
                    <span className="text-lg font-bold text-blue-700">${taxLiability.social_security.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm font-medium">Medicare</span>
                    <span className="text-lg font-bold text-purple-700">${taxLiability.medicare.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-100 rounded-lg border-2 border-slate-300">
                    <span className="text-base font-semibold">Total Tax Liability</span>
                    <span className="text-2xl font-bold text-slate-900">${taxLiability.total.toLocaleString()}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h4 className="font-semibold mb-4">Tax Summary</h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Federal Tax</span>
                      <span>{((taxLiability.federal_tax / taxLiability.total) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full" 
                        style={{ width: `${(taxLiability.federal_tax / taxLiability.total) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>State Tax</span>
                      <span>{((taxLiability.state_tax / taxLiability.total) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-orange-500 h-2 rounded-full" 
                        style={{ width: `${(taxLiability.state_tax / taxLiability.total) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Social Security</span>
                      <span>{((taxLiability.social_security / taxLiability.total) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${(taxLiability.social_security / taxLiability.total) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Medicare</span>
                      <span>{((taxLiability.medicare / taxLiability.total) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full" 
                        style={{ width: `${(taxLiability.medicare / taxLiability.total) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t">
                    <p className="text-xs text-slate-600">
                      This report shows the total tax liability for the selected period. 
                      Use this for quarterly tax filing and compliance.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}