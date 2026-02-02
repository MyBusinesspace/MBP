import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createInvitation } from '@/functions/createInvitation';
import { Branch } from '@/entities/all';
import { toast } from 'sonner';
import { Loader2, UserPlus, X, Shield, Circle, Check, Mail } from 'lucide-react';

export default function InviteUsersDialog({ isOpen, onClose, onSuccess }) {
  const [isLoading, setIsLoading] = useState(false);
  const [sentInvites, setSentInvites] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [invites, setInvites] = useState([
    { email: '', first_name: '', last_name: '', job_role: '', role: 'user', company_id: '' },
    { email: '', first_name: '', last_name: '', job_role: '', role: 'user', company_id: '' },
  ]);

  useEffect(() => {
    if (isOpen) {
      loadCompanies();
    }
  }, [isOpen]);

  const loadCompanies = async () => {
    try {
      const data = await Branch.list('sort_order');
      setCompanies(data || []);
    } catch (error) {
      console.error('Failed to load companies:', error);
    }
  };

  const resetForm = () => {
    setInvites([
      { email: '', first_name: '', last_name: '', job_role: '', role: 'user', company_id: '' },
      { email: '', first_name: '', last_name: '', job_role: '', role: 'user', company_id: '' },
    ]);
    setSentInvites([]);
    setIsLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };
  
  const updateInvite = (index, field, value) => {
    const newInvites = [...invites];
    newInvites[index][field] = value;
    setInvites(newInvites);
  };

  const addRow = () => {
    setInvites([...invites, { email: '', first_name: '', last_name: '', job_role: '', role: 'user', company_id: '' }]);
  };

  const removeRow = (index) => {
    if (invites.length > 1) {
      const newInvites = invites.filter((_, i) => i !== index);
      setInvites(newInvites);
    }
  };

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async () => {
    const validInvites = invites.filter(invite => invite.email.trim());
    if (validInvites.length === 0) {
      toast.error("Please enter at least one email address.");
      return;
    }

    const invalidEmails = validInvites.filter(invite => !validateEmail(invite.email));
    if (invalidEmails.length > 0) {
      toast.error("Please enter valid email addresses for all rows.");
      return;
    }

    setIsLoading(true);
    const results = [];
    
    for (const invite of validInvites) {
      try {
        const inviteData = {
          email: invite.email.trim(),
          first_name: invite.first_name.trim() || null,
          last_name: invite.last_name.trim() || null,
          job_role: invite.job_role.trim() || null,
          role: invite.role,
          company_id: invite.company_id || null,
        };

        console.log('Sending invitation for:', inviteData.email);
        const response = await createInvitation(inviteData);
        
        console.log('Response:', response);
        
        if (response.data && response.data.success) {
          results.push({ 
            email: invite.email, 
            name: `${invite.first_name} ${invite.last_name}`.trim() || invite.email,
            role: invite.role,
            success: true,
            invitationLink: response.data.invitationLink
          });
        } else {
          throw new Error(response.data?.error || 'Unknown error');
        }
      } catch (error) {
        console.error(`Failed to create invite for ${invite.email}:`, error);
        results.push({ 
          email: invite.email, 
          name: `${invite.first_name} ${invite.last_name}`.trim() || invite.email,
          role: invite.role,
          success: false,
          error: error.message 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    if (successCount > 0) {
      toast.success(`Successfully sent ${successCount} invitation${successCount > 1 ? 's' : ''}! Users will be created when they first log in.`);
      setSentInvites(results);
      onSuccess();
    }
    
    if (failCount > 0) {
      toast.error(`Failed to invite ${failCount} user${failCount > 1 ? 's' : ''}`);
    }
    
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invite Users to Your Company
          </DialogTitle>
          <p className="text-sm text-slate-600 mt-2">
            Send invitation emails to new users. Their accounts will be created automatically when they first log in.
            You can assign tasks to them before they join, and they'll see them immediately upon login.
          </p>
        </DialogHeader>
        
        {sentInvites.length === 0 ? (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2 pb-2 border-b text-xs font-medium text-gray-500 header-express">
                <div className="md:col-span-1">Email Address *</div>
                <div className="md:col-span-1">First & Last Name</div>
                <div className="md:col-span-1">Company</div>
                <div className="md:col-span-1">User Type</div>
                <div className="md:col-span-1"></div>
              </div>
              
              {invites.map((invite, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
                  <div className="md:col-span-1">
                    <Input 
                      type="email" 
                      placeholder="user@company.com" 
                      value={invite.email} 
                      onChange={(e) => updateInvite(index, 'email', e.target.value)} 
                      className="h-9 content-lexend" 
                    />
                  </div>
                  <div className="md:col-span-1 flex gap-2">
                    <Input 
                      placeholder="First" 
                      value={invite.first_name} 
                      onChange={(e) => updateInvite(index, 'first_name', e.target.value)} 
                      className="h-9 content-lexend" 
                    />
                    <Input 
                      placeholder="Last" 
                      value={invite.last_name} 
                      onChange={(e) => updateInvite(index, 'last_name', e.target.value)} 
                      className="h-9 content-lexend" 
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Select value={invite.company_id || ''} onValueChange={(value) => updateInvite(index, 'company_id', value)}>
                      <SelectTrigger className="h-9 content-lexend"><SelectValue placeholder="Select company" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>No Company</SelectItem>
                        {companies.map(company => (
                          <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-1">
                    <Select value={invite.role} onValueChange={(value) => updateInvite(index, 'role', value)}>
                      <SelectTrigger className="h-9 content-lexend"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">
                          <div className="flex items-center gap-2">
                            <Circle className="w-3 h-3 text-blue-600" />
                            <span>User</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-orange-600" />
                            <span>Admin</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-1 flex justify-end">
                    {invites.length > 1 && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeRow(index)} 
                        className="h-8 w-8 text-red-500 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-between items-center pt-4 border-t">
              <Button type="button" variant="outline" onClick={addRow} size="sm">
                + Add Row
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Sending Invitations...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Send Invitation Emails
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Invitation Summary</h3>
            <p className="text-sm text-gray-600">
              Invitations have been sent. Users will appear in your users list once they log in for the first time.
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {sentInvites.map((invite, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded-lg flex flex-col gap-2 ${
                    invite.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {invite.success ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <X className="w-5 h-5 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{invite.name}</p>
                        <p className="text-xs text-gray-600">{invite.email}</p>
                        {!invite.success && invite.error && (
                          <p className="text-xs text-red-600 mt-1">{invite.error}</p>
                        )}
                      </div>
                    </div>
                    {invite.success && (
                      <div className="flex items-center gap-2 text-xs text-green-700">
                        <Mail className="w-4 h-4" />
                        <span>Email sent</span>
                      </div>
                    )}
                  </div>
                  {invite.success && invite.invitationLink && (
                    <div className="ml-8 flex items-center gap-2">
                      <Input 
                        value={invite.invitationLink} 
                        readOnly 
                        className="text-xs h-7"
                        onClick={(e) => e.target.select()}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7"
                        onClick={() => {
                          navigator.clipboard.writeText(invite.invitationLink);
                          toast.success('Link copied!');
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}