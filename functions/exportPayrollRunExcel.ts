import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { payroll_run_id } = await req.json();
        
        if (!payroll_run_id) {
            return Response.json({ error: 'Missing payroll_run_id' }, { status: 400 });
        }

        // Obtener el payroll run
        const payrollRuns = await base44.asServiceRole.entities.PayrollRun.filter({ id: payroll_run_id });
        const payrollRun = payrollRuns[0];
        
        if (!payrollRun) {
            return Response.json({ error: 'Payroll run not found' }, { status: 404 });
        }

        // Obtener los pay stubs relacionados
        const payStubs = await base44.asServiceRole.entities.PayStub.filter({ payroll_run_id });
        
        // Obtener usuarios
        const allUsers = await base44.asServiceRole.entities.User.list();
        
        // Crear CSV (Excel compatible)
        let csv = '\uFEFF'; // BOM para UTF-8
        
        // Header
        csv += `Payroll Run Report\n`;
        csv += `Period: ${payrollRun.period_start_date} to ${payrollRun.period_end_date}\n`;
        csv += `Pay Date: ${payrollRun.pay_date}\n`;
        csv += `Status: ${payrollRun.status}\n`;
        csv += `Generated: ${new Date().toLocaleDateString()}\n\n`;
        
        // Summary
        csv += `Summary\n`;
        csv += `Total Employees,${payrollRun.employee_count || payStubs.length}\n`;
        csv += `Total Gross Pay,$${(payrollRun.total_gross_pay || 0).toLocaleString()}\n`;
        csv += `Total Deductions,$${(payrollRun.total_deductions || 0).toLocaleString()}\n`;
        csv += `Total Net Pay,$${(payrollRun.total_payroll_cost || 0).toLocaleString()}\n\n`;
        
        // Employee details
        csv += `Employee Details\n`;
        csv += `Employee Name,Gross Pay,Deductions,Net Pay,Status\n`;
        
        payStubs.forEach(stub => {
            const user = allUsers.find(u => u.id === stub.employee_id);
            const userName = user?.nickname || user?.full_name || user?.email || 'Unknown';
            
            csv += `"${userName}",`;
            csv += `$${(stub.gross_pay || 0).toFixed(2)},`;
            csv += `$${(stub.deductions || 0).toFixed(2)},`;
            csv += `$${(stub.net_pay || 0).toFixed(2)},`;
            csv += `${stub.status}\n`;
        });
        
        const encoder = new TextEncoder();
        const csvBytes = encoder.encode(csv);

        return new Response(csvBytes, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename=payroll-run-${payroll_run_id}.csv`
            }
        });

    } catch (error) {
        console.error('Export Excel error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});