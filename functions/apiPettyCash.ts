import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { format, parseISO, startOfMonth, endOfMonth } from 'https://cdn.skypack.dev/date-fns';

/**
 * Petty Cash API with User ID Authentication
 * 
 * Authentication:
 * - Pass user_id in request headers as 'X-User-ID' or 'user_id'
 * - Or pass API key as 'X-API-Key' or 'api_key'
 * 
 * Endpoints:
 * - GET /api/petty-cash - List petty cash entries with filters
 * - GET /api/petty-cash/:id - Get single petty cash entry
 * - GET /api/petty-cash?action=balance&employee_id=<id> - Get employee balance
 * - GET /api/petty-cash?action=categories - List all categories
 * - POST /api/petty-cash?action=create - Create petty cash entry
 * - POST /api/petty-cash?action=upload-documents&entry_id=<id> - Upload documents to entry
 * - POST /api/petty-cash?action=create-category - Create category (admin only)
 * - PUT /api/petty-cash?action=update&entry_id=<id> - Update entry
 * - PUT /api/petty-cash?action=update-category&category_id=<id> - Update category (admin only)
 * - DELETE /api/petty-cash/:id - Delete entry
 * - DELETE /api/petty-cash?action=delete-category&category_id=<id> - Delete category (admin only)
 */
 
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const method = req.method;

    // Get user ID from headers or query params
    const userId = req.headers.get('X-User-ID') || 
                   req.headers.get('user_id') ||
                   url.searchParams.get('user_id');

    const apiKey = req.headers.get('X-API-Key') || 
                   req.headers.get('api_key') ||
                   url.searchParams.get('api_key');

    if (!userId && !apiKey) {
      return Response.json({ 
        error: 'Authentication required. Provide user_id or api_key in headers or query params.',
        example: 'Headers: X-User-ID: your-user-id or X-API-Key: your-api-key'
      }, { status: 401 });
    } 
 
    // Verify user exists and get their role
    let user = null;
    
    if (userId) {
      const users = await base44.asServiceRole.entities.User.list();
      user = users.find(u => u.id === userId);
      
      if (!user) {
        return Response.json({ error: 'Invalid user_id' }, { status: 401 });
      }

      if (user.archived) {
        return Response.json({ error: 'User account is archived' }, { status: 403 });
      }
    } else if (apiKey) {
      const users = await base44.asServiceRole.entities.User.list();
      user = users.find(u => u.id === apiKey || u.email === apiKey);
      
      if (!user) {
        return Response.json({ error: 'Invalid api_key' }, { status: 401 });
      }
    }

    // Helper function to check if user is admin
    const isAdmin = () => user && user.role === 'admin';

    const action = url.searchParams.get('action');

    // GET /api/petty-cash?action=balance&employee_id=<id> - Get employee balance
    if (method === 'GET' && action === 'balance') {
      const employeeId = url.searchParams.get('employee_id');

      if (!employeeId) {
        return Response.json({ 
          error: 'employee_id parameter is required',
          example: 'GET /api/petty-cash?action=balance&employee_id=<employee-id>&user_id=<user-id>'
        }, { status: 400 });
      }

      try {
        // Get all entries for this employee
        const allEntries = await base44.asServiceRole.entities.PettyCashEntry.list('-created_date');
        const employeeEntries = allEntries.filter(e => e.employee_id === employeeId);

        // Calculate balance
        let balance = 0;
        employeeEntries.forEach(entry => {
          balance += entry.amount || 0;
        });

        return Response.json({
          success: true,
          data: {
            employee_id: employeeId,
            balance: balance,
            total_entries: employeeEntries.length,
            total_expenses: employeeEntries.filter(e => e.type === 'expense').length,
            total_inputs: employeeEntries.filter(e => e.type === 'input').length
          },
          authenticated_as: {
            user_id: user.id,
            email: user.email,
            role: user.role
          }
        });
      } catch (error) {
        console.error('Error calculating balance:', error);
        return Response.json({
          success: false,
          error: 'Failed to calculate balance',
          details: error.message
        }, { status: 500 });
      }
    }

    // GET /api/petty-cash?action=categories - List all categories
    if (method === 'GET' && action === 'categories') {
      try {
        const categories = await base44.asServiceRole.entities.PettyCashCategory.list('sort_order');

        return Response.json({
          success: true,
          data: categories,
          authenticated_as: {
            user_id: user.id,
            email: user.email,
            role: user.role
          }
        });
      } catch (error) {
        console.error('Error listing categories:', error);
        return Response.json({
          success: false,
          error: 'Failed to list categories',
          details: error.message
        }, { status: 500 });
      }
    }

    // GET /api/petty-cash - List petty cash entries with filters
    // if (method === 'GET' && !action && !url.pathname.split('/').pop().match(/^[a-f0-9-]{36}$/i)) {
    //   try {
    //     const employeeId = url.searchParams.get('employee_id');
    //     const type = url.searchParams.get('type'); // 'expense' or 'input'
    //     const categoryId = url.searchParams.get('category_id');
    //     const startDate = url.searchParams.get('start_date');
    //     const endDate = url.searchParams.get('end_date');
    //     const limit = parseInt(url.searchParams.get('limit') || '100');
    //     const offset = parseInt(url.searchParams.get('offset') || '0');
    //     const sortBy = url.searchParams.get('sort_by') || '-created_date';

    //     // Fetch all entries
    //     let entries = await base44.asServiceRole.entities.PettyCashEntry.list(sortBy, limit + offset);

    //     // Apply filters
    //     entries = entries.filter(entry => {
    //       // Filter by employee
    //       if (employeeId && entry.employee_id !== employeeId) return false;

    //       // Filter by type
    //       if (type && entry.type !== type) return false;

    //       // Filter by category
    //       if (categoryId && entry.category_id !== categoryId) return false;

    //       // Filter by date range
    //       if ((startDate || endDate) && entry.date) {
    //         const entryDate = new Date(entry.date);
    //         const start = startDate ? new Date(startDate) : null;
    //         const end = endDate ? new Date(endDate) : null;
    //         if (start && entryDate < start) return false;
    //         if (end && entryDate > end) return false;
    //       }

    //       return true;
    //     });

    //     // Apply pagination
    //     const paginatedEntries = entries.slice(offset, offset + limit);

    //     // Calculate totals
    //     const totalExpenses = entries
    //       .filter(e => e.type === 'expense')
    //       .reduce((sum, e) => sum + Math.abs(e.amount || 0), 0);
        
    //     const totalInputs = entries
    //       .filter(e => e.type === 'input')
    //       .reduce((sum, e) => sum + (e.amount || 0), 0);

    //     return Response.json({
    //       success: true,
    //       data: paginatedEntries,
    //       summary: {
    //         total_expenses: totalExpenses,
    //         total_inputs: totalInputs,
    //         balance: totalInputs - totalExpenses
    //       },
    //       pagination: {
    //         total: entries.length,
    //         limit,
    //         offset,
    //         hasMore: entries.length > offset + limit
    //       },
    //       authenticated_as: {
    //         user_id: user.id,
    //         email: user.email,
    //         role: user.role
    //       }
    //     }); 
    //   } catch (error) {
    //     console.error('Error listing petty cash entries:', error);
    //     return Response.json({
    //       success: false,
    //       error: 'Failed to list petty cash entries',
    //       details: error.message
    //     }, { status: 500 });
    //   }
    // }

    // // GET /api/petty-cash/:id - Get single petty cash entry
    // if (method === 'GET' && action === 'get') {
    //         const entryId = url.searchParams.get('id');
   
    //             try {
    //                 const entries = await base44.asServiceRole.entities.PettyCashEntry.list();
    //                 const entry = entries.find(e => e.id === entryId);

    //                 if (!entry) {
    //                 return Response.json({ error: 'Petty cash entry not found' }, { status: 404 });
    //                 }

    //                 return Response.json({
    //                 success: true,
    //                 data: entry,
    //                 authenticated_as: {
    //                     user_id: user.id,
    //                     email: user.email,
    //                     role: user.role
    //                 }
    //                 });
    //             } catch (error) {
    //                 console.error('Error fetching petty cash entry:', error);
    //                 return Response.json({
    //                 success: false,
    //                 error: 'Failed to fetch petty cash entry',
    //                 details: error.message
    //                 }, { status: 500 });
    //             }
    // }

// GET /api/petty-cash - List petty cash entries with filters
if (method === 'GET' && !action && !url.pathname.split('/').pop().match(/^[a-f0-9-]{36}$/i)) {
  try {
    const employeeId = url.searchParams.get('employee_id');
    const type = url.searchParams.get('type');
    const categoryId = url.searchParams.get('category_id');
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const sortBy = url.searchParams.get('sort_by') || '-created_date';

    // Fetch all entries
    let entries = await base44.asServiceRole.entities.PettyCashEntry.list(sortBy, limit + offset);

    // Apply filters
    entries = entries.filter(entry => {
      if (employeeId && entry.employee_id !== employeeId) return false;
      if (type && entry.type !== type) return false;
      if (categoryId && entry.category_id !== categoryId) return false;

      if ((startDate || endDate) && entry.date) {
        const entryDate = new Date(entry.date);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (start && entryDate < start) return false;
        if (end && entryDate > end) return false;
      }

      return true;
    });

    // Apply pagination
    const paginatedEntries = entries.slice(offset, offset + limit);

    // Fetch all users ONCE
    const allUsers = await base44.asServiceRole.entities.User.list("-created_date", 500);
    const usersMap = {};
    allUsers.forEach(u => (usersMap[u.id] = u));

    // Enrich entries with employee data
    const enrichedEntries = paginatedEntries.map(entry => {
      const u = usersMap[entry.employee_id];

      return {
        ...entry,
        employee: u
          ? {
              id: u.id,
              first_name: u.first_name || "",
              last_name: u.last_name || "",
              full_name: `${u.first_name || ""} ${u.last_name || ""}`.trim(),
              avatar_url: u.avatar_url || null
            }
          : null
      };
    });

    // Calculate totals
    const totalExpenses = entries
      .filter(e => e.type === 'expense')
      .reduce((sum, e) => sum + Math.abs(e.amount || 0), 0);

    const totalInputs = entries
      .filter(e => e.type === 'input')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    return Response.json({
      success: true,
      data: enrichedEntries,
      summary: {
        total_expenses: totalExpenses,
        total_inputs: totalInputs,
        balance: totalInputs - totalExpenses
      },
      pagination: {
        total: entries.length,
        limit,
        offset,
        hasMore: entries.length > offset + limit
      },
      authenticated_as: {
        user_id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error listing petty cash entries:', error);
    return Response.json({
      success: false,
      error: 'Failed to list petty cash entries',
      details: error.message
    }, { status: 500 });
  }
}

// GET /api/petty-cash?action=employee-stats&employee_id=<id>
// Returns full summary + transactions for a single employee
if (method === 'GET' && action === 'employee-stats') {
  const employeeId = url.searchParams.get('employee_id');

  if (!employeeId) {
    return Response.json({
      success: false,
      error: "employee_id is required"
    }, { status: 400 });
  }

  try {
    // Load all entries
    const allEntries = await base44.asServiceRole.entities.PettyCashEntry.list("-created_date");

    // Filter entries of the requested employee
    const employeeEntries = allEntries.filter(e => e.employee_id === employeeId);

    // Summaries
    const totalInputs = employeeEntries
      .filter(e => e.type === "input")
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const totalExpenses = employeeEntries
      .filter(e => e.type === "expense")
      .reduce((sum, e) => sum + Math.abs(e.amount || 0), 0);

    const balance = totalInputs - totalExpenses;

    // Fetch user info
    const allUsers = await base44.asServiceRole.entities.User.list();
    const employee = allUsers.find(u => u.id === employeeId) || null;

    // Enriched transactions
    const enrichedTransactions = employeeEntries.map(e => ({
      ...e,
      amount_abs: Math.abs(e.amount || 0),
      formatted_date: e.date ? new Date(e.date).toISOString().split("T")[0] : null
    }));

    return Response.json({
      success: true,
      employee: employee ? {
        id: employee.id,
        full_name: `${employee.first_name || ""} ${employee.last_name || ""}`.trim(),
        avatar_url: employee.avatar_url || null,
        email: employee.email
      } : null,

      summary: {
        total_inputs: totalInputs,
        total_expenses: totalExpenses,
        balance: balance,
        total_transactions: employeeEntries.length
      },

      transactions: enrichedTransactions,

      authenticated_as: {
        user_id: user.id,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error("Error generating employee stats:", error);
    return Response.json({
      success: false,
      error: "Failed to generate employee data",
      details: error.message
    }, { status: 500 });
  }
}

// GET /api/petty-cash/:id - Get single petty cash entry
if (method === 'GET' && action === 'get') {
  const entryId = url.searchParams.get('id');

  try {
    const entries = await base44.asServiceRole.entities.PettyCashEntry.list();
    const entry = entries.find(e => e.id === entryId);

    if (!entry) {
      return Response.json({ error: 'Petty cash entry not found' }, { status: 404 });
    }

    // Get employee info
    const users = await base44.asServiceRole.entities.User.list();
    const u = users.find(x => x.id === entry.employee_id);

    const enrichedEntry = {
      ...entry,
      employee: u
        ? {
            id: u.id,
            first_name: u.first_name || "",
            last_name: u.last_name || "",
            full_name: `${u.first_name || ""} ${u.last_name || ""}`.trim(),
            avatar_url: u.avatar_url || null
          }
        : null
    };

    return Response.json({
      success: true,
      data: enrichedEntry,
      authenticated_as: {
        user_id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error fetching petty cash entry:', error);
    return Response.json({
      success: false,
      error: 'Failed to fetch petty cash entry',
      details: error.message
    }, { status: 500 });
  }
}


    // // POST /api/petty-cash?action=create - Create petty cash entry
    // if (method === 'POST' && action === 'create') {
    //   try {
    //     const body = await req.json();

    //     // Validate required fields
    //     if (!body.employee_id) {
    //       return Response.json({ error: 'employee_id is required' }, { status: 400 });
    //     }

    //     if (!body.type || !['expense', 'input'].includes(body.type)) {
    //       return Response.json({ error: 'type is required and must be "expense" or "input"' }, { status: 400 });
    //     }

    //     if (body.amount === undefined || body.amount === null) {
    //       return Response.json({ error: 'amount is required' }, { status: 400 });
    //     }

    //     if (!body.date) {
    //       return Response.json({ error: 'date is required' }, { status: 400 });
    //     }

    //     // Create entry data
    //     const entryData = {
    //       employee_id: body.employee_id,
    //       type: body.type,
    //       amount: body.type === 'expense' ? -Math.abs(body.amount) : Math.abs(body.amount),
    //       date: body.date,
    //       category_id: body.category_id || null,
    //       provider_detail: body.provider_detail || '',
    //       note_number: body.note_number || '',
    //       description: body.description || '',
    //       document_urls: body.document_urls || []
    //     };

    //     const createdEntry = await base44.asServiceRole.entities.PettyCashEntry.create(entryData);

    //     return Response.json({
    //       success: true,
    //       data: createdEntry,
    //       message: 'Petty cash entry created successfully',
    //       created_by: {
    //         user_id: user.id,
    //         email: user.email
    //       }
    //     }, { status: 201 });
    //   } catch (error) {
    //     console.error('Error creating petty cash entry:', error);
    //     return Response.json({
    //       success: false,
    //       error: 'Failed to create petty cash entry',
    //       details: error.message
    //     }, { status: 500 });
    //   }
    // }

    // // POST /api/petty-cash?action=upload-documents&entry_id=<id> - Upload documents
    // if (method === 'POST' && action === 'upload-documents') {
    //   const entryId = url.searchParams.get('entry_id');

    //   if (!entryId) {
    //     return Response.json({ 
    //       error: 'entry_id parameter is required',
    //       example: 'POST /api/petty-cash?action=upload-documents&entry_id=<entry-id>&user_id=<user-id>'
    //     }, { status: 400 });
    //   }

    //   try {
    //     // Parse multipart form data
    //     const formData = await req.formData();
    //     const files = formData.getAll('files');

    //     if (!files || files.length === 0) {
    //       return Response.json({ 
    //         error: 'No files uploaded. Include files in form-data with key "files"',
    //         example: 'Send multipart/form-data with field name "files"'
    //       }, { status: 400 });
    //     }

    //     // Get the entry
    //     const entries = await base44.asServiceRole.entities.PettyCashEntry.list();
    //     const entry = entries.find(e => e.id === entryId);

    //     if (!entry) {
    //       return Response.json({ error: 'Petty cash entry not found' }, { status: 404 });
    //     }

    //     // Check permissions
    //     if (!isAdmin() && entry.employee_id !== user.id) {
    //       return Response.json({ 
    //         error: 'You do not have permission to upload documents to this entry',
    //         your_role: user.role
    //       }, { status: 403 });
    //     }

    //     const uploadedFileUrls = [];
    //     const failedUploads = [];

    //     // Upload each file
    //     for (const file of files) {
    //       try {
    //         console.log(`Uploading file: ${file.name}, size: ${file.size} bytes`);
            
    //         const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });
            
    //         if (!uploadResult || !uploadResult.file_url) {
    //           throw new Error('Upload failed - no file URL returned');
    //         }

    //         uploadedFileUrls.push({
    //           name: file.name,
    //           size: file.size,
    //           url: uploadResult.file_url,
    //           uploaded_at: new Date().toISOString()
    //         });

    //         console.log(`✅ Successfully uploaded: ${file.name}`);
    //       } catch (uploadError) {
    //         console.error(`❌ Failed to upload ${file.name}:`, uploadError);
    //         failedUploads.push({
    //           name: file.name,
    //           error: uploadError.message
    //         });
    //       }
    //     }

    //     // Update entry with new document URLs
    //     const existingDocUrls = entry.document_urls || [];
    //     const newDocUrls = uploadedFileUrls.map(f => f.url);
        
    //     const updatedEntry = await base44.asServiceRole.entities.PettyCashEntry.update(entryId, {
    //       document_urls: [...existingDocUrls, ...newDocUrls]
    //     });

    //     return Response.json({
    //       success: true,
    //       message: `Uploaded ${uploadedFileUrls.length} document(s) successfully`,
    //       data: {
    //         entry: updatedEntry,
    //         uploaded_documents: uploadedFileUrls,
    //         failed_uploads: failedUploads.length > 0 ? failedUploads : undefined
    //       },
    //       uploaded_by: {
    //         user_id: user.id,
    //         email: user.email
    //       }
    //     }, { status: 200 });

    //   } catch (error) {
    //     console.error('Error uploading documents:', error);
    //     return Response.json({
    //       success: false,
    //       error: 'Failed to upload documents',
    //       details: error.message
    //     }, { status: 500 });
    //   }
    // }
    //   // POST /api/petty-cash?action=analyze-document&entry_id=<id>&file_url=<url>
    //   if (method === 'POST' && action === 'analyze-document') {
    //           //   const entryId = url.searchParams.get('entry_id');
    //             const fileUrl = url.searchParams.get('file_url');

    //             if (!fileUrl) {
    //               return Response.json({
    //                 error: 'entry_id and file_url parameters are required',
    //                 example: 'POST /api/petty-cash?action=analyze-document&entry_id=<id>&file_url=<url>'
    //               }, { status: 400 });
    //             }

    //             try {
    //               // Get the entry
    //               // const entries = await base44.asServiceRole.entities.PettyCashEntry.list();
    //               // const entry = entries.find(e => e.id === entryId);

    //               // if (!entry) {
    //               //   return Response.json({ error: 'Petty cash entry not found' }, { status: 404 });
    //               // }

    //               // Check permissions
    //               // if (!isAdmin() && entry.employee_id !== user.id) {
    //               //   return Response.json({ 
    //               //     error: 'You do not have permission to analyze documents for this entry',
    //               //     your_role: user.role
    //               //   }, { status: 403 });
    //               // }

    //               // AI analysis
    //               const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    //                 prompt: `You are an invoice/receipt data extraction expert. Analyze this invoice/receipt image and extract the following information:
                    
    //           1. Total amount/cost
    //           2. Provider/vendor/merchant name
    //           3. Date (YYYY-MM-DD)
    //           4. Invoice/receipt number
    //           5. Description/items
    //           6. Category (Transportation, Food, Office Supplies, Travel, Equipment, Maintenance, Other)
    //           If info is missing, leave empty.`,
    //                 add_context_from_internet: false,
    //                 file_urls: [fileUrl],
    //                 response_json_schema: {
    //                   type: 'object',
    //                   properties: {
    //                     amount: { type: 'number' },
    //                     provider_detail: { type: 'string' },
    //                     date: { type: 'string' },
    //                     note_number: { type: 'string' },
    //                     description: { type: 'string' },
    //                     suggested_category: { type: 'string' }
    //                   }
    //                 }
    //               });

    //               // Return AI analysis
    //               return Response.json({
    //                 success: true,
    //                 message: 'Document analyzed successfully',
    //                 data: result
    //               }, { status: 200 });

    //             } catch (error) {
    //               console.error('Error analyzing document:', error);
    //               return Response.json({
    //                 success: false,
    //                 error: 'Failed to analyze document',
    //                 details: error.message
    //               }, { status: 500 });
    //             }
    //   }

// POST /api/petty-cash?action=upload-documents - Upload files independently
if (method === 'POST' && action === 'upload-documents') {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files');

    if (!files || files.length === 0) {
      return Response.json({ 
        error: 'No files uploaded. Include files in form-data with key "files"',
        example: 'Send multipart/form-data with field name "files"'
      }, { status: 400 });
    }

    const uploadedFileUrls = [];
    const failedUploads = [];

    for (const file of files) {
      try {
        const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });
        if (!uploadResult?.file_url) throw new Error('Upload failed - no file URL returned');

        uploadedFileUrls.push({
          name: file.name,
          size: file.size,
          url: uploadResult.file_url,
          uploaded_at: new Date().toISOString()
        });
      } catch (uploadError) {
        failedUploads.push({ name: file.name, error: uploadError.message });
      }
    }

    return Response.json({
      success: true,
      message: `Uploaded ${uploadedFileUrls.length} document(s) successfully`,
      data: {
        uploaded_documents: uploadedFileUrls,
        failed_uploads: failedUploads.length > 0 ? failedUploads : undefined
      }
    }, { status: 200 });

  } catch (error) {
    return Response.json({
      success: false,
      error: 'Failed to upload documents',
      details: error.message
    }, { status: 500 });
  }
}

// POST /api/petty-cash?action=analyze-document - Analyze single file by URL
if (method === 'POST' && action === 'analyze-document') {
  const fileUrl = url.searchParams.get('file_url');
  if (!fileUrl) {
    return Response.json({
      error: 'file_url parameter is required',
      example: 'POST /api/petty-cash?action=analyze-document&file_url=<url>'
    }, { status: 400 });
  }

      try {
        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `You are an invoice/receipt data extraction expert. Analyze this invoice/receipt image and extract the following information:
                    1. Total amount/cost
                    2. Provider/vendor/merchant name
                    3. Date (YYYY-MM-DD)
                    4. Invoice/receipt number
                    5. Description/items
                    6. Category (Transportation, Food, Office Supplies, Travel, Equipment, Maintenance, Other)
                    If info is missing, leave empty.`,
          add_context_from_internet: false,
          file_urls: [fileUrl],
          response_json_schema: {
            type: 'object',
            properties: {
              amount: { type: 'number' },
              provider_detail: { type: 'string' },
              date: { type: 'string' },
              note_number: { type: 'string' },
              description: { type: 'string' },
              suggested_category: { type: 'string' }
            }
          }
        });

    return Response.json({
      success: true,
      message: 'Document analyzed successfully',
      data: result
    }, { status: 200 });

  } catch (error) {
    return Response.json({
      success: false,
      error: 'Failed to analyze document',
      details: error.message
    }, { status: 500 });
  }
}

// POST /api/petty-cash?action=create - Create petty cash entry with uploaded files
if (method === 'POST' && action === 'create') {
  try {
    const body = await req.json();

    if (!body.employee_id) return Response.json({ error: 'employee_id is required' }, { status: 400 });
    if (!body.type || !['expense', 'input'].includes(body.type)) return Response.json({ error: 'type must be "expense" or "input"' }, { status: 400 });
    if (body.amount === undefined || body.amount === null) return Response.json({ error: 'amount is required' }, { status: 400 });
    if (!body.date) return Response.json({ error: 'date is required' }, { status: 400 });

    const entryData = {
      employee_id: body.employee_id,
      type: body.type,
      amount: body.type === 'expense' ? -Math.abs(body.amount) : Math.abs(body.amount),
      date: body.date,
      category_id: body.category_id || null,
      provider_detail: body.provider_detail || '',
      note_number: body.note_number || '',
      description: body.description || '',
      document_urls: body.document_urls || [] // يمكن ربط الملفات التي تم رفعها مسبقاً
    };

    const createdEntry = await base44.asServiceRole.entities.PettyCashEntry.create(entryData);

    return Response.json({
      success: true,
      data: createdEntry,
      message: 'Petty cash entry created successfully',
      created_by: { user_id: user.id, email: user.email }
    }, { status: 201 });

  } catch (error) {
    return Response.json({
      success: false,
      error: 'Failed to create petty cash entry',
      details: error.message
    }, { status: 500 });
  }
}



    // POST /api/petty-cash?action=create-category - Create category (admin only)
    if (method === 'POST' && action === 'create-category') {
      if (!isAdmin()) {
        return Response.json({ 
          error: 'Only admins can create categories',
          your_role: user.role
        }, { status: 403 });
      }

      try {
        const body = await req.json();

        if (!body.name) {
          return Response.json({ error: 'name is required' }, { status: 400 });
        }

        const categoryData = {
          name: body.name,
          color: body.color || 'gray',
          description: body.description || '',
          sort_order: body.sort_order || 0
        };

        const createdCategory = await base44.asServiceRole.entities.PettyCashCategory.create(categoryData);

        return Response.json({
          success: true,
          data: createdCategory,
          message: 'Category created successfully',
          created_by: {
            user_id: user.id,
            email: user.email
          }
        }, { status: 201 });
      } catch (error) {
        console.error('Error creating category:', error);
        return Response.json({
          success: false,
          error: 'Failed to create category',
          details: error.message
        }, { status: 500 });
      }
    }

    


    // PUT /api/petty-cash?action=update&entry_id=<id> - Update entry
    if (method === 'PUT' && action === 'update') {
      const entryId = url.searchParams.get('entry_id');

      if (!entryId) {
        return Response.json({ error: 'entry_id parameter is required' }, { status: 400 });
      }

      try {
        const body = await req.json();

        // Get the entry to check permissions
        const entries = await base44.asServiceRole.entities.PettyCashEntry.list();
        const entry = entries.find(e => e.id === entryId);

        if (!entry) {
          return Response.json({ error: 'Petty cash entry not found' }, { status: 404 });
        }

        // Check permissions
        if (!isAdmin() && entry.employee_id !== user.id) {
          return Response.json({ 
            error: 'You do not have permission to update this entry',
            your_role: user.role
          }, { status: 403 });
        }

        // Remove system fields
        const systemFields = ['id', 'created_date', 'updated_date', 'created_by'];
        const updateData = {};
        
        for (const [key, value] of Object.entries(body)) {
          if (!systemFields.includes(key) && value !== undefined) {
            updateData[key] = value;
          }
        }

        if (Object.keys(updateData).length === 0) {
          return Response.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        const updatedEntry = await base44.asServiceRole.entities.PettyCashEntry.update(entryId, updateData);

        return Response.json({
          success: true,
          data: updatedEntry,
          message: 'Petty cash entry updated successfully',
          updated_by: {
            user_id: user.id,
            email: user.email
          }
        });
      } catch (error) {
        console.error('Error updating petty cash entry:', error);
        return Response.json({
          success: false,
          error: 'Failed to update petty cash entry',
          details: error.message
        }, { status: 500 });
      }
    }

    // PUT /api/petty-cash?action=update-category&category_id=<id> - Update category (admin only)
    if (method === 'PUT' && action === 'update-category') {
      if (!isAdmin()) {
        return Response.json({ 
          error: 'Only admins can update categories',
          your_role: user.role
        }, { status: 403 });
      }

      const categoryId = url.searchParams.get('category_id');

      if (!categoryId) {
        return Response.json({ error: 'category_id parameter is required' }, { status: 400 });
      }

      try {
        const body = await req.json();

        const systemFields = ['id', 'created_date', 'updated_date'];
        const updateData = {};
        
        for (const [key, value] of Object.entries(body)) {
          if (!systemFields.includes(key) && value !== undefined) {
            updateData[key] = value;
          }
        }

        if (Object.keys(updateData).length === 0) {
          return Response.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        const updatedCategory = await base44.asServiceRole.entities.PettyCashCategory.update(categoryId, updateData);

        return Response.json({
          success: true,
          data: updatedCategory,
          message: 'Category updated successfully',
          updated_by: {
            user_id: user.id,
            email: user.email
          }
        });
      } catch (error) {
        console.error('Error updating category:', error);
        return Response.json({
          success: false,
          error: 'Failed to update category',
          details: error.message
        }, { status: 500 });
      }
    }

    // DELETE /api/petty-cash/:id - Delete entry
    if (method === 'DELETE' && !action) {
      const pathParts = url.pathname.split('/');
      const entryId = pathParts[pathParts.length - 1];

      if (!entryId || !entryId.match(/^[a-f0-9-]{36}$/i)) {
        return Response.json({ error: 'Invalid entry ID' }, { status: 400 });
      }

      try {
        // Get the entry to check permissions
        const entries = await base44.asServiceRole.entities.PettyCashEntry.list();
        const entry = entries.find(e => e.id === entryId);

        if (!entry) {
          return Response.json({ error: 'Petty cash entry not found' }, { status: 404 });
        }

        // Check permissions
        if (!isAdmin() && entry.employee_id !== user.id) {
          return Response.json({ 
            error: 'You do not have permission to delete this entry',
            your_role: user.role
          }, { status: 403 });
        }

        await base44.asServiceRole.entities.PettyCashEntry.delete(entryId);

        return Response.json({
          success: true,
          message: 'Petty cash entry deleted successfully',
          deleted_by: {
            user_id: user.id,
            email: user.email
          }
        });
      } catch (error) {
        console.error('Error deleting petty cash entry:', error);
        return Response.json({
          success: false,
          error: 'Failed to delete petty cash entry',
          details: error.message
        }, { status: 500 });
      }
    }

// DELETE /api/petty-cash?action=delete-document&file_url=<url>
if (method === 'GET' && action === 'delete-document') {
  const fileUrl = url.searchParams.get('file_url');

  if (!fileUrl) {
    return Response.json({
      success: false,
      error: 'file_url parameter is required',
      example: 'DELETE /api/petty-cash?action=delete-document&file_url=<url>'
    }, { status: 400 });
  }

  try {
    // Call Base44 API to delete the file
        const deleteResult = await base44.asServiceRole.integrations.Core.DeleteFile({
            file_id: '<file-id-returned-on-upload>'
        });


    if (!deleteResult?.success) {
      throw new Error(deleteResult?.message || 'Failed to delete file');
    }

    return Response.json({
      success: true,
      message: 'File deleted successfully',
      file_url: fileUrl
    }, { status: 200 });

  } catch (error) {
    console.error('Error deleting file:', error);
    return Response.json({
      success: false,
      error: 'Failed to delete file',
      details: error.message
    }, { status: 500 });
  }
}


    // DELETE /api/petty-cash?action=delete-category&category_id=<id> - Delete category (admin only)
    if (method === 'DELETE' && action === 'delete-category') {
      if (!isAdmin()) {
        return Response.json({ 
          error: 'Only admins can delete categories',
          your_role: user.role
        }, { status: 403 });
      }

      const categoryId = url.searchParams.get('category_id');

      if (!categoryId) {
        return Response.json({ error: 'category_id parameter is required' }, { status: 400 });
      }

      try {
        await base44.asServiceRole.entities.PettyCashCategory.delete(categoryId);

        return Response.json({
          success: true,
          message: 'Category deleted successfully',
          deleted_by: {
            user_id: user.id,
            email: user.email
          }
        });
      } catch (error) {
        console.error('Error deleting category:', error);
        return Response.json({
          success: false,
          error: 'Failed to delete category',
          details: error.message
        }, { status: 500 });
      }
    }

    return Response.json({ 
      error: 'Method not allowed or invalid action',
      available_endpoints: [
        'GET /api/petty-cash',
        'GET /api/petty-cash/:id',
        'GET /api/petty-cash?action=balance&employee_id=<id>',
        'GET /api/petty-cash?action=categories',
        'POST /api/petty-cash?action=create',
        'POST /api/petty-cash?action=upload-documents&entry_id=<id>',
        'POST /api/petty-cash?action=create-category (admin)',
        'PUT /api/petty-cash?action=update&entry_id=<id>',
        'PUT /api/petty-cash?action=update-category&category_id=<id> (admin)',
        'DELETE /api/petty-cash/:id',
        'DELETE /api/petty-cash?action=delete-category&category_id=<id> (admin)'
      ]
    }, { status: 405 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return Response.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
});