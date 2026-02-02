import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Teams API Handler
 * 
 * Endpoints:
 * - GET /api/teams - List all teams
 * - GET /api/teams/:id - Get single team
 * - GET /api/teams/:id/members - Get team members
 * - POST /api/teams - Create new team
 * - PUT /api/teams/:id - Update team
 * - DELETE /api/teams/:id - Delete team
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

    const isAdmin = currentUser.role === 'admin';

    // Route: GET /api/teams/:id/members
    if (method === 'GET' && pathParts.length === 4 && pathParts[3] === 'members') {
      const teamId = pathParts[2];
      
      const members = await base44.asServiceRole.entities.User.filter({ 
        team_id: teamId,
        archived: false 
      });

      return Response.json({
        success: true,
        data: members,
        count: members.length
      });
    }

    // Route: GET /api/teams/:id
    if (method === 'GET' && pathParts.length === 3) {
      const teamId = pathParts[2];
      
      const teams = await base44.asServiceRole.entities.Team.filter({ id: teamId });
      const team = teams[0];

      if (!team) {
        return Response.json({ error: 'Team not found' }, { status: 404 });
      }

      // Get team members count
      const members = await base44.asServiceRole.entities.User.filter({ 
        team_id: teamId,
        archived: false 
      });

      return Response.json({
        success: true,
        data: {
          ...team,
          member_count: members.length
        }
      });
    }

    // Route: GET /api/teams
    if (method === 'GET') {
      const teams = await base44.asServiceRole.entities.Team.list('sort_order');
      
      // Get member counts for each team
      const allUsers = await base44.asServiceRole.entities.User.filter({ archived: false });
      const memberCounts = {};
      allUsers.forEach(user => {
        if (user.team_id) {
          memberCounts[user.team_id] = (memberCounts[user.team_id] || 0) + 1;
        }
      });

      const teamsWithCounts = teams.map(team => ({
        ...team,
        member_count: memberCounts[team.id] || 0
      }));

      return Response.json({
        success: true,
        data: teamsWithCounts,
        count: teamsWithCounts.length
      });
    }

    // Route: POST /api/teams
    if (method === 'POST') {
      if (!isAdmin) {
        return Response.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
      }

      const body = await req.json();
      const {
        name,
        avatar_code,
        color = 'blue',
        parent_team_id,
        chart_position_x = 0,
        chart_position_y = 0
      } = body;

      if (!name) {
        return Response.json({ error: 'name is required' }, { status: 400 });
      }

      // Get max sort_order
      const teams = await base44.asServiceRole.entities.Team.list();
      const maxSortOrder = teams.length > 0 
        ? Math.max(...teams.map(t => t.sort_order || 0)) 
        : -1;

      const newTeam = await base44.asServiceRole.entities.Team.create({
        name,
        avatar_code: avatar_code || null,
        color,
        parent_team_id: parent_team_id || null,
        chart_position_x,
        chart_position_y,
        sort_order: maxSortOrder + 1
      });

      return Response.json({
        success: true,
        data: newTeam,
        message: 'Team created successfully'
      }, { status: 201 });
    }

    // Route: PUT /api/teams/:id
    if (method === 'PUT' && pathParts.length === 3) {
      if (!isAdmin) {
        return Response.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
      }

      const teamId = pathParts[2];
      const body = await req.json();

      const updates = {};
      if (body.name !== undefined) updates.name = body.name;
      if (body.avatar_code !== undefined) updates.avatar_code = body.avatar_code;
      if (body.color !== undefined) updates.color = body.color;
      if (body.parent_team_id !== undefined) updates.parent_team_id = body.parent_team_id;
      if (body.chart_position_x !== undefined) updates.chart_position_x = body.chart_position_x;
      if (body.chart_position_y !== undefined) updates.chart_position_y = body.chart_position_y;
      if (body.sort_order !== undefined) updates.sort_order = body.sort_order;

      const updatedTeam = await base44.asServiceRole.entities.Team.update(teamId, updates);

      return Response.json({
        success: true,
        data: updatedTeam,
        message: 'Team updated successfully'
      });
    }

    // Route: DELETE /api/teams/:id
    if (method === 'DELETE' && pathParts.length === 3) {
      if (!isAdmin) {
        return Response.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
      }

      const teamId = pathParts[2];

      // Check if team has members
      const members = await base44.asServiceRole.entities.User.filter({ 
        team_id: teamId,
        archived: false 
      });

      if (members.length > 0) {
        return Response.json({ 
          error: `Cannot delete team with ${members.length} active members. Please reassign members first.` 
        }, { status: 400 });
      }

      await base44.asServiceRole.entities.Team.delete(teamId);

      return Response.json({
        success: true,
        message: 'Team deleted successfully'
      });
    }

    return Response.json({ error: 'Endpoint not found' }, { status: 404 });

  } catch (error) {
    console.error('Teams API Error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
});