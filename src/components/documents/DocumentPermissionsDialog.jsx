import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { User } from '@/entities/all';
import { toast } from 'sonner';
import { Loader2, Crown, Shield, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Avatar from '../Avatar';

export default function DocumentPermissionsDialog({ isOpen, onClose, adminLeader, currentUser, isAdminLeader, allUsers, onSuccess }) {
  const [adminUsers, setAdminUsers] = useState([]);
  const [updating, setUpdating] = useState(new Set());

  useEffect(() => {
    if (isOpen && allUsers) {
      const admins = allUsers.filter(u => u.role === 'admin' && !u.archived);
      setAdminUsers(admins);
    }
  }, [isOpen, allUsers]);

  const handleTogglePermission = async (userId, currentValue) => {
    if (!isAdminLeader) {
      toast.error('Only the Admin Leader can grant or revoke permissions');
      return;
    }

    setUpdating(prev => new Set(prev).add(userId));
    try {
      await User.update(userId, { can_manage_documents: !currentValue });
      toast.success('Permission updated successfully');
      await onSuccess();
      
      // Refresh admin list
      const updatedAdmins = allUsers.filter(u => u.role === 'admin' && !u.archived);
      setAdminUsers(updatedAdmins);
    } catch (error) {
      console.error('Failed to update permission:', error);
      toast.error('Failed to update permission');
    } finally {
      setUpdating(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const getDynamicFullName = (user) => {
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    return `${firstName} ${lastName}`.trim() || user.full_name || 'Unnamed User';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Document Permissions
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Admin Leader Section */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-yellow-600" />
              <h3 className="font-semibold text-yellow-900">Admin Leader</h3>
            </div>
            {adminLeader ? (
              <div className="flex items-center gap-3 mt-3">
                <Avatar 
                  name={getDynamicFullName(adminLeader)} 
                  src={adminLeader.avatar_url}
                  isLeader={true}
                  className="h-10 w-10"
                />
                <div>
                  <p className="font-medium text-sm">{getDynamicFullName(adminLeader)}</p>
                  <p className="text-xs text-yellow-700">{adminLeader.email}</p>
                  <p className="text-xs text-yellow-600 mt-1">Full document management permissions</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-yellow-700">No admin leader found</p>
            )}
          </div>

          {/* Admin Users with Permissions */}
          <div>
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Admin Users ({adminUsers.length})
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {adminUsers.map((admin) => {
                const isLeader = admin.id === adminLeader?.id;
                const hasPermission = admin.can_manage_documents === true;
                const isUpdating = updating.has(admin.id);

                return (
                  <div 
                    key={admin.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isLeader ? 'bg-yellow-50 border-yellow-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar 
                        name={getDynamicFullName(admin)} 
                        src={admin.avatar_url}
                        isAdmin={!isLeader}
                        isLeader={isLeader}
                        className="h-8 w-8"
                      />
                      <div>
                        <p className="font-medium text-sm">{getDynamicFullName(admin)}</p>
                        <p className="text-xs text-slate-600">{admin.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isLeader ? (
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                          <Crown className="w-3 h-3 mr-1" />
                          Leader
                        </Badge>
                      ) : isAdminLeader ? (
                        <Button
                          variant={hasPermission ? "destructive" : "outline"}
                          size="sm"
                          onClick={() => handleTogglePermission(admin.id, hasPermission)}
                          disabled={isUpdating}
                          className="h-7"
                        >
                          {isUpdating ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : hasPermission ? (
                            <>
                              <X className="w-3 h-3 mr-1" />
                              Revoke Permission
                            </>
                          ) : (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              Grant Permission
                            </>
                          )}
                        </Button>
                      ) : (
                        <Badge variant={hasPermission ? "default" : "secondary"}>
                          {hasPermission ? 'Can Manage Documents' : 'View Only'}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {!isAdminLeader && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700">
                ℹ️ Only the Admin Leader can grant or revoke document management permissions
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}