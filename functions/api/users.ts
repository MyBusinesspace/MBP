import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Main Users API Handler
 * 
 * Endpoints:
 * - GET /api/users - List all users
 * - GET /api/users/:id - Get single user
 * - POST /api/users - Create new user
 * - PUT /api/users/:id - Update user
 * - DELETE /api/users/:id - Delete user
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const method = req.method;

    // Authenticate user
    const currentUser = await base44.auth.me();
    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can manage users
    const isAdmin = currentUser.role === 'admin';

    // Route: GET /api/users - List all users
    if (method === 'GET' && pathParts.length === 2) {
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

    // Route: GET /api/users/:id - Get single user
    if (method === 'GET' && pathParts.length === 3) {
      const userId = pathParts[2];

      // Users can view their own profile, admins can view anyone
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

    // Route: POST /api/users - Create new user
    if (method === 'POST' && pathParts.length === 2) {
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

      // Check if user already exists
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

    // Route: PUT /api/users/:id - Update user
    if (method === 'PUT' && pathParts.length === 3) {
      const userId = pathParts[2];

      // Users can update their own profile, admins can update anyone
      if (!isAdmin && userId !== currentUser.id) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const body = await req.json();

      // Non-admins can't change certain fields
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

    // Route: DELETE /api/users/:id - Delete user
    if (method === 'DELETE' && pathParts.length === 3) {
      if (!isAdmin) {
        return Response.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
      }

      const userId = pathParts[2];

      // Can't delete yourself
      if (userId === currentUser.id) {
        return Response.json({ error: 'Cannot delete yourself' }, { status: 400 });
      }

      // Check if user exists
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

    return Response.json({ error: 'Endpoint not found' }, { status: 404 });

  } catch (error) {
    console.error('Users API Error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
});