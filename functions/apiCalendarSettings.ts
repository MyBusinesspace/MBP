import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Calendar Settings & Invitations API (using `endpoint` query param)
 *
 * Authentication: Requires X-User-ID header
 *
 * Usage:
 *  - GET ?endpoint=invitations
 *  - GET ?endpoint=invitations/{id}
 *  - PUT ?endpoint=invitations/{id}
 *  - POST ?endpoint=invitations
 *  - GET ?endpoint=preferences
 *  - PUT ?endpoint=preferences
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const method = req.method;

    // ✅ Instead of parsing the URL path, use `endpoint` query parameter
    const endpoint = url.searchParams.get('endpoint') || '';
    const pathParts = endpoint.split('/').filter(Boolean);

    console.log('📍 Calendar Settings API:', method, 'endpoint:', endpoint, 'pathParts:', pathParts);

    // ✅ Authenticate user
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

    // 📨 GET /invitations
    if (method === 'GET' && pathParts.length === 1 && pathParts[0] === 'invitations') {
      try {
        const status = url.searchParams.get('status');

        let filters = { invitee_user_id: currentUser.id };
        if (status) filters.status = status;

        const invitations = await base44.asServiceRole.entities.CalendarEventInvitation.filter(filters);

        const enrichedInvitations = await Promise.all(
          invitations.map(async (invitation) => {
            const events = await base44.asServiceRole.entities.CalendarEvent.filter({ id: invitation.event_id });
            return { ...invitation, event: events[0] || null };
          })
        );

        return Response.json({
          success: true,
          data: enrichedInvitations,
          count: enrichedInvitations.length
        });
      } catch (error) {
        console.error('Error fetching invitations:', error);
        return Response.json({
          success: false,
          error: 'Failed to fetch invitations',
          details: error.message
        }, { status: 500 });
      }
    }

    // 📨 GET /invitations/{id}
    if (method === 'GET' && pathParts.length === 2 && pathParts[0] === 'invitations') {
      const invitationId = pathParts[1];
      try {
        const invitations = await base44.asServiceRole.entities.CalendarEventInvitation.filter({ id: invitationId });
        const invitation = invitations[0];

        if (!invitation) {
          return Response.json({ error: 'Invitation not found' }, { status: 404 });
        }
        if (invitation.invitee_user_id !== currentUser.id && !isAdmin) {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const events = await base44.asServiceRole.entities.CalendarEvent.filter({ id: invitation.event_id });

        return Response.json({
          success: true,
          data: { ...invitation, event: events[0] || null }
        });
      } catch (error) {
        console.error('Error fetching invitation:', error);
        return Response.json({
          success: false,
          error: 'Failed to fetch invitation',
          details: error.message
        }, { status: 500 });
      }
    }

    // 📨 PUT /invitations/{id}
    if (method === 'PUT' && pathParts.length === 2 && pathParts[0] === 'invitations') {
      const invitationId = pathParts[1];
      try {
        const invitations = await base44.asServiceRole.entities.CalendarEventInvitation.filter({ id: invitationId });
        const invitation = invitations[0];

        if (!invitation) {
          return Response.json({ error: 'Invitation not found' }, { status: 404 });
        }
        if (invitation.invitee_user_id !== currentUser.id) {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { status, invitee_note } = body;

        if (!status || !['accepted', 'declined'].includes(status)) {
          return Response.json({
            error: 'status is required and must be "accepted" or "declined"'
          }, { status: 400 });
        }

        const updateData = {
          status,
          responded_at: new Date().toISOString()
        };
        if (invitee_note) updateData.invitee_note = invitee_note;

        const updatedInvitation = await base44.asServiceRole.entities.CalendarEventInvitation.update(
          invitationId,
          updateData
        );

        return Response.json({
          success: true,
          data: updatedInvitation,
          message: `Invitation ${status}`
        });
      } catch (error) {
        console.error('Error responding to invitation:', error);
        return Response.json({
          success: false,
          error: 'Failed to respond to invitation',
          details: error.message
        }, { status: 500 });
      }
    }

    // 📨 POST /invitations
    if (method === 'POST' && pathParts.length === 1 && pathParts[0] === 'invitations') {
      try {
        const body = await req.json();
        const { event_id, invitee_user_ids } = body;

        if (!event_id) {
          return Response.json({ error: 'event_id is required' }, { status: 400 });
        }

        if (!invitee_user_ids || !Array.isArray(invitee_user_ids) || invitee_user_ids.length === 0) {
          return Response.json({
            error: 'invitee_user_ids array is required and must not be empty'
          }, { status: 400 });
        }

        const events = await base44.asServiceRole.entities.CalendarEvent.filter({ id: event_id });
        const event = events[0];

        if (!event) {
          return Response.json({ error: 'Event not found' }, { status: 404 });
        }

        if (event.created_by !== currentUser.email && !isAdmin) {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const createdInvitations = [];
        for (const userId of invitee_user_ids) {
          const invitation = await base44.asServiceRole.entities.CalendarEventInvitation.create({
            event_id,
            invitee_user_id: userId,
            status: 'pending'
          });
          createdInvitations.push(invitation);
        }

        return Response.json({
          success: true,
          data: createdInvitations,
          message: `${createdInvitations.length} invitations created successfully`
        }, { status: 201 });
      } catch (error) {
        console.error('Error creating invitations:', error);
        return Response.json({
          success: false,
          error: 'Failed to create invitations',
          details: error.message
        }, { status: 500 });
      }
    }

    // ⚙️ GET /preferences
    if (method === 'GET' && pathParts.length === 1 && pathParts[0] === 'preferences') {
      try {
        return Response.json({
          success: true,
          data: {
            timezone: currentUser.timezone || 'UTC',
            city: currentUser.city || '',
            default_view: 'week',
            default_reminder_minutes: 15
          }
        });
      } catch (error) {
        console.error('Error fetching preferences:', error);
        return Response.json({
          success: false,
          error: 'Failed to fetch preferences',
          details: error.message
        }, { status: 500 });
      }
    }

    // ⚙️ PUT /preferences
    if (method === 'PUT' && pathParts.length === 1 && pathParts[0] === 'preferences') {
      try {
        const body = await req.json();

        const updates = {};
        if (body.timezone) updates.timezone = body.timezone;
        if (body.city !== undefined) updates.city = body.city;

        if (Object.keys(updates).length > 0) {
          await base44.asServiceRole.entities.User.update(currentUser.id, updates);
        }

        return Response.json({
          success: true,
          message: 'Preferences updated successfully'
        });
      } catch (error) {
        console.error('Error updating preferences:', error);
        return Response.json({
          success: false,
          error: 'Failed to update preferences',
          details: error.message
        }, { status: 500 });
      }
    }

    return Response.json({
      error: 'Endpoint not found',
      debug: { method, endpoint, pathParts }
    }, { status: 404 });

  } catch (error) {
    console.error('Calendar Settings API Error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
});
