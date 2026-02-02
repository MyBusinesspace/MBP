import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';
import { PDFDocument } from 'npm:pdf-lib@1.17.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      startDate, 
      endDate, 
      teamIds = [], 
      projectIds = [], 
      categoryIds = [],
      statusFilter = [], 
      userIds = [],
      includeNotes = true,
      includeContacts = true,
      groupBy = 'team', // 'team', 'project', 'date'
      sortBy = 'time' // 'time', 'team', 'project'
    } = body;

    console.log('📥 Export PDF request:', { 
      startDate, 
      endDate, 
      teamIds, 
      projectIds, 
      categoryIds, 
      statusFilter,
      userIds,
      groupBy,
      sortBy
    });

    const [workOrders, teams, users, projects, customers, categories, branches] = await Promise.all([
      base44.asServiceRole.entities.TimeEntry.list('-updated_date', 2000),
      base44.asServiceRole.entities.Team.list('sort_order', 1000),
      base44.functions.invoke('getAllUsers'),
      base44.asServiceRole.entities.Project.list('-updated_date', 1000),
      base44.asServiceRole.entities.Customer.list('-updated_date', 1000),
      base44.asServiceRole.entities.WorkOrderCategory.list('sort_order', 1000),
      (async () => {
        try {
          return await base44.asServiceRole.entities.Branch.list();
        } catch {
          return [];
        }
      })()
    ]);

    const allUsers = Array.isArray(users.data?.users) ? users.data.users : [];

    const formatTimeGMT4 = (isoString) => {
      if (!isoString) return '';
      const date = new Date(isoString);
      const dubaiOffset = 4 * 60;
      const localOffset = date.getTimezoneOffset();
      const totalOffset = dubaiOffset + localOffset;
      const dubaiTime = new Date(date.getTime() + (totalOffset * 60 * 1000));
      const hours = dubaiTime.getHours().toString().padStart(2, '0');
      const minutes = dubaiTime.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    };

    const formatDateGMT4 = (isoString) => {
      if (!isoString) return '';
      const date = new Date(isoString);
      const dubaiOffset = 4 * 60;
      const localOffset = date.getTimezoneOffset();
      const totalOffset = dubaiOffset + localOffset;
      const dubaiTime = new Date(date.getTime() + (totalOffset * 60 * 1000));
      const month = (dubaiTime.getMonth() + 1).toString().padStart(2, '0');
      const day = dubaiTime.getDate().toString().padStart(2, '0');
      const year = dubaiTime.getFullYear();
      return `${month}/${day}/${year}`;
    };

    const formatDateLongGMT4 = (isoString) => {
      if (!isoString) return '';
      const date = new Date(isoString);
      const dubaiOffset = 4 * 60;
      const localOffset = date.getTimezoneOffset();
      const totalOffset = dubaiOffset + localOffset;
      const dubaiTime = new Date(date.getTime() + (totalOffset * 60 * 1000));
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      return dubaiTime.toLocaleDateString('en-US', options);
    };

    // ✅ FILTRADO ROBUSTO
    let filteredOrders = workOrders.filter(wo => {
      // Status filter
      if (statusFilter.length > 0 && !statusFilter.includes(wo.status)) {
        return false;
      }

      // Team filter
      if (teamIds.length > 0) {
        const woTeamIds = wo.team_ids || (wo.team_id ? [wo.team_id] : []);
        if (!woTeamIds.some(tid => teamIds.includes(tid))) {
          return false;
        }
      }

      // Project filter
      if (projectIds.length > 0 && !projectIds.includes(wo.project_id)) {
        return false;
      }

      // Category filter
      if (categoryIds.length > 0 && !categoryIds.includes(wo.work_order_category_id)) {
        return false;
      }

      // User filter
      if (userIds.length > 0) {
        const woUserIds = wo.employee_ids || [];
        if (!woUserIds.some(uid => userIds.includes(uid))) {
          return false;
        }
      }

      // Must have at least one team
      const hasTeam = (wo.team_ids && wo.team_ids.length > 0) || wo.team_id;
      if (!hasTeam) {
        return false;
      }

      return true;
    });

    console.log('📊 After filters:', filteredOrders.length);

    // Date range filter
    if (startDate && endDate) {
      console.log('📅 Filtering between:', startDate, 'and', endDate);
      filteredOrders = filteredOrders.filter(wo => {
        if (!wo.planned_start_time) return false;
        // Shift UTC to GMT+4 for accurate daily filtering in Dubai timezone
        const d = new Date(wo.planned_start_time);
        d.setHours(d.getHours() + 4);
        const woDateStr = d.toISOString().split('T')[0];
        return woDateStr >= startDate && woDateStr <= endDate;
      });
      console.log('✅ After date filter:', filteredOrders.length);
    }

    const getTeamSortKey = (name) => {
      const serviceMatch = name.match(/Service\s+(\d+)/i);
      if (serviceMatch) {
        const num = parseInt(serviceMatch[1]);
        return `A_Service_${num.toString().padStart(3, '0')}`;
      }
      const factoryMatch = name.match(/Factory\s+(\d+)/i);
      if (factoryMatch) {
        const num = parseInt(factoryMatch[1]);
        if (num === 7) return `Z_Factory_${num.toString().padStart(3, '0')}`;
        return `B_Factory_${num.toString().padStart(3, '0')}`;
      }
      const operationMatch = name.match(/Operation\s+(\d+)/i);
      if (operationMatch) {
        const num = parseInt(operationMatch[1]);
        return `C_Operation_${num.toString().padStart(3, '0')}`;
      }
      return `Y_${name}`;
    };

    // ✅ SORTING
    filteredOrders.sort((a, b) => {
      if (sortBy === 'time') {
        const timeA = a.planned_start_time ? new Date(a.planned_start_time).getTime() : 0;
        const timeB = b.planned_start_time ? new Date(b.planned_start_time).getTime() : 0;
        return timeA - timeB;
      } else if (sortBy === 'team') {
        const teamIdA = a.team_id || (a.team_ids && a.team_ids.length > 0 ? a.team_ids[0] : null);
        const teamIdB = b.team_id || (b.team_ids && b.team_ids.length > 0 ? b.team_ids[0] : null);
        const teamA = teamIdA ? teams.find(t => t.id === teamIdA) : null;
        const teamB = teamIdB ? teams.find(t => t.id === teamIdB) : null;
        const teamNameA = teamA?.name || 'ZZZ_Unassigned';
        const teamNameB = teamB?.name || 'ZZZ_Unassigned';
        return getTeamSortKey(teamNameA).localeCompare(getTeamSortKey(teamNameB));
      } else if (sortBy === 'project') {
        const projectA = projects.find(p => p.id === a.project_id);
        const projectB = projects.find(p => p.id === b.project_id);
        return (projectA?.name || '').localeCompare(projectB?.name || '');
      }
      return 0;
    });

    // ✅ GROUPING - Ordenar teams con WOs al inicio
    const grouped = {};
    filteredOrders.forEach(wo => {
      let keys = [];
      
      if (groupBy === 'team') {
        const teamIds = wo.team_ids || (wo.team_id ? [wo.team_id] : []);
        teamIds.forEach(teamId => {
          const team = teams.find(t => t.id === teamId);
          if (team) keys.push(`team_${team.name}`);
        });
      } else if (groupBy === 'project') {
        const project = projects.find(p => p.id === wo.project_id);
        if (project) keys.push(`project_${project.name}`);
      } else if (groupBy === 'date') {
        if (wo.planned_start_time) {
          const dateStr = wo.planned_start_time.split('T')[0];
          keys.push(`date_${dateStr}`);
        }
      }

      keys.forEach(key => {
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(wo);
      });
    });

    // ✅ ORDENAR KEYS: Teams con WOs primero, ordenados numéricamente
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      if (groupBy === 'team') {
        const nameA = a.replace('team_', '');
        const nameB = b.replace('team_', '');
        
        // Teams con WOs tienen prioridad
        const hasWOsA = grouped[a].length > 0;
        const hasWOsB = grouped[b].length > 0;
        
        if (hasWOsA && !hasWOsB) return -1;
        if (!hasWOsA && hasWOsB) return 1;
        
        // Ordenar numéricamente por Service/Factory/Operation
        return getTeamSortKey(nameA).localeCompare(getTeamSortKey(nameB));
      } else if (groupBy === 'date') {
        return a.localeCompare(b);
      }
      return a.localeCompare(b);
    });

    // Calculate display numbers
    Object.keys(grouped).forEach(key => {
      const orders = grouped[key];
      const ordersByDay = {};
      
      orders.forEach(wo => {
        const woDate = wo.planned_start_time ? wo.planned_start_time.split('T')[0] : null;
        if (woDate) {
          if (!ordersByDay[woDate]) ordersByDay[woDate] = [];
          ordersByDay[woDate].push(wo);
        }
      });

      Object.keys(ordersByDay).forEach(date => {
        const dayOrders = ordersByDay[date];
        dayOrders.sort((a, b) => {
          const timeA = a.planned_start_time ? new Date(a.planned_start_time).getTime() : 0;
          const timeB = b.planned_start_time ? new Date(b.planned_start_time).getTime() : 0;
          return timeA - timeB;
        });
        const total = dayOrders.length;
        dayOrders.forEach((wo, index) => {
          wo._displayNumber = `N${index + 1} of ${total}`;
        });
      });
    });

    // ✅ PDF GENERATION
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

    // Helper functions
    // Get branch data for company info
    const branchList = Array.isArray(branches) ? branches : (branches?.data || []);
    const activeBranch = branchList.find(b => b.is_active) || branchList[0];

    console.log(`[Export PDF] Active branch: name=${activeBranch?.name}, logo_forms_url=${activeBranch?.logo_forms_url}`);

    // Logo loading - fetch raw bytes for pdf-lib embedding later
    let logoBytes = null;
    let logoFormat = null;
    let logoLoadError = null;
    const logoUrl = activeBranch?.logo_forms_url || activeBranch?.logo_url;

    console.log(`[Export PDF] Branch: ${activeBranch?.name}, logoUrl: ${logoUrl}`);

    if (logoUrl) {
        try {
            console.log(`[Export PDF] Fetching logo: ${logoUrl}`);
            const res = await fetch(logoUrl);
            
            if (!res.ok) {
                logoLoadError = `HTTP ${res.status}`;
            } else {
                const arrayBuffer = await res.arrayBuffer();
                const uint8Array = new Uint8Array(arrayBuffer);
                
                console.log(`[Export PDF] Logo: ${uint8Array.length} bytes, first bytes: ${uint8Array[0]},${uint8Array[1]},${uint8Array[2]},${uint8Array[3]}`);
                
                const isJpeg = uint8Array[0] === 0xFF && uint8Array[1] === 0xD8;
                const isPng = uint8Array[0] === 0x89 && uint8Array[1] === 0x50;
                
                if ((isJpeg || isPng) && uint8Array.length > 100) {
                    logoBytes = uint8Array;
                    logoFormat = isJpeg ? 'jpeg' : 'png';
                    console.log(`✅ [Export PDF] Logo fetched: ${logoFormat}, ${uint8Array.length} bytes`);
                } else {
                    logoLoadError = 'Unknown format or too small';
                }
            }
        } catch (e) {
            logoLoadError = e.message;
            console.error(`[Export PDF] Logo error:`, e.message);
        }
    } else {
        logoLoadError = 'No URL';
    }

    const addHeader = (yPos, title, subtitle = '') => {
      // Company Info on LEFT - use branch data if available
      const companyName = activeBranch?.name || "REDCRANE LOADING & LIFTING EQUIPMENT RENTAL LLC";
      const phoneText = activeBranch?.phone || "055 375 2740, 055 338 3988";
      const emailText = activeBranch?.email || "emirates@redcrane.com";
      const trnText = activeBranch?.tax_number || "100387160300003";

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(200, 0, 0);
      doc.text(companyName, leftMargin, 14);

      doc.setFontSize(7);
      doc.setTextColor(0);
      doc.setFont('helvetica', 'normal');
      doc.text(`Contact Details: ${phoneText}`, leftMargin, 18);
      doc.text(emailText, leftMargin, 22);
      doc.setFont('helvetica', 'bold');
      doc.text(`TRN No. ${trnText}`, leftMargin, 26);

      // Logo on RIGHT (top-right corner)
      const logoWidth = 55;
      const logoHeight = 18;
      const logoX = pageWidth - 15 - logoWidth;
      const logoY = 8;

      // Logo will be added via pdf-lib after jsPDF generation
      // Just reserve space for now - no placeholder needed

      // Title Line
      doc.setDrawColor(200, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(leftMargin, 32, pageWidth - leftMargin, 32);
      
      // Report Title
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text(title, leftMargin, 40);
      
      if (subtitle) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(subtitle, leftMargin, 45);
      }

      // Applied Filters (Moved further down)
      const filterBoxW = contentWidth; // Full width
      const filterBoxX = leftMargin;
      const filterBoxY = 50; // Moved down to avoid overlap with Title/Subtitle
      
      doc.setDrawColor(220, 220, 220);
      doc.setFillColor(248, 250, 252); // Slate-50
      doc.setLineWidth(0.1);
      doc.roundedRect(filterBoxX, filterBoxY, filterBoxW, 12, 1, 1, 'FD');
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(50);
      doc.text("Applied Filters:", filterBoxX + 2, filterBoxY + 5);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80);
      
      const filters = [];
      if (startDate && endDate) filters.push(`Date: ${formatDateGMT4(startDate + 'T00:00:00')} - ${formatDateGMT4(endDate + 'T00:00:00')}`);
      if (teamIds.length > 0) filters.push(`Teams: ${teamIds.length} selected`);
      if (statusFilter.length > 0) filters.push(`Status: ${statusFilter.join(', ')}`);
      
      if (filters.length === 0) filters.push("All records");
      
      const filterText = filters.join('  |  ');
      doc.text(filterText, filterBoxX + 2, filterBoxY + 9);
      
      return 70; // Increased starting Y for content
    };

    // ✅ MEJORADO: Mostrar "Team: Service 1" en vez de solo "SERVICE 1"
    const addSectionHeader = (yPos, text, count, isTeamGroup = false) => {
      doc.setFillColor(79, 70, 229); // Indigo-600
      doc.roundedRect(leftMargin, yPos - 2, contentWidth, 12, 2, 2, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      
      // ✅ Si es agrupación por team, mostrar "Team: Service 1"
      const displayText = isTeamGroup ? `Team: ${text}` : text.toUpperCase();
      doc.text(displayText, leftMargin + 3, yPos + 5);
      
      doc.setFontSize(11);
      doc.text(`(${count} ${count === 1 ? 'Work Order' : 'Work Orders'})`, rightMargin - 3, yPos + 5, { align: 'right' });
      
      doc.setTextColor(0, 0, 0);
      return yPos + 15;
    };

    const addWorkOrder = (yPos, wo) => {
      if (yPos > pageHeight - 80) {
        doc.addPage();
        yPos = 20;
      }

      const project = projects.find(p => p.id === wo.project_id);
      const customer = project?.customer_id ? customers.find(c => c.id === project.customer_id) : null;
      const assignedUsers = allUsers.filter(u => (wo.employee_ids || []).includes(u.id));
      const category = categories.find(c => c.id === wo.work_order_category_id);
      const woTeams = (wo.team_ids || []).map(tid => teams.find(t => t.id === tid)).filter(Boolean);

      // Card border
      doc.setDrawColor(226, 232, 240); // Slate-200
      doc.setLineWidth(0.5);
      doc.roundedRect(leftMargin, yPos, contentWidth, 0, 2, 2, 'S');
      
      const cardStart = yPos;
      yPos += 5;

      // WO Number and Title
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      const displayNumber = wo._displayNumber || wo.work_order_number || 'N/A';
      doc.setTextColor(30, 58, 138); // Blue-900
      doc.text(displayNumber, leftMargin + 3, yPos);
      
      // Status badge
      const statusColors = {
        'on_queue': [148, 163, 184], // Slate-400
        'ongoing': [59, 130, 246], // Blue-500
        'closed': [34, 197, 94] // Green-500
      };
      const statusColor = statusColors[wo.status] || [107, 114, 128];
      doc.setFillColor(...statusColor);
      const statusText = wo.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN';
      const statusWidth = doc.getTextWidth(statusText) + 4;
      doc.roundedRect(rightMargin - statusWidth - 3, yPos - 4, statusWidth, 6, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text(statusText, rightMargin - statusWidth / 2 - 3, yPos, { align: 'center' });
      
      yPos += 6;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      const titleLines = doc.splitTextToSize(wo.title || 'Untitled Work Order', contentWidth - 6);
      titleLines.forEach(line => {
        doc.text(line, leftMargin + 3, yPos);
        yPos += 5;
      });

      yPos += 2;

      // Metadata grid
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      if (category) {
        doc.setFont('helvetica', 'bold');
        doc.text('Category:', leftMargin + 3, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(category.name, leftMargin + 25, yPos);
        yPos += 4;
      }

      if (project) {
        doc.setFont('helvetica', 'bold');
        doc.text('Project:', leftMargin + 3, yPos);
        doc.setFont('helvetica', 'normal');
        const projectText = doc.splitTextToSize(project.name, contentWidth - 28);
        projectText.forEach((line, idx) => {
          doc.text(line, leftMargin + 25, yPos);
          if (idx < projectText.length - 1) yPos += 4;
        });
        yPos += 4;
      }

      if (customer) {
        doc.setFont('helvetica', 'bold');
        doc.text('Customer:', leftMargin + 3, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(customer.name, leftMargin + 25, yPos);
        yPos += 4;
      }

      if (woTeams.length > 0 && groupBy !== 'team') {
        doc.setFont('helvetica', 'bold');
        doc.text('Teams:', leftMargin + 3, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(woTeams.map(t => t.name).join(', '), leftMargin + 25, yPos);
        yPos += 4;
      }

      if (project?.location_name || project?.address) {
        doc.setFont('helvetica', 'bold');
        doc.text('Location:', leftMargin + 3, yPos);
        doc.setFont('helvetica', 'italic');
        const locationLines = doc.splitTextToSize(project.location_name || project.address, contentWidth - 28);
        locationLines.forEach((line, idx) => {
          doc.text(line, leftMargin + 25, yPos);
          if (idx < locationLines.length - 1) yPos += 4;
        });
        doc.setFont('helvetica', 'normal');
        yPos += 4;
      }

      if (wo.planned_start_time) {
        doc.setFont('helvetica', 'bold');
        doc.text('Date & Time:', leftMargin + 3, yPos);
        doc.setFont('helvetica', 'normal');
        const dateStr = formatDateLongGMT4(wo.planned_start_time);
        const startTime = formatTimeGMT4(wo.planned_start_time);
        const endTime = wo.planned_end_time ? formatTimeGMT4(wo.planned_end_time) : '';
        const timeStr = endTime ? `${startTime} - ${endTime}` : startTime;
        doc.text(`${dateStr}, ${timeStr}`, leftMargin + 25, yPos);
        yPos += 4;
      }

      if (assignedUsers.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('Assigned:', leftMargin + 3, yPos);
        doc.setFont('helvetica', 'normal');
        const userNames = assignedUsers.map(u => u.nickname || u.first_name || u.email).join(', ');
        const userLines = doc.splitTextToSize(userNames, contentWidth - 28);
        userLines.forEach((line, idx) => {
          doc.text(line, leftMargin + 25, yPos);
          if (idx < userLines.length - 1) yPos += 4;
        });
        yPos += 4;
      }

      yPos += 2;

      if (wo.work_description_items && Array.isArray(wo.work_description_items) && wo.work_description_items.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('Order Instructions:', leftMargin + 3, yPos);
        yPos += 4;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        
        wo.work_description_items.forEach(item => {
          const textContent = typeof item === 'string' ? item : (item.text || '');
          if (!textContent) return;
          
          const isChecked = typeof item === 'object' && item.checked;
          const prefix = isChecked ? '[x] ' : '[ ] ';
          const fullText = prefix + textContent;
          
          const lines = doc.splitTextToSize(fullText, contentWidth - 10);
          lines.forEach(line => {
            if (yPos > pageHeight - 25) {
              doc.addPage();
              yPos = 20;
            }
            doc.text(line, leftMargin + 6, yPos);
            yPos += 3.5;
          });
        });
        yPos += 2;
      }

      if (includeNotes && wo.work_notes) {
        doc.setFont('helvetica', 'bold');
        doc.text('Notes:', leftMargin + 3, yPos);
        yPos += 4;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        const noteLines = doc.splitTextToSize(wo.work_notes, contentWidth - 10);
        noteLines.forEach(line => {
          if (yPos > pageHeight - 25) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, leftMargin + 6, yPos);
          yPos += 3.5;
        });
        yPos += 2;
      }

      if (includeContacts && project?.contact_persons && project.contact_persons.length > 0) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Contacts:', leftMargin + 3, yPos);
        yPos += 4;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        project.contact_persons.forEach((contact, idx) => {
          const phone = project.phones?.[idx] || '';
          doc.text(`- ${contact}${phone ? ` - ${phone}` : ''}`, leftMargin + 6, yPos);
          yPos += 3.5;
        });
        yPos += 1;
      }

      yPos += 3;

      // Complete card border
      const cardHeight = yPos - cardStart;
      doc.roundedRect(leftMargin, cardStart, contentWidth, cardHeight, 2, 2, 'S');

      return yPos + 3;
    };

    // ✅ GENERATE PDF
    let isFirstPage = true;
    
    for (const key of sortedKeys) {
      const orders = grouped[key];
      if (orders.length === 0) continue;

      if (!isFirstPage) {
        doc.addPage();
      }
      isFirstPage = false;

      let yPos = 0;

      // Header
      const groupName = key.replace(/^(team|project|date)_/, '');
      const groupLabel = groupBy === 'team' ? groupName : 
                        groupBy === 'project' ? groupName : 
                        formatDateLongGMT4(groupName + 'T00:00:00');
      
      yPos = addHeader(yPos, 'Work Orders Report', 
        `Generated ${formatDateLongGMT4(new Date().toISOString())} | ${filteredOrders.length} total orders`);

      // Section header - ✅ Pasar flag para mostrar "Team: Service 1"
      yPos = addSectionHeader(yPos, groupLabel, orders.length, groupBy === 'team');

      // Work orders
      for (const wo of orders) {
        yPos = addWorkOrder(yPos, wo);
      }
    }

    // Add summary footer
    const addFooter = () => {
      const footerY = pageHeight - 10;
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber}`, pageWidth / 2, footerY, { align: 'center' });
      doc.text(`Generated by ${user.full_name || user.email}`, rightMargin, footerY, { align: 'right' });
    };

    // Add footer to all pages
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter();
    }

    // Get jsPDF output as bytes
    const jsPdfBytes = doc.output('arraybuffer');
    
    // Use pdf-lib to embed the logo (more reliable than jsPDF for images)
    let finalPdfBytes = jsPdfBytes;
    
    if (logoBytes && logoFormat) {
      try {
        console.log(`[Export PDF] Embedding logo with pdf-lib...`);
        const pdfDoc = await PDFDocument.load(jsPdfBytes);
        
        // Embed the image
        let logoImage;
        if (logoFormat === 'jpeg') {
          logoImage = await pdfDoc.embedJpg(logoBytes);
        } else {
          logoImage = await pdfDoc.embedPng(logoBytes);
        }
        
        // Add logo to each page
        const pages = pdfDoc.getPages();
        const logoWidth = 55 * 2.83465; // mm to points
        const logoHeight = 18 * 2.83465;
        const logoX = (pageWidth - 15) * 2.83465 - logoWidth;
        const logoY = pages[0].getHeight() - (8 + 18) * 2.83465; // top margin
        
        for (const page of pages) {
          page.drawImage(logoImage, {
            x: logoX,
            y: logoY,
            width: logoWidth,
            height: logoHeight,
          });
        }
        
        finalPdfBytes = await pdfDoc.save();
        console.log(`✅ [Export PDF] Logo embedded successfully on ${pages.length} pages`);
      } catch (e) {
        console.error(`[Export PDF] pdf-lib embedding failed:`, e.message);
        // Fall back to jsPDF output without logo
      }
    }

    return new Response(finalPdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename=work-orders-${new Date().toISOString().split('T')[0]}.pdf`
      }
    });

  } catch (error) {
    console.error('❌ Export PDF error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});