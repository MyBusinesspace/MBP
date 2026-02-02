import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Quick Tasks CRUD API (Param-based)
 * 
 * Authentication: Requires X-User-ID header
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const method = req.method;
    const action = url.searchParams.get('action');

    // ✅ التحقق من المستخدم
    const userId = req.headers.get('X-User-ID');
    if (!userId) {
      return Response.json({ error: 'Unauthorized', message: 'X-User-ID header is required' }, { status: 401 });
    }

    const users = await base44.asServiceRole.entities.User.filter({ id: userId });
    const currentUser = users[0];
    if (!currentUser) {
      return Response.json({ error: 'Unauthorized', message: 'User not found' }, { status: 401 });
    }

    const isAdmin = currentUser.role === 'admin';

    // ✅ Action: List all tasks
// if (action === 'list' && method === 'GET') {
//       try {
//         const status = url.searchParams.get('status');
//         const departmentId = url.searchParams.get('department_id');
//         const customerId = url.searchParams.get('customer_id');
//         const assignedToUserId = url.searchParams.get('assigned_to_user_id');
//         const assignedToTeamId = url.searchParams.get('assigned_to_team_id');
//         const archived = url.searchParams.get('archived');
//         const isDraft = url.searchParams.get('is_draft');
//         const sort = url.searchParams.get('sort') || '-created_date';
//         const limit = parseInt(url.searchParams.get('limit') || '1000');

//         let filters = {};
//         if (status) filters.status = status;
//         if (departmentId) filters.department_id = departmentId;
//         if (customerId) filters.customer_id = customerId;
//         if (archived !== null) filters.archived = archived === 'true';
//         if (isDraft !== null) filters.is_draft = isDraft === 'true';

//         let tasks = Object.keys(filters).length > 0
//           ? await base44.asServiceRole.entities.QuickTask.filter(filters, sort, limit)
//           : await base44.asServiceRole.entities.QuickTask.list(sort, limit);

//         if (assignedToUserId)
//           tasks = tasks.filter(t => t.assigned_to_user_ids?.includes(assignedToUserId));
//         if (assignedToTeamId)
//           tasks = tasks.filter(t => t.assigned_to_team_ids?.includes(assignedToTeamId));

//         // 🧩 جلب أسماء المستخدمين
//         const allUserIds = new Set();
//         tasks.forEach(t => {
//           (t.assigned_to_user_ids || []).forEach(id => allUserIds.add(id));
//           (t.working_on_by_user_ids || []).forEach(id => allUserIds.add(id));
//         });

//         let userMap = {};
//         if (allUserIds.size > 0) {
//           const userList = await base44.asServiceRole.entities.User.filter({
//             id: { $in: Array.from(allUserIds) }
//           });
//           userMap = Object.fromEntries(userList.map(u => [u.id, u.full_name || u.email || u.id]));
//         }

//         // 🧩 استبدال المعرّفات بالأسماء
//         const enrichedTasks = tasks.map(t => ({
//           ...t,
//           assigned_to_users: (t.assigned_to_user_ids || []).map(id => userMap[id] || id),
//           working_on_by_users: (t.working_on_by_user_ids || []).map(id => userMap[id] || id),
//         }));

//         return Response.json({ success: true, data: enrichedTasks, count: enrichedTasks.length });
//       } catch (error) {
//         console.error('Error listing tasks:', error);
//         return Response.json({ success: false, error: error.message }, { status: 500 });
//       }
//     }

//     // ✅ Action: Get single task
//     if (action === 'get' && method === 'GET') {
//       const taskId = url.searchParams.get('id_task');
//       if (!taskId) return Response.json({ error: 'id_task parameter is required' }, { status: 400 });

//       const tasks = await base44.asServiceRole.entities.QuickTask.filter({ id: taskId });
//       const task = tasks[0];
//       if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });

//       // 🧩 جلب المستخدمين المرتبطين
//       const allUserIds = new Set([
//         ...(task.assigned_to_user_ids || []),
//         ...(task.working_on_by_user_ids || [])
//       ]);

//       let userMap = {};
//       if (allUserIds.size > 0) {
//         const userList = await base44.asServiceRole.entities.User.filter({
//           id: { $in: Array.from(allUserIds) }
//         });
//         userMap = Object.fromEntries(userList.map(u => [u.id, u.full_name || u.email || u.id]));
//       }

//       const enrichedTask = {
//         ...task,
//         assigned_to_users: (task.assigned_to_user_ids || []).map(id => userMap[id] || id),
//         working_on_by_users: (task.working_on_by_user_ids || []).map(id => userMap[id] || id),
//       };

//       return Response.json({ success: true, data: enrichedTask });
//     }


    if (action === 'list' && method === 'GET') {
  try {
    const status = url.searchParams.get('status');
    const departmentId = url.searchParams.get('department_id');
    const customerId = url.searchParams.get('customer_id');
    const assignedToUserId = url.searchParams.get('assigned_to_user_id');
    const assignedToTeamId = url.searchParams.get('assigned_to_team_id');
    const archived = url.searchParams.get('archived');
    const isDraft = url.searchParams.get('is_draft');
    const sort = url.searchParams.get('sort') || '-created_date';
    const limit = parseInt(url.searchParams.get('limit') || '1000');

    let filters = {};
    if (status) filters.status = status;
    if (departmentId) filters.department_id = departmentId;
    if (customerId) filters.customer_id = customerId;
    if (archived !== null) filters.archived = archived === 'true';
    if (isDraft !== null) filters.is_draft = isDraft === 'true';

    let tasks = Object.keys(filters).length > 0
      ? await base44.asServiceRole.entities.QuickTask.filter(filters, sort, limit)
      : await base44.asServiceRole.entities.QuickTask.list(sort, limit);

    if (assignedToUserId)
      tasks = tasks.filter(t => t.assigned_to_user_ids?.includes(assignedToUserId));
    if (assignedToTeamId)
      tasks = tasks.filter(t => t.assigned_to_team_ids?.includes(assignedToTeamId));

    /* ================= USERS ================= */
    const allUserIds = new Set();
    tasks.forEach(t => {
      (t.assigned_to_user_ids || []).forEach(id => allUserIds.add(id));
      (t.working_on_by_user_ids || []).forEach(id => allUserIds.add(id));
    });

    let userMap = {};
    if (allUserIds.size > 0) {
      const userList = await base44.asServiceRole.entities.User.filter({
        id: { $in: Array.from(allUserIds) }
      });

      // ⬅️ نخزن الكائن كامل
      userMap = Object.fromEntries(
        userList.map(u => [u.id, u])
      );
    }

    /* ================= TEAMS ================= */
    const allTeamIds = new Set();
    tasks.forEach(t => {
      (t.assigned_to_team_ids || []).forEach(id => allTeamIds.add(id));
    });

    let teamMap = {};
    if (allTeamIds.size > 0) {
      const teamList = await base44.asServiceRole.entities.Team.filter({
        id: { $in: Array.from(allTeamIds) }
      });

      // ⬅️ نخزن الكائن كامل
      teamMap = Object.fromEntries(
        teamList.map(t => [t.id, t])
      );
    }

    /* ================= ENRICH ================= */
    const enrichedTasks = tasks.map(t => ({
      ...t,

      // 👤 مستخدمين كاملين
      assigned_to_users: (t.assigned_to_user_ids || []).map(
        id => userMap[id] || { id }
      ),

      working_on_by_users: (t.working_on_by_user_ids || []).map(
        id => userMap[id] || { id }
      ),

      // 👥 تيمات كاملة
      assigned_to_teams: (t.assigned_to_team_ids || []).map(
        id => teamMap[id] || { id }
      )
    }));

    return Response.json({
      success: true,
      data: enrichedTasks,
      count: enrichedTasks.length
    });
  } catch (error) {
    console.error('Error listing tasks:', error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}




  if (action === 'get' && method === 'GET') {
    const taskId = url.searchParams.get('id_task');
    if (!taskId)
      return Response.json(
        { error: 'id_task parameter is required' },
        { status: 400 }
      );

    const tasks = await base44.asServiceRole.entities.QuickTask.filter({ id: taskId });
    const task = tasks[0];
    if (!task)
      return Response.json({ error: 'Task not found' }, { status: 404 });

    /* ========== USERS ========== */
    const allUserIds = new Set([
      ...(task.assigned_to_user_ids || []),
      ...(task.working_on_by_user_ids || [])
    ]);

    let userMap = {};
    if (allUserIds.size > 0) {
      const userList = await base44.asServiceRole.entities.User.filter({
        id: { $in: Array.from(allUserIds) }
      });
      userMap = Object.fromEntries(
        userList.map(u => [u.id, u.full_name || u.email || u.id])
      );
    }

    /* ========== TEAMS ========== */
    let teamMap = {};
    if (task.assigned_to_team_ids?.length) {
      const teamList = await base44.asServiceRole.entities.Team.filter({
        id: { $in: task.assigned_to_team_ids }
      });
      teamMap = Object.fromEntries(
        teamList.map(t => [t.id, t.name || t.title || t.id])
      );
    }

    const enrichedTask = {
      ...task,
      assigned_to_users: (task.assigned_to_user_ids || []).map(
        id => userMap[id] || id
      ),
      working_on_by_users: (task.working_on_by_user_ids || []).map(
        id => userMap[id] || id
      ),
      assigned_to_teams: (task.assigned_to_team_ids || []).map(
        id => teamMap[id] || id
      )
    };

    return Response.json({ success: true, data: enrichedTask });
  }


    // ✅ Action: Create task
    if (action === 'create' && method === 'POST') {
      const body = await req.json();
      if (!body.title) return Response.json({ error: 'title is required' }, { status: 400 });

      const newTask = await base44.asServiceRole.entities.QuickTask.create({
        title: body.title,
        description: body.description || '',
        customer_id: body.customer_id || null,
        status: body.status || 'open',
        is_draft: body.is_draft || false,
        department_id: body.department_id || null,
        assigned_to_user_ids: body.assigned_to_user_ids || [],
        working_on_by_user_ids: body.working_on_by_user_ids || [],
        assigned_to_team_ids: body.assigned_to_team_ids || [],
        due_date: body.due_date || null,
        location: body.location || '',
        subtasks: body.subtasks || [],
        archived: body.archived || false,
        document_urls: body.document_urls || []
      });

      return Response.json({ success: true, data: newTask, message: 'Task created successfully' });
    }

    // ✅ Action: Update task
    if (action === 'update' && method === 'PUT') {
      const taskId = url.searchParams.get('id_task');
      if (!taskId) return Response.json({ error: 'id_task is required' }, { status: 400 });

      const body = await req.json();
      const updates = {};
      Object.keys(body).forEach(k => updates[k] = body[k]);

      const updatedTask = await base44.asServiceRole.entities.QuickTask.update(taskId, updates);
      return Response.json({ success: true, data: updatedTask, message: 'Task updated successfully' });
    }

    // ✅ Action: Delete task
    if (action === 'delete' && method === 'DELETE') {
      const taskId = url.searchParams.get('id_task');
      if (!taskId) return Response.json({ error: 'id_task is required' }, { status: 400 });

      await base44.asServiceRole.entities.QuickTask.delete(taskId);
      return Response.json({ success: true, message: 'Task deleted successfully' });
    }

    // ✅ Action: Assign users/teams
    if (action === 'assign' && method === 'PUT') {
      const taskId = url.searchParams.get('id_task');
      const userIdParam = url.searchParams.get('id_user');
      const teamIdParam = url.searchParams.get('id_team');

      if (!taskId) return Response.json({ error: 'id_task is required' }, { status: 400 });

      const tasks = await base44.asServiceRole.entities.QuickTask.filter({ id: taskId });
      const task = tasks[0];
      if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });

      const updates = {};
      if (userIdParam) {
        const users = new Set(task.assigned_to_user_ids || []);
        users.add(userIdParam);
        updates.assigned_to_user_ids = Array.from(users);
      }
      if (teamIdParam) {
        const teams = new Set(task.assigned_to_team_ids || []);
        teams.add(teamIdParam);
        updates.assigned_to_team_ids = Array.from(teams);
      }

      const updatedTask = await base44.asServiceRole.entities.QuickTask.update(taskId, updates);
      return Response.json({ success: true, data: updatedTask, message: 'Task assignments updated' });
    }

    // ✅ Action: Working-on toggle
    if (action === 'working-on' && method === 'PUT') {
      const taskId = url.searchParams.get('id_task');
      const targetUser = url.searchParams.get('id_user');
      const isWorking = url.searchParams.get('is_working_on') === 'true';

      if (!taskId || !targetUser)
        return Response.json({ error: 'id_task and id_user are required' }, { status: 400 });

      const tasks = await base44.asServiceRole.entities.QuickTask.filter({ id: taskId });
      const task = tasks[0];
      if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });

      let working = task.working_on_by_user_ids || [];
      if (isWorking) {
        if (!working.includes(targetUser)) working.push(targetUser);
      } else {
        working = working.filter(u => u !== targetUser);
      }

      const updatedTask = await base44.asServiceRole.entities.QuickTask.update(taskId, {
        working_on_by_user_ids: working
      });

      return Response.json({
        success: true,
        data: updatedTask,
        message: isWorking ? 'Started working on task' : 'Stopped working on task'
      });
    }

    // ✅ Action: Complete task
    if (action === 'complete' && method === 'PUT') {
      const taskId = url.searchParams.get('id_task');
      if (!taskId) return Response.json({ error: 'id_task is required' }, { status: 400 });

      const updatedTask = await base44.asServiceRole.entities.QuickTask.update(taskId, {
        status: 'done',
        completed_date: new Date().toISOString()
      });

      return Response.json({ success: true, data: updatedTask, message: 'Task marked as complete' });
    }

    // ✅ Action: Bulk delete
    if (action === 'bulk-delete' && method === 'PUT') {
      if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

      const body = await req.json();
      const { task_ids } = body;
      if (!task_ids?.length) return Response.json({ error: 'task_ids required' }, { status: 400 });

      await Promise.all(task_ids.map(id => base44.asServiceRole.entities.QuickTask.delete(id)));
      return Response.json({ success: true, message: `Deleted ${task_ids.length} tasks` });
    }

    // ✅ Action: Bulk archive
    if (action === 'bulk-archive' && method === 'PUT') {
      if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

      const body = await req.json();
      const { task_ids } = body;
      if (!task_ids?.length) return Response.json({ error: 'task_ids required' }, { status: 400 });

      await Promise.all(task_ids.map(id =>
        base44.asServiceRole.entities.QuickTask.update(id, { archived: true })
      ));
      return Response.json({ success: true, message: `Archived ${task_ids.length} tasks` });
    }

    // ❌ Default
    return Response.json({ error: 'Invalid action', available_actions: [
      'list','get','create','update','delete','assign','complete','working-on','bulk-delete','bulk-archive'
    ]}, { status: 400 });

  } catch (error) {
    console.error('QuickTasks API Error:', error);
    return Response.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
});
 