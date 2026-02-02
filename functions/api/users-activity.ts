import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * User Activity API Handler
 * 
 * Endpoints:
 * - GET /api/users/:id/activity - Get user activity log
 * - POST /api/users/:id/activity - Add activity entry
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

    // Route: GET /api/users/:id/activity
    if (method === 'GET') {
      const activityType = url.searchParams.get('activity_type');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      let filters = { user_id: userId };
      if (activityType) filters.activity_type = activityType;

      const activities = await base44.asServiceRole.entities.UserActivityLog.filter(filters);
      
      // Sort by activity_date descending
      const sortedActivities = activities.sort((a, b) => 
        new Date(b.activity_date) - new Date(a.activity_date)
      );

      // Apply pagination
      const paginatedActivities = sortedActivities.slice(offset, offset + limit);

      return Response.json({
        success: true,
        data: paginatedActivities,
        count: paginatedActivities.length,
        total: sortedActivities.length,
        offset,
        limit
      });
    }

    // Route: POST /api/users/:id/activity
    if (method === 'POST') {
      if (!isAdmin) {
        return Response.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
      }

      const body = await req.json();
      const {
        activity_type,
        title,
        description,
        metadata
      } = body;

      if (!activity_type || !title) {
        return Response.json({ 
          error: 'activity_type and title are required' 
        }, { status: 400 });
      }

      const validActivityTypes = [
        'document_uploaded',
        'document_deleted',
        'payroll_processed',
        'profile_updated',
        'manual_entry'
      ];

      if (!validActivityTypes.includes(activity_type)) {
        return Response.json({ 
          error: 'Invalid activity_type. Must be one of: ' + validActivityTypes.join(', ')
        }, { status: 400 });
      }

      const newActivity = await base44.asServiceRole.entities.UserActivityLog.create({
        user_id: userId,
        activity_type,
        title,
        description: description || '',
        metadata: metadata || {},
        activity_date: new Date().toISOString(),
        created_by_user_id: currentUser.id
      });

      return Response.json({
        success: true,
        data: newActivity,
        message: 'Activity logged successfully'
      }, { status: 201 });
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405 });

  } catch (error) {
    console.error('User Activity API Error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
});