import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

const jsonToCsv = (items) => {
    const header = Object.keys(items[0]).join(',');
    const rows = items.map(item =>
        Object.values(item).map(value =>
            `"${String(value || '').replace(/"/g, '""')}"`
        ).join(',')
    );
    return [header, ...rows].join('\\n');
};

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const assets = await base44.asServiceRole.entities.Asset.list();

        if (!assets || assets.length === 0) {
            return new Response("No assets to export.", { status: 404 });
        }
        
        const csvData = jsonToCsv(assets.map(a => ({
            id: a.id,
            name: a.name,
            category: a.category,
            status: a.status,
            identifier: a.identifier,
            assigned_to_user_id: a.assigned_to_user_id,
            project_id: a.project_id,
            purchase_date: a.purchase_date,
            purchase_cost: a.purchase_cost,
            created_date: a.created_date,
        })));

        return new Response(csvData, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': 'attachment; filename="assets_export.csv"',
            },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});