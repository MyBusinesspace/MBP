
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Chats & Messages CRUD API
 * 
 * Authentication: Requires X-User-ID header
 * 
 * Endpoints:
 * - GET /apiChats - List all chats for the authenticated user
 * - POST /apiChats - Create a new chat (private or group)
 * 
 * - GET /apiChats/{chatId} - Get details for a single chat
 * - PUT /apiChats/{chatId} - Update a chat (e.g., rename group)
 * - DELETE /apiChats/{chatId} - Delete a chat
 * 
 * - GET /apiChats/{chatId}/messages - List messages for a chat
 * - POST /apiChats/{chatId}/messages - Send a new message in a chat
 * 
 * - POST /apiChats/{chatId}/mark-as-read - Mark all messages in a chat as read
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const method = req.method;

    // ✅ Use `endpoint` query parameter instead of parsing URL path
    const endpoint = url.searchParams.get('endpoint') || '';
    const pathParts = endpoint.split('/').filter(Boolean);

    console.log('📍 Chats API:', method, 'endpoint:', endpoint, 'pathParts:', pathParts);

    // --- Authentication ---
    const userIdFromHeader = req.headers.get('X-User-ID');
    if (!userIdFromHeader) {
      return Response.json({ 
        error: 'Unauthorized',
        message: 'X-User-ID header is required'
      }, { status: 401 });
    }

    const users = await base44.asServiceRole.entities.User.filter({ id: userIdFromHeader });
    const currentUser = users[0];
    
    if (!currentUser) {
      return Response.json({ error: 'Unauthorized', message: 'User not found' }, { status: 401 });
    }
    const isAdmin = currentUser.role === 'admin';

    // --- Helper ---
    const isMemberOf = (chat) => {
      return chat.memberUserIds?.includes(currentUser.id) || isAdmin;
    };

    // --- Routing ---

    // Route: /apiChats/{chatId}/messages
    // if (pathParts.length === 2 && pathParts[1] === 'messages') {
    //   const chatId = pathParts[0];
    //   const chat = (await base44.asServiceRole.entities.Chat.filter({ id: chatId }))[0];

    //   if (!chat) return Response.json({ error: 'Chat not found' }, { status: 404 });
    //   if (!isMemberOf(chat)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    //   // GET messages
    //   if (method === 'GET') {
    //     const messages = await base44.asServiceRole.entities.Message.filter({ chatId: chatId }, '-created_date');
    //     return Response.json({ success: true, data: messages });
    //   }

    //   // POST new message
    //   if (method === 'POST') {
    //     const body = await req.json();
    //     if (!body.content) {
    //       return Response.json({ error: 'content is required' }, { status: 400 });
    //     }

    //     const newMessage = await base44.asServiceRole.entities.Message.create({
    //       chatId: chatId,
    //       content: body.content,
    //       fileUrls: body.fileUrls || [],
    //       type: body.fileUrls?.length > 0 ? 'file' : 'text',
    //     });
        
    //     // Update chat's last message info
    //     await base44.asServiceRole.entities.Chat.update(chatId, {
    //       lastMessageText: body.content.substring(0, 100),
    //       lastMessageTimestamp: new Date().toISOString()
    //     });

    //     return Response.json({ success: true, data: newMessage }, { status: 201 });
    //   }
    // }

// Route: /apiChats/{chatId}/messages
if ((pathParts.length === 2 && pathParts[1] === 'messages') ||
    (pathParts.length === 3 && pathParts[2] === 'messages')) {

    // chatId هو الجزء الذي يحتوي على المعرف
    const chatId = pathParts.length === 2 ? pathParts[0] : pathParts[1];
    
    const chat = (await base44.asServiceRole.entities.Chat.filter({ id: chatId }))[0];
    if (!chat) return Response.json({ error: 'Chat not found' }, { status: 404 });
    if (!isMemberOf(chat)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    if (method === 'GET') {
        const messages = await base44.asServiceRole.entities.Message.filter({ chatId: chatId }, '-created_date');
        return Response.json({ success: true, data: messages });
    }

    // if (method === 'POST') {
    //     const body = await req.json();
    //     if (!body.content) {
    //         return Response.json({ error: 'content is required' }, { status: 400 });
    //     }

    //     const newMessage = await base44.asServiceRole.entities.Message.create({
    //         chatId: chatId,
    //         content: body.content,
    //         fileUrls: body.fileUrls || [],
    //         type: body.fileUrls?.length > 0 ? 'file' : 'text',
    //     });

    //     await base44.asServiceRole.entities.Chat.update(chatId, {
    //         lastMessageText: body.content.substring(0, 100),
    //         lastMessageTimestamp: new Date().toISOString()
    //     });

    //     return Response.json({ success: true, data: newMessage }, { status: 201 });
    // }


// if (method === 'POST') {
//   const body = await req.json();
//   if (!body.content) {
//     return Response.json({ error: 'content is required' }, { status: 400 });
//   }

//   const newMessage = await base44.asServiceRole.entities.Message.create({
//     chatId: chatId,
//     content: body.content,
//     fileUrls: body.fileUrls || [],
//     type: body.fileUrls?.length > 0 ? 'file' : 'text',
//     // ✅ حقل مخصص لهوية المرسل الحقيقي
//     created_by_id: userIdFromHeader,
//      sender_user_id: userIdFromHeader
//   });

//   await base44.asServiceRole.entities.Chat.update(chatId, {
//     lastMessageText: body.content.substring(0, 100),
//     lastMessageTimestamp: new Date().toISOString()
//   });

//   return Response.json({ success: true, data: newMessage }, { status: 201 });
// }

if (method === 'POST') {
  try {
    const body = await req.json();

    if (!chatId) {
      return Response.json({ error: 'chatId is required' }, { status: 400 });
    }

    if (!body.content && !body.callType) {
      return Response.json({ error: 'content or callType is required' }, { status: 400 });
    }

    // تحديد نوع الرسالة
    var messageType = 'text';
    var callStatus = null; // فقط للفيديو أو الصوت
    var callUrl = null;

    if (body.fileUrls && body.fileUrls.length > 0) {
      messageType = 'file';
    } else if (body.callType === 'video') {
      messageType = 'video_call';
      callStatus = 'pending';
    } else if (body.callType === 'audio') {
      messageType = 'voice_call';
      callStatus = 'pending';
    }

    // إذا كانت مكالمة فيديو أو صوت، توليد رابط Daily.co
    if (messageType === 'video_call' || messageType === 'voice_call') {
      var DAILY_API_KEY = Deno.env.get('DAILY_API_KEY');
      if (!DAILY_API_KEY) {
        return Response.json({ error: 'Daily.co API key not configured' }, { status: 500 });
      }

      var roomName = 'chat-' + chatId + '-' + Date.now();
      var dailyResponse = await fetch('https://api.daily.co/v1/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + DAILY_API_KEY
        },
        body: JSON.stringify({
          name: roomName,
          privacy: 'public',
          properties: {
            enable_screenshare: true,
            enable_chat: true,
            enable_knocking: false,
            enable_prejoin_ui: false,
            start_video_off: body.callType === 'audio',
            start_audio_off: false,
            max_participants: 50,
            exp: Math.floor(Date.now() / 1000) + 3600,
            eject_at_room_exp: true
          }
        })
      });

      if (!dailyResponse.ok) {
        const errorText = await dailyResponse.text();
        console.error('Daily.co API error:', errorText);
        return Response.json({ error: 'Failed to create video room' }, { status: 500 });
      }

      var roomData = await dailyResponse.json();
      callUrl = roomData.url;

      if (!body.content) {
        body.content = (messageType === 'video_call' ? '📹 Video' : '🎧 Audio') + ' call started\n' + callUrl;
      } else {
        body.content += '\n' + callUrl;
      }
    }

    // إنشاء الرسالة
    var newMessage = await base44.asServiceRole.entities.Message.create({
      chatId: chatId,
      content: body.content || '',
      fileUrls: body.fileUrls || [],
      type: messageType,
      sender_user_id: userIdFromHeader,
      created_by_id: userIdFromHeader,
      message_category: messageType,
      call_status: callStatus,
      call_url: callUrl
    });

    // تحديث آخر رسالة
    await base44.asServiceRole.entities.Chat.update(chatId, {
      lastMessageText: body.content?.substring(0, 100) ||
                       (messageType === 'video_call' ? '📹 Video Call' : messageType === 'voice_call' ? '🎧 Voice Call' : ''),
      lastMessageTimestamp: new Date().toISOString()
    });

    return Response.json({ success: true, data: newMessage }, { status: 201 });

  } catch (error) {
    console.error('Error creating message:', error);
    return Response.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}



}

    // Route: /apiChats/{chatId}/mark-as-read
    if (pathParts.length === 2 && pathParts[1] === 'mark-as-read') {
      const chatId = pathParts[0];
      if (method === 'POST') {
        const chat = (await base44.asServiceRole.entities.Chat.filter({ id: chatId }))[0];
        if (!chat || !isMemberOf(chat)) return Response.json({ error: 'Not Found or Forbidden' }, { status: 404 });

        const unreadMessages = await base44.asServiceRole.entities.Message.filter({ chatId });
        const messagesToUpdate = unreadMessages.filter(msg => 
            msg.created_by !== currentUser.email && 
            !msg.read_by_user_ids?.includes(currentUser.id)
        );

        for (const msg of messagesToUpdate) {
            const updatedReadBy = [...(msg.read_by_user_ids || []), currentUser.id];
            await base44.asServiceRole.entities.Message.update(msg.id, { read_by_user_ids: updatedReadBy });
        }

        return Response.json({ success: true, message: `${messagesToUpdate.length} messages marked as read.` });
      }
    }

    // Route: /apiChats/{chatId}
    if (pathParts.length === 1) {
      const chatId = pathParts[0];
      const chat = (await base44.asServiceRole.entities.Chat.filter({ id: chatId }))[0];
      
      if (!chat) return Response.json({ error: 'Chat not found' }, { status: 404 });
      if (!isMemberOf(chat)) return Response.json({ error: 'Forbidden' }, { status: 403 });

      // GET single chat
      if (method === 'GET') {
        return Response.json({ success: true, data: chat });
      }

      // PUT update chat
      if (method === 'PUT') {
        const body = await req.json();
        const updates = {};
        if (body.name !== undefined) updates.name = body.name;
        if (body.groupImageUrl !== undefined) updates.groupImageUrl = body.groupImageUrl;

        const updatedChat = await base44.asServiceRole.entities.Chat.update(chatId, updates);
        return Response.json({ success: true, data: updatedChat });
      }

      // DELETE chat
      if (method === 'DELETE') {
        const messages = await base44.asServiceRole.entities.Message.filter({ chatId });
        for (const msg of messages) {
          await base44.asServiceRole.entities.Message.delete(msg.id);
        }
        await base44.asServiceRole.entities.Chat.delete(chatId);
        return Response.json({ success: true, message: 'Chat and all messages deleted' });
      }
    }

    // Route: /apiChats
    if (pathParts.length === 0) {
      // GET list of chats for user
      // if (method === 'GET') {
      //   const allChats = await base44.asServiceRole.entities.Chat.list('-lastMessageTimestamp');
      //   const myChats = allChats.filter(isMemberOf);
      //   return Response.json({ success: true, data: myChats, count: myChats.length });
      // }
  // if (method === 'GET') {
  //   // ✅ Return only chats where current user is a member
  //   const myChats = await base44.asServiceRole.entities.Chat.filter(
  //     { memberUserIds: currentUser.id }, 
  //     '-lastMessageTimestamp'
  //   );
  //   return Response.json({ success: true, data: myChats, count: myChats.length });
  // }

  if (method === 'GET') {
  // ✅ 1. جلب جميع الدردشات الخاصة بالمستخدم الحالي
  const myChats = await base44.asServiceRole.entities.Chat.filter(
    { memberUserIds: currentUser.id },
    '-lastMessageTimestamp'
  );

  // ✅ 2. تجميع كل المعرفات الفريدة للمستخدمين المشاركين في هذه الدردشات
  const allMemberIds = Array.from(
    new Set(myChats.flatMap(chat => chat.memberUserIds || []))
  );

  // ✅ 3. جلب بيانات كل هؤلاء المستخدمين دفعة واحدة
  const allMembers = await base44.asServiceRole.entities.User.filter({
    id: allMemberIds
  });

  // ✅ 4. تحويلها إلى خريطة (Map) لتسريع الوصول
  const usersMap = new Map(
    allMembers.map(u => [u.id, {

      
      id: u.id,
      first_name: u.first_name,
      last_name: u.last_name,
      // full_name: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
      full_name: (
  u.first_name && u.last_name
    ? `${u.first_name} ${u.last_name}`.trim()
    : u.full_name
).trim(),
avatar: u.avatar_url,
// full_name: u.full_name,

      email: u.email
    }])

    
  );

  // ✅ 5. إرفاق بيانات الأعضاء مع كل دردشة
  const enrichedChats = myChats.map(chat => {
    const members = (chat.memberUserIds || [])
      .map(id => usersMap.get(id))
      .filter(Boolean);

    // إذا كانت دردشة خاصة وليس لها اسم، نضع اسم الطرف الآخر
    let displayName = chat.name;
    if (chat.type === 'private' && !chat.name && members.length === 2) {
      const other = members.find(m => m.id !== currentUser.id);
      displayName = other?.full_name || displayName;
    }

    return {
      ...chat,
      name: displayName,
      members
    };
  });

  return Response.json({
    success: true,
    data: enrichedChats,
    count: enrichedChats.length
  });
}


      // POST create new chat
      if (method === 'POST') {
        const body = await req.json();
        if (!body.type || !body.memberUserIds) {
          return Response.json({ error: 'type and memberUserIds are required' }, { status: 400 });
        }
        
        if (!body.memberUserIds.includes(currentUser.id)) {
            body.memberUserIds.push(currentUser.id);
        }

        let chatName = body.name;
        if (body.type === 'private' && body.memberUserIds.length === 2 && !chatName) {
            const otherUserId = body.memberUserIds.find(id => id !== currentUser.id);
            const otherUser = (await base44.asServiceRole.entities.User.filter({ id: otherUserId }))[0];
            chatName = otherUser ? `${otherUser.first_name || ''} ${otherUser.last_name || ''}`.trim() : 'Private Chat';
        } else if (body.type === 'group' && !chatName) {
            return Response.json({ error: 'name is required for group chats' }, { status: 400 });
        }

        const newChat = await base44.asServiceRole.entities.Chat.create({
          name: chatName,
          type: body.type,
          memberUserIds: body.memberUserIds,
          groupImageUrl: body.groupImageUrl || null,
          adminUserIds: body.type === 'group' ? [currentUser.id] : []
        });

        return Response.json({ success: true, data: newChat }, { status: 201 });
      }
    }

    return Response.json({ 
      error: 'Endpoint not found',
      debugInfo: { method, endpoint, pathParts }
    }, { status: 404 });

  } catch (error) {
    console.error('API Chats Error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
});
