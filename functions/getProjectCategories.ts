import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const categories = await base44.asServiceRole.entities.ProjectCategory.list('sort_order', 1000);
        
        const formattedCategories = categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            color: cat.color || 'blue',
            description: cat.description || '',
            sort_order: cat.sort_order || 0
        }));
        
        return Response.json({
            success: true,
            categories: formattedCategories,
            total: formattedCategories.length
        });

    } catch (error) {
        console.error('Error getting project categories:', error);
        return Response.json({ 
            success: false,
            error: 'Failed to get project categories',
            details: error.message
        }, { status: 500 });
    }
});