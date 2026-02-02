
import React, { useState, useEffect } from 'react';
import { User } from '@/entities/all';
import { toast } from 'sonner';
import { Loader2, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import Avatar from '../Avatar';

export default function PermissionsTab({ adminLeader, currentUser, isAdminLeader, allUsers, onSuccess }) {
  const [isSaving, setIsSaving] = useState(false);
  const [localUsers, setLocalUsers] = useState([]);

  const permissionsList = [
    {
      key: 'can_delete_admins',
      label: 'Can Delete Admins',
      description: 'Allow this admin to delete other admin users',
      allowedFor: ['director']
    },
    {
      key: 'can_access_payroll',
      label: 'Can Access Payroll',
      description: 'Allow this admin to view and manage payroll data',
      allowedFor: ['director']
    },
    {
      key: 'can_edit_user_documents',
      label: 'Can Edit User Documents',
      description: 'Allow this admin to edit photos and documents of other users',
      allowedFor: ['director']
    },
    {
      key: 'can_manage_departments',
      label: 'Can Manage Departments',
      description: 'Allow this admin to create and manage departments',
      allowedFor: ['director', 'advisor']
    },
    {
      key: 'can_manage_assets',
      label: 'Can Manage Assets',
      description: 'Allow this admin to manage inventory, contacts, and fixed assets',
      allowedFor: ['director', 'advisor']
    },
    {
      key: 'can_view_employee_timesheets',
      label: 'Can View Employee Timesheets',
      description: 'Allow this admin to view all employee clock in/out times and timesheets',
      allowedFor: ['leader', 'director', 'advisor']
    }
  ];

  useEffect(() => {
    if (allUsers) {
      // Get all active users (not archived)
      const activeUsers = allUsers.filter(u => !u.archived && !u.is_ghost);
      
      // Sort by role hierarchy: Leader > Director > Advisor > User
      const sortedUsers = activeUsers.sort((a, b) => {
        const getRoleWeight = (user) => {
          if (user.role === 'user') return 0;
          if (user.admin_role_type === 'leader') return 4;
          if (user.admin_role_type === 'director') return 3;
          if (user.admin_role_type === 'advisor') return 2;
          return 1; // admin without role type
        };
        
        return getRoleWeight(b) - getRoleWeight(a);
      });
      
      setLocalUsers(sortedUsers);
    }
  }, [allUsers]);

  const canEditRole = (targetUser) => {
    if (!currentUser || currentUser.role !== 'admin') return false;
    
    const currentRoleType = currentUser.admin_role_type;
    const targetRoleType = targetUser.admin_role_type;
    
    // Special case: If current user is admin but has no role_type set,
    // allow them to edit their own role to set it up
    if (!currentRoleType && currentUser.id === targetUser.id) {
      return true;
    }
    
    // If current user has no role_type and is trying to edit someone else,
    // they need to set their own role first
    if (!currentRoleType && currentUser.id !== targetUser.id) {
      return false;
    }
    
    // Can't edit own role once it's set
    if (currentUser.id === targetUser.id) return false;
    
    // Leader can edit everyone
    if (currentRoleType === 'leader') return true;
    
    // Director can edit directors, advisors, and users (but not leaders)
    if (currentRoleType === 'director') {
      return targetRoleType !== 'leader';
    }
    
    // Advisor can only edit advisors and users (but not leaders or directors)
    if (currentRoleType === 'advisor') {
      return targetRoleType === 'advisor' || targetUser.role === 'user';
    }
    
    return false;
  };

  const getAvailableRoles = () => {
    const roleType = currentUser?.admin_role_type;
    
    const roles = [
      { value: 'user', label: 'User', icon: '👤', description: 'Standard access' }
    ];
    
    // If admin has no role_type, show all admin options so they can set themselves up
    if (!roleType && currentUser?.role === 'admin') {
      return [
        { value: 'leader', label: 'Admin Leader', icon: '👑', description: 'Full access' },
        { value: 'director', label: 'Admin Director', icon: '🛡️', description: 'Manage users & payroll' },
        { value: 'advisor', label: 'Admin Advisor', icon: '⭐', description: 'Manage departments' },
        ...roles
      ];
    }
    
    // Advisor can assign: Advisor, User
    if (roleType === 'advisor') {
      roles.unshift({ value: 'advisor', label: 'Admin Advisor', icon: '⭐', description: 'Manage departments' });
    }
    
    // Director can assign: Director, Advisor, User
    if (roleType === 'director') {
      roles.unshift(
        { value: 'director', label: 'Admin Director', icon: '🛡️', description: 'Manage users & payroll' },
        { value: 'advisor', label: 'Admin Advisor', icon: '⭐', description: 'Manage departments' }
      );
    }
    
    // Leader can assign: Leader, Director, Advisor, User
    if (roleType === 'leader') {
      roles.unshift(
        { value: 'leader', label: 'Admin Leader', icon: '👑', description: 'Full access' },
        { value: 'director', label: 'Admin Director', icon: '🛡️', description: 'Manage users & payroll' },
        { value: 'advisor', label: 'Admin Advisor', icon: '⭐', description: 'Manage departments' }
      );
    }
    
    return roles;
  };

  const handleRoleChange = async (userId, newRoleValue) => {
    setIsSaving(true);
    try {
      let updateData;
      
      if (newRoleValue === 'user') {
        // Change to regular user
        updateData = { role: 'user', admin_role_type: null };
      } else {
        // Change to admin with specific role type
        updateData = { role: 'admin', admin_role_type: newRoleValue };
      }
      
      await User.update(userId, updateData);
      
      // If user just set their own role, update currentUser reference
      if (userId === currentUser.id) {
        toast.success('Your admin role has been set! You can now manage other users.');
      } else {
        toast.success('User role updated successfully');
      }
      
      // Update local state and re-sort
      setLocalUsers(prev => {
        const updated = prev.map(u => u.id === userId ? { ...u, ...updateData } : u);
        
        // Re-sort after update
        return updated.sort((a, b) => {
          const getRoleWeight = (user) => {
            if (user.role === 'user') return 0;
            if (user.admin_role_type === 'leader') return 4;
            if (user.admin_role_type === 'director') return 3;
            if (user.admin_role_type === 'advisor') return 2;
            return 1;
          };
          
          return getRoleWeight(b) - getRoleWeight(a);
        });
      });
      
      if (onSuccess) await onSuccess();
    } catch (error) {
      console.error('Failed to update user role:', error);
      toast.error('Failed to update user role');
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleLabel = (user) => {
    if (user.role === 'user') {
      return { text: 'User', icon: '👤', color: 'bg-slate-100 text-slate-700' };
    }
    
    if (user.admin_role_type === 'leader') {
      return { text: 'Admin Leader', icon: '👑', color: 'bg-yellow-100 text-yellow-800' };
    }
    
    if (user.admin_role_type === 'director') {
      return { text: 'Admin Director', icon: '🛡️', color: 'bg-orange-100 text-orange-800' };
    }
    
    if (user.admin_role_type === 'advisor') {
      return { text: 'Admin Advisor', icon: '⭐', color: 'bg-blue-100 text-blue-800' };
    }
    
    return { text: 'Admin (No Role)', icon: '⚠️', color: 'bg-amber-100 text-amber-800' };
  };

  const getDynamicFullName = (user) => {
    if (!user) return 'Unknown User';
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    const dynamicName = `${firstName} ${lastName}`.trim();
    return dynamicName || user.full_name || user.email;
  };

  const availableRoles = getAvailableRoles();
  
  // Check if current user needs to set their role first
  const needsRoleSetup = currentUser?.role === 'admin' && !currentUser?.admin_role_type;

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="text-center py-8 text-slate-500">
        <p>You need to be an admin to manage permissions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {needsRoleSetup && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-900 mb-1">Action Required: Set Your Admin Role</h4>
            <p className="text-sm text-amber-700">
              Your account has admin privileges but no specific role type assigned. 
              Please set your admin role first (Leader, Director, or Advisor) before managing other users.
              Find yourself in the list below and select your role.
            </p>
          </div>
        </div>
      )}
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Role Hierarchy</h4>
        <div className="text-sm text-blue-700 space-y-1">
          <p>👑 <strong>Leader:</strong> Can assign all roles (Leader, Director, Advisor, User)</p>
          <p>🛡️ <strong>Director:</strong> Can assign Director, Advisor, and User roles</p>
          <p>⭐ <strong>Advisor:</strong> Can assign Advisor and User roles</p>
          <p>👤 <strong>User:</strong> Cannot assign roles</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <h4 className="font-semibold text-slate-900">User</h4>
          <h4 className="font-semibold text-slate-900">Role</h4>
        </div>
        
        {localUsers.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No users found.</p>
        ) : (
          localUsers.map(user => {
            const canEdit = canEditRole(user);
            const currentRoleValue = user.role === 'user' ? 'user' : user.admin_role_type || 'advisor';
            const roleInfo = getRoleLabel(user);
            const isCurrentUserRow = user.id === currentUser.id;
            
            return (
              <div 
                key={user.id} 
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  isCurrentUserRow && needsRoleSetup 
                    ? 'bg-amber-50 border-amber-300 animate-pulse' 
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar
                    name={getDynamicFullName(user)}
                    src={user.avatar_url}
                    isAdmin={user.role === 'admin' && user.admin_role_type !== 'leader'}
                    isLeader={user.admin_role_type === 'leader'}
                    adminRoleType={user.admin_role_type}
                    className="h-9 w-9 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{getDynamicFullName(user)}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                  {isCurrentUserRow && (
                    <Badge variant="outline" className="text-xs flex-shrink-0">You</Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-3 flex-shrink-0">
                  {canEdit ? (
                    <Select
                      value={currentRoleValue}
                      onValueChange={(val) => handleRoleChange(user.id, val)}
                      disabled={isSaving}
                    >
                      <SelectTrigger className={`w-48 h-9 ${isCurrentUserRow && needsRoleSetup ? 'border-amber-400 border-2' : ''}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map(role => (
                          <SelectItem key={role.value} value={role.value}>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{role.icon}</span>
                              <div>
                                <div className="font-medium text-xs">{role.label}</div>
                                <div className="text-[10px] text-slate-500">{role.description}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={`${roleInfo.color} flex items-center gap-1.5 text-xs px-2 py-1`}>
                      <span className="text-xs">{roleInfo.icon}</span>
                      <span>{roleInfo.text}</span>
                    </Badge>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {isSaving && (
        <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Updating role...</span>
        </div>
      )}
    </div>
  );
}
