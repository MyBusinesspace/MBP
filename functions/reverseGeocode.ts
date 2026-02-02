import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { lat, lon } = await req.json();
        
        if (!lat || !lon) {
            return Response.json({ error: 'Missing lat or lon' }, { status: 400 });
        }

        const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
        if (!apiKey) {
            return Response.json({ error: 'API key not configured' }, { status: 500 });
        }

        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${apiKey}`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.results && data.results.length > 0) {
            return Response.json({ 
                address: data.results[0].formatted_address,
                success: true 
            });
        }

        return Response.json({ 
            address: `${lat}, ${lon}`,
            success: false,
            error: data.status 
        });

    } catch (error) {
        console.error('Reverse geocode error:', error);
        return Response.json({ 
            error: error.message,
            address: 'Location unavailable' 
        }, { status: 500 });
    }
});