import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // ✅ FIXED: Cargar TODOS los usuarios sin filtrar por archived
        const users = await base44.asServiceRole.entities.User.list('sort_order', 1000);
        
        // ✅ NO filtrar usuarios archivados - devolver todos
        const formattedUsers = users.map(u => ({
            id: u.id,
            full_name: u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
            first_name: u.first_name || '',
            last_name: u.last_name || '',
            nickname: u.nickname || '',
            email: u.email,
            role: u.role || 'user',
            job_role: u.job_role || '',
            team_id: u.team_id || null,
            department: u.department || '',
            archived: u.archived || false,
            status: u.status || 'Pending',
            avatar_url: u.avatar_url || null
        }));
        
        console.log(`✅ Returning ${formattedUsers.length} users (including archived)`);
        
        return Response.json({
            success: true,
            users: formattedUsers,
            total: formattedUsers.length
        });

    } catch (error) {
        console.error('Error getting users:', error);
        return Response.json({ 
            success: false,
            error: 'Failed to get users',
            details: error.message
        }, { status: 500 });
    }
});