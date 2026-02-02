import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Redcrane ID - securely hardcoded or could be fetched by name
        const redcraneId = '691bfdc1a0a7316f947facbb'; 
        
        // List all users (limit 1000)
        const users = await base44.entities.User.list(1000);
        
        // Filter users who don't have company_id
        const usersToUpdate = users.filter(u => !u.company_id);
        
        const results = [];
        
        for (const user of usersToUpdate) {
            await base44.entities.User.update(user.id, {
                company_id: redcraneId
            });
            results.push(user.id);
        }

        return Response.json({ 
            success: true,
            message: `Successfully assigned ${results.length} users to Redcrane`,
            updated_count: results.length
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});