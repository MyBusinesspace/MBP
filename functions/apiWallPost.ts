// import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// WallPost API
// - Uses query param ?action= (list|get|create|update|delete)
// - Auth: requires `x-user-id` header and does NOT use base44.auth.me()
// - Body: JSON for create/update

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const action = (url.searchParams.get('action') || '').toLowerCase();

  // Header-based auth (as requested): require x-user-id
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return Response.json({ error: 'Unauthorized: missing x-user-id header' }, { status: 401 });
  }

  // Initialize Base44 client from request (do not call base44.auth.me())
  const base44 = createClientFromRequest(req);

  try {
    if (!action) {
      return Response.json({ error: 'Missing action. Use ?action=list|get|create|update|delete' }, { status: 400 });
    }

    // Parse body when needed
    const method = req.method.toUpperCase();
    const needsBody = action === 'create' || action === 'update';
    // let body = null;

    // في بداية الدالة (Deno)
let body = {};
if (req.method === "POST" || req.method === "PUT") {
  try {
    const rawBody = await req.text(); // قراءة النص الخام أولاً
    body = JSON.parse(rawBody);      // تحويله يدوياً للتأكد
  } catch (e) {
    console.error("Parsing error:", e);
    // لا ترجع خطأ هنا، دع الـ logic يتعامل مع الجسم الفارغ
  }
}

    // if (needsBody) {
    //   try {
    //     body = await req.json();
    //   } catch {
    //     return Response.json({ error: 'Invalid or missing JSON body' }, { status: 400 });
    //   }
    // }

    switch (action) {



// case 'list': {
//   const limitParam = url.searchParams.get('limit');
//   const limit = Math.max(1, Math.min(parseInt(limitParam || '50', 10) || 50, 500));

//   const items = await base44.asServiceRole.entities.WallPost.filter({}, '-created_date', limit);

//   const userIds = new Set();
  
//   // وظيفة للتحقق من أن المعرف هو ObjectId صالح (24 حرف hex)
//   const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

//   items.forEach(item => {
//     if (isValidObjectId(item.created_by_id)) userIds.add(item.created_by_id);
//     (item.likes_user_ids || []).forEach(id => {
//       if (isValidObjectId(id)) userIds.add(id);
//     });
//     (item.comments || []).forEach(c => {
//       if (isValidObjectId(c.user_id)) userIds.add(c.user_id);
//     });
//   });

//   const users = await base44.asServiceRole.entities.User.filter({
//     id: { $in: Array.from(userIds) }
//   });

//   const userMap = {};
//   users.forEach(u => { userMap[u.id] = u; });

//   const enrichedItems = items.map(item => ({
//     ...item,
//     user: userMap[item.created_by_id] || null,
//     likes_users: (item.likes_user_ids || []).map(id => userMap[id] || null),
//     comments: (item.comments || []).map(c => ({
//       ...c,
//       user: userMap[c.user_id] || null
//     }))
//   }));

//   return Response.json({ success: true, data: enrichedItems });
// }

case 'list': {
  const limitParam = url.searchParams.get('limit');
  const limit = Math.max(1, Math.min(parseInt(limitParam || '50', 10) || 50, 500));

  const items = await base44.asServiceRole.entities.WallPost.filter({}, '-created_date', limit);

  const userIds = new Set();
  
  const isValidObjectId = (id) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);

  items.forEach(item => {
    // التحقق من الحقل الجديد أولاً، ثم القديم كخيار بديل (Fallback)
    const authorId = item.created_by_user_id || item.created_by_id;
    if (isValidObjectId(authorId)) userIds.add(authorId);

    (item.likes_user_ids || []).forEach(id => {
      if (isValidObjectId(id)) userIds.add(id);
    });
    
    (item.comments || []).forEach(c => {
      if (isValidObjectId(c.user_id)) userIds.add(c.user_id);
    });
  });

  const users = await base44.asServiceRole.entities.User.filter({
    id: { $in: Array.from(userIds) }
  });

  const userMap = {};
  users.forEach(u => { userMap[u.id] = u; });

  const enrichedItems = items.map(item => {
    // تحديد أي المعرفات سنستخدم لجلب بيانات المستخدم
    const finalAuthorId = item.created_by_user_id || item.created_by_id;

    return {
      ...item,
      // جلب بيانات كاتب المنشور من الخريطة
      user: userMap[finalAuthorId] || null,
      likes_users: (item.likes_user_ids || []).map(id => userMap[id] || null),
      comments: (item.comments || []).map(c => ({
        ...c,
        user: userMap[c.user_id] || null
      }))
    };
  });

  return Response.json({ success: true, data: enrichedItems });
}
      case 'get': {
        const id = url.searchParams.get('id');
        if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
        const rows = await base44.entities.WallPost.filter({ id });
        const item = Array.isArray(rows) ? rows[0] : null;
        if (!item) return Response.json({ error: 'Not found' }, { status: 404 });
        return Response.json({ success: true, data: item });
      }

      // case 'create': {
      //   if (!body || typeof body !== 'object') {
      //     return Response.json({ error: 'Body must be a JSON object' }, { status: 400 });
      //   }
      //   // Pass-through fields to respect entity schema; do not force custom fields
      //   const created = await base44.asServiceRole.entities.WallPost.create(body);
      //   return Response.json({ success: true, data: created });
      // }
// case 'create': {
//   if (!body || typeof body !== 'object') {
//     return Response.json({ error: 'Body must be a JSON object' }, { status: 400 });
//   }

//   const { title, content, media_items = [], ...rest } = body;
//   if (!title) return Response.json({ error: 'Field title is required' }, { status: 400 });

//   const finalMediaItems = [];

//   for (const item of media_items) {
//     if (item.url) {
//       finalMediaItems.push(item);
//       continue;
//     }

//     // --- التعديل هنا: التعامل مع الـ Base64 ---
//     if (item.file) {
//       try {
//         // تحويل الـ Base64 إلى Uint8Array ثم إلى Blob
//         const binaryString = atob(item.file);
//         const bytes = new Uint8Array(binaryString.length);
//         for (let i = 0; i < binaryString.length; i++) {
//           bytes[i] = binaryString.charCodeAt(i);
//         }
        
//         // إنشاء ملف وهمي ليقبله الـ SDK
//         const blob = new Blob([bytes], { type: item.type === 'video' ? 'video/mp4' : 'image/jpeg' });
//         const fileToUpload = new File([blob], "upload.jpg", { type: blob.type });

//         const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({
//           file: fileToUpload,
//         });

//         if (!uploadResult?.file_url) throw new Error('Upload failed');

//         finalMediaItems.push({
//           url: uploadResult.file_url,
//           type: item.type || 'image',
//         });
//       } catch (e) {
//         return Response.json({ error: `Failed to process media: ${e.message}` }, { status: 500 });
//       }
//     }
//   }

//   const created = await base44.asServiceRole.entities.WallPost.create({
//     title,
//     content,
//     media_items: finalMediaItems,
//     ...rest,
//   });

//   return Response.json({ success: true, data: created });
// }
case 'create': {
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Body must be a JSON object' }, { status: 400 });
  }

  const { title, content, media_items = [] } = body;
  if (!title) return Response.json({ error: 'Field title is required' }, { status: 400 });

  const finalMediaItems = [];
  // ... (نفس كود معالجة الصور السابق) ...
  for (const item of media_items) {
    if (item.url) { finalMediaItems.push(item); continue; }
    if (item.file) {
      try {
        const binaryString = atob(item.file);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) { bytes[i] = binaryString.charCodeAt(i); }
        const blob = new Blob([bytes], { type: item.type === 'video' ? 'video/mp4' : 'image/jpeg' });
        const fileToUpload = new File([blob], "upload.jpg", { type: blob.type });
        const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file: fileToUpload });
        if (uploadResult?.file_url) finalMediaItems.push({ url: uploadResult.file_url, type: item.type || 'image' });
      } catch (e) { console.error("Upload error", e); }
    }
  }

  // التنظيف: نرسل فقط الحقول التي نحتاجها ونحدد صاحب المنشور
  const cleanData = {
    title,
    content,
    media_items: finalMediaItems,
    created_by_id: userId,
    created_by_user_id: userId,
    likes_user_ids: [],
    comments: [],
    created_date: new Date().toISOString()
  };

  const created = await base44.asServiceRole.entities.WallPost.create(cleanData);
  return Response.json({ success: true, data: created });
}

      case 'update': {
        const id = url.searchParams.get('id') || body?.id;
        if (!id) return Response.json({ error: 'Missing id (query or body.id)' }, { status: 400 });
        const updates = body?.data ?? body;
        if (!updates || typeof updates !== 'object') {
          return Response.json({ error: 'Missing update data (body or body.data)' }, { status: 400 });
        }
        const updated = await base44.entities.WallPost.update(id, updates);
        return Response.json({ success: true, data: updated });
      }

      case 'delete': {
        const id = url.searchParams.get('id');
        if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
        await base44.entities.WallPost.delete(id);
        return Response.json({ success: true, id });
      }

      
 case 'addcomment': {   // ← يجب أن يكون نفس الاسم تماماً
    if (!body || typeof body !== 'object') {
      return Response.json({ error: 'Body must be a JSON object' }, { status: 400 });
    }

    const { postId, content } = body;

    if (!postId || !content) {
      return Response.json({ error: 'Body must contain postId and content' }, { status: 400 });
    }

    const posts = await base44.asServiceRole.entities.WallPost.filter({ id: postId });
    const post = Array.isArray(posts) ? posts[0] : null;

    if (!post) return Response.json({ error: 'Post not found' }, { status: 404 });

    const newComment = {
      user_id: userId,
      content,
      timestamp: new Date().toISOString()
    };

    const updatedPost = await base44.asServiceRole.entities.WallPost.update(postId, {
      comments: [...(post.comments || []), newComment]
    });

    return Response.json({ success: true, data: newComment });
  }



  case 'togglelike': {
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Body must be a JSON object' }, { status: 400 });
  }

  const { postId } = body;
  if (!postId) {
    return Response.json({ error: 'Body must contain postId' }, { status: 400 });
  }

  // جلب البوست
  const posts = await base44.asServiceRole.entities.WallPost.filter({ id: postId });
  const post = Array.isArray(posts) ? posts[0] : null;
  if (!post) return Response.json({ error: 'Post not found' }, { status: 404 });

  const likes = new Set(post.likes_user_ids || []);

     let action;
  if (likes.has(userId)) {
    likes.delete(userId); // إزالة اللايك
    action = 'unliked';
  } else {
    likes.add(userId); // إضافة اللايك
    action = 'liked';
  }

  const updatedPost = await base44.asServiceRole.entities.WallPost.update(postId, {
    likes_user_ids: Array.from(likes)
  });

  return Response.json({
    success: true,
    action,
    data: updatedPost
  });
}



      default:
        return Response.json({ error: `Unsupported action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error?.message || 'Internal error' }, { status: 500 });
  }
});