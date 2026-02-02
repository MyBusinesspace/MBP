import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { address } = await req.json();
        
        if (!address) {
            return Response.json({ error: 'Missing address' }, { status: 400 });
        }

        const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
        if (!apiKey) {
            return Response.json({ error: 'API key not configured' }, { status: 500 });
        }

        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.results && data.results.length > 0) {
            const location = data.results[0].geometry.location;
            return Response.json({
                lat: location.lat,
                lon: location.lng,
                success: true
            });
        }

        return Response.json({
            error: `Geocoding failed: ${data.status}`,
            success: false
        }, { status: 400 });

    } catch (error) {
        console.error('Forward geocode error:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});