import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Usar el patrón exacto que funciona: especificar orden Y límite
        const categories = await base44.asServiceRole.entities.ProjectCategory.list('sort_order', 1000);
        
        console.log('Retrieved categories:', categories);
        console.log('Categories count:', categories?.length);
        
        return Response.json({
            success: true,
            categories: categories || [],
            count: categories?.length || 0
        });

    } catch (error) {
        console.error('Error in testGetCategories:', error);
        return Response.json({ 
            success: false,
            error: error.message,
            categories: [],
            count: 0
        }, { status: 500 });
    }
});