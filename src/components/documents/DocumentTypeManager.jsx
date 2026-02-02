import React, { useState, useEffect, useCallback } from 'react';
import { DocumentType, DocumentFolder, UserStatus } from '@/entities/all';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Loader2, Settings, Users } from 'lucide-react';
import { toast } from "sonner";
import InlineInput from '../InlineInput';

const colorOptions = [
  { value: 'gray', label: 'Gray', class: 'bg-gray-100 text-gray-800' },
  { value: 'red', label: 'Red', class: 'bg-red-100 text-red-800' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-100 text-yellow-800' },
  { value: 'green', label: 'Green', class: 'bg-green-100 text-green-800' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-100 text-blue-800' },
  { value: 'indigo', label: 'Indigo', class: 'bg-indigo-100 text-indigo-800' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-100 text-purple-800' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-100 text-pink-800' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-100 text-orange-800' },
  { value: 'teal', label: 'Teal', class: 'bg-teal-100 text-teal-800' }
];



export default function DocumentTypeManager({ isOpen, onClose, onTypesChanged, onSuccess, showFoldersTab = false }) {
    const [documentTypes, setDocumentTypes] = useState([]);
    const [folders, setFolders] = useState([]);
    const [userStatuses, setUserStatuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('doc-types');
    
    const [newTypeName, setNewTypeName] = useState('');
    const [selectedFolderId, setSelectedFolderId] = useState('');
    
    const [newFolderName, setNewFolderName] = useState('');
    const [newFolderColor, setNewFolderColor] = useState('blue');

    const [newUserStatusName, setNewUserStatusName] = useState('');
    const [newUserStatusColor, setNewUserStatusColor] = useState('green');

    const loadData = useCallback(async () => {
        try {
            const [typesData, foldersData, userStatusData] = await Promise.all([
                DocumentType.list('sort_order'),
                DocumentFolder.list('sort_order'),
                UserStatus.list('sort_order'),
            ]);
            setDocumentTypes(typesData || []);
            setFolders(foldersData || []);
            setUserStatuses(userStatusData || []);
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error("Failed to load data.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen, loadData]);

    // Document Types
    const handleAddDocumentType = async () => {
        if (!newTypeName.trim()) {
            toast.error("Document type name is required.");
            return;
        }

        try {
            const maxOrder = Math.max(...documentTypes.map(t => t.sort_order || 0), 0);
            const selectedFolder = folders.find(f => f.id === selectedFolderId);
            
            const newType = await DocumentType.create({
                name: newTypeName,
                folder_name: selectedFolder?.name || null,
                sort_order: maxOrder + 1
            });
            
            setDocumentTypes(prev => [...prev, newType].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
            setNewTypeName('');
            setSelectedFolderId('');
            
            if (onTypesChanged) onTypesChanged();
            toast.success("Document type added!");
        } catch (error) {
            console.error("Failed to add document type:", error);
            toast.error("Failed to add document type.");
        }
    };

    const handleUpdateType = async (id, field, value) => {
        try {
            await DocumentType.update(id, { [field]: value });
            setDocumentTypes(prev => 
                prev.map(t => t.id === id ? { ...t, [field]: value } : t)
            );
            if (onTypesChanged) onTypesChanged();
            toast.success("Updated!");
        } catch (error) {
            console.error("Failed to update document type:", error);
            toast.error("Failed to update.");
        }
    };

    const handleDeleteType = async (typeId) => {
        if (!confirm("Delete this document type? This will also delete ALL documents of this type for ALL employees.")) {
            return;
        }
        try {
            await DocumentType.delete(typeId);
            setDocumentTypes(prev => prev.filter(t => t.id !== typeId));
            if (onTypesChanged) onTypesChanged(typeId);
            toast.success("Deleted!");
        } catch (error) {
            console.error("Failed to delete:", error);
            toast.error("Failed to delete.");
        }
    };

    // Folders
    const handleAddFolder = async () => {
        if (!newFolderName.trim()) {
            toast.error("Folder name is required.");
            return;
        }

        try {
            const maxOrder = Math.max(...folders.map(f => f.sort_order || 0), 0);
            const newFolder = await DocumentFolder.create({
                name: newFolderName,
                color: newFolderColor,
                sort_order: maxOrder + 1
            });
            
            setFolders(prev => [...prev, newFolder].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
            setNewFolderName('');
            setNewFolderColor('blue');
            
            toast.success("Folder added!");
        } catch (error) {
            console.error("Failed to add folder:", error);
            toast.error("Failed to add folder.");
        }
    };

    const handleUpdateFolder = async (id, field, value) => {
        try {
            await DocumentFolder.update(id, { [field]: value });
            setFolders(prev => 
                prev.map(f => f.id === id ? { ...f, [field]: value } : f)
            );
            
            if (field === 'name') {
                const oldFolder = folders.find(f => f.id === id);
                if (oldFolder) {
                    const typesToUpdate = documentTypes.filter(dt => dt.folder_name === oldFolder.name);
                    for (const type of typesToUpdate) {
                        await DocumentType.update(type.id, { folder_name: value });
                    }
                    await loadData();
                }
            }
            
            toast.success("Updated!");
        } catch (error) {
            console.error("Failed to update folder:", error);
            toast.error("Failed to update.");
        }
    };

    const handleDeleteFolder = async (folderId) => {
        const folder = folders.find(f => f.id === folderId);
        const typesUsingFolder = documentTypes.filter(dt => dt.folder_name === folder.name);
        
        if (typesUsingFolder.length > 0) {
            const confirmDelete = confirm(`This folder is used by ${typesUsingFolder.length} document type(s). Delete anyway?`);
            if (!confirmDelete) return;
            
            for (const type of typesUsingFolder) {
                await DocumentType.update(type.id, { folder_name: null });
            }
        } else {
            if (!confirm("Delete this folder?")) return;
        }
        
        try {
            await DocumentFolder.delete(folderId);
            setFolders(prev => prev.filter(f => f.id !== folderId));
            await loadData();
            toast.success("Deleted!");
        } catch (error) {
            console.error("Failed to delete folder:", error);
            toast.error("Failed to delete.");
        }
    };

    // User Status
    const handleAddUserStatus = async () => {
        if (!newUserStatusName.trim()) {
            toast.error("User status name is required.");
            return;
        }

        try {
            const maxOrder = Math.max(...userStatuses.map(s => s.sort_order || 0), 0);
            const newStatus = await UserStatus.create({
                name: newUserStatusName,
                color: newUserStatusColor,
                sort_order: maxOrder + 1
            });
            
            setUserStatuses(prev => [...prev, newStatus].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
            setNewUserStatusName('');
            setNewUserStatusColor('green');
            
            toast.success("User status added!");
        } catch (error) {
            console.error("Failed to add user status:", error);
            toast.error("Failed to add user status.");
        }
    };

    const handleUpdateUserStatus = async (id, field, value) => {
        try {
            await UserStatus.update(id, { [field]: value });
            setUserStatuses(prev => 
                prev.map(s => s.id === id ? { ...s, [field]: value } : s)
            );
            toast.success("Updated!");
        } catch (error) {
            console.error("Failed to update user status:", error);
            toast.error("Failed to update.");
        }
    };

    const handleDeleteUserStatus = async (statusId) => {
        if (!confirm("Delete this user status?")) return;
        
        try {
            await UserStatus.delete(statusId);
            setUserStatuses(prev => prev.filter(s => s.id !== statusId));
            toast.success("Deleted!");
        } catch (error) {
            console.error("Failed to delete:", error);
            toast.error("Failed to delete.");
        }
    };



    const getColorClass = (color) => {
        return colorOptions.find(o => o.value === color)?.class || 'bg-blue-100 text-blue-800';
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="right" className="w-full sm:max-w-xl overflow-hidden flex flex-col p-0">
                <SheetHeader className="border-b py-3 px-4">
                    <div className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-indigo-600" />
                        <SheetTitle className="text-slate-900 text-lg">
                            Manage Types & Categories
                        </SheetTitle>
                    </div>
                </SheetHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="mx-4 mt-2 grid grid-cols-4">
                            <TabsTrigger value="doc-types" className="text-xs">
                                Doc Types
                            </TabsTrigger>
                            {showFoldersTab ? (
                              <TabsTrigger value="folders" className="text-xs">
                                Folder
                              </TabsTrigger>
                            ) : (
                              <TabsTrigger value="user-status" className="text-xs">
                                <Users className="w-3 h-3 mr-1" />
                                User Status
                              </TabsTrigger>
                            )}
                        </TabsList>

                    {/* Document Types Tab */}
                    <TabsContent value="doc-types" className="flex-1 flex flex-col overflow-hidden mt-0 p-0">
                        <div className="bg-slate-50 border-b border-slate-200 p-3">
                            <h3 className="font-medium text-slate-700 mb-2 text-xs">Add Document Type</h3>
                            <div className="space-y-2">
                                <Input
                                    placeholder="e.g., 'ID Card', 'License'"
                                    value={newTypeName}
                                    onChange={(e) => setNewTypeName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddDocumentType()}
                                    className="h-8 text-sm"
                                />
                                <div className="flex gap-2">
                                    <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                                        <SelectTrigger className="h-8 text-xs flex-1">
                                            <SelectValue placeholder="Folder (optional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={null}>No Folder</SelectItem>
                                            {folders.map(folder => (
                                                <SelectItem key={folder.id} value={folder.id}>
                                                    <Badge className={`${getColorClass(folder.color)} text-[10px]`}>{folder.name}</Badge>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button onClick={handleAddDocumentType} size="sm" className="h-8 px-3 text-xs">
                                        <Plus className="w-3 h-3 mr-1" />
                                        Add
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="flex justify-center items-center p-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-100 hover:bg-slate-100">
                                            <TableHead className="py-2 px-3 text-xs font-bold text-slate-800">Document Name</TableHead>
                                            <TableHead className="py-2 px-3 text-xs font-bold text-slate-800 w-32">Folder</TableHead>
                                            <TableHead className="py-2 px-3 text-xs font-bold text-slate-800 w-16 text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {documentTypes.map(type => {
                                            const folder = folders.find(f => f.name === type.folder_name);
                                            return (
                                                <TableRow key={type.id} className="hover:bg-slate-50">
                                                    <TableCell className="py-1.5 px-3">
                                                        <InlineInput
                                                            value={type.name}
                                                            onSave={(val) => handleUpdateType(type.id, 'name', val)}
                                                            className="text-xs font-medium text-slate-900"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="py-1.5 px-3">
                                                        {folder ? (
                                                            <Badge className={`${getColorClass(folder.color)} text-[10px] px-1.5 py-0`}>
                                                                {folder.name}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-1.5 px-3 text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDeleteType(type.id)}
                                                            className="h-6 w-6 text-red-500 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        {documentTypes.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={3} className="h-20 text-center text-xs text-slate-500">
                                                    No document types yet.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </TabsContent>

                     {/* Folders Tab (Clients) */}
                     {showFoldersTab && (
                       <TabsContent value="folders" className="flex-1 flex flex-col overflow-hidden mt-0 p-0">
                         <div className="bg-slate-50 border-b border-slate-200 p-3">
                           <h3 className="font-medium text-slate-700 mb-2 text-xs">Add Folder</h3>
                           <div className="flex gap-2">
                             <Input
                               placeholder="e.g., 'Compliance', 'HR', 'Finance'"
                               value={newFolderName}
                               onChange={(e) => setNewFolderName(e.target.value)}
                               onKeyDown={(e) => e.key === 'Enter' && handleAddFolder()}
                               className="h-8 text-sm flex-1"
                             />
                             <Select value={newFolderColor} onValueChange={setNewFolderColor}>
                               <SelectTrigger className="h-8 text-xs w-28">
                                 <SelectValue />
                               </SelectTrigger>
                               <SelectContent>
                                 {colorOptions.map(opt => (
                                   <SelectItem key={opt.value} value={opt.value}>
                                     <Badge className={`${opt.class} text-[10px]`}>{opt.label}</Badge>
                                   </SelectItem>
                                 ))}
                               </SelectContent>
                             </Select>
                             <Button onClick={handleAddFolder} size="sm" className="h-8 px-3 text-xs">
                               <Plus className="w-3 h-3 mr-1" />
                               Add
                             </Button>
                           </div>
                         </div>

                         <div className="flex-1 overflow-y-auto">
                           {loading ? (
                             <div className="flex justify-center items-center p-8">
                               <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                             </div>
                           ) : (
                             <Table>
                               <TableHeader>
                                 <TableRow className="bg-slate-100 hover:bg-slate-100">
                                   <TableHead className="py-2 px-3 text-xs font-bold text-slate-800">Folder Name</TableHead>
                                   <TableHead className="py-2 px-3 text-xs font-bold text-slate-800 w-24">Color</TableHead>
                                   <TableHead className="py-2 px-3 text-xs font-bold text-slate-800 w-16 text-right">Actions</TableHead>
                                 </TableRow>
                               </TableHeader>
                               <TableBody>
                                 {folders.map(folder => (
                                   <TableRow key={folder.id} className="hover:bg-slate-50">
                                     <TableCell className="py-1.5 px-3">
                                       <InlineInput
                                         value={folder.name}
                                         onSave={(val) => handleUpdateFolder(folder.id, 'name', val)}
                                         className="text-xs font-medium text-slate-900"
                                       />
                                     </TableCell>
                                     <TableCell className="py-1.5 px-3">
                                       <Select
                                         value={folder.color}
                                         onValueChange={(val) => handleUpdateFolder(folder.id, 'color', val)}
                                       >
                                         <SelectTrigger className="h-6 w-full bg-transparent border-none p-0">
                                           <SelectValue asChild>
                                             <Badge className={`${getColorClass(folder.color)} text-[10px]`}>
                                               {colorOptions.find(o => o.value === folder.color)?.label}
                                             </Badge>
                                           </SelectValue>
                                         </SelectTrigger>
                                         <SelectContent>
                                           {colorOptions.map(opt => (
                                             <SelectItem key={opt.value} value={opt.value}>
                                               <Badge className={`${opt.class} text-[10px]`}>{opt.label}</Badge>
                                             </SelectItem>
                                           ))}
                                         </SelectContent>
                                       </Select>
                                     </TableCell>
                                     <TableCell className="py-1.5 px-3 text-right">
                                       <Button
                                         variant="ghost"
                                         size="icon"
                                         onClick={() => handleDeleteFolder(folder.id)}
                                         className="h-6 w-6 text-red-500 hover:bg-red-50"
                                       >
                                         <Trash2 className="w-3 h-3" />
                                       </Button>
                                     </TableCell>
                                   </TableRow>
                                 ))}
                                 {folders.length === 0 && (
                                   <TableRow>
                                     <TableCell colSpan={3} className="h-20 text-center text-xs text-slate-500">
                                       No folders yet.
                                     </TableCell>
                                   </TableRow>
                                 )}
                               </TableBody>
                             </Table>
                           )}
                         </div>
                       </TabsContent>
                     )}

                     {/* User Status Tab */}
                    <TabsContent value="user-status" className="flex-1 flex flex-col overflow-hidden mt-0 p-0">
                        <div className="bg-slate-50 border-b border-slate-200 p-3">
                            <h3 className="font-medium text-slate-700 mb-2 text-xs">Add User Status</h3>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="e.g., 'Active', 'On Leave'"
                                    value={newUserStatusName}
                                    onChange={(e) => setNewUserStatusName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddUserStatus()}
                                    className="h-8 text-sm flex-1"
                                />
                                <Select value={newUserStatusColor} onValueChange={setNewUserStatusColor}>
                                    <SelectTrigger className="h-8 text-xs w-24">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {colorOptions.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                <Badge className={`${opt.class} text-[10px]`}>{opt.label}</Badge>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button onClick={handleAddUserStatus} size="sm" className="h-8 px-3 text-xs">
                                    <Plus className="w-3 h-3 mr-1" />
                                    Add
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="flex justify-center items-center p-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-100 hover:bg-slate-100">
                                            <TableHead className="py-2 px-3 text-xs font-bold text-slate-800">Status Name</TableHead>
                                            <TableHead className="py-2 px-3 text-xs font-bold text-slate-800 w-24">Color</TableHead>
                                            <TableHead className="py-2 px-3 text-xs font-bold text-slate-800">Description</TableHead>
                                            <TableHead className="py-2 px-3 text-xs font-bold text-slate-800 w-16 text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {userStatuses.map(status => (
                                            <TableRow key={status.id} className="hover:bg-slate-50">
                                                <TableCell className="py-1.5 px-3">
                                                    <InlineInput
                                                        value={status.name}
                                                        onSave={(val) => handleUpdateUserStatus(status.id, 'name', val)}
                                                        className="text-xs font-medium text-slate-900"
                                                    />
                                                </TableCell>
                                                <TableCell className="py-1.5 px-3">
                                                    <Select
                                                        value={status.color}
                                                        onValueChange={(val) => handleUpdateUserStatus(status.id, 'color', val)}
                                                    >
                                                        <SelectTrigger className="h-6 w-full bg-transparent border-none p-0">
                                                            <SelectValue asChild>
                                                                <Badge className={`${getColorClass(status.color)} text-[10px]`}>
                                                                    {colorOptions.find(o => o.value === status.color)?.label}
                                                                </Badge>
                                                            </SelectValue>
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {colorOptions.map(opt => (
                                                                <SelectItem key={opt.value} value={opt.value}>
                                                                    <Badge className={`${opt.class} text-[10px]`}>{opt.label}</Badge>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell className="py-1.5 px-3">
                                                    <InlineInput
                                                        value={status.description || ''}
                                                        onSave={(val) => handleUpdateUserStatus(status.id, 'description', val)}
                                                        placeholder="Optional"
                                                        className="text-xs text-slate-600"
                                                    />
                                                </TableCell>
                                                <TableCell className="py-1.5 px-3 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteUserStatus(status.id)}
                                                        className="h-6 w-6 text-red-500 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {userStatuses.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-20 text-center text-xs text-slate-500">
                                                    No user statuses yet.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </TabsContent>


                </Tabs>
            </SheetContent>
        </Sheet>
    );
}