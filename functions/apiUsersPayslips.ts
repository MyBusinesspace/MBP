import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * User Pay Slips API Handler
 * 
 * Access URL: https://chronos-8ee5fab2.base44.app/functions/apiUsersPayslips?user_id={id}
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const method = req.method;
    const userId = url.searchParams.get('user_id');
    const slipId = url.searchParams.get('slip_id');

    if (!userId) {
      return Response.json({ error: 'user_id parameter is required' }, { status: 400 });
    }

    const currentUser = await base44.auth.me();
    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = currentUser.role === 'admin';
    const isOwnProfile = userId === currentUser.id;

    if (!isAdmin && !isOwnProfile) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // GET specific pay slip
    if (method === 'GET' && slipId) {
      const slips = await base44.asServiceRole.entities.PayStub.filter({ id: slipId });
      const slip = slips[0];

      if (!slip || slip.employee_id !== userId) {
        return Response.json({ error: 'Pay slip not found' }, { status: 404 });
      }

      return Response.json({
        success: true,
        data: slip
      });
    }

    // GET all pay slips
    if (method === 'GET') {
      const status = url.searchParams.get('status');
      const payrollRunId = url.searchParams.get('payroll_run_id');
      
      let filters = { employee_id: userId };
      if (status) filters.status = status;
      if (payrollRunId) filters.payroll_run_id = payrollRunId;

      const paySlips = await base44.asServiceRole.entities.PayStub.filter(filters);
      
      const sortedSlips = paySlips.sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      );

      return Response.json({
        success: true,
        data: sortedSlips,
        count: sortedSlips.length
      });
    }

    // POST - Create pay slip
    if (method === 'POST') {
      if (!isAdmin) {
        return Response.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
      }

      const body = await req.json();
      const {
        payroll_run_id,
        gross_pay,
        deductions = 0,
        net_pay,
        pay_method = 'Direct Deposit',
        status = 'Pending',
        data_snapshot
      } = body;

      if (!payroll_run_id || gross_pay === undefined || net_pay === undefined) {
        return Response.json({ 
          error: 'payroll_run_id, gross_pay, and net_pay are required' 
        }, { status: 400 });
      }

      const newPaySlip = await base44.asServiceRole.entities.PayStub.create({
        payroll_run_id,
        employee_id: userId,
        gross_pay: parseFloat(gross_pay),
        deductions: parseFloat(deductions),
        net_pay: parseFloat(net_pay),
        pay_method,
        status,
        data_snapshot: data_snapshot || {}
      });

      return Response.json({
        success: true,
        data: newPaySlip,
        message: 'Pay slip created successfully'
      }, { status: 201 });
    }

    // PUT - Update pay slip
    if (method === 'PUT' && slipId) {
      if (!isAdmin) {
        return Response.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
      }

      const slips = await base44.asServiceRole.entities.PayStub.filter({ id: slipId });
      const slip = slips[0];

      if (!slip || slip.employee_id !== userId) {
        return Response.json({ error: 'Pay slip not found' }, { status: 404 });
      }

      const body = await req.json();
      const updates = {};

      if (body.gross_pay !== undefined) updates.gross_pay = parseFloat(body.gross_pay);
      if (body.deductions !== undefined) updates.deductions = parseFloat(body.deductions);
      if (body.net_pay !== undefined) updates.net_pay = parseFloat(body.net_pay);
      if (body.pay_method !== undefined) updates.pay_method = body.pay_method;
      if (body.status !== undefined) updates.status = body.status;
      if (body.data_snapshot !== undefined) updates.data_snapshot = body.data_snapshot;

      const updatedSlip = await base44.asServiceRole.entities.PayStub.update(slipId, updates);

      return Response.json({
        success: true,
        data: updatedSlip,
        message: 'Pay slip updated successfully'
      });
    }

    // DELETE - Delete pay slip
    if (method === 'DELETE' && slipId) {
      if (!isAdmin) {
        return Response.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
      }

      const slips = await base44.asServiceRole.entities.PayStub.filter({ id: slipId });
      const slip = slips[0];

      if (!slip || slip.employee_id !== userId) {
        return Response.json({ error: 'Pay slip not found' }, { status: 404 });
      }

      await base44.asServiceRole.entities.PayStub.delete(slipId);

      return Response.json({
        success: true,
        message: 'Pay slip deleted successfully'
      });
    }

    return Response.json({ error: 'Invalid request' }, { status: 400 });

  } catch (error) {
    console.error('User Pay Slips API Error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
});