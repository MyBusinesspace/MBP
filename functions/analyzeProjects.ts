import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Fetch all projects
        const projects = await base44.entities.Project.list(1000);
        
        const stats = {
            total: projects.length,
            by_branch: {},
            missing_branch: 0
        };

        projects.forEach(p => {
            if (!p.branch_id) {
                stats.missing_branch++;
            } else {
                stats.by_branch[p.branch_id] = (stats.by_branch[p.branch_id] || 0) + 1;
            }
        });

        return Response.json({ stats });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});