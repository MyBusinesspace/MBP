import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QuickTask, QuickTaskComment } from '@/entities/all';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  FolderKanban,
  X,
  Loader2,
  ChevronDown,
  Upload,
  FileText,
  Download,
  Building2,
  Save
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import TaskActivityFeed from './TaskActivityFeed';
import { base44 } from '@/api/base44Client';
import DocumentViewer from '../shared/DocumentViewer';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const departmentColorClasses = {
    white: { bg: 'bg-white', border: 'border-slate-200', text: 'text-slate-900' },
    gray: { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-900' },
    red: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-900' },
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-900' },
    green: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-900' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-900' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-900' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-900' },
    pink: { bg: 'bg-pink-50', border: 'border-pink-300', text: 'text-pink-900' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-900' },
    teal: { bg: 'bg-teal-50', border: 'border-teal-300', text: 'text-teal-900' }
};

async function UploadFile({ file }) {
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    return { file_url };
}

export default function TaskDetailsSidePanel({ isOpen, onClose, task, departments, users, teams, customers, onUpdate, currentUser, initialTab = 'details' }) {
    const [localTask, setLocalTask] = useState(task || {});
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState(initialTab);
    const [comments, setComments] = useState([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const fileInputRef = useRef(null);
    const [uploadingDocument, setUploadingDocument] = useState(false);
    const [showDocumentViewer, setShowDocumentViewer] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const loadComments = useCallback(async () => {
        if (!task?.id) return;

        setLoadingComments(true);
        try {
        const commentsData = await QuickTaskComment.filter({ task_id: task.id }, '-created_date');
        setComments(commentsData || []);
        } catch (error) {
        toast.error('Failed to load comments');
        } finally {
        setLoadingComments(false);
        }
    }, [task?.id]);

    useEffect(() => {
        if (task) {
        setLocalTask(task);
        setHasUnsavedChanges(false);
        if (isOpen) {
            loadComments();
            setActiveTab(initialTab);
        } else {
            setComments([]);
            setActiveTab('details');
            setUploadingDocument(false);
        }
        }
    }, [task, isOpen, loadComments, initialTab]);

    const handleSave = async () => {
        if (!task?.id || !hasUnsavedChanges) return;
        
        setIsSaving(true);
        try {
        await QuickTask.update(task.id, localTask);
        setHasUnsavedChanges(false);
        if (onUpdate) {
            onUpdate(task.id, localTask);
        }
        toast.success('Task saved');
        } catch (error) {
        toast.error('Failed to save changes');
        } finally {
        setIsSaving(false);
        }
    };

    const handleFieldChange = (field, value) => {
        setLocalTask(prev => ({ ...prev, [field]: value }));
        setHasUnsavedChanges(true);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSave();
        }
    };

    const handleDocumentUpload = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelected = async (event) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;

        setUploadingDocument(true);
        try {
        const uploadPromises = files.map(file => UploadFile({ file }));
        const results = await Promise.all(uploadPromises);
        const newUrls = results.map(r => r.file_url);

        const updatedUrls = [...(localTask.document_urls || []), ...newUrls];
        setLocalTask(prev => ({ ...prev, document_urls: updatedUrls }));
        setHasUnsavedChanges(true);

        toast.success(`${files.length} document${files.length > 1 ? 's' : ''} uploaded - Click Save to apply`);
        } catch (error) {
        toast.error('Failed to upload documents');
        } finally {
        setUploadingDocument(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemoveDocument = async (urlToRemove) => {
        const updatedUrls = (localTask.document_urls || []).filter(url => url !== urlToRemove);
        setLocalTask(prev => ({ ...prev, document_urls: updatedUrls }));
        setHasUnsavedChanges(true);
        toast.success('Document removed - Click Save to apply');
    };



    const safeFormatDate = (dateString) => {
        if (!dateString || typeof dateString !== 'string') return 'N/A';
        try {
        const parsed = parseISO(dateString);
        return isNaN(parsed.getTime()) ? 'N/A' : format(parsed, 'PPP');
        } catch {
        return 'N/A';
        }
    };

    if (!task) return null;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
            <SheetHeader className="border-b pb-3 pt-4 px-6">
            <div className="flex items-center justify-between">
                <SheetTitle className="flex items-center gap-2">
                <FolderKanban className="w-5 h-5" />
                Task Details
                </SheetTitle>
                <div className="flex items-center gap-2">
                {hasUnsavedChanges && (
                    <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-indigo-600 hover:bg-indigo-700"
                    >
                    {isSaving ? (
                        <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                        </>
                    ) : (
                        <>
                        <Save className="w-4 h-4 mr-2" />
                        Save
                        </>
                    )}
                    </Button>
                )}
                </div>
            </div>
            {hasUnsavedChanges && (
                <p className="text-xs text-amber-600 mt-1">You have unsaved changes - Press Cmd/Ctrl+Enter or click Save</p>
            )}
            </SheetHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6 flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-3 mx-6">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="documents">
                Documents {localTask.document_urls?.length > 0 && `(${localTask.document_urls.length})`}
                </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="flex-1 overflow-y-auto px-6 mt-0 pt-4">
                <div className="space-y-6 pb-6" onKeyDown={handleKeyDown}>
                <div>
                    <label className="text-sm font-medium mb-2 block">Task Title *</label>
                    <Input
                    value={localTask.title || ''}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    placeholder="Task title"
                    className="text-lg font-semibold"
                    />
                </div>

                <div>
                    <label className="text-sm font-medium mb-2 block">Description</label>
                    <Textarea
                    value={localTask.description || ''}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    placeholder="Task description..."
                    rows={4}
                    className="resize-none"
                    />
                </div>

                <div>
                    <label className="text-sm font-medium mb-2 block">Department</label>
                    <Select
                    value={localTask.department_id || ''}
                    onValueChange={(val) => handleFieldChange('department_id', val === "null" ? null : val)}
                    >
                    <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                        <SelectItem value="null">No Department</SelectItem>
                        {departments.map(dept => {
                        const colorClass = departmentColorClasses[dept.color] || departmentColorClasses.blue;
                        return (
                            <SelectItem key={dept.id} value={dept.id}>
                            <div className="flex items-center gap-2">
                                <div className={cn("w-3 h-3 rounded", colorClass.bg)}></div>
                                <span>{dept.name}</span>
                            </div>
                            </SelectItem>
                        );
                        })}
                    </SelectContent>
                    </Select>
                </div>

                <div>
                    <label className="text-sm font-medium mb-2 block">Customer</label>
                    <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between bg-white">
                        {localTask.customer_id ? (
                            <span>{customers.find(c => c.id === localTask.customer_id)?.name || 'Select customer'}</span>
                        ) : (
                            <span className="text-slate-400">Search customer...</span>
                        )}
                        <ChevronDown className="w-4 h-4 ml-2" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0 bg-white" align="start">
                        <Command className="bg-white">
                        <CommandInput placeholder="Search customers..." className="h-9" />
                        <CommandEmpty>No customer found.</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-y-auto">
                            <CommandItem
                            value="no-customer"
                            onSelect={() => handleFieldChange('customer_id', null)}
                            >
                            <span className="text-slate-400">No Customer</span>
                            </CommandItem>
                            {customers.map(customer => (
                            <CommandItem
                                key={customer.id}
                                value={customer.name}
                                onSelect={() => handleFieldChange('customer_id', customer.id)}
                            >
                                <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-slate-500" />
                                <span>{customer.name}</span>
                                </div>
                            </CommandItem>
                            ))}
                        </CommandGroup>
                        </Command>
                    </PopoverContent>
                    </Popover>
                </div>


                <div>
                    <label className="text-sm font-medium mb-2 block">Location</label>
                    <Input
                    value={localTask.location || ''}
                    onChange={(e) => handleFieldChange('location', e.target.value)}
                    placeholder="Task location"
                    />
                </div>

                <div>
                    <label className="text-sm font-medium mb-2 block">Assigned To</label>
                    <Select
                    value=""
                    onValueChange={(userId) => {
                        if (userId && !localTask.assigned_to_user_ids?.includes(userId)) {
                        const newUserIds = [...(localTask.assigned_to_user_ids || []), userId];
                        handleFieldChange('assigned_to_user_ids', newUserIds);
                        }
                    }}
                    >
                    <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Add users" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                        {users.filter(u => !localTask.assigned_to_user_ids?.includes(u.id)).map(user => (
                        <SelectItem key={user.id} value={user.id}>
                            {user.first_name} {user.last_name}
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                    {localTask.assigned_to_user_ids?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {localTask.assigned_to_user_ids.map(userId => {
                        const user = users.find(u => u.id === userId);
                        return user ? (
                            <div key={userId} className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-sm">
                            {user.first_name} {user.last_name}
                            <X
                                className="w-3 h-3 cursor-pointer"
                                onClick={() => {
                                const newUserIds = localTask.assigned_to_user_ids.filter(id => id !== userId);
                                handleFieldChange('assigned_to_user_ids', newUserIds);
                                }}
                            />
                            </div>
                        ) : null;
                        })}
                    </div>
                    )}
                </div>

                <div>
                    <label className="text-sm font-medium mb-2 block">Assigned Teams</label>
                    <Select
                    value=""
                    onValueChange={(teamId) => {
                        if (teamId && !localTask.assigned_to_team_ids?.includes(teamId)) {
                        const newTeamIds = [...(localTask.assigned_to_team_ids || []), teamId];
                        handleFieldChange('assigned_to_team_ids', newTeamIds);
                        }
                    }}
                    >
                    <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Add teams" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                        {teams.filter(t => !localTask.assigned_to_team_ids?.includes(t.id)).map(team => (
                        <SelectItem key={team.id} value={team.id}>
                            {team.name}
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                    {localTask.assigned_to_team_ids?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {localTask.assigned_to_team_ids.map(teamId => {
                        const team = teams.find(t => t.id === teamId);
                        return team ? (
                            <div key={teamId} className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-sm">
                            {team.name}
                            <X
                                className="w-3 h-3 cursor-pointer"
                                onClick={() => {
                                const newTeamIds = localTask.assigned_to_team_ids.filter(id => id !== teamId);
                                handleFieldChange('assigned_to_team_ids', newTeamIds);
                                }}
                            />
                            </div>
                        ) : null;
                        })}
                    </div>
                    )}
                </div>

                <div className="pt-4 border-t space-y-2 text-sm text-gray-500">
                    <div>Created: {safeFormatDate(localTask.created_date)}</div>
                    <div>Last Updated: {safeFormatDate(localTask.updated_date)}</div>
                    {localTask.created_by && <div>Created By: {localTask.created_by}</div>}
                </div>
                </div>
            </TabsContent>

            <TabsContent value="documents" className="flex-1 overflow-y-auto px-6 mt-0 pt-4">
                <div className="space-y-4 pb-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Task Documents</h3>
                    <Button
                    size="sm"
                    onClick={handleDocumentUpload}
                    disabled={uploadingDocument}
                    >
                    {uploadingDocument ? (
                        <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                        </>
                    ) : (
                        <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Document
                        </>
                    )}
                    </Button>
                    <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelected}
                    className="hidden"
                    />
                </div>

                {(!localTask.document_urls || localTask.document_urls.length === 0) ? (
                    <div className="text-center py-12 text-slate-500">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <p>No documents uploaded yet.</p>
                    <p className="text-sm mt-2">Click "Upload Document" to add files to this task.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                    {localTask.document_urls.map((url, index) => {
                        const fileName = url.split('/').pop()?.split('?')[0] || `Document ${index + 1}`;

                        return (
                        <div key={url} className="relative group border rounded-lg p-4 hover:bg-slate-50 transition-all">
                            <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <FileText className="w-5 h-5 text-slate-400 flex-shrink-0" />
                                <span className="text-sm truncate" title={fileName}>{fileName}</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 flex-shrink-0"
                                onClick={() => handleRemoveDocument(url)}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                            </div>
                            <div className="flex gap-2 mt-3">
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => window.open(url, '_blank')}
                            >
                                <Download className="w-3 h-3 mr-1" />
                                Download
                            </Button>
                            </div>
                        </div>
                        );
                    })}
                    </div>
                )}
                </div>
            </TabsContent>

            <TabsContent value="activity" className="flex-1 overflow-hidden mt-0">
                {loadingComments ? (
                <div className="flex justify-center items-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
                ) : (
                <TaskActivityFeed
                    taskId={task.id}
                    comments={comments}
                    users={users}
                    currentUser={currentUser}
                    onRefresh={loadComments}
                />
                )}
            </TabsContent>
            </Tabs>
        </SheetContent>
        
        {showDocumentViewer && (
            <DocumentViewer
            isOpen={showDocumentViewer}
            onClose={() => setShowDocumentViewer(false)}
            title="Task Documents"
            documents={localTask.document_urls || []}
            onRemove={handleRemoveDocument}
            canEdit={true}
            />
        )}
        </Sheet>
    );
}