import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Calendar Events CRUD API
 * 
 * Endpoints:
 * - GET /calendarEvents - List calendar events with filters
 * - GET /calendarEvents/:id - Get single event
 * - POST /calendarEvents - Create new event
 * - PUT /calendarEvents/:id - Update event
 * - DELETE /calendarEvents/:id - Delete event
 * - POST /calendarEvents/:id/duplicate - Duplicate event
 * - GET /calendarEvents/upcoming - Get upcoming events for current user
 * - GET /calendarEvents/user/:userId - Get events for specific user
 * - GET /calendarEvents/team/:teamId - Get events for specific team
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

    // Helper function to check if user has access to event
    const hasAccessToEvent = (event) => {
      // Admins can access all events
      if (isAdmin) return true;

      // Check if user is a participant
      if (event.participant_user_ids?.includes(currentUser.id)) return true;

      // Check if user's team is invited
      if (currentUser.team_id && event.participant_team_ids?.includes(currentUser.team_id)) return true;

      // Check if event is created by user
      if (event.created_by === currentUser.email) return true;

      return false;
    };

    // Route: GET /calendarEvents/upcoming - Get upcoming events for current user
    if (method === 'GET' && pathParts.length === 2 && pathParts[1] === 'upcoming') {
      try {
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const now = new Date().toISOString();

        const allEvents = await base44.asServiceRole.entities.CalendarEvent.list('-start_time', limit * 2);
        
        const upcomingEvents = allEvents
          .filter(event => {
            // Filter future events
            if (event.start_time < now) return false;

            // Filter by access
            return hasAccessToEvent(event);
          })
          .slice(0, limit);

        return Response.json({
          success: true,
          data: upcomingEvents,
          count: upcomingEvents.length
        });
      } catch (error) {
        console.error('Error fetching upcoming events:', error);
        return Response.json({
          success: false,
          error: 'Failed to fetch upcoming events',
          details: error.message
        }, { status: 500 });
      }
    }

    // Route: GET /calendarEvents/user/:userId - Get events for specific user
    if (method === 'GET' && pathParts.length === 3 && pathParts[1] === 'user') {
      const userId = pathParts[2];

      // Users can only view their own events unless admin
      if (!isAdmin && userId !== currentUser.id) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      try {
        const allEvents = await base44.asServiceRole.entities.CalendarEvent.list('-start_time');
        
        const userEvents = allEvents.filter(event => 
          event.participant_user_ids?.includes(userId) || 
          event.created_by === currentUser.email
        );

        return Response.json({
          success: true,
          data: userEvents,
          count: userEvents.length
        });
      } catch (error) {
        console.error('Error fetching user events:', error);
        return Response.json({
          success: false,
          error: 'Failed to fetch user events',
          details: error.message
        }, { status: 500 });
      }
    }

    // Route: GET /calendarEvents/team/:teamId - Get events for specific team
    if (method === 'GET' && pathParts.length === 3 && pathParts[1] === 'team') {
      const teamId = pathParts[2];

      try {
        const allEvents = await base44.asServiceRole.entities.CalendarEvent.list('-start_time');
        
        const teamEvents = allEvents.filter(event => 
          event.participant_team_ids?.includes(teamId) && 
          (isAdmin || hasAccessToEvent(event))
        );

        return Response.json({
          success: true,
          data: teamEvents,
          count: teamEvents.length
        });
      } catch (error) {
        console.error('Error fetching team events:', error);
        return Response.json({
          success: false,
          error: 'Failed to fetch team events',
          details: error.message
        }, { status: 500 });
      }
    }

    // Route: POST /calendarEvents/:id/duplicate - Duplicate event
    if (method === 'POST' && pathParts.length === 3 && pathParts[2] === 'duplicate') {
      const eventId = pathParts[1];

      try {
        const events = await base44.asServiceRole.entities.CalendarEvent.filter({ id: eventId });
        const originalEvent = events[0];

        if (!originalEvent) {
          return Response.json({ error: 'Event not found' }, { status: 404 });
        }

        if (!hasAccessToEvent(originalEvent)) {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Create duplicate with modified title
        const duplicateData = {
          ...originalEvent,
          title: `${originalEvent.title} (Copy)`,
          google_calendar_sync: false,
          google_event_id: null,
        };

        // Remove system fields
        delete duplicateData.id;
        delete duplicateData.created_date;
        delete duplicateData.updated_date;
        delete duplicateData.created_by;

        const duplicatedEvent = await base44.asServiceRole.entities.CalendarEvent.create(duplicateData);

        return Response.json({
          success: true,
          data: duplicatedEvent,
          message: 'Event duplicated successfully'
        }, { status: 201 });
      } catch (error) {
        console.error('Error duplicating event:', error);
        return Response.json({
          success: false,
          error: 'Failed to duplicate event',
          details: error.message
        }, { status: 500 });
      }
    }

    // Route: GET /calendarEvents/:id - Get single event
    if (method === 'GET' && pathParts.length === 2) {
      const eventId = pathParts[1];

      try {
        const events = await base44.asServiceRole.entities.CalendarEvent.filter({ id: eventId });
        const event = events[0];

        if (!event) {
          return Response.json({ error: 'Event not found' }, { status: 404 });
        }

        if (!hasAccessToEvent(event)) {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        return Response.json({
          success: true,
          data: event
        });
      } catch (error) {
        console.error('Error fetching event:', error);
        return Response.json({
          success: false,
          error: 'Failed to fetch event',
          details: error.message
        }, { status: 500 });
      }
    }

    // Route: GET /calendarEvents - List events with filters
    if (method === 'GET' && pathParts.length === 1) {
      try {
        const startDate = url.searchParams.get('start_date');
        const endDate = url.searchParams.get('end_date');
        const eventType = url.searchParams.get('event_type');
        const includeRecurring = url.searchParams.get('include_recurring') !== 'false';
        const limit = parseInt(url.searchParams.get('limit') || '1000');

        let events = await base44.asServiceRole.entities.CalendarEvent.list('-start_time', limit);

        // Filter by access
        events = events.filter(event => hasAccessToEvent(event));

        // Filter by date range
        if (startDate) {
          events = events.filter(event => event.start_time >= startDate);
        }
        if (endDate) {
          events = events.filter(event => event.start_time <= endDate);
        }

        // Filter by event type
        if (eventType) {
          events = events.filter(event => event.event_type === eventType);
        }

        // Filter recurring events
        if (!includeRecurring) {
          events = events.filter(event => !event.is_recurring);
        }

        return Response.json({
          success: true,
          data: events,
          count: events.length,
          filters: {
            start_date: startDate,
            end_date: endDate,
            event_type: eventType,
            include_recurring: includeRecurring
          }
        });
      } catch (error) {
        console.error('Error listing events:', error);
        return Response.json({
          success: false,
          error: 'Failed to list events',
          details: error.message
        }, { status: 500 });
      }
    }

    // Route: POST /calendarEvents - Create new event
    if (method === 'POST' && pathParts.length === 1) {
      try {
        const body = await req.json();

        // Validate required fields
        if (!body.title) {
          return Response.json({ error: 'title is required' }, { status: 400 });
        }
        if (!body.start_time) {
          return Response.json({ error: 'start_time is required' }, { status: 400 });
        }
        if (!body.end_time) {
          return Response.json({ error: 'end_time is required' }, { status: 400 });
        }

        // Validate dates
        const startTime = new Date(body.start_time);
        const endTime = new Date(body.end_time);
        if (endTime <= startTime) {
          return Response.json({ error: 'end_time must be after start_time' }, { status: 400 });
        }

        // Prepare event data
        const eventData = {
          title: body.title,
          description: body.description || '',
          event_type: body.event_type || 'meeting',
          start_time: body.start_time,
          end_time: body.end_time,
          all_day: body.all_day || false,
          location: body.location || '',
          meeting_link: body.meeting_link || '',
          participant_user_ids: body.participant_user_ids || [],
          participant_team_ids: body.participant_team_ids || [],
          participant_customer_emails: body.participant_customer_emails || [],
          color: body.color || 'blue',
          reminder_minutes: body.reminder_minutes || 15,
          is_recurring: body.is_recurring || false,
          recurrence_type: body.recurrence_type || null,
          recurrence_interval: body.recurrence_interval || 1,
          recurrence_end_date: body.recurrence_end_date || null,
          recurrence_days_of_week: body.recurrence_days_of_week || [],
          google_calendar_sync: body.google_calendar_sync || false,
          google_event_id: body.google_event_id || null
        };

        const newEvent = await base44.asServiceRole.entities.CalendarEvent.create(eventData);

        return Response.json({
          success: true,
          data: newEvent,
          message: 'Event created successfully'
        }, { status: 201 });
      } catch (error) {
        console.error('Error creating event:', error);
        return Response.json({
          success: false,
          error: 'Failed to create event',
          details: error.message
        }, { status: 500 });
      }
    }

    // Route: PUT /calendarEvents/:id - Update event
    if (method === 'PUT' && pathParts.length === 2) {
      const eventId = pathParts[1];

      try {
        const events = await base44.asServiceRole.entities.CalendarEvent.filter({ id: eventId });
        const existingEvent = events[0];

        if (!existingEvent) {
          return Response.json({ error: 'Event not found' }, { status: 404 });
        }

        if (!hasAccessToEvent(existingEvent) && !isAdmin) {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();

        // Validate dates if provided
        if (body.start_time && body.end_time) {
          const startTime = new Date(body.start_time);
          const endTime = new Date(body.end_time);
          if (endTime <= startTime) {
            return Response.json({ error: 'end_time must be after start_time' }, { status: 400 });
          }
        }

        // Remove system fields
        const systemFields = ['id', 'created_date', 'updated_date', 'created_by'];
        const updateData = {};
        
        for (const [key, value] of Object.entries(body)) {
          if (!systemFields.includes(key) && value !== undefined) {
            updateData[key] = value;
          }
        }

        if (Object.keys(updateData).length === 0) {
          return Response.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        const updatedEvent = await base44.asServiceRole.entities.CalendarEvent.update(eventId, updateData);

        return Response.json({
          success: true,
          data: updatedEvent,
          message: 'Event updated successfully'
        });
      } catch (error) {
        console.error('Error updating event:', error);
        return Response.json({
          success: false,
          error: 'Failed to update event',
          details: error.message
        }, { status: 500 });
      }
    }

    // Route: DELETE /calendarEvents/:id - Delete event
    if (method === 'DELETE' && pathParts.length === 2) {
      const eventId = pathParts[1];

      try {
        const events = await base44.asServiceRole.entities.CalendarEvent.filter({ id: eventId });
        const event = events[0];

        if (!event) {
          return Response.json({ error: 'Event not found' }, { status: 404 });
        }

        if (!hasAccessToEvent(event) && !isAdmin) {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        await base44.asServiceRole.entities.CalendarEvent.delete(eventId);

        return Response.json({
          success: true,
          message: 'Event deleted successfully'
        });
      } catch (error) {
        console.error('Error deleting event:', error);
        return Response.json({
          success: false,
          error: 'Failed to delete event',
          details: error.message
        }, { status: 500 });
      }
    }

    return Response.json({ error: 'Endpoint not found' }, { status: 404 });

  } catch (error) {
    console.error('Calendar Events API Error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
});