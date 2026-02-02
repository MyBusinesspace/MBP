import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verificar autenticación
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Obtener el ID de la categoría del body
        const body = await req.json();
        const categoryId = body.id;
        
        if (!categoryId) {
            return Response.json({ 
                error: 'Category ID is required',
                message: 'Please provide an id in the request body'
            }, { status: 400 });
        }

        // Obtener todas las categorías usando service role
        const categories = await base44.asServiceRole.entities.ProjectCategory.list('sort_order', 1000);
        const targetCategory = categories.find(cat => cat.id === categoryId);
        
        if (!targetCategory) {
            return Response.json({ 
                error: 'Category not found',
                id: categoryId,
                message: `No project category found with ID: ${categoryId}`,
                available_categories: categories.length
            }, { status: 404 });
        }
        
        // Formatear datos de la categoría
        const formattedCategory = {
            id: targetCategory.id,
            name: targetCategory.name,
            color: targetCategory.color || 'blue',
            description: targetCategory.description || '',
            sort_order: targetCategory.sort_order || 0,
            created_date: targetCategory.created_date || null
        };
        
        return Response.json({
            ...formattedCategory,
            success: true
        });

    } catch (error) {
        console.error('Error getting project category by ID:', error);
        return Response.json({ 
            error: 'Failed to get project category',
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});