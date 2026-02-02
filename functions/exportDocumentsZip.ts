import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import JSZip from 'npm:jszip@3.10.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const file_uris = Array.isArray(body?.file_uris) ? body.file_uris : [];
    const file_names = Array.isArray(body?.file_names) ? body.file_names : [];

    if (file_uris.length === 0) {
      return Response.json({ error: 'No file URIs provided' }, { status: 400 });
    }

    const zip = new JSZip();
    let added = 0;

    for (let i = 0; i < file_uris.length; i++) {
      const fileUri = file_uris[i];
      try {
        const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
          file_uri: fileUri,
          expires_in: 300,
        });

        const response = await fetch(signed_url);
        if (!response.ok) {
          console.warn(`Failed to fetch file: ${fileUri}, status: ${response.status}`);
          continue;
        }
        const buf = await response.arrayBuffer();
        const fallbackName = (fileUri?.split('/')?.pop()) || `file_${i + 1}`;
        const name = file_names[i] || fallbackName;
        zip.file(name, buf);
        added++;
      } catch (err) {
        console.error('Error processing file', fileUri, err);
      }
    }

    if (added === 0) {
      return Response.json({ error: 'No files could be downloaded or processed' }, { status: 422 });
    }

    const zipped = await zip.generateAsync({ type: 'uint8array' });

    return new Response(zipped, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="documents.zip"',
      },
    });
  } catch (error) {
    console.error('exportDocumentsZip error:', error);
    return Response.json({ error: error?.message || 'Internal error' }, { status: 500 });
  }
});