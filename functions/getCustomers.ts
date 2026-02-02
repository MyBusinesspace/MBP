import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verificar con un secreto simple
        const url = new URL(req.url);
        const apiKey = url.searchParams.get('key');
        
        const expectedKey = Deno.env.get("CUSTOMERS_API_KEY");
        
        if (!apiKey || apiKey !== expectedKey) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const customers = await base44.asServiceRole.entities.Customer.list();
        
        return Response.json({ 
            success: true,
            count: customers.length,
            customers 
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});