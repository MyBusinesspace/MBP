import React, { useState, useEffect, useMemo } from 'react';
import { PettyCashEntry, PettyCashCategory, AppSettings } from '@/entities/all';
import { useData } from '../components/DataProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Wallet, Search, Loader2, TrendingUp, TrendingDown, Download, Settings, DollarSign } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Avatar from '../components/Avatar';
import EmployeeDetailPanel from '../components/petty-cash/EmployeeDetailPanel';
import PettyCashSettingsPanel from '../components/petty-cash/PettyCashSettingsPanel';
import { base44 } from '@/api/base44Client';

export default function PettyCashPage() {
  const { currentUser, loadUsers } = useData();
  
  const [employees, setEmployees] = useState([]);
  const [entries, setEntries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Currency settings
  const [currencySymbol, setCurrencySymbol] = useState('Dhs');
  const [decimalSeparator, setDecimalSeparator] = useState('.');
  const [decimalPlaces, setDecimalPlaces] = useState(2);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('📥 Loading petty cash data...');
      
      const [usersData, entriesData, categoriesData, settingsData] = await Promise.all([
        loadUsers(true),
        PettyCashEntry.list('-date'),
        PettyCashCategory.list('sort_order'),
        AppSettings.list()
      ]);
      
      const activeUsers = (usersData || []).filter(u => !u.is_ghost && !u.archived);
      
      setEmployees(activeUsers);
      setEntries(entriesData || []);
      setCategories(categoriesData || []);
      
      // Load currency settings
      const currencySetting = settingsData?.find(s => s.key === 'petty_cash_currency');
      const decimalSepSetting = settingsData?.find(s => s.key === 'petty_cash_decimal_separator');
      const decimalPlacesSetting = settingsData?.find(s => s.key === 'petty_cash_decimal_places');
      
      if (currencySetting?.value) {
        setCurrencySymbol(currencySetting.value);
      }
      if (decimalSepSetting?.value) {
        setDecimalSeparator(decimalSepSetting.value);
      }
      if (decimalPlacesSetting?.value) {
        setDecimalPlaces(parseInt(decimalPlacesSetting.value) || 2);
      }
      
      console.log('✅ Petty cash data loaded:', {
        employees: activeUsers.length,
        entries: entriesData?.length || 0,
        categories: categoriesData?.length || 0,
        currency: currencySetting?.value || 'Dhs'
      });
    } catch (error) {
      console.error('❌ Failed to load petty cash data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getDynamicFullName = (user) => {
    if (!user) return 'Unknown User';
    if (user.nickname) return user.nickname;
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    return `${firstName} ${lastName}`.trim() || user.full_name || user.email;
  };

  const calculateBalance = (employeeId) => {
    const employeeEntries = entries.filter(e => e.employee_id === employeeId);
    return employeeEntries.reduce((sum, entry) => {
      if (entry.type === 'input') {
        return sum + (entry.amount || 0);
      } else {
        return sum - Math.abs(entry.amount || 0);
      }
    }, 0);
  };

  const formatCurrency = (amount) => {
    const absAmount = Math.abs(amount);
    const formatted = absAmount.toFixed(decimalPlaces);
    const [integer, decimal] = formatted.split('.');
    const withThousands = integer.replace(/\B(?=(\d{3})+(?!\d))/g, decimalSeparator === '.' ? ',' : '.');
    return `${currencySymbol}${withThousands}${decimal ? decimalSeparator + decimal : ''}`;
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const fullName = getDynamicFullName(emp);
      const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (emp.email || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [employees, searchTerm]);

  const handleExportEmployee = async (employee) => {
    setExporting(true);
    try {
      const response = await base44.functions.invoke('exportPettyCash', {
        employee_id: employee.id
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `petty-cash-${getDynamicFullName(employee)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  const totalCashDistributed = useMemo(() => {
    return filteredEmployees.reduce((sum, emp) => {
      const balance = calculateBalance(emp.id);
      return sum + (balance > 0 ? balance : 0);
    }, 0);
  }, [filteredEmployees, entries]);

  const totalExpenses = useMemo(() => {
    return entries
      .filter(e => e.type === 'expense')
      .reduce((sum, e) => sum + Math.abs(e.amount || 0), 0);
  }, [entries]);

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Card className="p-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Wallet className="w-5 h-5 text-amber-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 header-express">Petty Cash</h1>
          </div>

          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-3 border border-emerald-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-700 font-medium">Total Cash Out</p>
              <p className="text-lg font-bold text-emerald-900 mt-0.5">
                {formatCurrency(totalCashDistributed)}
              </p>
            </div>
            <div className="p-2 bg-emerald-200 rounded-lg">
              <TrendingUp className="w-4 h-4 text-emerald-700" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-3 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-red-700 font-medium">Total Expenses</p>
              <p className="text-lg font-bold text-red-900 mt-0.5">
                {formatCurrency(totalExpenses)}
              </p>
            </div>
            <div className="p-2 bg-red-200 rounded-lg">
              <TrendingDown className="w-4 h-4 text-red-700" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-700 font-medium">Employees</p>
              <p className="text-lg font-bold text-blue-900 mt-0.5">
                {filteredEmployees.length}
              </p>
            </div>
            <div className="p-2 bg-blue-200 rounded-lg">
              <DollarSign className="w-4 h-4 text-blue-700" />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="p-3 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50 border-0">
                <TableHead className="font-semibold text-xs px-2 py-1 h-8">Employee</TableHead>
                <TableHead className="font-semibold text-xs px-2 py-1 h-8">Role</TableHead>
                <TableHead className="font-semibold text-right text-xs px-2 py-1 h-8">Balance</TableHead>
                <TableHead className="font-semibold text-xs px-2 py-1 h-8">Last Transaction</TableHead>
                {isAdmin && (
                  <TableHead className="text-right font-semibold w-20 text-xs px-2 py-1 h-8">Export</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 5 : 4} className="text-center py-12 text-slate-500">
                    <Wallet className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <p className="font-medium">No employees found</p>
                    <p className="text-sm mt-2">Try adjusting your search</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map(employee => {
                  const balance = calculateBalance(employee.id);
                  const employeeEntries = entries.filter(e => e.employee_id === employee.id);
                  const lastEntry = employeeEntries.length > 0 ? employeeEntries[0] : null;

                  return (
                    <TableRow
                      key={employee.id}
                      className="hover:bg-slate-50 cursor-pointer transition-colors h-10"
                      onClick={() => setSelectedEmployee(employee)}
                    >
                      <TableCell className="px-2 py-1">
                        <div className="flex items-center gap-2">
                          <Avatar
                            user={employee}
                            size="sm"
                          />
                          <div>
                            <p className="font-semibold text-xs text-slate-900">
                              {getDynamicFullName(employee)}
                            </p>
                            <p className="text-[10px] text-slate-500">{employee.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell className="px-2 py-1">
                        <span className="text-xs text-slate-600">{employee.job_role || '-'}</span>
                      </TableCell>

                      <TableCell className="text-right px-2 py-1">
                        <span
                          className={cn(
                            "text-sm font-bold tabular-nums",
                            balance > 0 ? "text-emerald-700" :
                            balance < 0 ? "text-red-700" :
                            "text-slate-700"
                          )}
                        >
                          {formatCurrency(balance)}
                        </span>
                      </TableCell>

                      <TableCell className="px-2 py-1">
                        {lastEntry ? (
                          <div className="text-xs text-slate-500">
                            {format(parseISO(lastEntry.date), 'MMM d, yyyy')}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No transactions</span>
                        )}
                      </TableCell>

                      {isAdmin && (
                        <TableCell className="text-right px-2 py-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportEmployee(employee);
                            }}
                            disabled={exporting}
                            className="h-6 w-6 p-0"
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {selectedEmployee && (
        <EmployeeDetailPanel
          isOpen={!!selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          employee={selectedEmployee}
          entries={entries.filter(e => e.employee_id === selectedEmployee.id)}
          categories={categories}
          currencySymbol={currencySymbol}
          decimalSeparator={decimalSeparator}
          decimalPlaces={decimalPlaces}
          onEntriesChanged={loadData}
          isAdmin={isAdmin}
        />
      )}

      {showSettings && (
        <PettyCashSettingsPanel
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          categories={categories}
          onRefresh={loadData}
        />
      )}
    </div>
  );
}