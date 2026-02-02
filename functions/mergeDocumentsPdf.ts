import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { PDFDocument } from 'npm:pdf-lib@1.17.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_uris } = await req.json();
    if (!Array.isArray(file_uris) || file_uris.length === 0) {
      return Response.json({ error: 'file_uris must be a non-empty array' }, { status: 400 });
    }

    // Helper to get a public URL for a file (handles private URIs)
    const getUrl = async (uri) => {
      if (!uri) return null;
      const isPublic = uri.startsWith('http://') || uri.startsWith('https://') || uri.includes('/storage/v1/object/public/');
      if (isPublic) return uri;
      // private URI -> signed url
      const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: uri, expires_in: 3600 });
      return signed_url || uri;
    };

    const mergedPdf = await PDFDocument.create();
    const A4_WIDTH = 595.28; // pt
    const A4_HEIGHT = 841.89; // pt

    let pagesAdded = 0;
    for (const uri of file_uris) {
      try {
        const url = await getUrl(uri);
        const res = await fetch(url);
        if (!res.ok) continue;
        const contentType = res.headers.get('content-type') || '';
        const bytes = new Uint8Array(await res.arrayBuffer());

        if (contentType.includes('pdf') || uri.toLowerCase().endsWith('.pdf')) {
          const srcPdf = await PDFDocument.load(bytes);
          const pages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
          pages.forEach((p) => { mergedPdf.addPage(p); pagesAdded++; });
        } else if (contentType.includes('jpeg') || contentType.includes('jpg') || uri.toLowerCase().endsWith('.jpg') || uri.toLowerCase().endsWith('.jpeg')) {
          const img = await mergedPdf.embedJpg(bytes);
          const page = mergedPdf.addPage([A4_WIDTH, A4_HEIGHT]);
          const scale = Math.min(A4_WIDTH / img.width, A4_HEIGHT / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          const x = (A4_WIDTH - w) / 2;
          const y = (A4_HEIGHT - h) / 2;
          page.drawImage(img, { x, y, width: w, height: h });
        } else if (contentType.includes('png') || uri.toLowerCase().endsWith('.png') || contentType.includes('webp') || uri.toLowerCase().endsWith('.webp')) {
          const img = await mergedPdf.embedPng(bytes);
          const page = mergedPdf.addPage([A4_WIDTH, A4_HEIGHT]);
          const scale = Math.min(A4_WIDTH / img.width, A4_HEIGHT / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          const x = (A4_WIDTH - w) / 2;
          const y = (A4_HEIGHT - h) / 2;
          page.drawImage(img, { x, y, width: w, height: h });
        } else {
          // Unsupported: skip silently
          continue;
        }
      } catch (_e) {
        // skip file on error
        continue;
      }
    }

    if (pagesAdded === 0) {
      return Response.json({ error: 'No supported files to merge' }, { status: 400 });
    }

    const pdfBytes = await mergedPdf.save();

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="documents.pdf"',
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    return Response.json({ error: error.message || 'merge failed' }, { status: 500 });
  }
});