import React, { useState, useEffect } from 'react';
import { useData } from '../components/DataProvider';
import ChatSidebar from '../components/chat/ChatSidebar';
import ChatWindow from '../components/chat/ChatWindow';
import { toast } from 'sonner';
import { Chat } from '@/entities/all';
import { MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function ChatPage() {
  const { currentUser, currentCompany, teams, loadUsers, loading: dataLoading } = useData();
  
  const [users, setUsers] = useState([]);
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser && currentUser.id) {
      loadPageData();
    }
  }, [currentUser]);

  const loadPageData = async () => {
    setLoading(true);
    try {
      console.log('📥 Loading chat data...');
      
      const [usersData, chatsData] = await Promise.all([
        loadUsers(true),
        loadChats()
      ]);
      
      setUsers(usersData || []);
      setChats(chatsData || []);
      
      console.log('✅ Chat data loaded:', {
        users: usersData?.length || 0,
        chats: chatsData?.length || 0
      });
    } catch (error) {
      console.error('❌ Failed to load chat data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadChats = async () => {
    if (!currentUser || !currentUser.id) {
      console.log('⏳ Chat: Waiting for currentUser...');
      return [];
    }

    try {
      console.log('📡 Chat: Loading chats for user:', currentUser.id);
      
      const allChats = await Chat.list('-lastMessageTimestamp');
      const myChats = allChats.filter(chat => 
        chat.memberUserIds?.includes(currentUser.id)
      );
      
      console.log('✅ Chats loaded:', myChats.length);
      return myChats;
      
    } catch (error) {
      console.error('❌ Chat: Error loading chats:', error);
      toast.error('Error loading chats: ' + (error.message || 'Unknown error'));
      return [];
    }
  };

  const handleSelectChat = (chatId) => {
    setSelectedChatId(chatId);
  };

  const handleNewChat = async (userId) => {
    if (!currentUser || !currentUser.id) {
      toast.error('Current user not found. Cannot create chat.');
      return;
    }
    
    try {
      const existingChat = chats.find(chat =>
        chat.type === 'private' &&
        chat.memberUserIds.length === 2 &&
        chat.memberUserIds.includes(currentUser.id) &&
        chat.memberUserIds.includes(userId)
      );

      if (existingChat) {
        setSelectedChatId(existingChat.id);
        toast.info('Chat already exists, opening it now.');
        return;
      }

      const otherUser = users.find(u => u.id === userId);
      const chatName = otherUser 
        ? `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim() || 'Private Chat'
        : 'Private Chat';

      const newChat = await Chat.create({
        name: chatName,
        type: 'private',
        memberUserIds: [currentUser.id, userId],
        adminUserIds: []
      });

      setChats(prev => [newChat, ...prev]);
      setSelectedChatId(newChat.id);
      toast.success('Chat created successfully');
      
    } catch (error) {
      console.error('❌ Error creating chat:', error);
      toast.error('Failed to create chat: ' + error.message);
    }
  };

  const handleNewGroup = async (groupName, memberIds) => {
    if (!currentUser || !currentUser.id) {
      toast.error('Current user not found. Cannot create group.');
      return;
    }
    
    if (!groupName.trim()) {
      toast.error('Group name is required');
      return;
    }

    try {
      const newChat = await Chat.create({
        name: groupName,
        type: 'group',
        memberUserIds: [currentUser.id, ...memberIds],
        adminUserIds: [currentUser.id],
        groupImageUrl: null
      });

      setChats(prev => [newChat, ...prev]);
      setSelectedChatId(newChat.id);
      toast.success('Group chat created successfully');
      
    } catch (error) {
      console.error('❌ Error creating group chat:', error);
      toast.error('Failed to create group: ' + error.message);
    }
  };

  if (dataLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-slate-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  const selectedChat = chats.find(c => c.id === selectedChatId);

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 flex-shrink-0">
        <Card className="p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${currentCompany?.chat_tab_icon_url ? '' : 'bg-green-100'}`}>
              {currentCompany?.chat_tab_icon_url ? (
                <img src={currentCompany.chat_tab_icon_url} alt="Chat" className="w-10 h-10 object-contain" />
              ) : (
                <MessageSquare className="w-5 h-5 text-green-600" />
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900">Chat</h1>
          </div>
        </Card>
      </div>

      {/* Main Content: Sidebar + Chat Window */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - REDUCIDO 30% de 320px (w-80) a 224px (w-56) */}
        <div className="w-56 flex-shrink-0 border-r border-slate-200 bg-white overflow-hidden">
          <ChatSidebar
            chats={chats}
            selectedChatId={selectedChatId}
            onChatSelect={handleSelectChat}
            onNewChat={handleNewChat}
            onNewGroup={handleNewGroup}
            activeChatId={selectedChatId}
            currentUser={currentUser}
            users={users}
            teams={teams || []}
          />
        </div>

        {/* Chat Window */}
        <div className="flex-1 bg-slate-100 overflow-hidden">
          <ChatWindow
            chat={selectedChat}
            currentUser={currentUser}
            users={users}
          />
        </div>
      </div>
    </div>
  );
}