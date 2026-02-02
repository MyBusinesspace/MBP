import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * User Salary API Handler
 * 
 * Endpoints:
 * - GET /api/users/:id/salary - Get user salary profile
 * - PUT /api/users/:id/salary - Update user salary profile
 * - POST /api/users/:id/salary - Create user salary profile
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

    // Only admins can view/manage salary info (users can't see their own)
    if (!isAdmin) {
      return Response.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Route: GET /api/users/:id/salary
    if (method === 'GET') {
      const profiles = await base44.asServiceRole.entities.EmployeePayrollProfile.filter({ 
        employee_id: userId 
      });
      
      const profile = profiles[0] || null;

      return Response.json({
        success: true,
        data: profile,
        exists: !!profile
      });
    }

    // Route: POST /api/users/:id/salary
    if (method === 'POST') {
      // Check if profile already exists
      const existingProfiles = await base44.asServiceRole.entities.EmployeePayrollProfile.filter({ 
        employee_id: userId 
      });

      if (existingProfiles.length > 0) {
        return Response.json({ 
          error: 'Salary profile already exists. Use PUT to update.' 
        }, { status: 409 });
      }

      const body = await req.json();
      const {
        pay_type = 'Hourly',
        pay_rate,
        payment_method = 'Direct Deposit',
        bank_name,
        routing_number,
        account_number,
        tax_filing_status,
        tax_allowances
      } = body;

      if (!pay_rate) {
        return Response.json({ error: 'pay_rate is required' }, { status: 400 });
      }

      const newProfile = await base44.asServiceRole.entities.EmployeePayrollProfile.create({
        employee_id: userId,
        pay_type,
        pay_rate: parseFloat(pay_rate),
        payment_method,
        bank_name: bank_name || null,
        routing_number: routing_number || null,
        account_number: account_number || null,
        tax_filing_status: tax_filing_status || null,
        tax_allowances: tax_allowances ? parseInt(tax_allowances) : null
      });

      return Response.json({
        success: true,
        data: newProfile,
        message: 'Salary profile created successfully'
      }, { status: 201 });
    }

    // Route: PUT /api/users/:id/salary
    if (method === 'PUT') {
      const profiles = await base44.asServiceRole.entities.EmployeePayrollProfile.filter({ 
        employee_id: userId 
      });
      
      if (profiles.length === 0) {
        return Response.json({ 
          error: 'Salary profile not found. Use POST to create.' 
        }, { status: 404 });
      }

      const profile = profiles[0];
      const body = await req.json();

      const updates = {};
      if (body.pay_type !== undefined) updates.pay_type = body.pay_type;
      if (body.pay_rate !== undefined) updates.pay_rate = parseFloat(body.pay_rate);
      if (body.payment_method !== undefined) updates.payment_method = body.payment_method;
      if (body.bank_name !== undefined) updates.bank_name = body.bank_name;
      if (body.routing_number !== undefined) updates.routing_number = body.routing_number;
      if (body.account_number !== undefined) updates.account_number = body.account_number;
      if (body.tax_filing_status !== undefined) updates.tax_filing_status = body.tax_filing_status;
      if (body.tax_allowances !== undefined) updates.tax_allowances = body.tax_allowances ? parseInt(body.tax_allowances) : null;

      const updatedProfile = await base44.asServiceRole.entities.EmployeePayrollProfile.update(
        profile.id, 
        updates
      );

      return Response.json({
        success: true,
        data: updatedProfile,
        message: 'Salary profile updated successfully'
      });
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405 });

  } catch (error) {
    console.error('User Salary API Error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
});