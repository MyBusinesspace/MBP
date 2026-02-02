import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verificar autenticación
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Obtener los IDs del body
        const body = await req.json();
        const userIds = body.ids;
        
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return Response.json({ 
                error: 'User IDs array is required',
                message: 'Please provide an array of user IDs in the request body as "ids"'
            }, { status: 400 });
        }

        // Obtener todos los usuarios usando service role
        const allUsers = await base44.asServiceRole.entities.User.list('sort_order', 1000);
        
        // Filtrar solo los usuarios solicitados
        const requestedUsers = allUsers.filter(u => userIds.includes(u.id));
        
        // Formatear datos
        const formattedUsers = requestedUsers.map(u => ({
            id: u.id,
            full_name: u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
            first_name: u.first_name || '',
            last_name: u.last_name || '',
            nickname: u.nickname || '',
            email: u.email,
            role: u.role || 'user',
            job_role: u.job_role || '',
            status: u.status || 'Active',
            team_id: u.team_id || null,
            department: u.department || '',
            avatar_url: u.avatar_url || null,
            is_team_leader: u.is_team_leader || false,
            archived: u.archived || false
        }));
        
        // Identificar IDs no encontrados
        const foundIds = formattedUsers.map(u => u.id);
        const notFoundIds = userIds.filter(id => !foundIds.includes(id));
        
        return Response.json({
            users: formattedUsers,
            total: formattedUsers.length,
            requested: userIds.length,
            found: foundIds.length,
            not_found_ids: notFoundIds.length > 0 ? notFoundIds : [],
            not_found_count: notFoundIds.length
        });

    } catch (error) {
        console.error('Error getting users by IDs:', error);
        return Response.json({ 
            error: 'Failed to get users',
            details: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});