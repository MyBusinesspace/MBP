import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * User Settings API Handler
 * 
 * Endpoints:
 * - GET /api/users/:id/settings - Get user settings
 * - PUT /api/users/:id/settings - Update user settings
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

    // Route: GET /api/users/:id/settings
    if (method === 'GET') {
      const users = await base44.asServiceRole.entities.User.filter({ id: userId });
      const user = users[0];

      if (!user) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }

      const settings = {
        role: user.role,
        status: user.status,
        timezone: user.timezone,
        archived: user.archived,
        kiosk_code: user.kiosk_code,
        is_team_leader: user.is_team_leader
      };

      // Admin-only settings
      if (isAdmin) {
        settings.can_delete_admins = user.can_delete_admins;
        settings.can_manage_documents = user.can_manage_documents;
        settings.sort_order = user.sort_order;
      }

      return Response.json({
        success: true,
        data: settings
      });
    }

    // Route: PUT /api/users/:id/settings
    if (method === 'PUT') {
      const body = await req.json();
      const updates = {};

      // User can update their own timezone
      if (body.timezone !== undefined) {
        updates.timezone = body.timezone;
      }

      // Admin-only settings
      if (isAdmin) {
        if (body.role !== undefined) updates.role = body.role;
        if (body.status !== undefined) updates.status = body.status;
        if (body.archived !== undefined) updates.archived = body.archived;
        if (body.kiosk_code !== undefined) updates.kiosk_code = body.kiosk_code;
        if (body.is_team_leader !== undefined) updates.is_team_leader = body.is_team_leader;
        if (body.can_delete_admins !== undefined) updates.can_delete_admins = body.can_delete_admins;
        if (body.can_manage_documents !== undefined) updates.can_manage_documents = body.can_manage_documents;
        if (body.sort_order !== undefined) updates.sort_order = body.sort_order;
      } else if (Object.keys(body).some(key => !['timezone'].includes(key))) {
        return Response.json({ 
          error: 'Forbidden - Admin access required to modify these settings' 
        }, { status: 403 });
      }

      if (Object.keys(updates).length === 0) {
        return Response.json({ error: 'No valid fields to update' }, { status: 400 });
      }

      const updatedUser = await base44.asServiceRole.entities.User.update(userId, updates);

      return Response.json({
        success: true,
        data: updatedUser,
        message: 'User settings updated successfully'
      });
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405 });

  } catch (error) {
    console.error('User Settings API Error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
});