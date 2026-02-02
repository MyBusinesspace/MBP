import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Usar el patrón exacto que funciona: especificar orden Y límite
        const users = await base44.asServiceRole.entities.User.list('sort_order', 1000);
        
        console.log('Retrieved users:', users);
        console.log('Users count:', users?.length);
        
        return Response.json({
            success: true,
            users: users || [],
            count: users?.length || 0
        });

    } catch (error) {
        console.error('Error in testGetUsers:', error);
        return Response.json({ 
            success: false,
            error: error.message,
            users: [],
            count: 0
        }, { status: 500 });
    }
});