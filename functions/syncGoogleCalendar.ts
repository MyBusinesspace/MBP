import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // 1. Get Access Token
        // Note: getAccessToken returns a string directly, or null/error if not found
        let accessToken;
        try {
            accessToken = await base44.asServiceRole.connectors.getAccessToken("googlecalendar");
        } catch (e) {
            return Response.json({ connected: false, error: "Not connected" }, { status: 200 });
        }

        if (!accessToken) {
             return Response.json({ connected: false }, { status: 200 });
        }

        // 2. Parse query params for date range (optional, default to wide range for year view)
        // For simplicity, let's fetch a wide range around today (e.g. current year +/- 1)
        const now = new Date();
        const start = new Date(now.getFullYear() - 1, 0, 1).toISOString();
        const end = new Date(now.getFullYear() + 1, 11, 31).toISOString();

        // 3. Fetch Events
        const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${start}&timeMax=${end}&singleEvents=true&orderBy=startTime&maxResults=2500`, 
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        if (!response.ok) {
            if (response.status === 401) {
                return Response.json({ connected: false, error: "Token expired" }, { status: 200 });
            }
            const err = await response.text();
            throw new Error(`Google API Error: ${err}`);
        }

        const data = await response.json();
        
        // 4. Transform
        const events = (data.items || []).map(item => ({
            id: `g_${item.id}`,
            title: item.summary || '(No Title)',
            description: item.description || '',
            start_time: item.start.dateTime || (item.start.date ? new Date(item.start.date).toISOString() : null),
            end_time: item.end.dateTime || (item.end.date ? new Date(item.end.date).toISOString() : null),
            location: item.location || '',
            event_type: 'Google', 
            all_day: !item.start.dateTime,
            is_google_event: true,
            htmlLink: item.htmlLink,
            status: item.status
        })).filter(e => e.start_time && e.end_time && e.status !== 'cancelled');

        return Response.json({ connected: true, events });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});