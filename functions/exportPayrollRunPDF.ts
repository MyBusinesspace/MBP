import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { jsPDF } from 'npm:jspdf@2.5.1';
import 'npm:jspdf-autotable@3.8.2';

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
        
        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.text('Payroll Run Report', 20, 20);

        doc.setFontSize(10);
        doc.text(`Period: ${payrollRun.period_start_date} to ${payrollRun.period_end_date}`, 20, 30);
        doc.text(`Pay Date: ${payrollRun.pay_date}`, 20, 36);
        doc.text(`Status: ${payrollRun.status}`, 20, 42);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 48);

        // Summary
        doc.setFontSize(12);
        doc.text('Summary', 20, 60);
        doc.setFontSize(10);
        doc.text(`Total Employees: ${payrollRun.employee_count || payStubs.length}`, 20, 68);
        doc.text(`Total Gross Pay: $${(payrollRun.total_gross_pay || 0).toLocaleString()}`, 20, 74);
        doc.text(`Total Deductions: $${(payrollRun.total_deductions || 0).toLocaleString()}`, 20, 80);
        doc.text(`Total Net Pay: $${(payrollRun.total_payroll_cost || 0).toLocaleString()}`, 20, 86);

        // Employee details table
        const tableData = payStubs.map(stub => {
            const user = allUsers.find(u => u.id === stub.employee_id);
            const userName = user?.nickname || user?.full_name || user?.email || 'Unknown';
            
            return [
                userName,
                `$${(stub.gross_pay || 0).toLocaleString()}`,
                `$${(stub.deductions || 0).toLocaleString()}`,
                `$${(stub.net_pay || 0).toLocaleString()}`,
                stub.status
            ];
        });

        doc.autoTable({
            startY: 95,
            head: [['Employee', 'Gross Pay', 'Deductions', 'Net Pay', 'Status']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] },
            styles: { fontSize: 9 }
        });

        const pdfBytes = doc.output('arraybuffer');

        return new Response(pdfBytes, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename=payroll-run-${payroll_run_id}.pdf`
            }
        });

    } catch (error) {
        console.error('Export PDF error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});