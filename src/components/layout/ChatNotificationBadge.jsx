import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Chat, Message } from '@/entities/all';
import { useData } from '../DataProvider';

// Cache global para evitar múltiples llamadas
let cachedUnreadCount = 0;
let lastFetchTimestamp = 0;
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutos de cache
const REFRESH_INTERVAL = 3 * 60 * 1000; // Refresh cada 3 minutos

export default function ChatNotificationBadge() {
  const { currentUser } = useData();
  const [unreadCount, setUnreadCount] = useState(cachedUnreadCount);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    let intervalId = null;
    
    const loadUnreadCount = async (isInitialLoad = false) => {
      if (!currentUser?.id) {
        setIsLoading(false);
        return;
      }

      // ✅ Si está en cache y es reciente, usar cache
      const now = Date.now();
      if (!isInitialLoad && now - lastFetchTimestamp < CACHE_DURATION) {
        console.log('💾 Using cached unread count:', cachedUnreadCount);
        setUnreadCount(cachedUnreadCount);
        return;
      }

      // ✅ Si ya está cargando, no hacer otra llamada
      if (isLoading) {
        console.log('⏸️ Already loading, skipping...');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // ✅ Timeout más corto para evitar esperas largas
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 8000)
        );

        const chatsPromise = Chat.list();
        
        let chats;
        try {
          chats = await Promise.race([chatsPromise, timeoutPromise]);
        } catch (timeoutError) {
          console.warn('⏰ Chat loading timeout, using cached value');
          if (mounted) {
            setUnreadCount(cachedUnreadCount);
            setIsLoading(false);
          }
          return;
        }

        if (!mounted) return;

        const userChats = (chats || []).filter(chat => 
          chat.memberUserIds?.includes(currentUser.id)
        );

        let totalUnread = 0;
        let failedChatsCount = 0;

        // ✅ Procesar máximo 10 chats para evitar rate limit
        const chatsToProcess = userChats.slice(0, 10);

        for (const chat of chatsToProcess) {
          try {
            // ✅ Delay pequeño entre llamadas para evitar rate limit
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const messages = await Message.filter({ chatId: chat.id });
            const unreadInChat = (messages || []).filter(msg => 
              msg.created_by !== currentUser.email && 
              !msg.read_by_user_ids?.includes(currentUser.id)
            ).length;
            totalUnread += unreadInChat;
          } catch (msgError) {
            failedChatsCount++;
            console.warn('⚠️ Failed to load messages for chat:', chat.id);
            
            // ✅ Si falla por rate limit, detener y usar cache
            if (msgError.message?.includes('Rate limit') || msgError.response?.status === 429) {
              console.warn('🚫 Rate limit hit, using cached value');
              if (mounted) {
                setUnreadCount(cachedUnreadCount);
                setIsLoading(false);
              }
              return;
            }
          }
        }

        if (mounted) {
          cachedUnreadCount = totalUnread;
          lastFetchTimestamp = Date.now();
          setUnreadCount(totalUnread);
          
          if (failedChatsCount > 0) {
            console.warn(`⚠️ ${failedChatsCount} chats failed to load`);
          }
        }
      } catch (error) {
        console.warn('❌ Failed to load chat notifications:', error.message);
        
        if (mounted) {
          setError(error);
          // ✅ En caso de error, usar valor cacheado
          setUnreadCount(cachedUnreadCount);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // ✅ Carga inicial solo si no hay cache reciente
    const now = Date.now();
    const needsInitialLoad = now - lastFetchTimestamp >= CACHE_DURATION;
    
    if (needsInitialLoad) {
      loadUnreadCount(true);
    } else {
      setUnreadCount(cachedUnreadCount);
    }
    
    // ✅ Refresh cada 3 minutos (en lugar de 30 segundos)
    intervalId = setInterval(() => {
      loadUnreadCount(false);
    }, REFRESH_INTERVAL);

    return () => {
      mounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [currentUser?.id]);

  // ✅ No mostrar nada si está cargando, hay error, o no hay mensajes
  if (isLoading || error || unreadCount === 0) {
    return null;
  }

  return (
    <Badge 
      variant="destructive" 
      className="absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center px-1 text-xs font-bold animate-pulse"
    >
      {unreadCount > 99 ? '99+' : unreadCount}
    </Badge>
  );
}