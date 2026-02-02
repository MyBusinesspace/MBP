import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { employee_id } = await req.json();

        if (!employee_id) {
            return Response.json({ error: 'employee_id is required' }, { status: 400 });
        }

        console.log('📥 Exporting petty cash for employee:', employee_id);

        // Load all required data
        const [employees, entries, categories] = await Promise.all([
            base44.asServiceRole.entities.User.filter({ id: employee_id }),
            base44.asServiceRole.entities.PettyCashEntry.filter({ employee_id }),
            (async () => {
                try {
                    return await base44.asServiceRole.entities.PettyCashCategory.list('sort_order');
                } catch {
                    return [];
                }
            })()
        ]);

        const employee = employees[0];

        if (!employee) {
            return Response.json({ error: 'Employee not found' }, { status: 404 });
        }

        // Sort entries by date (oldest first)
        const sortedEntries = entries.sort((a, b) => new Date(a.date) - new Date(b.date));

        console.log(`📊 Generating PDF with ${sortedEntries.length} entries`);

        // Create PDF with enhanced design
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        const leftMargin = 15;
        const rightMargin = pageWidth - 15;
        const contentWidth = rightMargin - leftMargin;

        // Helper function for currency formatting
        const formatCurrency = (amount) => {
            return `Dhs ${Math.abs(amount).toFixed(2)}`;
        };

        // Helper function for dates
        const formatDate = (dateStr) => {
            try {
                const date = new Date(dateStr);
                return date.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                });
            } catch {
                return dateStr;
            }
        };

        // Get category name
        const getCategoryName = (categoryId) => {
            const category = categories.find(c => c.id === categoryId);
            return category?.name || 'Uncategorized';
        };

        // ✅ HEADER - Professional design
        doc.setFillColor(37, 99, 235); // Blue-600
        doc.rect(0, 0, pageWidth, 50, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('PETTY CASH REPORT', leftMargin, 20);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const employeeName = employee.nickname || 
                            `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 
                            employee.full_name || 
                            employee.email;
        doc.text(`Employee: ${employeeName}`, leftMargin, 30);
        doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}`, leftMargin, 38);

        doc.setTextColor(0, 0, 0);

        // ✅ SUMMARY SECTION
        let yPos = 60;

        // Calculate summary stats
        const totalInput = sortedEntries
            .filter(e => e.type === 'input')
            .reduce((sum, e) => sum + (e.amount || 0), 0);
        
        const totalExpenses = sortedEntries
            .filter(e => e.type === 'expense')
            .reduce((sum, e) => sum + Math.abs(e.amount || 0), 0);
        
        const finalBalance = totalInput - totalExpenses;

        // Summary cards
        doc.setFillColor(243, 244, 246); // Gray-100
        doc.roundedRect(leftMargin, yPos, contentWidth, 35, 2, 2, 'F');

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105); // Slate-600
        doc.text('SUMMARY', leftMargin + 3, yPos + 7);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');

        // Total Input
        doc.text('Total Received:', leftMargin + 3, yPos + 15);
        doc.setTextColor(34, 197, 94); // Green-500
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(totalInput), leftMargin + 40, yPos + 15);

        // Total Expenses
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text('Total Expenses:', leftMargin + 3, yPos + 22);
        doc.setTextColor(239, 68, 68); // Red-500
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(totalExpenses), leftMargin + 40, yPos + 22);

        // Final Balance
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text('Current Balance:', leftMargin + 3, yPos + 29);
        doc.setTextColor(finalBalance >= 0 ? 34 : 239, finalBalance >= 0 ? 197 : 68, finalBalance >= 0 ? 94 : 68);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(formatCurrency(finalBalance), leftMargin + 40, yPos + 29);

        // Transaction count
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Total Transactions: ${sortedEntries.length}`, rightMargin - 3, yPos + 15, { align: 'right' });
        doc.text(`Expenses: ${sortedEntries.filter(e => e.type === 'expense').length}`, rightMargin - 3, yPos + 22, { align: 'right' });
        doc.text(`Inputs: ${sortedEntries.filter(e => e.type === 'input').length}`, rightMargin - 3, yPos + 29, { align: 'right' });

        doc.setTextColor(0, 0, 0);
        yPos += 45;

        // ✅ TRANSACTION HISTORY HEADER
        doc.setFillColor(79, 70, 229); // Indigo-600
        doc.roundedRect(leftMargin, yPos, contentWidth, 10, 2, 2, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('TRANSACTION HISTORY', leftMargin + 3, yPos + 7);
        
        doc.setTextColor(0, 0, 0);
        yPos += 15;

        // ✅ TABLE HEADERS - Adjusted column positions for better spacing
        doc.setFillColor(248, 250, 252); // Slate-50
        doc.rect(leftMargin, yPos, contentWidth, 8, 'F');
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text('Date', leftMargin + 2, yPos + 5);
        doc.text('Provider', leftMargin + 32, yPos + 5);
        doc.text('Note #', leftMargin + 78, yPos + 5);
        doc.text('Paid', leftMargin + 112, yPos + 5, { align: 'right' });
        doc.text('Received', leftMargin + 148, yPos + 5, { align: 'right' });
        doc.text('Balance', rightMargin - 2, yPos + 5, { align: 'right' });
        
        doc.setDrawColor(226, 232, 240); // Slate-200
        doc.line(leftMargin, yPos + 8, rightMargin, yPos + 8);
        
        doc.setTextColor(0, 0, 0);
        yPos += 12;

        // ✅ TRANSACTION ROWS
        let runningBalance = 0;

        for (const entry of sortedEntries) {
            if (yPos > pageHeight - 30) {
                doc.addPage();
                yPos = 20;
                
                // Repeat headers on new page
                doc.setFillColor(248, 250, 252);
                doc.rect(leftMargin, yPos, contentWidth, 8, 'F');
                
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(71, 85, 105);
                doc.text('Date', leftMargin + 2, yPos + 5);
                doc.text('Provider', leftMargin + 32, yPos + 5);
                doc.text('Note #', leftMargin + 78, yPos + 5);
                doc.text('Paid', leftMargin + 112, yPos + 5, { align: 'right' });
                doc.text('Received', leftMargin + 148, yPos + 5, { align: 'right' });
                doc.text('Balance', rightMargin - 2, yPos + 5, { align: 'right' });
                
                doc.line(leftMargin, yPos + 8, rightMargin, yPos + 8);
                doc.setTextColor(0, 0, 0);
                yPos += 12;
            }

            const isExpense = entry.type === 'expense';
            runningBalance += entry.amount || 0;

            // Alternate row background
            if (sortedEntries.indexOf(entry) % 2 === 0) {
                doc.setFillColor(249, 250, 251);
                doc.rect(leftMargin, yPos - 4, contentWidth, 7, 'F');
            }

            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(51, 65, 85); // Slate-700

            // Date - shortened format
            const shortDate = formatDate(entry.date).replace(',', '');
            doc.text(shortDate, leftMargin + 2, yPos);

            // Provider Detail - increased space
            const provider = entry.provider_detail || '-';
            const truncatedProvider = provider.length > 22 ? provider.substring(0, 22) + '...' : provider;
            doc.text(truncatedProvider, leftMargin + 32, yPos);

            // Note Number
            const noteNum = entry.note_number || '-';
            const truncatedNote = noteNum.length > 12 ? noteNum.substring(0, 12) + '...' : noteNum;
            doc.text(truncatedNote, leftMargin + 78, yPos);

            // Amount columns with proper alignment
            if (isExpense) {
                doc.setTextColor(220, 38, 38); // Red-600
                doc.text(formatCurrency(entry.amount), leftMargin + 112, yPos, { align: 'right' });
                doc.setTextColor(51, 65, 85);
                doc.text('-', leftMargin + 148, yPos, { align: 'right' });
            } else {
                doc.text('-', leftMargin + 112, yPos, { align: 'right' });
                doc.setTextColor(22, 163, 74); // Green-600
                doc.text(formatCurrency(entry.amount), leftMargin + 148, yPos, { align: 'right' });
                doc.setTextColor(51, 65, 85);
            }

            // Balance
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(runningBalance >= 0 ? 22 : 220, runningBalance >= 0 ? 163 : 38, runningBalance >= 0 ? 74 : 38);
            doc.text(formatCurrency(runningBalance), rightMargin - 2, yPos, { align: 'right' });

            yPos += 7;
        }

        if (sortedEntries.length === 0) {
            doc.setFontSize(10);
            doc.setTextColor(148, 163, 184);
            doc.setFont('helvetica', 'italic');
            doc.text('No transactions found', pageWidth / 2, yPos + 20, { align: 'center' });
        }

        // ✅ FOOTER on all pages
        const addFooter = (pageNum) => {
            const footerY = pageHeight - 10;
            doc.setFontSize(8);
            doc.setTextColor(107, 114, 128);
            doc.setFont('helvetica', 'normal');
            doc.text(`Page ${pageNum}`, pageWidth / 2, footerY, { align: 'center' });
            doc.text(`Generated by ${user.full_name || user.email}`, rightMargin, footerY, { align: 'right' });
            doc.text('MyBusinessPace', leftMargin, footerY);
        };

        // Add footers to all pages
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            addFooter(i);
        }

        const pdfBytes = doc.output('arraybuffer');

        console.log('✅ PDF generated successfully');

        return new Response(pdfBytes, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename=petty-cash-${employeeName}-${new Date().toISOString().split('T')[0]}.pdf`
            }
        });
    } catch (error) {
        console.error('❌ Export error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});