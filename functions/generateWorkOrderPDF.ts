import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';
import 'npm:jspdf-autotable@3.8.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { work_order_id } = await req.json();

    if (!work_order_id) {
      return Response.json({ error: 'Missing work_order_id' }, { status: 400 });
    }

    // 1. Fetch Data
    const wo = await base44.asServiceRole.entities.TimeEntry.get(work_order_id);
    if (!wo) return Response.json({ error: 'Work Order not found' }, { status: 404 });

    const [project, users, teams, assets, clientEquipments, woCategory] = await Promise.all([
      wo.project_id ? base44.asServiceRole.entities.Project.get(wo.project_id) : null,
      base44.functions.invoke('getAllUsers'),
      base44.asServiceRole.entities.Team.list(),
      base44.asServiceRole.entities.Asset.list(),
      base44.asServiceRole.entities.ClientEquipment.list(),
      wo.work_order_category_id ? base44.asServiceRole.entities.WorkOrderCategory.get(wo.work_order_category_id) : null
    ]);

    const customer = project?.customer_id ? await base44.asServiceRole.entities.Customer.get(project.customer_id) : null;
    const branch = project?.branch_id ? await base44.asServiceRole.entities.Branch.get(project.branch_id) : null;

    console.log('🔍 [WO PDF] Debug info:', {
        work_order_id,
        project_id: wo.project_id,
        project_branch_id: project?.branch_id,
        branch_id: branch?.id,
        branch_name: branch?.name,
        logo_forms_url: branch?.logo_forms_url,
        logo_url: branch?.logo_url
    });

    // Timezone helpers (Dubai UTC+4)
    const formatTime = (isoString) => {
        if (!isoString) return '-';
        return new Date(isoString).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute:'2-digit', 
            timeZone: 'Asia/Dubai',
            hour12: true 
        });
    };

    const formatDate = (isoString) => {
         if (!isoString) return '-';
        return new Date(isoString).toLocaleDateString('en-GB', {
            timeZone: 'Asia/Dubai'
        });
    };

    const allUsers = users?.data?.users || [];
    
    // ✅ Load approved leaves to filter unavailable users
    const approvedLeaves = await base44.asServiceRole.entities.LeaveRequest.filter({ status: 'approved' });
    
    // ✅ Helper: Check if user was available on the work order date
    const isUserAvailableForWO = (user, woDate) => {
      if (!user || !woDate) return false;
      
      // Check if user was archived before or on this date
      if (user.archived && user.archived_date) {
        const archivedDate = new Date(user.archived_date);
        archivedDate.setHours(0, 0, 0, 0);
        const workOrderDate = new Date(woDate);
        workOrderDate.setHours(0, 0, 0, 0);
        if (workOrderDate >= archivedDate) {
          return false;
        }
      } else if (user.archived) {
        return false; // Archived without date = unavailable
      }
      
      // Check if user was on leave on this date
      const woDateStr = formatDate(woDate).split('/').reverse().join('-'); // Convert to yyyy-MM-dd
      const onLeave = approvedLeaves.some(leave => {
        if (leave.employee_id !== user.id) return false;
        return woDateStr >= leave.start_date && woDateStr <= leave.end_date;
      });
      
      return !onLeave;
    };
    
    // ✅ Filter only available users for the work order date
    const assignedUsers = allUsers.filter(u => 
      (wo.employee_ids || []).includes(u.id) && 
      isUserAvailableForWO(u, wo.planned_start_time)
    );
    const assignedTeams = teams.filter(t => (wo.team_ids || []).includes(t.id));
    
    // Resolve Assets
    const assignedAssets = (wo.equipment_ids || []).map(id => {
        const asset = assets.find(a => a.id === id);
        if (asset) return { ...asset, type: 'Asset' };
        const clientEq = clientEquipments.find(e => e.id === id);
        if (clientEq) return { ...clientEq, type: 'Client Equipment' };
        return null;
    }).filter(Boolean);


    // 2. PDF Setup
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10;
    
    let y = margin;

    // Helper function to add image to PDF
    const addImageToPDF = async (imageUrl, x, y, maxWidth, maxHeight) => {
        if (!imageUrl) return { success: false };
        
        try {
            const response = await fetch(imageUrl);
            if (!response.ok) return { success: false };
            
            const arrayBuffer = await response.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            
            if (uint8Array.length < 100) return { success: false };
            
            const isJpeg = uint8Array[0] === 0xFF && uint8Array[1] === 0xD8;
            const isPng = uint8Array[0] === 0x89 && uint8Array[1] === 0x50;
            
            if (!isJpeg && !isPng) return { success: false };
            
            const imageType = isJpeg ? 'JPEG' : 'PNG';
            
            // Get dimensions
            let imgWidth = 0, imgHeight = 0;
            if (isPng) {
                imgWidth = (uint8Array[16] << 24) | (uint8Array[17] << 16) | (uint8Array[18] << 8) | uint8Array[19];
                imgHeight = (uint8Array[20] << 24) | (uint8Array[21] << 16) | (uint8Array[22] << 8) | uint8Array[23];
            } else {
                for (let i = 0; i < uint8Array.length - 1; i++) {
                    if (uint8Array[i] === 0xFF && (uint8Array[i + 1] === 0xC0 || uint8Array[i + 1] === 0xC2)) {
                        imgHeight = (uint8Array[i + 5] << 8) | uint8Array[i + 6];
                        imgWidth = (uint8Array[i + 7] << 8) | uint8Array[i + 8];
                        break;
                    }
                }
            }
            
            // Calculate dimensions
            let finalWidth = maxWidth, finalHeight = maxHeight;
            if (imgWidth > 0 && imgHeight > 0) {
                const aspectRatio = imgWidth / imgHeight;
                if (maxWidth / maxHeight > aspectRatio) {
                    finalHeight = maxHeight;
                    finalWidth = maxHeight * aspectRatio;
                } else {
                    finalWidth = maxWidth;
                    finalHeight = maxWidth / aspectRatio;
                }
            }
            
            // Convert to base64 using btoa
            let binary = '';
            for (let i = 0; i < uint8Array.length; i++) {
                binary += String.fromCharCode(uint8Array[i]);
            }
            const base64 = btoa(binary);
            
            const mimeType = isJpeg ? 'image/jpeg' : 'image/png';
            const dataUri = `data:${mimeType};base64,${base64}`;
            
            doc.addImage(dataUri, imageType, x, y, finalWidth, finalHeight);
            
            return { success: true, width: finalWidth, height: finalHeight };
        } catch (e) {
            console.error('Image error:', e.message);
            return { success: false };
        }
    };

    // 3. Header Logic
    const logoUrl = branch?.logo_forms_url || branch?.logo_url;
    const maxLogoWidth = 55;
    const maxLogoHeight = 35;
    let finalLogoWidth = maxLogoWidth;
    let finalLogoHeight = maxLogoHeight;
    const logoY = margin;
    
    // Company Details
    const companyName = branch?.name || "REDCRANE LOADING & LIFTING EQUIPMENT RENTAL LLC";
    const phoneText = branch?.phone || "055 375 2740, 055 338 3988";
    const companyContact = `Contact Details: ${phoneText}`;
    const companyEmail = branch?.email || "emirates@redcrane.com";
    const trnText = branch?.tax_number || "100387160300003";
    const trnLabel = `TRN No. ${trnText}`;
    
    // Add logo
    console.log('🖼️ [WO PDF] Logo URL:', logoUrl);
    
    if (logoUrl) {
        const logoX = pageWidth - margin - maxLogoWidth;
        const result = await addImageToPDF(logoUrl, logoX, logoY, maxLogoWidth, maxLogoHeight);
        if (result.success) {
            finalLogoWidth = result.width;
            finalLogoHeight = result.height;
            console.log('✅ [WO PDF] Logo added successfully');
        } else {
            console.log('⚠️ [WO PDF] Logo could not be added');
        }
    }
    
    // Calculate max width for company text
    const logoX = pageWidth - margin - finalLogoWidth;
    const maxTextWidth = logoX - margin - 5;

    // Now add company text on the LEFT (after logo so it doesn't get covered)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(200, 0, 0); // Red
    // Split company name if too long
    const companyNameLines = doc.splitTextToSize(companyName, maxTextWidth);
    doc.text(companyNameLines, margin, y + 6);
    
    const textYOffset = companyNameLines.length > 1 ? 4 : 0;
    
    doc.setFontSize(8);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    doc.text(companyContact, margin, y + 11 + textYOffset);
    doc.text(companyEmail, margin, y + 15 + textYOffset);
    doc.setFont('helvetica', 'bold');
    doc.text(trnLabel, margin, y + 19 + textYOffset);

    // WO Number (Below logo on the right)
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`No. ${wo.work_order_number || ''}`, pageWidth - margin, y + 28, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    y += 35;

    // Title
    // Modern separator line
    doc.setDrawColor(200, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("SERVICE & MAINTENANCE REPORT", margin, y);
    y += 5;

    // Modern Table Styles
    const headerColor = [220, 50, 50]; // Redcrane Red-ish
    const headerText = 255; // White

    // 4. Job Info Table
    const jobInfoData = [
        [
            { content: 'COMPANY', styles: { fillColor: headerColor, textColor: headerText, fontStyle: 'bold' } },
            customer?.name || '-',
            { content: 'CATEGORY', styles: { fillColor: headerColor, textColor: headerText, fontStyle: 'bold', halign: 'center' } },
            { content: woCategory?.name || '-', colSpan: 2, styles: { halign: 'center' } },
        ],
        [
            { content: 'LOCATION', styles: { fillColor: headerColor, textColor: headerText, fontStyle: 'bold' } },
            project?.address || project?.location_name || '-',
            { content: 'DATE', styles: { fillColor: headerColor, textColor: headerText, fontStyle: 'bold', halign: 'center' } },
            { content: 'STARTING TIME', styles: { fillColor: headerColor, textColor: headerText, fontStyle: 'bold', halign: 'center' } },
            { content: 'ENDING TIME', styles: { fillColor: headerColor, textColor: headerText, fontStyle: 'bold', halign: 'center' } },
        ],
        [
            { content: 'PROJECT SITE', styles: { fillColor: headerColor, textColor: headerText, fontStyle: 'bold' } },
            project?.name || '-',
            { content: formatDate(wo.planned_start_time), styles: { halign: 'center' } },
            { content: formatTime(wo.planned_start_time), styles: { halign: 'center' } },
            { content: wo.end_time ? formatTime(wo.end_time) : formatTime(wo.planned_end_time), styles: { halign: 'center' } },
        ],
        [
            { content: 'ASSET CUSTOMER NO.', styles: { fillColor: headerColor, textColor: headerText, fontStyle: 'bold' } },
            assignedAssets.map(a => a.name).join(', ') || '-',
            { content: 'STATUS', styles: { fillColor: headerColor, textColor: headerText, fontStyle: 'bold', halign: 'center' } },
            { content: wo.status || '-', colSpan: 2, styles: { halign: 'center' } },
        ]
    ];

    doc.autoTable({
        startY: y,
        head: [],
        body: jobInfoData,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1, lineColor: 0, lineWidth: 0.1 },
        columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 60 },
            2: { cellWidth: 30 },
            3: { cellWidth: 30 },
            4: { cellWidth: 30 }
        },
        margin: { left: margin, right: margin }
    });

    y = doc.lastAutoTable.finalY + 5;

    // 5. Assets Details (Always show block even if empty)
    const asset = assignedAssets.length > 0 ? assignedAssets[0] : {};
    
    doc.setFillColor(255, 235, 230); // Light orange/red background
    doc.rect(margin, y, pageWidth - 2 * margin, 6, 'F');
    doc.setDrawColor(0);
    doc.rect(margin, y, pageWidth - 2 * margin, 6);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`ASSET: ${(asset.name || '-').toUpperCase()} (${asset.category || ''})`, margin + 2, y + 4);
    doc.text(`MODEL: ${asset.model || '-'}`, margin + 100, y + 4);
    doc.text(`YEAR: ${asset.year || asset.purchase_date?.split('-')[0] || '-'}`, margin + 150, y + 4);

    y += 6;
    
    // Asset details grid
    const assetDetailsData = [
        ['BRAND:', asset.brand || '-', 'MANUAL?', '[ ]'],
        ['SERIAL NO:', asset.identifier || asset.serial_no || '-', 'N. TIE COLLARS:', '-'],
        ['LAST THIRD PARTY:', '-', 'ON BASE:', '[ ]'],
        ['JIB / ACTUAL HEIGHT:', '-', 'ON ANCHORS:', '[ ]']
    ];
    
    doc.autoTable({
        startY: y,
        body: assetDetailsData,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 1.5 },
        columnStyles: {
            0: { cellWidth: 35, fontStyle: 'bold', textColor: [50, 50, 50] },
            1: { cellWidth: 60 },
            2: { cellWidth: 35, fontStyle: 'bold', textColor: [50, 50, 50] },
            3: { cellWidth: 20 }
        },
        margin: { left: margin }
    });
    y = doc.lastAutoTable.finalY + 2;
    
    doc.line(margin, y, pageWidth - margin, y);
    y += 2;

    // 6. Checklists (Instructions & Work Done & Spare Parts)
    
    // Instructions
    if (wo.work_description_items?.length > 0) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text("ORDER INSTRUCTIONS", margin, y + 4);
        y += 5;
        
        const instructionsData = wo.work_description_items.map(item => [
            item.text, 
            item.checked ? 'YES' : 'NO'
        ]);
        
        doc.autoTable({
            startY: y,
            head: [['INSTRUCTION', 'COMPLETED']],
            body: instructionsData,
            theme: 'grid',
            headStyles: { fillColor: headerColor, textColor: headerText, fontSize: 9, fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 2 },
            columnStyles: { 0: { cellWidth: 150 }, 1: { cellWidth: 30, halign: 'center' } },
            margin: { left: margin, right: margin }
        });
        y = doc.lastAutoTable.finalY + 5;
    }

    // Work Done / Site Report
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text("SITE REPORT / WORK DONE", margin, y + 4);
    y += 5;

    const workDoneItems = wo.work_done_items?.map(item => [item.text, '[ X ]', '[   ]']) || [];
    // Add extra empty rows as requested
    for(let i=0; i<2; i++) workDoneItems.push(['', '[   ]', '[   ]']);

    doc.autoTable({
        startY: y,
        head: [['DESCRIPTION OF WORK', 'DONE', 'PENDING']],
        body: workDoneItems,
        theme: 'grid',
        headStyles: { fillColor: headerColor, textColor: headerText, fontSize: 9, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 0: { cellWidth: 130 }, 1: { cellWidth: 25, halign: 'center' }, 2: { cellWidth: 25, halign: 'center' } },
        margin: { left: margin, right: margin }
    });
    y = doc.lastAutoTable.finalY + 5;

    // Notes
    if (wo.work_notes) {
        doc.setFillColor(255, 235, 230);
        doc.rect(margin, y, pageWidth - 2*margin, 6, 'F');
        doc.rect(margin, y, pageWidth - 2*margin, 6);
        doc.setFontSize(9);
        doc.text("NOTES / REMARKS:", margin + 2, y + 4);
        y += 6;
        
        doc.setFont('helvetica', 'normal');
        doc.rect(margin, y, pageWidth - 2*margin, 15);
        const splitNotes = doc.splitTextToSize(wo.work_notes, pageWidth - 2*margin - 4);
        doc.text(splitNotes, margin + 2, y + 4);
        y += 20;
    }

    // Status
    doc.setFont('helvetica', 'bold');
    doc.text("WORK STATUS", margin, y);
    y += 5;
    
    doc.setFont('helvetica', 'normal');
    const statusOptions = ["All done", "Pending more work", "Safe to use", "Unsafe to use", "Others"];
    const currentStatus = wo.job_completion_status;
    
    let statusX = margin;
    statusOptions.forEach(opt => {
        const isSelected = opt === currentStatus;
        const text = `[ ${isSelected ? 'X' : ' '} ] ${opt}`;
        doc.text(text, statusX, y);
        statusX += doc.getStringUnitWidth(text) * 10 / doc.internal.scaleFactor + 25; 
    });
    y += 10;

    // Spare Parts
    doc.setFont('helvetica', 'bold');
    doc.text("SPARE PARTS INSTALLED / REPLACED", margin, y);
    y += 2;
    
    const sparePartsDone = (wo.spare_parts_items || []).map(item => [item.text, '[ X ]', '[   ]', '1']);
    const sparePartsPending = (wo.spare_parts_pending_items || []).map(item => [item.text, '[   ]', '[ X ]', '1']);
    let combinedSpareParts = [...sparePartsDone, ...sparePartsPending];
    
    // Add extra empty rows as requested
    for(let i=0; i<3; i++) combinedSpareParts.push(['', '[   ]', '[   ]', '']);

    doc.autoTable({
        startY: y,
        head: [['PART DESCRIPTION', 'DONE', 'PENDING', 'QTY']],
        body: combinedSpareParts,
        theme: 'grid',
        headStyles: { fillColor: headerColor, textColor: headerText, fontSize: 9, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 
            0: { cellWidth: 110 }, 
            1: { cellWidth: 25, halign: 'center' }, 
            2: { cellWidth: 25, halign: 'center' },
            3: { cellWidth: 20, halign: 'center' }
        },
        margin: { left: margin, right: margin }
    });
    y = doc.lastAutoTable.finalY + 5;

    // Time Tracker
    if (wo.start_time && wo.end_time) {
        doc.setFont('helvetica', 'bold');
        doc.text("TIME TRACKER", margin, y);
        y += 4;
        
        const timeData = [
            ['Clock In', formatTime(wo.start_time)],
            ['Clock Out', formatTime(wo.end_time)],
            ['Duration', `${Math.floor((wo.duration_minutes || 0) / 60)}h ${(wo.duration_minutes || 0) % 60}m`]
        ];
        
        doc.autoTable({
            startY: y,
            body: timeData,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 1 },
            columnStyles: { 0: { cellWidth: 40, fontStyle: 'bold' }, 1: { cellWidth: 100 } },
            margin: { left: margin }
        });
        y = doc.lastAutoTable.finalY + 5;
    }

    // 7. Footer / Signatures
    // Ensure we have space at bottom
    if (y > pageHeight - 40) {
        doc.addPage();
        y = 20;
    }

    y = Math.max(y, pageHeight - 40); // Push to bottom if space allows, or just use current Y

    doc.setDrawColor(0);
    doc.setLineWidth(0.1);
    
    // Signature Box
    const sigBoxY = y;
    const sigBoxHeight = 25;
    const colWidth = (pageWidth - 2 * margin) / 3;

    // Mechanic
    doc.rect(margin, sigBoxY, colWidth, sigBoxHeight);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text("REDCRANE MECHANIC/S:", margin + 2, sigBoxY + 4);
    
    if (assignedUsers.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.text(assignedUsers.map(u => u.full_name || u.email).join('\n'), margin + 2, sigBoxY + 10);
    }

    // Operator
    doc.rect(margin + colWidth, sigBoxY, colWidth, sigBoxHeight);
    doc.setFont('helvetica', 'bold');
    doc.text("NAME OF OPERATOR:", margin + colWidth + 2, sigBoxY + 4);

    // Client
    doc.rect(margin + 2 * colWidth, sigBoxY, colWidth, sigBoxHeight);
    doc.setFont('helvetica', 'bold');
    doc.text("NAME OF RESPONSIBLE FROM SITE:", margin + 2 * colWidth + 2, sigBoxY + 4);
    doc.text("(NAME & PHONE)", margin + 2 * colWidth + 2, sigBoxY + 8);
    
    if (wo.client_representative_name) {
        doc.setFont('helvetica', 'normal');
        doc.text(wo.client_representative_name, margin + 2 * colWidth + 2, sigBoxY + 14);
        if (wo.client_representative_phone) {
            doc.text(wo.client_representative_phone, margin + 2 * colWidth + 2, sigBoxY + 18);
        }
    }
    
    // Disclaimer
    doc.setFontSize(6);
    doc.text("Name & Signature is only for verifying the time and spare parts that has been used in this WR.", margin + 2 * colWidth + 2, sigBoxY + 22, { maxWidth: colWidth - 4 });


    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename=WO-${wo.work_order_number || 'report'}.pdf`
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});