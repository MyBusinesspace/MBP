import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Work Orders API with API Key Authentication
 * 
 * Authentication:
 * - Pass user_id in request headers as 'X-User-ID' or 'user_id'
 * - Or pass API key as 'X-API-Key' or 'api_key'
 * 
 * Endpoints:
 * - GET /api/work-orders - List work orders with filters
 * - GET /api/work-orders/:id - Get single work order
 * - POST /api/work-orders - Create work order (admin only)
 * - PUT /api/work-orders/:id - Update work order (admin only)
 * - DELETE /api/work-orders/:id - Delete work order (admin only)
 * - PATCH /api/work-orders/:id/archive - Archive work order (admin only)
 * - PATCH /api/work-orders/bulk-delete - Bulk delete work orders (admin only)
 * - PATCH /api/work-orders/bulk-archive - Bulk archive work orders (admin only)
 */


// Helper function: fetch meta data
async function workOrdersMeta(base44, user) {
  try {
    // Fetch projects
    const projects = await base44.asServiceRole.entities.Project.list();

    // Fetch users
    const users = await base44.asServiceRole.entities.User.list();

    // Fetch shifts (Shift Types)
    const shifts = await base44.asServiceRole.entities.ShiftType.list();

    return Response.json({
      success: true,
      meta: {
        projects,
        users,
        shifts
      },
      authenticated_as: {
        user_id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error fetching work orders meta:', error);
    return Response.json({
      success: false,
      error: 'Failed to fetch work orders meta',
      details: error.message
    }, { status: 500 });
  }
}


Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const method = req.method;

    // Get user ID from headers or query params
    const userId = req.headers.get('X-User-ID') || 
                   req.headers.get('user_id') ||
                   url.searchParams.get('user_id');

    const apiKey = req.headers.get('X-API-Key') || 
                   req.headers.get('api_key') ||
                   url.searchParams.get('api_key');

    if (!userId && !apiKey) {
      return Response.json({ 
        error: 'Authentication required. Provide user_id or api_key in headers or query params.',
        example: 'Headers: X-User-ID: your-user-id or X-API-Key: your-api-key'
      }, { status: 401 });
    }

    // Verify user exists and get their role
    let user = null;
    
    if (userId) {
      const users = await base44.asServiceRole.entities.User.list();
      user = users.find(u => u.id === userId);
      
      if (!user) {
        return Response.json({ error: 'Invalid user_id' }, { status: 401 });
      }

      // Check if user is active
      if (user.status !== 'Active') {
        return Response.json({ error: 'User account is not active' }, { status: 403 });
      }

      // Check if user is archived
      if (user.archived) {
        return Response.json({ error: 'User account is archived' }, { status: 403 });
      }
    } else if (apiKey) {
      // Validate API key (you can store API keys in a separate entity or in user records)
      // For now, we'll check if the API key matches a user's ID (temporary solution)
      const users = await base44.asServiceRole.entities.User.list();
      user = users.find(u => u.id === apiKey || u.email === apiKey);
      
      if (!user) {
        return Response.json({ error: 'Invalid api_key' }, { status: 401 });
      }
    }

    // Helper function to check if user is admin
    const isAdmin = () => user && user.role === 'admin';


    // GET /api/work-orders - List work orders with filters
    if (method === 'GET' && !url.pathname.split('/').pop().match(/^[a-f0-9-]{36}$/i)) {
      try {
        // Parse query parameters
        const projectId = url.searchParams.get('project_id');
        const teamId = url.searchParams.get('team_id');
        const categoryId = url.searchParams.get('category_id');
        const status = url.searchParams.get('status');
        const startDate = url.searchParams.get('start_date');
        const endDate = url.searchParams.get('end_date');
        const limit = parseInt(url.searchParams.get('limit') || '100');
        const offset = parseInt(url.searchParams.get('offset') || '0');
        const sortBy = url.searchParams.get('sort_by') || '-created_date';

        // Fetch all work orders
        let workOrders = await base44.asServiceRole.entities.TimeEntry.list(sortBy, limit + offset);

        // Apply filters
        workOrders = workOrders.filter(wo => {
          // Filter archived
          if (wo.archived) return false;

          // Filter by project
          if (projectId && wo.project_id !== projectId) return false;

          // Filter by team
          if (teamId) {
            const teamIds = wo.team_ids || (wo.team_id ? [wo.team_id] : []);
            if (!teamIds.includes(teamId)) return false;
          }

          // Filter by category
          if (categoryId && wo.work_order_category_id !== categoryId) return false;

          // Filter by status
          if (status && wo.status !== status) return false;

          // Filter by date range
          if (startDate && wo.planned_start_time) {
            const woDate = new Date(wo.planned_start_time);
            if (woDate < new Date(startDate)) return false;
          }

          if (endDate && wo.planned_start_time) {
            const woDate = new Date(wo.planned_start_time);
            if (woDate > new Date(endDate)) return false;
          }

          return true;
        });

        // Apply pagination
        const paginatedWorkOrders = workOrders.slice(offset, offset + limit);

        return Response.json({
          success: true,
          data: paginatedWorkOrders,
          pagination: {
            total: workOrders.length,
            limit,
            offset,
            hasMore: workOrders.length > offset + limit
          },
          authenticated_as: {
            user_id: user.id,
            email: user.email,
            role: user.role
          }
        });
      } catch (error) {
        console.error('Error listing work orders:', error);
        return Response.json({
          success: false,
          error: 'Failed to list work orders',
          details: error.message
        }, { status: 500 });
      }
    }

    // GET /api/work-orders/:id - Get single work order
    if (method === 'GET') {
      const pathParts = url.pathname.split('/');
      const workOrderId = pathParts[pathParts.length - 1];

      if (!workOrderId || !workOrderId.match(/^[a-f0-9-]{36}$/i)) {
        return Response.json({ error: 'Invalid work order ID' }, { status: 400 });
      }

      try {
        const workOrders = await base44.asServiceRole.entities.TimeEntry.list();
        const workOrder = workOrders.find(wo => wo.id === workOrderId);

        if (!workOrder) {
          return Response.json({ error: 'Work order not found' }, { status: 404 });
        }

        return Response.json({
          success: true,
          data: workOrder,
          authenticated_as: {
            user_id: user.id,
            email: user.email,
            role: user.role
          }
        });
      } catch (error) {
        console.error('Error fetching work order:', error);
        return Response.json({
          success: false,
          error: 'Failed to fetch work order',
          details: error.message
        }, { status: 500 });
      }
    }

    // POST /api/work-orders - Create work order
    if (method === 'POST') {
      // Only admins can create work orders
      if (!isAdmin()) {
        return Response.json({ 
          error: 'Only admins can create work orders',
          your_role: user.role
        }, { status: 403 });
      }

      try {
        const body = await req.json();

        // Validate required fields
        if (!body.project_id) {
          return Response.json({ error: 'project_id is required' }, { status: 400 });
        }

        if (!body.planned_start_time) {
          return Response.json({ error: 'planned_start_time is required' }, { status: 400 });
        }

        // Generate work order number if not provided
        if (!body.work_order_number) {
          body.work_order_number = `N${Math.floor(Math.random() * 100000)}`;
        }

        // Set default values
        const workOrderData = {
          title: body.title || '',
          project_id: body.project_id,
          work_notes: body.work_notes || '',
          planned_start_time: body.planned_start_time,
          planned_end_time: body.planned_end_time || null,
          employee_ids: body.employee_ids || [],
          team_ids: body.team_ids || [],
          employee_id: body.employee_id || body.employee_ids?.[0] || null,
          team_id: body.team_id || body.team_ids?.[0] || null,
          work_order_category_id: body.work_order_category_id || null,
          shift_type_id: body.shift_type_id || null,
          status: body.status || 'on_queue',
          work_order_number: body.work_order_number,
          task: body.task || '',
          archived: false,
          is_active: false
        };

        const createdWorkOrder = await base44.asServiceRole.entities.TimeEntry.create(workOrderData);

        return Response.json({
          success: true,
          data: createdWorkOrder,
          message: 'Work order created successfully',
          created_by: {
            user_id: user.id,
            email: user.email
          }
        }, { status: 201 });
      } catch (error) {
        console.error('Error creating work order:', error);
        return Response.json({
          success: false,
          error: 'Failed to create work order',
          details: error.message
        }, { status: 500 });
      }
    }

    // PUT /api/work-orders/:id - Update work order
    if (method === 'PUT') {
      // Only admins can update work orders
      if (!isAdmin()) {
        return Response.json({ 
          error: 'Only admins can update work orders',
          your_role: user.role
        }, { status: 403 });
      }

      const pathParts = url.pathname.split('/');
      const workOrderId = pathParts[pathParts.length - 1];

      if (!workOrderId || !workOrderId.match(/^[a-f0-9-]{36}$/i)) {
        return Response.json({ error: 'Invalid work order ID' }, { status: 400 });
      }

      try {
        const body = await req.json();

        // Remove system fields that shouldn't be updated
        const systemFields = ['id', 'created_date', 'updated_date', 'created_by_id', 'created_by'];
        const updateData = {};
        
        for (const [key, value] of Object.entries(body)) {
          if (!systemFields.includes(key) && value !== undefined) {
            updateData[key] = value;
          }
        }

        if (Object.keys(updateData).length === 0) {
          return Response.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        const updatedWorkOrder = await base44.asServiceRole.entities.TimeEntry.update(workOrderId, updateData);

        return Response.json({
          success: true,
          data: updatedWorkOrder,
          message: 'Work order updated successfully',
          updated_by: {
            user_id: user.id,
            email: user.email
          }
        });
      } catch (error) {
        console.error('Error updating work order:', error);
        return Response.json({
          success: false,
          error: 'Failed to update work order',
          details: error.message
        }, { status: 500 });
      }
    }

    // DELETE /api/work-orders/:id - Delete work order
    if (method === 'DELETE') {
      // Only admins can delete work orders
      if (!isAdmin()) {
        return Response.json({ 
          error: 'Only admins can delete work orders',
          your_role: user.role
        }, { status: 403 });
      }

      const pathParts = url.pathname.split('/');
      const workOrderId = pathParts[pathParts.length - 1];

      if (!workOrderId || !workOrderId.match(/^[a-f0-9-]{36}$/i)) {
        return Response.json({ error: 'Invalid work order ID' }, { status: 400 });
      }

      try {
        await base44.asServiceRole.entities.TimeEntry.delete(workOrderId);

        return Response.json({
          success: true,
          message: 'Work order deleted successfully',
          deleted_by: {
            user_id: user.id,
            email: user.email
          }
        });
      } catch (error) {
        console.error('Error deleting work order:', error);
        return Response.json({
          success: false,
          error: 'Failed to delete work order',
          details: error.message
        }, { status: 500 });
      }
    }

    // PATCH /api/work-orders/:id/archive - Archive work order
    if (method === 'PATCH' && url.pathname.includes('/archive')) {
      // Only admins can archive work orders
      if (!isAdmin()) {
        return Response.json({ 
          error: 'Only admins can archive work orders',
          your_role: user.role
        }, { status: 403 });
      }

      const pathParts = url.pathname.split('/');
      const workOrderId = pathParts[pathParts.length - 2];

      if (!workOrderId || !workOrderId.match(/^[a-f0-9-]{36}$/i)) {
        return Response.json({ error: 'Invalid work order ID' }, { status: 400 });
      }

      try {
        const updatedWorkOrder = await base44.asServiceRole.entities.TimeEntry.update(workOrderId, {
          archived: true
        });

        return Response.json({
          success: true,
          data: updatedWorkOrder,
          message: 'Work order archived successfully',
          archived_by: {
            user_id: user.id,
            email: user.email
          }
        });
      } catch (error) {
        console.error('Error archiving work order:', error);
        return Response.json({
          success: false,
          error: 'Failed to archive work order',
          details: error.message
        }, { status: 500 });
      }
    }

    // PATCH /api/work-orders/bulk-delete - Bulk delete work orders
    if (method === 'PATCH' && url.pathname.includes('/bulk-delete')) {
      // Only admins can bulk delete
      if (!isAdmin()) {
        return Response.json({ 
          error: 'Only admins can delete work orders',
          your_role: user.role
        }, { status: 403 });
      }

      try {
        const body = await req.json();
        const { ids } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
          return Response.json({ error: 'ids array is required' }, { status: 400 });
        }

        const results = [];
        for (const id of ids) {
          try {
            await base44.asServiceRole.entities.TimeEntry.delete(id);
            results.push({ id, success: true });
          } catch (error) {
            results.push({ id, success: false, error: error.message });
          }
        }

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        return Response.json({
          success: true,
          message: `Deleted ${successCount} work orders, ${failCount} failed`,
          results,
          deleted_by: {
            user_id: user.id,
            email: user.email
          }
        });
      } catch (error) {
        console.error('Error bulk deleting work orders:', error);
        return Response.json({
          success: false,
          error: 'Failed to bulk delete work orders',
          details: error.message
        }, { status: 500 });
      }
    }

    // PATCH /api/work-orders/bulk-archive - Bulk archive work orders
    if (method === 'PATCH' && url.pathname.includes('/bulk-archive')) {
      // Only admins can bulk archive
      if (!isAdmin()) {
        return Response.json({ 
          error: 'Only admins can archive work orders',
          your_role: user.role
        }, { status: 403 });
      }

      try {
        const body = await req.json();
        const { ids } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
          return Response.json({ error: 'ids array is required' }, { status: 400 });
        }

        const results = [];
        for (const id of ids) {
          try {
            await base44.asServiceRole.entities.TimeEntry.update(id, { archived: true });
            results.push({ id, success: true });
          } catch (error) {
            results.push({ id, success: false, error: error.message });
          }
        }

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        return Response.json({
          success: true,
          message: `Archived ${successCount} work orders, ${failCount} failed`,
          results,
          archived_by: {
            user_id: user.id,
            email: user.email
          }
        });
      } catch (error) {
        console.error('Error bulk archiving work orders:', error);
        return Response.json({
          success: false,
          error: 'Failed to bulk archive work orders',
          details: error.message
        }, { status: 500 });
      }
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return Response.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
});