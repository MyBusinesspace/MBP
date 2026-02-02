import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        console.log('🔍 [getAllUsers] Function called');
        
        const base44 = createClientFromRequest(req);
        
        // ✅ FIX: Verificar autenticación de manera más robusta
        let currentUser;
        try {
            currentUser = await base44.auth.me();
        } catch (authError) {
            console.error('❌ [getAllUsers] Auth error:', authError);
            return Response.json({ error: 'Authentication failed', users: [] }, { status: 401 });
        }
        
        console.log('🔍 [getAllUsers] Current user:', {
            id: currentUser?.id,
            email: currentUser?.email,
            role: currentUser?.role
        });
        
        if (!currentUser) {
            console.error('❌ [getAllUsers] Unauthorized - no user');
            return Response.json({ error: 'Unauthorized', users: [] }, { status: 401 });
        }

        // ✅ FIX: Usar service role para obtener todos los usuarios con mejor manejo de errores
        console.log('🔍 [getAllUsers] Fetching users with service role...');
        let users;
        
        try {
            users = await base44.asServiceRole.entities.User.list('sort_order', 1000);
        } catch (dbError) {
            console.error('❌ [getAllUsers] Database error:', dbError);
            return Response.json({ 
                error: 'Failed to fetch users from database',
                users: [] 
            }, { status: 500 });
        }
        
        console.log(`✅ [getAllUsers] Retrieved ${users?.length || 0} users from DB`);
        
        if (users && users.length > 0) {
            console.log('🔍 [getAllUsers] Sample users:', users.slice(0, 3).map(u => ({
                id: u.id,
                email: u.email,
                first_name: u.first_name,
                last_name: u.last_name,
                status: u.status,
                archived: u.archived
            })));
        }
        
        const activeUsers = users?.filter(u => !u.archived) || [];
        console.log(`✅ [getAllUsers] Active (non-archived) users: ${activeUsers.length}`);
        
        return Response.json({ 
            users: users || [],
            total: users?.length || 0,
            active: activeUsers.length
        });
        
    } catch (error) {
        console.error('❌ [getAllUsers] Unexpected error:', error);
        console.error('❌ [getAllUsers] Error stack:', error.stack);
        return Response.json({ 
            error: 'Internal server error',
            message: error.message,
            users: [] 
        }, { status: 500 });
    }
});