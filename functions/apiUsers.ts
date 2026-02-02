import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Main Users API Handler
 * 
 * Access URL: https://chronos-8ee5fab2.base44.app/functions/apiUsers
 * 
 * Endpoints (handled internally via routing):
 * - GET /api/apps/{app_id}/functions/apiUsers (list all users)
 * - GET /api/apps/{app_id}/functions/apiUsers?user_id={id} (get single user)
 * - POST /api/apps/{app_id}/functions/apiUsers (create user)
 * - PUT /api/apps/{app_id}/functions/apiUsers?user_id={id} (update user)
 * - DELETE /api/apps/{app_id}/functions/apiUsers?user_id={id} (delete user)
      */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const method = req.method;
    const userId = url.searchParams.get('user_id');

    // Authenticate user
    // const currentUser = await base44.auth.me();
    // if (!currentUser) {
    //   return Response.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // const isAdmin = currentUser.role === 'admin';
  const isAdmin = true;
    // GET single user
    if (method === 'GET' && userId) {
      if (!isAdmin && userId !== currentUser.id) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const users = await base44.asServiceRole.entities.User.filter({ id: userId });
      const user = users[0];

      if (!user) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }

      return Response.json({
        success: true,
        data: user
      });
    }

    // GET all users (list)
    if (method === 'GET') {
      if (!isAdmin) {
        return Response.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
      }

      const archived = url.searchParams.get('archived') === 'true';
      const teamId = url.searchParams.get('team_id');
      const department = url.searchParams.get('department');
      const branchId = url.searchParams.get('branch_id');

      let filters = {};
      if (archived !== null) filters.archived = archived;
      if (teamId) filters.team_id = teamId;
      if (department) filters.department = department;
      if (branchId) filters.branch_id = branchId;

      const users = Object.keys(filters).length > 0
        ? await base44.asServiceRole.entities.User.filter(filters)
        : await base44.asServiceRole.entities.User.list('sort_order');

      return Response.json({
        success: true,
        data: users,
        count: users.length
      });
    }

    // POST - Create user
    if (method === 'POST') {
      if (!isAdmin) {
        return Response.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
      }

      const body = await req.json();
      const {
        email,
        first_name,
        last_name,
        full_name,
        role = 'user',
        job_role,
        team_id,
        department,
        branch_id,
        employee_number,
        mobile_phone,
        status = 'Active'
      } = body;

      if (!email) {
        return Response.json({ error: 'Email is required' }, { status: 400 });
      }

      const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
      if (existingUsers.length > 0) {
        return Response.json({ error: 'User with this email already exists' }, { status: 409 });
      }

      const newUser = await base44.asServiceRole.entities.User.create({
        email,
        first_name,
        last_name,
        full_name: full_name || `${first_name || ''} ${last_name || ''}`.trim(),
        role,
        job_role,
        team_id,
        department,
        branch_id,
        employee_number,
        mobile_phone,
        status,
        archived: false, 
        sort_order: 0
      });

      return Response.json({
        success: true,
        data: newUser,
        message: 'User created successfully'
      }, { status: 201 });
    }

    // PUT - Update user
    if (method === 'PUT' && userId) {
      if (!isAdmin && userId !== currentUser.id) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const body = await req.json();

      if (!isAdmin) {
        delete body.role;
        delete body.employee_number;
        delete body.archived;
        delete body.can_delete_admins;
        delete body.can_manage_documents;
      }

      const updatedUser = await base44.asServiceRole.entities.User.update(userId, body);

      return Response.json({
        success: true,
        data: updatedUser,
        message: 'User updated successfully'
      });
    }

    // DELETE - Delete user
    if (method === 'DELETE' && userId) {
      if (!isAdmin) {
        return Response.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
      }

      if (userId === currentUser.id) {
        return Response.json({ error: 'Cannot delete yourself' }, { status: 400 });
      }

      const users = await base44.asServiceRole.entities.User.filter({ id: userId });
      if (users.length === 0) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }

      await base44.asServiceRole.entities.User.delete(userId);

      return Response.json({
        success: true,
        message: 'User deleted successfully'
      });
    }

    return Response.json({ error: 'Invalid request' }, { status: 400 });

  } catch (error) {
    console.error('Users API Error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
});