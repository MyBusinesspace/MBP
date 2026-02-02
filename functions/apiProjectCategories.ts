import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verificar autenticación
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const url = new URL(req.url);
        const method = req.method;

        // GET - Listar todas las categorías o obtener una por ID
        if (method === 'GET') {
            const categoryId = url.searchParams.get('id');
            
            if (categoryId) {
                // Obtener una categoría específica por ID
                try {
                    const categories = await base44.entities.ProjectCategory.list();
                    const category = categories.find(cat => cat.id === categoryId);
                    
                    if (!category) {
                        return Response.json({ 
                            error: 'Category not found',
                            id: categoryId 
                        }, { status: 404 });
                    }
                    
                    return Response.json({
                        id: category.id,
                        name: category.name,
                        color: category.color,
                        description: category.description,
                        sort_order: category.sort_order
                    });
                } catch (error) {
                    console.error('Error fetching category:', error);
                    return Response.json({ 
                        error: 'Failed to fetch category',
                        details: error.message 
                    }, { status: 500 });
                }
            } else {
                // Listar todas las categorías
                try {
                    const categories = await base44.entities.ProjectCategory.list('sort_order');
                    
                    const formattedCategories = categories.map(cat => ({
                        id: cat.id,
                        name: cat.name,
                        color: cat.color,
                        description: cat.description || '',
                        sort_order: cat.sort_order || 0
                    }));
                    
                    return Response.json({
                        categories: formattedCategories,
                        total: formattedCategories.length
                    });
                } catch (error) {
                    console.error('Error listing categories:', error);
                    return Response.json({ 
                        error: 'Failed to list categories',
                        details: error.message 
                    }, { status: 500 });
                }
            }
        }

        // POST - Crear nueva categoría
        if (method === 'POST') {
            try {
                const body = await req.json();
                const { name, color, description } = body;
                
                if (!name) {
                    return Response.json({ 
                        error: 'Category name is required' 
                    }, { status: 400 });
                }
                
                const categories = await base44.entities.ProjectCategory.list();
                const maxSortOrder = categories.reduce((max, cat) => 
                    Math.max(max, cat.sort_order || 0), 0
                );
                
                const newCategory = await base44.entities.ProjectCategory.create({
                    name,
                    color: color || 'blue',
                    description: description || '',
                    sort_order: maxSortOrder + 1
                });
                
                return Response.json({
                    success: true,
                    category: {
                        id: newCategory.id,
                        name: newCategory.name,
                        color: newCategory.color,
                        description: newCategory.description,
                        sort_order: newCategory.sort_order
                    }
                }, { status: 201 });
            } catch (error) {
                console.error('Error creating category:', error);
                return Response.json({ 
                    error: 'Failed to create category',
                    details: error.message 
                }, { status: 500 });
            }
        }

        // PUT - Actualizar categoría existente
        if (method === 'PUT') {
            try {
                const body = await req.json();
                const { id, name, color, description } = body;
                
                if (!id) {
                    return Response.json({ 
                        error: 'Category ID is required' 
                    }, { status: 400 });
                }
                
                const updateData = {};
                if (name !== undefined) updateData.name = name;
                if (color !== undefined) updateData.color = color;
                if (description !== undefined) updateData.description = description;
                
                const updatedCategory = await base44.entities.ProjectCategory.update(id, updateData);
                
                return Response.json({
                    success: true,
                    category: {
                        id: updatedCategory.id,
                        name: updatedCategory.name,
                        color: updatedCategory.color,
                        description: updatedCategory.description,
                        sort_order: updatedCategory.sort_order
                    }
                });
            } catch (error) {
                console.error('Error updating category:', error);
                return Response.json({ 
                    error: 'Failed to update category',
                    details: error.message 
                }, { status: 500 });
            }
        }

        // DELETE - Eliminar categoría
        if (method === 'DELETE') {
            try {
                const body = await req.json();
                const { id } = body;
                
                if (!id) {
                    return Response.json({ 
                        error: 'Category ID is required' 
                    }, { status: 400 });
                }
                
                await base44.entities.ProjectCategory.delete(id);
                
                return Response.json({
                    success: true,
                    message: 'Category deleted successfully'
                });
            } catch (error) {
                console.error('Error deleting category:', error);
                return Response.json({ 
                    error: 'Failed to delete category',
                    details: error.message 
                }, { status: 500 });
            }
        }

        return Response.json({ 
            error: 'Method not allowed' 
        }, { status: 405 });

    } catch (error) {
        console.error('Unexpected error:', error);
        return Response.json({ 
            error: 'Internal server error',
            details: error.message 
        }, { status: 500 });
    }
});