import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Users, MessageCircle, MoreVertical, ChevronLeft, Settings, MessageSquare, Trash2, Edit3, X, Video, Phone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Avatar from '../Avatar';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

const getDynamicFullName = (user) => {
  if (!user) return 'Unknown User';
  
  const firstName = user.first_name || '';
  const lastName = user.last_name || '';
  const dynamicName = `${firstName} ${lastName}`.trim();
  
  if (dynamicName) return dynamicName;
  if (user.full_name) return user.full_name;
  if (user.email) return user.email.split('@')[0];
  
  return 'Unknown User';
};

export default function ChatSidebar({ currentUser, chats, users, teams, onChatSelect, onNewChat, onNewGroup, activeChatId }) {
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showNewTeamModal, setShowNewTeamModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedTeamMembers, setSelectedTeamMembers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [isChatSidebarCollapsed, setIsChatSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState(new Set()); 

  const apiHeaders = { 'X-User-ID': currentUser?.id };

  const filteredChats = useMemo(() => {
    if (!chats) return [];
    
    switch (activeTab) {
      case 'teams':
        return chats.filter(chat => chat.type === 'group');
      case 'unread':
        return [];
      case 'all':
      default:
        return chats;
    }
  }, [chats, activeTab]);

  const getChatDetails = (chat) => {
    if (chat.type === 'private') {
      const otherUserId = chat.memberUserIds.find(id => id !== currentUser.id);
      const otherUser = users.find(u => u.id === otherUserId);
      return {
        name: getDynamicFullName(otherUser),
        avatar: otherUser?.avatar_url,
        isGroup: false
      };
    }
    return {
      name: chat.name,
      avatar: chat.groupImageUrl,
      isGroup: true
    };
  };

  const availableUsers = useMemo(() => {
    return users.filter(user => user.id !== currentUser.id);
  }, [users, currentUser]);

  const handleNewChat = () => {
    setShowNewChatModal(true);
    setSelectedUserId('');
  };

  const handleNewTeam = () => {
    setShowNewTeamModal(true);
    setSelectedTeamMembers([]);
    setGroupName('');
  };

  const confirmNewChat = () => {
    if (selectedUserId) {
      onNewChat(selectedUserId);
      setShowNewChatModal(false);
      setSelectedUserId('');
    }
  };

  const confirmNewTeam = () => {
    if (groupName.trim() && selectedTeamMembers.length > 0) {
      onNewGroup(groupName, selectedTeamMembers);
      setShowNewTeamModal(false);
      setGroupName('');
      setSelectedTeamMembers([]);
    }
  };

  const toggleTeamMember = (userId) => {
    setSelectedTeamMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleChatSelection = (chatId) => {
    setSelectedChatIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chatId)) {
        newSet.delete(chatId);
      } else {
        newSet.add(chatId);
      }
      return newSet;
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedChatIds.size === 0) return;
    
    const confirmDelete = window.confirm(`Delete ${selectedChatIds.size} chat${selectedChatIds.size > 1 ? 's' : ''}? This cannot be undone.`);
    if (!confirmDelete) return;

    try {
      for (const chatId of selectedChatIds) {
        await base44.functions.invoke(`apiChats/${chatId}`, null, { headers: apiHeaders, method: 'DELETE' });
      }
      toast.success(`${selectedChatIds.size} chat${selectedChatIds.size > 1 ? 's' : ''} deleted`);
      setSelectedChatIds(new Set());
      setSelectionMode(false);
      window.location.reload();
    } catch (error) {
      console.error('Error deleting chats:', error);
      toast.error('Failed to delete chats');
    }
  };

  // ✅ Generate quick call link for a chat
  const generateQuickCallLink = async (chatId, isVideo = true) => {
    try {
      const response = await base44.functions.invoke('createDailyRoom', {
        roomName: `chat-${chatId}-${Date.now()}`,
        properties: {
          enable_chat: true,
          enable_screenshare: true,
          enable_recording: 'local'
        }
      });

      if (response?.url) {
        await navigator.clipboard.writeText(response.url);
        toast.success(`${isVideo ? 'Video' : 'Audio'} call link copied to clipboard!`);
      } else {
        toast.error('Failed to generate call link');
      }
    } catch (error) {
      console.error('Error generating call link:', error);
      toast.error('Failed to generate call link');
    }
  };

  return (
    <div className={`bg-white border-r border-slate-200 h-full flex flex-col transition-all duration-300 ${isChatSidebarCollapsed ? 'w-20' : 'w-full md:w-80 lg:w-96'}`}>
      
      <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-end flex-shrink-0 bg-white">
          {!isChatSidebarCollapsed && <h2 className="font-bold text-base header-express text-slate-900 mr-auto">Messages</h2>}
          
          <div className={`flex items-center gap-1.5 ${isChatSidebarCollapsed ? 'w-full justify-center flex-col' : ''}`}>
              {!selectionMode ? (
                <>
                  <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white">
                              <PlusCircle className="w-4 h-4" />
                          </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={handleNewChat} className="py-2 text-xs">
                              <MessageCircle className="mr-2 h-3 w-3 text-indigo-600" />
                              <span className="font-medium">New Chat</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleNewTeam} className="py-2 text-xs">
                              <Users className="mr-2 h-3 w-3 text-indigo-600" />
                              <span className="font-medium">New Group</span>
                          </DropdownMenuItem>
                      </DropdownMenuContent>
                  </DropdownMenu>

                  {!isChatSidebarCollapsed && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-slate-100">
                                <MoreVertical className="w-4 h-4 text-slate-600" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => setSelectionMode(true)} className="py-1.5 text-xs">
                                <Edit3 className="mr-2 h-3 w-3" />
                              <span>Select Chats</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setShowSettings(!showSettings)} className="py-1.5 text-xs">
                                <Settings className="mr-2 h-3 w-3" />
                              <span>Settings</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setIsChatSidebarCollapsed(prev => !prev)} className="py-1.5 text-xs">
                                <ChevronLeft className={`mr-2 h-3 w-3 transition-transform ${isChatSidebarCollapsed ? 'rotate-180' : ''}`} />
                                <span>{isChatSidebarCollapsed ? 'Expand' : 'Collapse'}</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-1.5">
                  {!isChatSidebarCollapsed && (
                    <span className="text-xs font-medium text-slate-700 whitespace-nowrap">
                        {selectedChatIds.size} sel
                    </span>
                  )}
                  <Button 
                    variant="ghost" 
                    size={isChatSidebarCollapsed ? "icon" : "sm"} 
                    onClick={handleDeleteSelected}
                    disabled={selectedChatIds.size === 0}
                    className="h-7 text-xs text-red-600 hover:bg-red-50 px-2"
                  >
                    <Trash2 className={`w-3 h-3 ${!isChatSidebarCollapsed ? 'mr-1' : ''}`} />
                    {!isChatSidebarCollapsed && 'Del'}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size={isChatSidebarCollapsed ? "icon" : "sm"} 
                    onClick={() => {
                      setSelectionMode(false);
                      setSelectedChatIds(new Set());
                    }}
                    className="h-7 text-xs px-2"
                  >
                    {!isChatSidebarCollapsed ? 'Cancel' : <X className="w-3 h-3" />}
                  </Button>
                </div>
              )}
          </div>
      </div>

      {showSettings && !isChatSidebarCollapsed && (
        <div className="bg-indigo-50 border-b border-indigo-100 px-3 py-2">
          <div className="flex items-center gap-2 mb-1">
            <Settings className="w-3 h-3 text-indigo-700" />
            <div className="text-xs font-semibold text-indigo-900">Settings</div>
          </div>
          <div className="text-[10px] text-indigo-700 space-y-0.5">
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
              <span>Notifications: On</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
              <span>Files: Enabled</span>
            </div>
          </div>
        </div>
      )}

      {!isChatSidebarCollapsed && !selectionMode && (
        <div className="px-2 py-2 border-b border-slate-100 bg-slate-50">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-7 bg-white border border-slate-200">
              <TabsTrigger value="all" className="text-[10px] font-medium data-[state=active]:bg-indigo-600 data-[state=active]:text-white px-1">All</TabsTrigger>
              <TabsTrigger value="unread" className="text-[10px] font-medium data-[state=active]:bg-indigo-600 data-[state=active]:text-white px-1">Unread</TabsTrigger>
              <TabsTrigger value="teams" className="text-[10px] font-medium data-[state=active]:bg-indigo-600 data-[state=active]:text-white px-1">Teams</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      <div className="flex-1 overflow-y-auto bg-white">
        {filteredChats.length === 0 ? (
          <div className="p-4 text-center">
            {isChatSidebarCollapsed ? (
              <MessageCircle className="mx-auto h-6 w-6 text-slate-300"/>
            ) : (
              <div>
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-xs text-slate-500 content-lexend">No chats</p>
                <p className="text-[10px] text-slate-400 mt-1">Start a conversation</p>
              </div>
            )}
          </div>
        ) : (
          <ul>
            {filteredChats.map(chat => {
              const { name, avatar } = getChatDetails(chat);
              const isActive = activeChatId === chat.id;
              const isSelected = selectedChatIds.has(chat.id);
              
              return (
                <li key={chat.id} className="relative group">
                  <button 
                    onClick={() => {
                      if (selectionMode) {
                        toggleChatSelection(chat.id);
                      } else {
                        onChatSelect(chat.id);
                      }
                    }}
                    className={cn(
                      "w-full text-left px-2 py-2 transition-colors border-l-4",
                      isActive && !selectionMode
                        ? 'bg-indigo-50 border-indigo-600' 
                        : isSelected
                        ? 'bg-red-50 border-red-500'
                        : 'hover:bg-slate-50 border-transparent',
                      isChatSidebarCollapsed ? 'flex justify-center' : ''
                    )}
                  >
                    <div className={cn(
                      "flex items-center gap-2",
                      isChatSidebarCollapsed ? 'w-auto' : 'w-full'
                    )}>
                      {selectionMode && !isChatSidebarCollapsed && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleChatSelection(chat.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-shrink-0 h-3 w-3"
                        />
                      )}
                      <div className="relative flex-shrink-0">
                        <Avatar name={name} src={avatar} className="w-8 h-8" />
                        {isActive && !isChatSidebarCollapsed && !selectionMode && (
                          <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border border-white rounded-full"></div>
                        )}
                      </div>
                      {!isChatSidebarCollapsed && (
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-0.5">
                            <p className={cn(
                              "font-semibold text-xs truncate",
                              isActive && !selectionMode ? 'text-indigo-900' : 'text-slate-800'
                            )}>
                              {name}
                            </p>
                            {chat.lastMessageTimestamp && (
                              <p className="text-[9px] text-slate-400 flex-shrink-0 ml-1">
                                {formatDistanceToNow(new Date(chat.lastMessageTimestamp), { addSuffix: true })}
                              </p>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 truncate content-lexend">
                            {chat.lastMessageText || 'No messages'}
                          </p>
                        </div>
                      )}
                    </div>
                  </button>

                  {/* ✅ THREE DOTS MENU - appears on hover */}
                  {!selectionMode && !isChatSidebarCollapsed && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 rounded-full hover:bg-slate-200"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-3 h-3 text-slate-600" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              generateQuickCallLink(chat.id, true);
                            }}
                            className="py-1.5 text-xs cursor-pointer"
                          >
                            <Video className="mr-2 h-3 w-3 text-blue-600" />
                            <span>Copy Video Call Link</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              generateQuickCallLink(chat.id, false);
                            }}
                            className="py-1.5 text-xs cursor-pointer"
                          >
                            <Phone className="mr-2 h-3 w-3 text-green-600" />
                            <span>Copy Audio Call Link</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={showNewChatModal} onOpenChange={setShowNewChatModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Start New Chat
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Select user to chat with:
              </label>
              {availableUsers.length > 0 ? (
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <Avatar name={getDynamicFullName(user)} src={user.avatar_url} className="w-6 h-6" />
                          <div>
                            <div className="font-medium">{getDynamicFullName(user)}</div>
                            <div className="text-xs text-gray-500">{user.job_role}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-gray-500 p-3 bg-gray-50 rounded">
                  No other users available for chat.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewChatModal(false)}>
                Cancel
              </Button>
              <Button onClick={confirmNewChat} disabled={!selectedUserId}>
                Start Chat
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewTeamModal} onOpenChange={setShowNewTeamModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Create Team Chat
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Team name:
              </label>
              <Input
                placeholder="Enter team name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Select team members:
              </label>
              <div className="max-h-40 overflow-y-auto space-y-1 border rounded-lg p-2">
                {availableUsers.map(user => {
                  const isSelected = selectedTeamMembers.includes(user.id);
                  return (
                    <div 
                      key={user.id} 
                      className={cn(
                        "flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-all",
                        isSelected 
                          ? "bg-indigo-50 border-2 border-indigo-400" 
                          : "hover:bg-slate-50 border-2 border-transparent"
                      )}
                      onClick={() => toggleTeamMember(user.id)}
                    >
                      <Checkbox
                        id={`user-${user.id}`}
                        checked={isSelected}
                        onCheckedChange={() => toggleTeamMember(user.id)}
                      />
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar name={getDynamicFullName(user)} src={user.avatar_url} className="w-8 h-8" />
                        <div>
                          <div className="font-semibold text-base">{getDynamicFullName(user)}</div>
                          <div className="text-sm text-gray-500">{user.job_role}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewTeamModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={confirmNewTeam} 
                disabled={!groupName.trim() || selectedTeamMembers.length === 0}
              >
                Create Team
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}