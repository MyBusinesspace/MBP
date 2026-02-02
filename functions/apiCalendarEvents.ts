import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Calendar Events CRUD API
 * 
 * Pass the desired endpoint as a query param or body field named `endpoint`
 * Example:
 * GET  ?endpoint=upcoming
 * GET  ?endpoint=68f0aa704c95d5ca0d6e6386
 * GET  ?endpoint=user/USER_ID
 * POST { "endpoint": "EVENT_ID/duplicate", ... }
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const method = req.method;

    // ✅ Get endpoint either from query or body
    let endpoint = url.searchParams.get('endpoint');
    if (!endpoint && (method === 'POST' || method === 'PUT')) {
      try {
        const body = await req.clone().json();
        endpoint = body.endpoint;
      } catch (e) {
        console.log('No endpoint in body');
      }
    }
    endpoint = (endpoint || '').trim().replace(/^\/+|\/+$/g, '');
    const pathParts = endpoint ? endpoint.split('/').filter(Boolean) : [];

    console.log('📍 API Call:', method, 'endpoint:', endpoint, 'pathParts:', pathParts);

    // ✅ Authenticate user via X-User-ID header
    const userIdFromHeader = req.headers.get('X-User-ID');
    if (!userIdFromHeader) {
      return Response.json({ 
        error: 'Unauthorized',
        message: 'X-User-ID header is required'
      }, { status: 401 });
    }

    let currentUser;
    try {
      const users = await base44.asServiceRole.entities.User.filter({ id: userIdFromHeader });
      currentUser = users[0];
      if (!currentUser) {
        return Response.json({ 
          error: 'Unauthorized',
          message: 'User not found'
        }, { status: 401 });
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      return Response.json({ 
        error: 'Unauthorized',
        message: 'Failed to authenticate user'
      }, { status: 401 });
    }

    const isAdmin = currentUser.role === 'admin';

    const hasAccessToEvent = (event) => {
      if (isAdmin) return true;
      if (event.participant_user_ids?.includes(currentUser.id)) return true;
      if (currentUser.team_id && event.participant_team_ids?.includes(currentUser.team_id)) return true;
      if (event.created_by === currentUser.email) return true;
      return false;
    };

    // ========================= Routes ==========================

    // GET /upcoming
    if (method === 'GET' && pathParts[0] === 'upcoming') {
      const limit = parseInt(url.searchParams.get('limit') || '10');
      const now = new Date().toISOString();
      const allEvents = await base44.asServiceRole.entities.CalendarEvent.list('-start_time', limit * 2);

      const upcoming = allEvents
        .filter(ev => ev.start_time >= now && hasAccessToEvent(ev))
        .slice(0, limit);

      return Response.json({ success: true, data: upcoming, count: upcoming.length });
    }

    // GET /user/{userId}
    if (method === 'GET' && pathParts[0] === 'user' && pathParts[1]) {
      const userId = pathParts[1];
      if (!isAdmin && userId !== currentUser.id) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const events = await base44.asServiceRole.entities.CalendarEvent.list('-start_time');
      const userEvents = events.filter(e => 
        e.participant_user_ids?.includes(userId) || e.created_by === currentUser.email
      );
      return Response.json({ success: true, data: userEvents });
    }

    // GET /team/{teamId}
    if (method === 'GET' && pathParts[0] === 'team' && pathParts[1]) {
      const teamId = pathParts[1];
      const events = await base44.asServiceRole.entities.CalendarEvent.list('-start_time');
      const teamEvents = events.filter(e => 
        e.participant_team_ids?.includes(teamId) && (isAdmin || hasAccessToEvent(e))
      );
      return Response.json({ success: true, data: teamEvents });
    }
 
    // POST / - Create new event
    if (method === 'POST' && pathParts.length === 1) {
      try {
        const body = await req.json();

        if (!body.title || !body.start_time || !body.end_time) {
          return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        let participantUserIds = body.participant_user_ids || [];
        if (participantUserIds.length > 0 && participantUserIds[0].includes('@')) {
          const users = await base44.asServiceRole.entities.User.filter({
            email: { $in: participantUserIds }
          });
          participantUserIds = users.map(u => u.id);
        }

        const eventData = {
          title: body.title,
          description: body.description || '',
          event_type: body.event_type || 'meeting',
          start_time: body.start_time,
          end_time: body.end_time,
          all_day: body.all_day || false,
          location: body.location || '',
          meeting_link: body.meeting_link || '',
          participant_user_ids: participantUserIds || [],
          participant_team_ids: body.participant_team_ids || [],
          participant_customer_emails: body.participant_customer_emails || [],
          participant_customer_whatsapp: body.participant_customer_whatsapp || [],
          color: body.color || 'blue',
          reminder_minutes: body.reminder_minutes || 15,
          is_recurring: body.is_recurring || false,
        };

        const newEvent = await base44.asServiceRole.entities.CalendarEvent.create(eventData);

       // ✅ إرسال دعوات البريد الإلكتروني باستخدام ملف sendCalendarInvites
            let emailsSent = 0;

            try {
              const inviteResponse = await base44.functions.invoke('apiCalendarInvitation', {
                event: newEvent
              });
              emailsSent = inviteResponse.data?.emailsSent || 0;
            } catch (inviteError) {
              console.error('Failed to send calendar invites:', inviteError);
            }
            
        return Response.json({
          success: true,
          data: newEvent,
          emailsSent,
          message: emailsSent > 0 
            ? `Event created and ${emailsSent} invitation email(s) sent` 
            : 'Event created successfully'
        }, { status: 200 });

      } catch (error) {
        console.error('Error creating event:', error);
        return Response.json({
          success: false,
          error: 'Failed to create event',
          details: error.message
        }, { status: 500 });
      }
    }

    
    // GET /{id}
    if (method === 'GET' && pathParts.length === 1 && pathParts[0]) {
      const eventId = pathParts[0];
      const events = await base44.asServiceRole.entities.CalendarEvent.filter({ id: eventId });
      const event = events[0];
      if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });
      if (!hasAccessToEvent(event)) return Response.json({ error: 'Forbidden' }, { status: 403 });
      return Response.json({ success: true, data: event });
    }

    // GET / (list all)
    if (method === 'GET' && pathParts.length === 0) {
      const startDate = url.searchParams.get('start_date');
      const endDate = url.searchParams.get('end_date');
      const eventType = url.searchParams.get('event_type');
      const limit = parseInt(url.searchParams.get('limit') || '1000');

      let events = await base44.asServiceRole.entities.CalendarEvent.list('-start_time', limit);
      events = events.filter(hasAccessToEvent);
      if (startDate) events = events.filter(e => e.start_time >= startDate);
      if (endDate) events = events.filter(e => e.start_time <= endDate);
      if (eventType) events = events.filter(e => e.event_type === eventType);

      return Response.json({ success: true, data: events, count: events.length });
    }

    return Response.json({ error: 'Endpoint not found', endpoint }, { status: 404 });

  } catch (error) {
    console.error('Calendar Events API Error:', error);
    return Response.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
});