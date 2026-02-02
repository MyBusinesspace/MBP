import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { file_uri, expires_in = 3600 } = await req.json();

        if (!file_uri) {
            return Response.json({ error: 'file_uri is required' }, { status: 400 });
        }

        // Verificar si es una URL pública (no necesita signed URL)
        if (file_uri.includes('/storage/v1/object/public/')) {
            return Response.json({ signed_url: file_uri });
        }

        // Para archivos privados, crear signed URL
        try {
            const result = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
                file_uri: file_uri,
                expires_in: expires_in
            });

            // Modificar URL para inline display
            const urlObj = new URL(result.signed_url);
            urlObj.searchParams.set('response-content-disposition', 'inline');

            return Response.json({ signed_url: urlObj.toString() });
        } catch (innerError) {
            console.error('Error creating signed URL:', innerError);
            
            // Si falla la creación de signed URL, intentar devolver la URI original
            // (por si acaso es un archivo público mal etiquetado)
            return Response.json({ signed_url: file_uri });
        }
    } catch (error) {
        console.error('Error in createPreviewUrl:', error);
        return Response.json({ 
            error: error.message || 'Failed to create preview URL',
            details: error.toString()
        }, { status: 500 });
    }
});