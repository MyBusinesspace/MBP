import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { short_url } = await req.json();
        
        // Validate input
        if (!short_url || typeof short_url !== 'string') {
            return Response.json({ error: 'short_url parameter is required' }, { status: 400 });
        }

        const trimmedUrl = short_url.trim();
        
        // Validate it's a URL
        if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
            return Response.json({ 
                error: 'Invalid URL format. URL must start with http:// or https://' 
            }, { status: 400 });
        }

        console.log('📍 Resolving URL:', trimmedUrl);

        try {
            // Follow redirects to get the full URL
            const response = await fetch(trimmedUrl, {
                method: 'HEAD',
                redirect: 'follow',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const resolvedUrl = response.url;
            console.log('✅ Resolved URL:', resolvedUrl);

            // Extract coordinates from the resolved URL
            let lat = null;
            let lng = null;

            // Try different patterns to extract coordinates
            // Pattern 1: @lat,lng,zoom
            let coordsMatch = resolvedUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (coordsMatch) {
                lat = parseFloat(coordsMatch[1]);
                lng = parseFloat(coordsMatch[2]);
            }

            // Pattern 2: !3d and !4d (alternative format)
            if (!lat || !lng) {
                const latMatch = resolvedUrl.match(/!3d(-?\d+\.\d+)/);
                const lngMatch = resolvedUrl.match(/!4d(-?\d+\.\d+)/);
                if (latMatch && lngMatch) {
                    lat = parseFloat(latMatch[1]);
                    lng = parseFloat(lngMatch[1]);
                }
            }

            // Pattern 3: ll= parameter
            if (!lat || !lng) {
                const llMatch = resolvedUrl.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
                if (llMatch) {
                    lat = parseFloat(llMatch[1]);
                    lng = parseFloat(llMatch[2]);
                }
            }

            return Response.json({ 
                success: true,
                long_url: resolvedUrl,
                original_url: trimmedUrl,
                coordinates: lat && lng ? { lat, lng } : null
            });

        } catch (fetchError) {
            console.error('❌ Error fetching URL:', fetchError);
            
            // If fetch fails, try to extract coordinates from the original URL
            const coordsMatch = trimmedUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (coordsMatch) {
                return Response.json({
                    success: true,
                    long_url: trimmedUrl,
                    original_url: trimmedUrl,
                    coordinates: {
                        lat: parseFloat(coordsMatch[1]),
                        lng: parseFloat(coordsMatch[2])
                    }
                });
            }

            return Response.json({ 
                error: 'Failed to resolve URL: ' + fetchError.message,
                long_url: trimmedUrl,
                original_url: trimmedUrl,
                coordinates: null
            }, { status: 200 }); // Return 200 to allow frontend to handle gracefully
        }

    } catch (error) {
        console.error('❌ Error in resolveShortUrl:', error);
        return Response.json({ 
            error: 'Failed to process request: ' + error.message 
        }, { status: 500 });
    }
});