import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verificar autenticación
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Solo admins pueden crear categorías
        if (user.role !== 'admin') {
            return Response.json({ 
                error: 'Forbidden',
                message: 'Only administrators can create project categories'
            }, { status: 403 });
        }

        // Obtener datos del body
        const body = await req.json();
        const { name, color, description } = body;
        
        if (!name || name.trim() === '') {
            return Response.json({ 
                error: 'Category name is required',
                message: 'Please provide a name for the category'
            }, { status: 400 });
        }

        // Verificar si ya existe una categoría con ese nombre
        const existingCategories = await base44.asServiceRole.entities.ProjectCategory.list();
        const duplicate = existingCategories.find(cat => 
            cat.name.toLowerCase() === name.trim().toLowerCase()
        );
        
        if (duplicate) {
            return Response.json({ 
                error: 'Category already exists',
                message: `A category named "${name}" already exists`,
                existing_id: duplicate.id
            }, { status: 400 });
        }

        // Calcular el siguiente sort_order
        const maxSortOrder = existingCategories.reduce((max, cat) => 
            Math.max(max, cat.sort_order || 0), 0
        );

        // Crear nueva categoría usando service role
        const newCategory = await base44.asServiceRole.entities.ProjectCategory.create({
            name: name.trim(),
            color: color || 'blue',
            description: description || '',
            sort_order: maxSortOrder + 1
        });
        
        return Response.json({
            success: true,
            message: 'Project category created successfully',
            category: {
                id: newCategory.id,
                name: newCategory.name,
                color: newCategory.color,
                description: newCategory.description,
                sort_order: newCategory.sort_order
            }
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating project category:', error);
        return Response.json({ 
            error: 'Failed to create project category',
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});