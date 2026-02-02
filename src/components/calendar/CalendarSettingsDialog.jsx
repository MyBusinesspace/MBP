import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Eye, Palette, Upload, Pencil, X, PartyPopper } from 'lucide-react';
import EventCategoryManager from './EventCategoryManager';
import PublicHolidayManager from './PublicHolidayManager';
import { cn } from '@/lib/utils';
import { useData } from '../DataProvider';
import { Branch } from '@/entities/all';
import { base44 } from '@/api/base44Client';
import ImageCropDialog from '../users/ImageCropDialog';

export default function CalendarSettingsDialog({ isOpen, onClose, currentUserId, onRefresh, isGoogleConnected }) {
  const { currentCompany, setCurrentCompany } = useData();
  
  // Tab icons state
  const [calendarTabIconUrl, setCalendarTabIconUrl] = useState(currentCompany?.calendar_tab_icon_url || '');
  const [uploadingIcon, setUploadingIcon] = useState(false);
  
  // Image crop dialog state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCalendarTabIconUrl(currentCompany?.calendar_tab_icon_url || '');
    }
  }, [isOpen, currentCompany]);

  const [privacySettings, setPrivacySettings] = useState(() => {
    try {
      const stored = localStorage.getItem('calendarPrivacySettings');
      const parsed = stored ? JSON.parse(stored) : { visibility: 'all', isVisible: true };
      
      if (currentUserId) {
        const userPrivacy = localStorage.getItem(`calendarPrivacy_${currentUserId}`);
        if (userPrivacy) {
          const userParsed = JSON.parse(userPrivacy);
          parsed.isVisible = userParsed.isVisible;
        }
      }
      
      return parsed;
    } catch {
      return { visibility: 'all', isVisible: true };
    }
  });

  const handleGoogleCalendarSync = () => {
    if (isGoogleConnected) {
      toast.success('Your Google Calendar is already connected and syncing.');
    } else {
      // Since we cannot trigger OAuth from here, we instruct the user
      toast.info("To connect, please type: 'Connect Google Calendar' in the chat with the AI Assistant.", {
        duration: 5000,
        action: {
          label: "Close",
          onClick: () => console.log("Undo")
        },
      });
    }
  };

  const handleSavePrivacy = () => {
    try {
      localStorage.setItem('calendarPrivacySettings', JSON.stringify(privacySettings));
      
      if (currentUserId) {
        localStorage.setItem(`calendarPrivacy_${currentUserId}`, JSON.stringify({
          isVisible: privacySettings.isVisible
        }));
      }
    } catch (error) {
      console.error('Failed to save privacy settings', error);
    }
  };

  const handleSaveAndClose = () => {
    handleSavePrivacy();
    if (onRefresh) onRefresh();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle>Calendar Settings</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="integrations" className="mt-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="holidays">Holidays</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="invitations">Invitations</TabsTrigger>
            <TabsTrigger value="tab-icons">Tab Icons</TabsTrigger>
          </TabsList>

          <TabsContent value="privacy" className="space-y-4 mt-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Visibility Settings
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Show my events to others</Label>
                    <p className="text-xs text-slate-500 mt-1">
                      Allow other users to see your calendar events
                    </p>
                  </div>
                  <Switch
                    checked={privacySettings.isVisible}
                    onCheckedChange={(checked) => setPrivacySettings({...privacySettings, isVisible: checked})}
                  />
                </div>

                <div className="border-t pt-4">
                  <Label className="font-medium mb-2 block">View events from</Label>
                  <Select
                    value={privacySettings.visibility}
                    onValueChange={(value) => setPrivacySettings({...privacySettings, visibility: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All users</SelectItem>
                      <SelectItem value="team">My team only</SelectItem>
                      <SelectItem value="none">Only my events</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="categories" className="mt-4">
            <div className="border rounded-lg p-6 bg-gradient-to-br from-slate-50 to-white">
              <div className="flex items-center gap-2 mb-6">
                <Palette className="w-5 h-5 text-blue-600" />
                <h3 className="text-xl font-bold text-slate-900">Event Categories & Colors</h3>
              </div>
              <p className="text-sm text-slate-600 mb-6">
                Organize your calendar with custom event categories. Each category can have its own color to help you visually distinguish between different types of events.
              </p>
              <EventCategoryManager 
                onCategoriesChanged={() => {
                  // Categories changed, will refresh on close
                }} 
              />
            </div>
          </TabsContent>

          <TabsContent value="holidays" className="mt-4">
            <div className="border rounded-lg p-6 bg-gradient-to-br from-red-50 to-white">
              <div className="flex items-center gap-2 mb-4">
                <PartyPopper className="w-5 h-5 text-red-600" />
                <h3 className="text-xl font-bold text-slate-900">Public Holidays</h3>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Define public holidays that will be excluded from working days calculations in leave requests.
              </p>
              <PublicHolidayManager />
            </div>
          </TabsContent>

          <TabsContent value="invitations" className="mt-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Invitation Settings</h3>
              <p className="text-sm text-slate-600 mb-4">
                Manage who can invite you to events and your default invitation preferences.
              </p>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="autoAcceptInvitations" className="font-medium">Auto-accept invitations</Label>
                    <p className="text-xs text-slate-500 mt-1">Automatically accept event invitations from known contacts.</p>
                  </div>
                  <Switch id="autoAcceptInvitations" disabled checked={false} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="receiveNotifications" className="font-medium">Receive invitation notifications</Label>
                    <p className="text-xs text-slate-500 mt-1">Get notified when someone invites you to an event.</p>
                  </div>
                  <Switch id="receiveNotifications" disabled checked={true} />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="integrations" className="mt-4">
            <div className="border rounded-lg p-8 flex flex-col items-center text-center bg-white">
              <div className="w-full max-w-md">
                 <div className="text-left mb-6">
                    <h3 className="font-bold text-lg mb-1">Google Calendar Sync</h3>
                    <p className="text-sm text-slate-500">
                        Sync your events with Google Calendar to keep everything in one place.
                    </p>
                 </div>

                 <div className="bg-slate-50 rounded-lg p-8 border border-slate-100 flex flex-col items-center">
                    <Button 
                        onClick={handleGoogleCalendarSync}
                        variant="outline"
                        className={cn(
                            "h-12 px-8 text-base font-medium transition-all shadow-sm hover:shadow",
                            isGoogleConnected 
                                ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800 hover:border-green-300" 
                                : "bg-white hover:bg-slate-50"
                        )}
                    >
                        <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        {isGoogleConnected ? 'Google Calendar Connected' : 'Connect Google Calendar'}
                    </Button>
                    
                    {!isGoogleConnected && (
                        <p className="text-xs text-slate-400 mt-4 max-w-xs mx-auto">
                            Click to start the secure connection process via the AI Assistant.
                        </p>
                    )}
                 </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tab-icons" className="mt-4">
            <div className="border rounded-lg p-6">
              <div>
                <h3 className="font-medium text-slate-800 mb-1">Tab Icons</h3>
                <p className="text-xs text-slate-500 mb-4">Customize the icon shown on the "Calendar" tab.</p>
              </div>

              {/* Calendar Tab Icon */}
              <div className="p-4 border rounded-lg bg-slate-50">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${calendarTabIconUrl ? '' : 'bg-purple-100'}`}>
                    {calendarTabIconUrl ? (
                      <img src={calendarTabIconUrl} alt="Calendar icon" className="w-10 h-10 object-contain" />
                    ) : (
                      <img src="https://cdn-icons-png.flaticon.com/512/2838/2838590.png" alt="Calendar default" className="w-10 h-10 object-contain" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-slate-800">Calendar Tab Icon</h4>
                    <p className="text-xs text-slate-500">Default: Calendar with clock icon</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        setCropImageSrc(reader.result);
                        setCropDialogOpen(true);
                      };
                      reader.readAsDataURL(file);
                      e.target.value = '';
                    }}
                    className="hidden"
                    id="calendar-tab-icon-upload"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    type="button" 
                    disabled={uploadingIcon}
                    onClick={() => document.getElementById('calendar-tab-icon-upload')?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingIcon ? 'Uploading...' : 'Upload Icon'}
                  </Button>
                  {calendarTabIconUrl && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCropImageSrc(calendarTabIconUrl);
                          setCropDialogOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (!currentCompany?.id) return;
                          try {
                            await Branch.update(currentCompany.id, { calendar_tab_icon_url: null });
                            const updatedCompany = { ...currentCompany, calendar_tab_icon_url: null };
                            setCalendarTabIconUrl('');
                            if (setCurrentCompany) {
                              setCurrentCompany(updatedCompany);
                              localStorage.setItem('currentCompany', JSON.stringify(updatedCompany));
                            }
                            toast.success('Icon reset to default');
                            if (onRefresh) onRefresh();
                          } catch (error) {
                            toast.error('Failed to reset icon');
                          }
                        }}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reset
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Image Crop Dialog */}
        <ImageCropDialog
          isOpen={cropDialogOpen}
          onClose={() => {
            setCropDialogOpen(false);
            setCropImageSrc('');
          }}
          imageUrl={cropImageSrc}
          onSave={async (croppedBlob) => {
            if (!currentCompany?.id) return;
            
            setUploadingIcon(true);
            
            try {
              const file = new File([croppedBlob], 'calendar-tab-icon.png', { type: 'image/png' });
              const result = await base44.integrations.Core.UploadFile({ file });
              
              await Branch.update(currentCompany.id, { calendar_tab_icon_url: result.file_url });
              
              const updatedCompany = { ...currentCompany, calendar_tab_icon_url: result.file_url };
              setCalendarTabIconUrl(result.file_url);
              if (setCurrentCompany) {
                setCurrentCompany(updatedCompany);
                localStorage.setItem('currentCompany', JSON.stringify(updatedCompany));
              }
              
              toast.success('Icon updated!');
              if (onRefresh) onRefresh();
            } catch (error) {
              console.error('Error saving icon:', error);
              toast.error('Failed to save icon');
            } finally {
              setUploadingIcon(false);
              setCropDialogOpen(false);
              setCropImageSrc('');
            }
          }}
        />

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSaveAndClose} className="bg-slate-900 text-white hover:bg-slate-800">
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}