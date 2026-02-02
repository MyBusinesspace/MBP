import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';
import 'npm:jspdf-autotable@3.8.2';

// Helper function to format numbers - clean ASCII only, no currency symbol in table
const formatAmount = (amount) => {
    const num = Number(amount) || 0;
    const parts = num.toFixed(2).split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return intPart + '.' + parts[1];
};

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { pay_slip_id } = await req.json();
        
        if (!pay_slip_id) {
            return Response.json({ error: 'Missing pay_slip_id' }, { status: 400 });
        }

        // Obtener el pay slip
        const paySlips = await base44.asServiceRole.entities.PayStub.filter({ id: pay_slip_id });
        const paySlip = paySlips[0];
        
        if (!paySlip) {
            return Response.json({ error: 'Pay slip not found' }, { status: 404 });
        }

        // Obtener el empleado
        const employees = await base44.asServiceRole.entities.User.filter({ id: paySlip.employee_id });
        const employee = employees[0];

        // Obtener el payroll run
        const payrollRuns = await base44.asServiceRole.entities.PayrollRun.filter({ id: paySlip.payroll_run_id });
        const payrollRun = payrollRuns[0];

        // Obtener configuración de la compañía
        const companySettings = await base44.asServiceRole.entities.AppSettings.filter({});
        const getSettingValue = (key, defaultValue = '') => {
            const setting = companySettings.find(s => s.setting_key === key);
            return setting?.setting_value || defaultValue;
        };

        // Obtener branch para colores y logo
        let branch = null;
        try {
            const branches = await base44.asServiceRole.entities.Branch.list('id', 1);
            branch = branches[0];
        } catch (e) {
            console.log('Could not load branch:', e);
        }

        const companyName = getSettingValue('payroll_company_company_name', branch?.name || 'Company Name');
        const companyAddress = getSettingValue('payroll_company_company_address', branch?.address || '');
        const companyEIN = getSettingValue('payroll_company_company_ein', branch?.tax_number || '');
        
        // Get form settings for payslip customization
        const formSettings = branch?.form_settings || {};
        const payslipSettings = formSettings.payslip_report || {};
        
        // Currency from payslip settings or fallback
        const currency = payslipSettings.currency || getSettingValue('payroll_company_currency', 'AED');
        const currencySymbol = payslipSettings.currency_symbol || getSettingValue('payroll_company_currency_symbol', '');
        
        // Colors from branch form settings
        const primaryColorHex = formSettings.primary_color || '#4F46E5'; // Default indigo
        const secondaryColorHex = formSettings.secondary_color || '#1E40AF';
        
        // Helper to convert hex to RGB
        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : { r: 79, g: 70, b: 229 };
        };
        
        const primaryColor = hexToRgb(primaryColorHex);
        const secondaryColor = hexToRgb(secondaryColorHex);
        
        // Logo URL
        const logoUrl = branch?.logo_forms_url || branch?.logo_url;

        const doc = new jsPDF();

        // Company Header with white background
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, 210, 40, 'F');
        
        // Try to add logo in top right
        if (logoUrl && payslipSettings.show_logo !== false) {
            try {
                const logoResponse = await fetch(logoUrl);
                if (logoResponse.ok) {
                    const logoBuffer = await logoResponse.arrayBuffer();
                    const logoBase64 = btoa(String.fromCharCode(...new Uint8Array(logoBuffer)));
                    const logoExt = logoUrl.toLowerCase().includes('.png') ? 'PNG' : 'JPEG';
                    doc.addImage('data:image/' + logoExt.toLowerCase() + ';base64,' + logoBase64, logoExt, 165, 5, 30, 30);
                }
            } catch (e) {
                console.log('Could not load logo:', e.message);
            }
        }
        
        // Company text in primary color
        doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text(companyName, 15, 15);
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(80, 80, 80);
        if (companyAddress && payslipSettings.show_company_address !== false) doc.text(companyAddress, 15, 22);
        if (branch?.phone && payslipSettings.show_company_phone !== false) doc.text('Tel: ' + branch.phone, 15, 28);
        if (companyEIN && payslipSettings.show_tax_number !== false) doc.text('TRN: ' + companyEIN, 15, 34);
        
        // Red divider line
        doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
        doc.setLineWidth(1);
        doc.line(15, 42, 195, 42);

        // Document Title and Reference - compact header
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text(payslipSettings.custom_title || 'PAY SLIP', 15, 50);
        
        // Reference on the right
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        if (payrollRun?.payrun_number) {
            doc.text('Ref: ' + payrollRun.payrun_number, 195, 50, { align: 'right' });
        }

        // Pay Period info - compact single line
        doc.setFontSize(8);
        let periodLine = '';
        if (payrollRun) {
            periodLine = 'Period: ' + payrollRun.period_start_date + ' to ' + payrollRun.period_end_date + '  |  Pay Date: ' + payrollRun.pay_date + '  |  Status: ' + paySlip.status;
        }
        doc.text(periodLine, 15, 56);

        // Employee Information Box - comprehensive
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(15, 60, 180, 38, 2, 2, 'FD');

        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('Employee Details', 18, 67);

        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        
        // Full name (formal - first + last, or full_name)
        const firstName = employee?.first_name || '';
        const lastName = employee?.last_name || '';
        const employeeName = (firstName && lastName) ? (firstName + ' ' + lastName) : (employee?.full_name || employee?.email || 'Unknown');
        
        // Calculate seniority
        let seniorityText = '';
        if (employee?.employment_start_date) {
            const startDate = new Date(employee.employment_start_date);
            const now = new Date();
            const years = Math.floor((now - startDate) / (365.25 * 24 * 60 * 60 * 1000));
            const months = Math.floor(((now - startDate) % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
            if (years > 0) {
                seniorityText = years + 'y ' + months + 'm';
            } else if (months > 0) {
                seniorityText = months + ' month' + (months > 1 ? 's' : '');
            } else {
                seniorityText = 'New';
            }
        }
        
        // Get team name if available
        let teamName = '-';
        if (employee?.team_id) {
            try {
                const team = await base44.asServiceRole.entities.Team.get(employee.team_id);
                if (team?.name) teamName = team.name;
            } catch (e) {
                console.log('Could not fetch team:', e.message);
            }
        }
        
        // Left column labels
        doc.setFont(undefined, 'bold');
        doc.text('Name:', 18, 73);
        doc.text('ID:', 18, 78);
        doc.text('Position:', 18, 83);
        doc.text('Email:', 18, 88);
        doc.text('Dept:', 18, 93);
        
        // Left column values
        doc.setFont(undefined, 'normal');
        doc.text(employeeName, 38, 73);
        doc.text(employee?.employee_number || '-', 38, 78);
        doc.text(employee?.job_role || '-', 38, 83);
        doc.text(employee?.email || '-', 38, 88);
        doc.text(employee?.department || '-', 38, 93);
        
        // Right column labels
        doc.setFont(undefined, 'bold');
        doc.text('Start Date:', 110, 73);
        doc.text('Seniority:', 110, 78);
        doc.text('Team:', 110, 83);
        doc.text('Birthday:', 110, 88);
        doc.text('Location:', 110, 93);
        
        // Right column values
        doc.setFont(undefined, 'normal');
        doc.text(employee?.employment_start_date || '-', 140, 73);
        doc.text(seniorityText || '-', 140, 78);
        doc.text(teamName, 140, 83);
        doc.text(employee?.birthday || '-', 140, 88);
        doc.text(employee?.city || '-', 140, 93);

        // Data snapshot for detailed breakdown
        const snapshot = paySlip.data_snapshot || {};
        const hoursData = snapshot.hours_data || {};
        const salaryItems = snapshot.salary_items || [];
        const basicSalary = snapshot.basic_salary || snapshot.regular_pay || 0;
        const overtimePay = snapshot.overtime_pay || 0;
        
        let currentY = 102;

        // Hours Worked Section - Compact inline if we have data
        const regularHours = hoursData.regular_hours || 0;
        const overtimeHoursPaid = hoursData.overtime_hours_paid || 0;
        const overtimeHoursNonPaid = hoursData.overtime_hours_non_paid || 0;
        const totalHours = hoursData.total_hours || (regularHours + overtimeHoursPaid + overtimeHoursNonPaid);
        const daysWorked = hoursData.days_worked || snapshot.days_worked || 0;
        const daysAbsent = hoursData.days_absent || snapshot.days_absent || 0;
        
        // Compact time summary - single line if possible
        const hasTimeData = daysWorked > 0 || totalHours > 0 || overtimeHoursPaid > 0;
        if (hasTimeData) {
            doc.setFontSize(8);
            doc.setFont(undefined, 'bold');
            doc.text('Time:', 15, currentY);
            doc.setFont(undefined, 'normal');
            let timeStr = '';
            if (daysWorked > 0) timeStr += daysWorked + ' days';
            if (totalHours > 0) timeStr += (timeStr ? ', ' : '') + totalHours.toFixed(1) + 'h total';
            if (overtimeHoursPaid > 0) timeStr += ', OT: ' + overtimeHoursPaid.toFixed(1) + 'h';
            if (daysAbsent > 0) timeStr += ', Absent: ' + daysAbsent + 'd';
            doc.text(timeStr, 30, currentY);
            currentY += 6;
        }

        // Earnings Section - With Category, Subcategory, Pay Item, Account
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text('Earnings', 15, currentY);
        currentY += 4;

        const earningsRows = [];
        
        // Use earnings_breakdown if available (has category info)
        const earningsBreakdown = snapshot.earnings_breakdown || [];
        if (earningsBreakdown.length > 0) {
            earningsBreakdown.forEach(earning => {
                if (earning.amount > 0) {
                    earningsRows.push([
                        earning.category || earning.selected_category || '-',
                        earning.subcategory || earning.selected_subcategory || '-',
                        earning.pay_item_name || 'Item',
                        earning.account || '-',
                        formatAmount(earning.amount)
                    ]);
                }
            });
        } else {
            // Fallback to basic values
            if (basicSalary > 0) earningsRows.push(['Earnings', 'Base Pay', 'Basic Salary', 'Wages & Salaries', formatAmount(basicSalary)]);
            if (overtimePay > 0) earningsRows.push(['Earnings', 'Variable Pay', 'Overtime Pay', 'Wages - Overtime', formatAmount(overtimePay)]);
            
            salaryItems.forEach(item => {
                if (item.is_active && (item.category === 'Earnings' || item.category === 'Reimbursements') && item.amount > 0) {
                    earningsRows.push([item.category || 'Earnings', '-', item.pay_item_name || 'Allowance', '-', formatAmount(item.amount)]);
                }
            });
        }

        if (earningsRows.length === 0) {
            earningsRows.push(['Earnings', '-', 'Gross Pay', '-', formatAmount(paySlip.gross_pay)]);
        }

        doc.autoTable({
            startY: currentY,
            head: [['Category', 'Subcategory', 'Pay Item', 'Account', 'Amount']],
            body: earningsRows,
            theme: 'grid',
            styles: { fontSize: 7, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.1 },
            headStyles: { fillColor: [220, 252, 231], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7 },
            alternateRowStyles: { fillColor: [250, 255, 250] },
            columnStyles: {
                0: { cellWidth: 32 },
                1: { cellWidth: 32 },
                2: { cellWidth: 45 },
                3: { cellWidth: 40 },
                4: { halign: 'right', textColor: [22, 163, 74], cellWidth: 31 }
            },
            margin: { left: 15, right: 15 },
            tableWidth: 180
        });

        // Total Earnings Row
        currentY = doc.lastAutoTable.finalY;
        doc.autoTable({
            startY: currentY,
            body: [['', '', '', 'Total Earnings', formatAmount(paySlip.gross_pay)]],
            theme: 'grid',
            styles: { fontSize: 8, fontStyle: 'bold', cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.1 },
            columnStyles: {
                0: { cellWidth: 32, fillColor: [220, 252, 231] },
                1: { cellWidth: 32, fillColor: [220, 252, 231] },
                2: { cellWidth: 45, fillColor: [220, 252, 231] },
                3: { cellWidth: 40, fillColor: [220, 252, 231], fontStyle: 'bold' },
                4: { halign: 'right', textColor: [22, 163, 74], fillColor: [220, 252, 231], cellWidth: 31 }
            },
            margin: { left: 15, right: 15 },
            tableWidth: 180
        });

        currentY = doc.lastAutoTable.finalY + 4;

        // Deductions Section - With Category, Subcategory, Pay Item, Account
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text('Deductions', 15, currentY);
        currentY += 4;

        const deductionsBreakdownObj = snapshot.deductions_breakdown || {};
        const deductionRows = [];

        // Check if we have detailed deductions with category info (array format from UI)
        if (Array.isArray(deductionsBreakdownObj)) {
            deductionsBreakdownObj.forEach(ded => {
                if (ded.amount > 0) {
                    deductionRows.push([
                        ded.category || 'Deductions',
                        ded.subcategory || ded.selected_subcategory || '-',
                        ded.pay_item_name || 'Deduction',
                        ded.account || '-',
                        '-' + formatAmount(ded.amount)
                    ]);
                }
            });
        } else {
            // Fallback to old format
            salaryItems.forEach(item => {
                if (item.is_active && item.category === 'Deductions' && item.amount > 0) {
                    deductionRows.push(['Deductions', '-', item.pay_item_name || 'Deduction', '-', '-' + formatAmount(item.amount)]);
                }
            });

            if (deductionsBreakdownObj.federal_tax > 0) deductionRows.push(['Deductions', 'Taxes', 'Federal Tax', 'Tax Payable', '-' + formatAmount(deductionsBreakdownObj.federal_tax)]);
            if (deductionsBreakdownObj.state_tax > 0) deductionRows.push(['Deductions', 'Taxes', 'State Tax', 'Tax Payable', '-' + formatAmount(deductionsBreakdownObj.state_tax)]);
            if (deductionsBreakdownObj.social_security > 0) deductionRows.push(['Deductions', 'Taxes', 'Social Security', 'FICA Payable', '-' + formatAmount(deductionsBreakdownObj.social_security)]);
            if (deductionsBreakdownObj.medicare > 0) deductionRows.push(['Deductions', 'Taxes', 'Medicare', 'Medicare Payable', '-' + formatAmount(deductionsBreakdownObj.medicare)]);
        }

        if (deductionRows.length > 0) {
            doc.autoTable({
                startY: currentY,
                head: [['Category', 'Subcategory', 'Pay Item', 'Account', 'Amount']],
                body: deductionRows,
                theme: 'grid',
                styles: { fontSize: 7, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.1 },
                headStyles: { fillColor: [254, 226, 226], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7 },
                alternateRowStyles: { fillColor: [255, 250, 250] },
                columnStyles: {
                    0: { cellWidth: 32 },
                    1: { cellWidth: 32 },
                    2: { cellWidth: 45 },
                    3: { cellWidth: 40 },
                    4: { halign: 'right', textColor: [220, 38, 38], cellWidth: 31 }
                },
                margin: { left: 15, right: 15 },
                tableWidth: 180
            });
            currentY = doc.lastAutoTable.finalY;
        }

        // Total Deductions Row
        doc.autoTable({
            startY: currentY,
            body: [['', '', '', 'Total Deductions', '-' + formatAmount(paySlip.deductions)]],
            theme: 'grid',
            styles: { fontSize: 8, fontStyle: 'bold', cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.1 },
            columnStyles: {
                0: { cellWidth: 32, fillColor: [254, 226, 226] },
                1: { cellWidth: 32, fillColor: [254, 226, 226] },
                2: { cellWidth: 45, fillColor: [254, 226, 226] },
                3: { cellWidth: 40, fillColor: [254, 226, 226], fontStyle: 'bold' },
                4: { halign: 'right', textColor: [220, 38, 38], fillColor: [254, 226, 226], cellWidth: 31 }
            },
            margin: { left: 15, right: 15 },
            tableWidth: 180
        });

        currentY = doc.lastAutoTable.finalY + 6;

        // Net Pay (highlighted box) - compact
        doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
        doc.setLineWidth(1);
        doc.setFillColor(
            Math.min(255, primaryColor.r + 150),
            Math.min(255, primaryColor.g + 150),
            Math.min(255, primaryColor.b + 150)
        );
        doc.roundedRect(15, currentY, 180, 12, 2, 2, 'FD');

        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
        doc.text('NET PAY', 20, currentY + 8);
        doc.text(formatAmount(paySlip.net_pay) + ' ' + currency, 190, currentY + 8, { align: 'right' });

        currentY += 16;
        
        // Bank details - compact
        let bankInfo = null;
        try {
            const profiles = await base44.asServiceRole.entities.EmployeePayrollProfile.filter({ employee_id: paySlip.employee_id });
            if (profiles[0]) bankInfo = profiles[0];
        } catch (e) {}

        if (bankInfo && (bankInfo.bank_name || bankInfo.iban)) {
            doc.setFontSize(7);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text('Payment:', 15, currentY);
            doc.setFont(undefined, 'normal');
            let bankStr = '';
            if (bankInfo.bank_name) bankStr += bankInfo.bank_name;
            if (bankInfo.iban) bankStr += ' | IBAN: ' + bankInfo.iban;
            if (bankInfo.payment_method) bankStr += ' | ' + bankInfo.payment_method;
            doc.text(bankStr, 35, currentY);
            currentY += 5;
        }

        // Payslip Notes if any
        const notes = paySlip.notes || snapshot.notes || '';
        if (notes) {
            doc.setFontSize(7);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text('Notes:', 15, currentY);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(80, 80, 80);
            // Wrap long notes
            const splitNotes = doc.splitTextToSize(notes, 160);
            doc.text(splitNotes, 35, currentY);
            currentY += splitNotes.length * 3 + 3;
        }

        // Footer - compact
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(6);
        doc.setTextColor(150, 150, 150);
        let footerText = 'Generated: ' + new Date().toISOString().split('T')[0];
        if (payrollRun?.payrun_number) footerText += ' | Ref: ' + payrollRun.payrun_number;
        doc.text(footerText, 105, pageHeight - 8, { align: 'center' });
        doc.text(payslipSettings.custom_footer_text || 'Computer-generated document. No signature required.', 105, pageHeight - 5, { align: 'center' });

        const pdfBytes = doc.output('arraybuffer');

        return new Response(pdfBytes, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename=pay-slip-${pay_slip_id}.pdf`
            }
        });

    } catch (error) {
        console.error('Export Pay Slip PDF error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});