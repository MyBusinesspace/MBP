import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * User Documents API Handler
 * 
 * Endpoints:
 * - GET /api/users/:id/documents - List user documents
 * - GET /api/users/:id/documents/:docId - Get specific document
 * - POST /api/users/:id/documents - Upload document
 * - PUT /api/users/:id/documents/:docId - Update document metadata
 * - DELETE /api/users/:id/documents/:docId - Delete document
 * - GET /api/users/:id/documents/types - Get document types
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const method = req.method;

    // Authenticate user
    const currentUser = await base44.auth.me();
    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = pathParts[2];
    const isAdmin = currentUser.role === 'admin';
    const isOwnProfile = userId === currentUser.id;

    if (!isAdmin && !isOwnProfile) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Route: GET /api/users/:id/documents/types
    if (method === 'GET' && pathParts[4] === 'types') {
      const documentTypes = await base44.asServiceRole.entities.DocumentType.list('sort_order');
      
      return Response.json({
        success: true,
        data: documentTypes
      });
    }

    // Route: GET /api/users/:id/documents/:docId
    if (method === 'GET' && pathParts.length === 5) {
      const docId = pathParts[4];
      
      const docs = await base44.asServiceRole.entities.EmployeeDocument.filter({ id: docId });
      const doc = docs[0];

      if (!doc || doc.employee_id !== userId) {
        return Response.json({ error: 'Document not found' }, { status: 404 });
      }

      return Response.json({
        success: true,
        data: doc
      });
    }

    // Route: GET /api/users/:id/documents
    if (method === 'GET') {
      const documentTypeId = url.searchParams.get('document_type_id');
      
      let filters = { employee_id: userId };
      if (documentTypeId) filters.document_type_id = documentTypeId;

      const documents = await base44.asServiceRole.entities.EmployeeDocument.filter(filters);
      
      // Get document types for reference
      const documentTypes = await base44.asServiceRole.entities.DocumentType.list();
      const typeMap = {};
      documentTypes.forEach(type => {
        typeMap[type.id] = type.name;
      });

      // Enrich documents with type names
      const enrichedDocs = documents.map(doc => ({
        ...doc,
        type_name: typeMap[doc.document_type_id] || 'Unknown'
      }));

      return Response.json({
        success: true,
        data: enrichedDocs,
        count: enrichedDocs.length
      });
    }

    // Route: POST /api/users/:id/documents
    if (method === 'POST') {
      const formData = await req.formData();
      const documentTypeId = formData.get('document_type_id');
      const files = formData.getAll('files');
      const expiryDate = formData.get('expiry_date');
      const notes = formData.get('notes');

      if (!documentTypeId) {
        return Response.json({ error: 'document_type_id is required' }, { status: 400 });
      }

      if (!files || files.length === 0) {
        return Response.json({ error: 'At least one file is required' }, { status: 400 });
      }

      // Upload files using base44 integration
      const uploadPromises = files.map(file => 
        base44.asServiceRole.integrations.Core.UploadPrivateFile({ file })
      );
      const uploadResults = await Promise.all(uploadPromises);
      
      const fileUris = uploadResults.map(result => result.file_uri);
      const fileNames = files.map(file => file.name);

      // Create document record
      const newDocument = await base44.asServiceRole.entities.EmployeeDocument.create({
        employee_id: userId,
        document_type_id: documentTypeId,
        file_urls: fileUris,
        file_names: fileNames,
        upload_date: new Date().toISOString(),
        last_updated_date: new Date().toISOString(),
        expiry_date: expiryDate || null,
        notes: notes || null
      });

      return Response.json({
        success: true,
        data: newDocument,
        message: 'Document uploaded successfully'
      }, { status: 201 });
    }

    // Route: PUT /api/users/:id/documents/:docId
    if (method === 'PUT' && pathParts.length === 5) {
      const docId = pathParts[4];
      
      const docs = await base44.asServiceRole.entities.EmployeeDocument.filter({ id: docId });
      const doc = docs[0];

      if (!doc || doc.employee_id !== userId) {
        return Response.json({ error: 'Document not found' }, { status: 404 });
      }

      const body = await req.json();
      const updates = {};

      if (body.expiry_date !== undefined) updates.expiry_date = body.expiry_date;
      if (body.notes !== undefined) updates.notes = body.notes;
      
      updates.last_updated_date = new Date().toISOString();

      const updatedDoc = await base44.asServiceRole.entities.EmployeeDocument.update(docId, updates);

      return Response.json({
        success: true,
        data: updatedDoc,
        message: 'Document updated successfully'
      });
    }

    // Route: DELETE /api/users/:id/documents/:docId
    if (method === 'DELETE' && pathParts.length === 5) {
      if (!isAdmin && !currentUser.can_manage_documents) {
        return Response.json({ error: 'Forbidden - Document management permission required' }, { status: 403 });
      }

      const docId = pathParts[4];
      
      const docs = await base44.asServiceRole.entities.EmployeeDocument.filter({ id: docId });
      const doc = docs[0];

      if (!doc || doc.employee_id !== userId) {
        return Response.json({ error: 'Document not found' }, { status: 404 });
      }

      await base44.asServiceRole.entities.EmployeeDocument.delete(docId);

      return Response.json({
        success: true,
        message: 'Document deleted successfully'
      });
    }

    return Response.json({ error: 'Endpoint not found' }, { status: 404 });

  } catch (error) {
    console.error('User Documents API Error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
});