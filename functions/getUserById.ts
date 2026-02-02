import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verificar autenticación
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Obtener el ID del usuario del body
        const body = await req.json();
        const userId = body.id;
        
        if (!userId) {
            return Response.json({ 
                error: 'User ID is required',
                message: 'Please provide an id in the request body'
            }, { status: 400 });
        }

        // Obtener todos los usuarios usando service role
        const users = await base44.asServiceRole.entities.User.list('sort_order', 1000);
        const targetUser = users.find(u => u.id === userId);
        
        if (!targetUser) {
            return Response.json({ 
                error: 'User not found',
                id: userId,
                message: `No user found with ID: ${userId}`
            }, { status: 404 });
        }
        
        // Formatear datos del usuario
        const formattedUser = {
            id: targetUser.id,
            full_name: targetUser.full_name || `${targetUser.first_name || ''} ${targetUser.last_name || ''}`.trim() || targetUser.email,
            first_name: targetUser.first_name || '',
            last_name: targetUser.last_name || '',
            nickname: targetUser.nickname || '',
            email: targetUser.email,
            role: targetUser.role || 'user',
            job_role: targetUser.job_role || '',
            status: targetUser.status || 'Active',
            team_id: targetUser.team_id || null,
            department: targetUser.department || '',
            employee_number: targetUser.employee_number || '',
            mobile_phone: targetUser.mobile_phone || '',
            country_code: targetUser.country_code || '',
            avatar_url: targetUser.avatar_url || null,
            is_team_leader: targetUser.is_team_leader || false,
            employment_start_date: targetUser.employment_start_date || null,
            birthday: targetUser.birthday || null,
            archived: targetUser.archived || false
        };
        
        return Response.json(formattedUser);

    } catch (error) {
        console.error('Error getting user by ID:', error);
        return Response.json({ 
            error: 'Failed to get user',
            details: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});