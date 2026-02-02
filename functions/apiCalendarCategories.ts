import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Calendar Event Categories CRUD API
 * 
 * Authentication: Requires X-User-ID header
 * 
 * Endpoints:
 * - GET /apiCalendarCategories - List all categories
 * - GET /apiCalendarCategories/{id} - Get single category
 * - POST /apiCalendarCategories - Create new category (admin only)
 * - PUT /apiCalendarCategories/{id} - Update category (admin only)
 * - DELETE /apiCalendarCategories/{id} - Delete category (admin only)
 * - PUT /apiCalendarCategories/reorder - Reorder categories (admin only)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const method = req.method;

    // Parse pathname
    let pathParts = url.pathname.split('/').filter(Boolean);
    const functionsIndex = pathParts.indexOf('functions');
    if (functionsIndex !== -1 && pathParts[functionsIndex + 1] === 'apiCalendarCategories') {
      pathParts = pathParts.slice(functionsIndex + 2);
    } else if (pathParts[0] === 'apiCalendarCategories') {
      pathParts = pathParts.slice(1);
    }

    console.log('📍 Calendar Categories API:', method, 'pathParts:', pathParts);

    // Authenticate user
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
      return Response.json({ 
        error: 'Unauthorized',
        message: 'User not found'
      }, { status: 401 });
    }

    const isAdmin = currentUser.role === 'admin';

    // Route: GET / - List all categories
    if (method === 'GET' && pathParts.length === 0) {
      try {
        const categories = await base44.asServiceRole.entities.CalendarEventCategory.list('sort_order');

        return Response.json({
          success: true,
          data: categories,
          count: categories.length
        });
      } catch (error) {
        console.error('Error listing categories:', error);
        return Response.json({
          success: false,
          error: 'Failed to list categories',
          details: error.message
        }, { status: 500 });
      }
    }

    // Route: GET /{id} - Get single category
    if (method === 'GET' && pathParts.length === 1 && pathParts[0] !== 'reorder') {
      const categoryId = pathParts[0];

      try {
        const categories = await base44.asServiceRole.entities.CalendarEventCategory.filter({ id: categoryId });
        const category = categories[0];

        if (!category) {
          return Response.json({ error: 'Category not found' }, { status: 404 });
        }

        return Response.json({
          success: true,
          data: category
        });
      } catch (error) {
        console.error('Error fetching category:', error);
        return Response.json({
          success: false,
          error: 'Failed to fetch category',
          details: error.message
        }, { status: 500 });
      }
    }

    // Route: POST / - Create new category
    if (method === 'POST' && pathParts.length === 0) {
      if (!isAdmin) {
        return Response.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
      }

      try {
        const body = await req.json();

        if (!body.name) {
          return Response.json({ error: 'name is required' }, { status: 400 });
        }

        // Get max sort_order
        const categories = await base44.asServiceRole.entities.CalendarEventCategory.list();
        const maxSortOrder = categories.length > 0 
          ? Math.max(...categories.map(c => c.sort_order || 0)) 
          : -1;

        const categoryData = {
          name: body.name,
          color: body.color || 'blue',
          icon: body.icon || '',
          sort_order: maxSortOrder + 1
        };

        const newCategory = await base44.asServiceRole.entities.CalendarEventCategory.create(categoryData);

        return Response.json({
          success: true,
          data: newCategory,
          message: 'Category created successfully'
        }, { status: 201 });
      } catch (error) {
        console.error('Error creating category:', error);
        return Response.json({
          success: false,
          error: 'Failed to create category',
          details: error.message
        }, { status: 500 });
      }
    }

    // Route: PUT /{id} - Update category
    if (method === 'PUT' && pathParts.length === 1 && pathParts[0] !== 'reorder') {
      if (!isAdmin) {
        return Response.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
      }

      const categoryId = pathParts[0];

      try {
        const body = await req.json();

        const updates = {};
        if (body.name !== undefined) updates.name = body.name;
        if (body.color !== undefined) updates.color = body.color;
        if (body.icon !== undefined) updates.icon = body.icon;
        if (body.sort_order !== undefined) updates.sort_order = body.sort_order;

        if (Object.keys(updates).length === 0) {
          return Response.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        const updatedCategory = await base44.asServiceRole.entities.CalendarEventCategory.update(categoryId, updates);

        return Response.json({
          success: true,
          data: updatedCategory,
          message: 'Category updated successfully'
        });
      } catch (error) {
        console.error('Error updating category:', error);
        return Response.json({
          success: false,
          error: 'Failed to update category',
          details: error.message
        }, { status: 500 });
      }
    }

    // Route: PUT /reorder - Reorder categories
    if (method === 'PUT' && pathParts.length === 1 && pathParts[0] === 'reorder') {
      if (!isAdmin) {
        return Response.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
      }

      try {
        const body = await req.json();
        const { categoryIds } = body;

        if (!categoryIds || !Array.isArray(categoryIds)) {
          return Response.json({ error: 'categoryIds array is required' }, { status: 400 });
        }

        for (let i = 0; i < categoryIds.length; i++) {
          await base44.asServiceRole.entities.CalendarEventCategory.update(categoryIds[i], {
            sort_order: i
          });
        }

        return Response.json({
          success: true,
          message: 'Categories reordered successfully'
        });
      } catch (error) {
        console.error('Error reordering categories:', error);
        return Response.json({
          success: false,
          error: 'Failed to reorder categories',
          details: error.message
        }, { status: 500 });
      }
    }

    // Route: DELETE /{id} - Delete category
    if (method === 'DELETE' && pathParts.length === 1) {
      if (!isAdmin) {
        return Response.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
      }

      const categoryId = pathParts[0];

      try {
        await base44.asServiceRole.entities.CalendarEventCategory.delete(categoryId);

        return Response.json({
          success: true,
          message: 'Category deleted successfully'
        });
      } catch (error) {
        console.error('Error deleting category:', error);
        return Response.json({
          success: false,
          error: 'Failed to delete category',
          details: error.message
        }, { status: 500 });
      }
    }

    return Response.json({ 
      error: 'Endpoint not found',
      debug: { method, pathParts }
    }, { status: 404 });

  } catch (error) {
    console.error('Calendar Categories API Error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
});