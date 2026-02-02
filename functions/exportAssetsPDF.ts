import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all assets
        const assets = await base44.asServiceRole.entities.Asset.list('-updated_date', 1000);

        // Create PDF
        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.text('Assets Report', 20, 20);
        
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30);
        doc.text(`Total Assets: ${assets.length}`, 20, 37);
        
        // Table headers
        doc.setFontSize(10);
        doc.text('Asset Name', 20, 50);
        doc.text('Category', 80, 50);
        doc.text('Status', 120, 50);
        doc.text('Identifier', 160, 50);
        
        // Asset rows
        let y = 60;
        assets.forEach((asset) => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }
            
            doc.setFontSize(9);
            doc.text((asset.name || '').substring(0, 30), 20, y);
            doc.text(asset.category || '-', 80, y);
            doc.text(asset.status || '-', 120, y);
            doc.text((asset.identifier || '-').substring(0, 15), 160, y);
            y += 8;
        });

        const pdfBytes = doc.output('arraybuffer');

        return new Response(pdfBytes, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename=assets.pdf'
            }
        });
    } catch (error) {
        console.error('Export PDF error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});