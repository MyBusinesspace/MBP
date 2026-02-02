import React, { useState, useEffect, useRef } from 'react';
import { useData } from '@/components/DataProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  Send,
  Loader2,
  Sparkles,
  MessageSquare,
  Plus,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import Avatar from '@/components/Avatar';

function MessageBubble({ message, user }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={cn("flex gap-3 mb-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
      )}
      
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-3",
        isUser 
          ? "bg-indigo-600 text-white" 
          : "bg-white border border-slate-200"
      )}>
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown
              className={cn(
                "text-sm leading-relaxed",
                "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
                "[&_p]:my-2",
                "[&_ul]:my-2 [&_ul]:ml-4 [&_ul]:list-disc",
                "[&_ol]:my-2 [&_ol]:ml-4 [&_ol]:list-decimal",
                "[&_li]:my-1",
                "[&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-slate-100 [&_code]:text-slate-700 [&_code]:text-xs",
                "[&_pre]:bg-slate-900 [&_pre]:text-slate-100 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre]:my-2",
                "[&_pre_code]:bg-transparent [&_pre_code]:p-0"
              )}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        
        {message.tool_calls && message.tool_calls.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.tool_calls.map((toolCall, idx) => (
              <div key={idx} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>{toolCall.name || 'Processing...'}</span>
                {toolCall.status === 'completed' && <span className="text-green-600">✓</span>}
                {toolCall.status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {isUser && (
        <Avatar user={user} size="xs" className="flex-shrink-0" />
      )}
    </div>
  );
}

export default function AIAssistantPage() {
  const { currentUser } = useData();
  
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const unsubscribeRef = useRef(null);

  const agentName = 'business_secretary';
  const whatsappURL = base44.agents.getWhatsAppConnectURL(agentName);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    try {
      const convs = await base44.agents.listConversations({ agent_name: agentName });
      setConversations(convs || []);
      
      if (convs && convs.length > 0 && !currentConversationId) {
        const latestConv = convs[0];
        setCurrentConversationId(latestConv.id);
        setMessages(latestConv.messages || []);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
      toast.error('Failed to load conversations');
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadConversations();
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentConversationId) return;

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    const unsubscribe = base44.agents.subscribeToConversation(currentConversationId, (data) => {
      setMessages(data.messages || []);
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [currentConversationId]);

  const handleNewConversation = async () => {
    try {
      const newConv = await base44.agents.createConversation({
        agent_name: agentName,
        metadata: {
          name: `Chat ${format(new Date(), 'MMM d, HH:mm')}`,
          description: 'Business assistant conversation'
        }
      });
      
      setConversations(prev => [newConv, ...prev]);
      setCurrentConversationId(newConv.id);
      setMessages([]);
      toast.success('New conversation created');
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast.error('Failed to create new conversation');
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !currentConversationId || isSending) return;

    const messageContent = inputMessage.trim();
    setInputMessage('');
    setIsSending(true);

    try {
      const conversation = conversations.find(c => c.id === currentConversationId);
      if (!conversation) {
        toast.error('Conversation not found');
        return;
      }

      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: messageContent
      });

      await loadConversations();
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteConversation = async (convId) => {
    const confirmed = window.confirm('Delete this conversation? This action cannot be undone.');
    if (!confirmed) return;

    try {
      setConversations(prev => prev.filter(c => c.id !== convId));
      
      if (currentConversationId === convId) {
        const remaining = conversations.filter(c => c.id !== convId);
        if (remaining.length > 0) {
          setCurrentConversationId(remaining[0].id);
          setMessages(remaining[0].messages || []);
        } else {
          setCurrentConversationId(null);
          setMessages([]);
        }
      }
      
      toast.success('Conversation deleted');
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      toast.error('Failed to delete conversation');
    }
  };

  return (
    <div className="flex bg-slate-50" style={{ height: 'calc(100vh - 0px)' }}>
      {/* Sidebar - Conversations List */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-violet-100 rounded-lg">
                <Bot className="w-6 h-6 text-violet-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">AI Assistant</h2>
                <p className="text-xs text-slate-500">Business Secretary</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Button
              onClick={handleNewConversation}
              className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2"
              size="sm"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </Button>
            
            <a 
              href={whatsappURL} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block"
            >
              <Button
                variant="outline"
                className="w-full gap-2 bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                size="sm"
              >
                <MessageSquare className="w-4 h-4" />
                Connect WhatsApp
              </Button>
            </a>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <div className="text-center py-8 px-4">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No conversations yet</p>
              <p className="text-xs text-slate-400 mt-1">Start a new chat to begin</p>
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map(conv => {
                const isActive = conv.id === currentConversationId;
                const lastMessage = conv.messages?.[conv.messages.length - 1];
                
                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setCurrentConversationId(conv.id);
                      setMessages(conv.messages || []);
                    }}
                    className={cn(
                      "p-3 rounded-lg cursor-pointer transition-all group relative",
                      isActive 
                        ? "bg-indigo-50 border border-indigo-200" 
                        : "hover:bg-slate-50 border border-transparent"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          isActive ? "text-indigo-900" : "text-slate-900"
                        )}>
                          {conv.metadata?.name || 'Untitled Chat'}
                        </p>
                        {lastMessage && (
                          <p className="text-xs text-slate-500 truncate mt-1">
                            {lastMessage.content?.substring(0, 50)}...
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1">
                          {conv.created_date && format(parseISO(conv.created_date), 'MMM d, HH:mm')}
                        </p>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(conv.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentConversationId ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Business Secretary</h3>
                    <p className="text-xs text-slate-500">AI assistant for work orders, projects, and more</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <Sparkles className="w-3 h-3" />
                    AI Powered
                  </Badge>
                  
                  <a 
                    href={whatsappURL} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                    >
                      <MessageSquare className="w-4 h-4" />
                      WhatsApp
                    </Button>
                  </a>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                      <Bot className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                      Hi! I'm your Business Secretary
                    </h3>
                    <p className="text-slate-600 mb-4">
                      I can help you with work orders, projects, customers, tasks, and more.
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-left">
                      <div className="bg-white border border-slate-200 rounded-lg p-3">
                        <p className="text-xs font-medium text-slate-700 mb-1">📋 Work Orders</p>
                        <p className="text-[10px] text-slate-500">Create, update, and manage</p>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-lg p-3">
                        <p className="text-xs font-medium text-slate-700 mb-1">🏢 Projects</p>
                        <p className="text-[10px] text-slate-500">Track and organize</p>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-lg p-3">
                        <p className="text-xs font-medium text-slate-700 mb-1">👥 Customers</p>
                        <p className="text-[10px] text-slate-500">Manage client data</p>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-lg p-3">
                        <p className="text-xs font-medium text-slate-700 mb-1">✅ Quick Tasks</p>
                        <p className="text-[10px] text-slate-500">Create and update</p>
                      </div>
                    </div>
                    
                    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-700 mb-2">
                        <MessageSquare className="w-4 h-4" />
                        <p className="text-sm font-medium">Chat on WhatsApp</p>
                      </div>
                      <p className="text-xs text-green-600 mb-3">
                        Connect your WhatsApp to chat with your assistant anytime, anywhere!
                      </p>
                      <a 
                        href={whatsappURL} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <Button
                          size="sm"
                          className="w-full bg-green-600 hover:bg-green-700 gap-2"
                        >
                          <MessageSquare className="w-4 h-4" />
                          Connect WhatsApp
                        </Button>
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => (
                    <MessageBubble
                      key={index}
                      message={message}
                      user={currentUser}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Area */}
            <div className="bg-white border-t border-slate-200 p-4">
              <div className="flex gap-3">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ask me anything about your business..."
                  className="flex-1"
                  disabled={isSending}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isSending}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 text-center">
                AI can make mistakes. Verify important information.
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-slate-50">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                <Bot className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Welcome to AI Assistant
              </h3>
              <p className="text-slate-600 mb-4">
                Start a new conversation to begin chatting with your business secretary
              </p>
              <Button
                onClick={handleNewConversation}
                className="bg-indigo-600 hover:bg-indigo-700 gap-2"
              >
                <Plus className="w-4 h-4" />
                Start New Chat
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}