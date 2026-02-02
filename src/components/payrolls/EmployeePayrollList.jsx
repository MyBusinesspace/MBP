import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Edit,
  Trash2,
  Search,
  ChevronDown,
  ChevronUp,
  Save,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Avatar from '../Avatar';
import { CurrencyIcon } from '../../Layout';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function EmployeePayrollList({ 
  profiles = [], 
  users = [], 
  onEditProfile, 
  onDeleteProfile, 
  onRefresh 
}) {
  console.log('🐛 [EmployeePayrollList] Render - useMemo available?', typeof useMemo);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('employee_name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showAllUsers, setShowAllUsers] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [salaryAverages, setSalaryAverages] = useState({});

  // Load salary averages for all profiles
  useEffect(() => {
    const loadAverages = async () => {
      const averages = {};
      for (const profile of profiles) {
        try {
          const stubs = await base44.entities.PayStub.filter({ employee_id: profile.employee_id }, '-created_date', 5);
          if (stubs && stubs.length > 0) {
            let totalWithExtra = 0;
            let count = 0;
            stubs.forEach(stub => {
              if (stub.net_pay) {
                totalWithExtra += stub.net_pay;
                count++;
              }
            });
            averages[profile.employee_id] = count > 0 ? totalWithExtra / count : 0;
          } else {
            averages[profile.employee_id] = 0;
          }
        } catch (err) {
          averages[profile.employee_id] = 0;
        }
      }
      setSalaryAverages(averages);
    };
    if (profiles.length > 0) {
      loadAverages();
    }
  }, [profiles]);

  const enrichedProfiles = useMemo(() => {
    return profiles.map(profile => {
      const user = users.find(u => u.id === profile.employee_id);
      return {
        ...profile,
        user,
        displayName: user?.nickname || user?.full_name || user?.email || 'Unknown',
        hasProfile: true
      };
    });
  }, [profiles, users]);

  const usersWithoutProfile = useMemo(() => {
    return users
      .filter(user => !user.archived)
      .filter(user => !profiles.some(p => p.employee_id === user.id))
      .map(user => ({
        employee_id: user.id,
        user,
        displayName: user.nickname || user.full_name || user.email || 'Unknown',
        hasProfile: false,
        monthly_basic_salary: null,
        annual_salary: null
      }));
  }, [users, profiles]);

  const allEmployees = useMemo(() => {
    if (showAllUsers) {
      return [...enrichedProfiles, ...usersWithoutProfile];
    }
    return enrichedProfiles;
  }, [enrichedProfiles, usersWithoutProfile, showAllUsers]);

  const filteredAndSortedProfiles = useMemo(() => {
    let filtered = allEmployees;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = allEmployees.filter(profile => {
        const name = profile.displayName.toLowerCase();
        return name.includes(query);
      });
    }

    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'employee_name':
          aVal = a.displayName.toLowerCase();
          bVal = b.displayName.toLowerCase();
          break;
        case 'monthly_salary':
          aVal = a.monthly_basic_salary || 0;
          bVal = b.monthly_basic_salary || 0;
          break;
        case 'gross_salary':
          // Calculate gross salary (monthly basic + monthly extras)
          const aExtras = (a.salary_items || [])
            .filter(item => item.is_active && (item.category === 'Earnings' || item.category === 'Reimbursements'))
            .reduce((sum, item) => sum + (item.amount || 0), 0);
          const bExtras = (b.salary_items || [])
            .filter(item => item.is_active && (item.category === 'Earnings' || item.category === 'Reimbursements'))
            .reduce((sum, item) => sum + (item.amount || 0), 0);
          aVal = (a.monthly_basic_salary || 0) + aExtras;
          bVal = (b.monthly_basic_salary || 0) + bExtras;
          break;
        case 'average_salary':
          aVal = salaryAverages[a.employee_id] || 0;
          bVal = salaryAverages[b.employee_id] || 0;
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return filtered;
  }, [allEmployees, searchQuery, sortBy, sortOrder, salaryAverages]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleStartEdit = (profile, e) => {
    e.stopPropagation();
    setEditingId(profile.id);
    setEditValue(profile.monthly_basic_salary || '');
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setEditingId(null);
    setEditValue('');
  };

  const handleSaveEdit = async (profile, e) => {
    e.stopPropagation();
    
    const newMonthlySalary = parseFloat(editValue) || 0;
    if (newMonthlySalary <= 0) {
      toast.error('Please enter a valid monthly salary');
      return;
    }

    try {
      const annual = newMonthlySalary * 12;
      const ordinaryHourly = annual / 2080;
      
      await base44.entities.EmployeePayrollProfile.update(profile.id, {
        monthly_basic_salary: newMonthlySalary,
        annual_salary: annual,
        ordinary_hourly_rate: ordinaryHourly,
        overtime_hourly_rate: ordinaryHourly * 1.5 // Default multiplier
      });

      toast.success('Salary updated successfully');
      setEditingId(null);
      setEditValue('');
      onRefresh();
    } catch (error) {
      console.error('Failed to update salary:', error);
      toast.error('Failed to update salary');
    }
  };

  const SortButton = ({ column, children }) => (
    <button
      onClick={() => handleSort(column)}
      className="flex items-center gap-1 hover:text-indigo-600 transition-colors font-semibold"
    >
      {children}
      {sortBy === column && (
        sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
      )}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-lg border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showAllUsers}
                onChange={(e) => setShowAllUsers(e.target.checked)}
                className="rounded border-slate-300"
              />
              Show all ({users.filter(u => !u.archived).length} total)
            </label>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-4 text-sm text-slate-700">
                  <SortButton column="employee_name">Employee</SortButton>
                </th>
                <th className="text-left p-4 text-sm text-slate-700">
                  <SortButton column="monthly_salary">Basic Monthly Salary</SortButton>
                </th>
                <th className="text-left p-4 text-sm text-slate-700">
                  <SortButton column="gross_salary">Gross Salary</SortButton>
                </th>
                <th className="text-left p-4 text-sm text-slate-700">
                  <SortButton column="average_salary">Total average with OT</SortButton>
                </th>
                <th className="text-right p-4 text-sm text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedProfiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500">
                    {searchQuery ? 'No employees found matching your search' : 'No employee profiles yet'}
                  </td>
                </tr>
              ) : (
                filteredAndSortedProfiles.map((profile) => (
                  <tr
                    key={profile.employee_id}
                    className={cn(
                      "border-b border-slate-100 hover:bg-slate-50 transition-colors",
                      !profile.hasProfile && "bg-yellow-50/30",
                      editingId !== profile.id && "cursor-pointer"
                    )}
                    onClick={() => editingId !== profile.id && onEditProfile(profile)}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar user={profile.user} size="sm" />
                        <div>
                          <div className="font-medium text-sm flex items-center gap-2">
                            {profile.displayName}
                            {!profile.hasProfile && (
                              <Badge className="bg-yellow-100 text-yellow-700 text-[10px]">
                                No Profile
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">{profile.user?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {editingId === profile.id ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <CurrencyIcon className="w-4 h-4 text-slate-400 text-[10px]" />
                          <Input
                            type="number"
                            step="0.01"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-32 h-8 text-sm"
                            autoFocus
                          />
                        </div>
                      ) : profile.monthly_basic_salary ? (
                        <div className="flex items-center gap-2">
                          <CurrencyIcon className="w-4 h-4 text-green-600 text-[10px]" />
                          <span className="text-sm font-semibold">
                            {(profile.monthly_basic_salary || 0).toLocaleString()}
                            <span className="text-xs text-slate-500 ml-1">/mo</span>
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      {profile.monthly_basic_salary ? (
                        <div className="flex items-center gap-2">
                          <CurrencyIcon className="w-4 h-4 text-green-600 text-[10px]" />
                          <span className="text-sm font-semibold">
                            {(() => {
                              const salaryItems = profile.salary_items || [];
                              const extras = salaryItems
                                .filter(item => item.is_active && (item.category === 'Earnings' || item.category === 'Reimbursements'))
                                .reduce((sum, item) => sum + (item.amount || 0), 0);
                              return ((profile.monthly_basic_salary || 0) + extras).toLocaleString();
                            })()}
                            <span className="text-xs text-slate-500 ml-1">/mo</span>
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      {salaryAverages[profile.employee_id] ? (
                        <div className="flex items-center gap-2">
                          <CurrencyIcon className="w-4 h-4 text-indigo-600 text-[10px]" />
                          <span className="text-sm font-semibold">
                            {salaryAverages[profile.employee_id].toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            <span className="text-xs text-slate-500 ml-1">/mo avg</span>
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        {editingId === profile.id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleSaveEdit(profile, e)}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <Save className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleCancelEdit}
                              className="text-slate-600 hover:text-slate-700"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            {profile.hasProfile && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleStartEdit(profile, e)}
                                title="Quick edit monthly salary"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                            {profile.hasProfile && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteProfile(profile.id);
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}