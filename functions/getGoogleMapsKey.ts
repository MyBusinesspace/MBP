import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Returns Google Maps API Key for frontend use
 * This is safe because Google Maps API keys are designed to be used in frontend
 * with domain restrictions configured in Google Cloud Console
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verify user is authenticated
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
        
        if (!apiKey) {
            console.error("GOOGLE_PLACES_API_KEY not set in environment");
            return Response.json({ error: 'API key not configured' }, { status: 500 });
        }

        return Response.json({ 
            apiKey: apiKey 
        });
        
    } catch (error) {
        console.error('Error getting Google Maps key:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});