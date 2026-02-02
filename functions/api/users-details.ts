import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * User Details API Handler
 * 
 * Endpoints:
 * - GET /api/users/:id/details - Get user details
 * - PUT /api/users/:id/details - Update user details
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

    const userId = pathParts[2];
    const isAdmin = currentUser.role === 'admin';
    const isOwnProfile = userId === currentUser.id;

    if (!isAdmin && !isOwnProfile) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Route: GET /api/users/:id/details
    if (method === 'GET') {
      const users = await base44.asServiceRole.entities.User.filter({ id: userId });
      const user = users[0];

      if (!user) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }

      // Return detailed user information
      const details = {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        job_role: user.job_role,
        employee_number: user.employee_number,
        mobile_phone: user.mobile_phone,
        country_code: user.country_code,
        birthday: user.birthday,
        gender: user.gender,
        employment_start_date: user.employment_start_date,
        department: user.department,
        team_id: user.team_id,
        branch_id: user.branch_id,
        direct_manager: user.direct_manager,
        responsibility: user.responsibility,
        timezone: user.timezone,
        city: user.city,
        quick_note: user.quick_note,
        role: user.role,
        status: user.status,
        archived: user.archived,
        created_date: user.created_date
      };

      return Response.json({
        success: true,
        data: details
      });
    }

    // Route: PUT /api/users/:id/details
    if (method === 'PUT') {
      const body = await req.json();

      // Fields that can be updated
      const allowedFields = [
        'first_name',
        'last_name',
        'avatar_url',
        'job_role',
        'mobile_phone',
        'country_code',
        'birthday',
        'gender',
        'employment_start_date',
        'direct_manager',
        'responsibility',
        'timezone',
        'city',
        'quick_note'
      ];

      // Admin-only fields
      const adminFields = [
        'employee_number',
        'department',
        'team_id',
        'branch_id',
        'role',
        'status',
        'archived'
      ];

      const updates = {};

      // Filter allowed fields
      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updates[field] = body[field];
        }
      }

      // Admin can update additional fields
      if (isAdmin) {
        for (const field of adminFields) {
          if (body[field] !== undefined) {
            updates[field] = body[field];
          }
        }
      }

      // Update full_name if first_name or last_name changed
      if (updates.first_name !== undefined || updates.last_name !== undefined) {
        const users = await base44.asServiceRole.entities.User.filter({ id: userId });
        const user = users[0];
        const firstName = updates.first_name !== undefined ? updates.first_name : user.first_name;
        const lastName = updates.last_name !== undefined ? updates.last_name : user.last_name;
        updates.full_name = `${firstName || ''} ${lastName || ''}`.trim();
      }

      const updatedUser = await base44.asServiceRole.entities.User.update(userId, updates);

      return Response.json({
        success: true,
        data: updatedUser,
        message: 'User details updated successfully'
      });
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405 });

  } catch (error) {
    console.error('User Details API Error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
});