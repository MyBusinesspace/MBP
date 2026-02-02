import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * User Documents API Handler
 * 
 * Access URL: https://chronos-8ee5fab2.base44.app/functions/apiUsersDocuments?user_id={id}
 * 
 * Query Parameters:
 * - user_id: Required for all operations
 * - document_id: Required for GET/PUT/DELETE specific document
 * - document_type_id: Optional filter for GET list
 * - get_types: Set to 'true' to get document types
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const method = req.method;
    const userId = url.searchParams.get('user_id');
    const documentId = url.searchParams.get('document_id');
    const getTypes = url.searchParams.get('get_types') === 'true';

    if (!userId && !getTypes) {
      return Response.json({ error: 'user_id parameter is required' }, { status: 400 });
    }

    const currentUser = await base44.auth.me();
    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = currentUser.role === 'admin';
    const isOwnProfile = userId === currentUser.id;

    if (!isAdmin && !isOwnProfile && !getTypes) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // GET document types
    if (method === 'GET' && getTypes) {
      const documentTypes = await base44.asServiceRole.entities.DocumentType.list('sort_order');
      return Response.json({
        success: true,
        data: documentTypes
      });
    }

    // GET specific document
    if (method === 'GET' && documentId) {
      const docs = await base44.asServiceRole.entities.EmployeeDocument.filter({ id: documentId });
      const doc = docs[0];

      if (!doc || doc.employee_id !== userId) {
        return Response.json({ error: 'Document not found' }, { status: 404 });
      }

      return Response.json({
        success: true,
        data: doc
      });
    }

    // GET all documents for user
    if (method === 'GET') {
      const documentTypeId = url.searchParams.get('document_type_id');
      
      let filters = { employee_id: userId };
      if (documentTypeId) filters.document_type_id = documentTypeId;

      const documents = await base44.asServiceRole.entities.EmployeeDocument.filter(filters);
      
      const documentTypes = await base44.asServiceRole.entities.DocumentType.list();
      const typeMap = {};
      documentTypes.forEach(type => {
        typeMap[type.id] = type.name;
      });

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

    // POST - Upload document
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

      const uploadPromises = files.map(file => 
        base44.asServiceRole.integrations.Core.UploadPrivateFile({ file })
      );
      const uploadResults = await Promise.all(uploadPromises);
      
      const fileUris = uploadResults.map(result => result.file_uri);
      const fileNames = files.map(file => file.name);

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

    // PUT - Update document
    if (method === 'PUT' && documentId) {
      const docs = await base44.asServiceRole.entities.EmployeeDocument.filter({ id: documentId });
      const doc = docs[0];

      if (!doc || doc.employee_id !== userId) {
        return Response.json({ error: 'Document not found' }, { status: 404 });
      }

      const body = await req.json();
      const updates = {};

      if (body.expiry_date !== undefined) updates.expiry_date = body.expiry_date;
      if (body.notes !== undefined) updates.notes = body.notes;
      
      updates.last_updated_date = new Date().toISOString();

      const updatedDoc = await base44.asServiceRole.entities.EmployeeDocument.update(documentId, updates);

      return Response.json({
        success: true,
        data: updatedDoc,
        message: 'Document updated successfully'
      });
    }

    // DELETE - Delete document
    if (method === 'DELETE' && documentId) {
      if (!isAdmin && !currentUser.can_manage_documents) {
        return Response.json({ error: 'Forbidden - Document management permission required' }, { status: 403 });
      }

      const docs = await base44.asServiceRole.entities.EmployeeDocument.filter({ id: documentId });
      const doc = docs[0];

      if (!doc || doc.employee_id !== userId) {
        return Response.json({ error: 'Document not found' }, { status: 404 });
      }

      await base44.asServiceRole.entities.EmployeeDocument.delete(documentId);

      return Response.json({
        success: true,
        message: 'Document deleted successfully'
      });
    }

    return Response.json({ error: 'Invalid request' }, { status: 400 });

  } catch (error) {
    console.error('User Documents API Error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
});