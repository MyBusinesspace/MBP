import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { format, parseISO } from 'npm:date-fns@4.1.0';

/**
 * Work Orders API with API Key Authentication
 * 
 * Authentication:
 * - Pass user_id in request headers as 'X-User-ID' or 'user_id'
 * - Or pass API key as 'X-API-Key' or 'api_key'
 * 
 * Endpoints:
 * - GET /api/work-orders - List work orders with filters
 * - GET /api/work-orders/:id - Get single work order
 * - POST /api/work-orders - Create work order (admin only)
 * - PUT /api/work-orders/:id - Update work order (admin only)
 * - DELETE /api/work-orders/:id - Delete work order (admin only)
 * - PATCH /api/work-orders/:id/archive - Archive work order (admin only)
 * - PATCH /api/work-orders/bulk-delete - Bulk delete work orders (admin only)
 * - PATCH /api/work-orders/bulk-archive - Bulk archive work orders (admin only)
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

      // Check if user is active
      // if (user.status !== 'Active') {
      //   return Response.json({ error: 'User account is not active' }, { status: 403 });
      // }

      // Check if user is archived
      if (user.archived) {
        return Response.json({ error: 'User account is archived' }, { status: 403 });
      }
    } else if (apiKey) {
      // Validate API key (you can store API keys in a separate entity or in user records)
      // For now, we'll check if the API key matches a user's ID (temporary solution)
      const users = await base44.asServiceRole.entities.User.list();
      user = users.find(u => u.id === apiKey || u.email === apiKey);
      
      if (!user) {
        return Response.json({ error: 'Invalid api_key' }, { status: 401 });
      }
    } 

    // Helper function to check if user is admin
    const isAdmin = () => user && user.role === 'admin';
// ======================================================================
//  Unified GET Handler Based on Action Parameter
// ======================================================================
if (method === "GET") {
    const action = url.searchParams.get("action");

    // -------------------------------------------------------------
    // ACTION 1: LIST WORK ORDERS (FILTERED)
    // -------------------------------------------------------------
    if (action === "list") {
        try {
            // Parse query parameters
            const projectId = url.searchParams.get('project_id');
            const teamId = url.searchParams.get('team_id');
            const categoryId = url.searchParams.get('category_id');
            const status = url.searchParams.get('status');
            const startDate = url.searchParams.get('start_date');
            const endDate = url.searchParams.get('end_date');
            const limit = parseInt(url.searchParams.get('limit') || '100');
            const offset = parseInt(url.searchParams.get('offset') || '0');
            const sortBy = url.searchParams.get('sort_by') || '-created_date';
            const filterDate = url.searchParams.get('date');

            // Fetch all work orders by user
            // let workOrders = await base44.asServiceRole.entities.TimeEntry.list(sortBy, limit + offset);
            // workOrders = workOrders.filter(wo => wo.employee_id === user.id || (wo.employee_ids || []).includes(user.id));

        // Fetch all work orders
        let workOrders = await base44.asServiceRole.entities.TimeEntry.list(sortBy, limit + offset);

        // 🔥 إذا كان المستخدم Admin → إرجاع كل on-going فقط
        if (isAdmin()) {
            workOrders = workOrders.filter(wo => !wo.archived);
        } 
        else {
            // 🟡 مستخدم عادي → إرجاع التايم شيت الخاصة به فقط
            workOrders = workOrders.filter(wo =>
                !wo.archived &&
                (wo.employee_id === user.id || (wo.employee_ids || []).includes(user.id))
            );
        }

      ////////////////

          // Apply filters
          workOrders = workOrders.filter(wo => {
            if (wo.archived) return false;
            if (projectId && wo.project_id !== projectId) return false;
            if (teamId) {
              const teamIds = wo.team_ids || (wo.team_id ? [wo.team_id] : []);
              if (!teamIds.includes(teamId)) return false;
            }
            if (categoryId && wo.work_order_category_id !== categoryId) return false;
            if (status && wo.status !== status) return false;

            if ((startDate || endDate) && wo.planned_start_time) {
              const woDate = new Date(wo.planned_start_time);
              const start = startDate ? new Date(startDate) : null;
              const end = endDate ? new Date(endDate) : null;
              if (start && woDate < start) return false;
              if (end && woDate > end) return false;
            }

            if (filterDate && wo.planned_start_time) {
              const woDateStr = wo.planned_start_time.slice(0, 10);
              if (woDateStr !== filterDate) return false;
            }

            return true;
          });

          // اجمع كل معرفات الموظفين بدون تكرار
          const employeeIdsSet = new Set();
          const projectIdsSet = new Set();
          const teamIdsSet = new Set();
          const branchIdsSet = new Set();

          workOrders.forEach(wo => {
            if (wo.employee_id) employeeIdsSet.add(wo.employee_id);
            if (wo.employee_ids && Array.isArray(wo.employee_ids)) wo.employee_ids.forEach(id => employeeIdsSet.add(id));
            if (wo.project_id) projectIdsSet.add(wo.project_id);
            if (wo.team_id) teamIdsSet.add(wo.team_id);
            if (wo.team_ids && Array.isArray(wo.team_ids)) wo.team_ids.forEach(id => teamIdsSet.add(id));
            if (wo.branch_id) branchIdsSet.add(wo.branch_id);
          });

          const employeeIds = [...employeeIdsSet];
          const projectIds = [...projectIdsSet];
          const teamIdsArr = [...teamIdsSet];
          const branchIds = [...branchIdsSet];

          // استرجاع بيانات الموظفين والمشاريع والفِرق والفروع
          const [employees, projects, teams, branches] = await Promise.all([
            base44.asServiceRole.entities.User.filter({ id: { $in: employeeIds } }),
            base44.asServiceRole.entities.Project.filter({ id: { $in: projectIds } }),
            base44.asServiceRole.entities.Team.filter({ id: { $in: teamIdsArr } }),
            base44.asServiceRole.entities.Branch.filter({ id: { $in: branchIds } })
          ]);

          const employeeMap = Object.fromEntries(employees.map(emp => [emp.id, emp]));
          const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));
          const teamMap = Object.fromEntries(teams.map(t => [t.id, t]));
          const branchMap = Object.fromEntries(branches.map(b => [b.id, b]));

          // 🔥 جمع معرفات الزبائن من المشاريع
          const customerIdsSet = new Set();
          projects.forEach(p => {
            if (p.customer_id) customerIdsSet.add(p.customer_id);
          });

          const customerIds = [...customerIdsSet];

          // 🔥 جلب بيانات الزبائن
          const customers = await base44.asServiceRole.entities.Customer.filter({
            id: { $in: customerIds }
          });

          const customerMap = Object.fromEntries(customers.map(c => [c.id, c]));


          const calculateSequence = async (workOrder, allEntries) => {
              if (!workOrder?.planned_start_time) return null;

          const entryDate = new Date(workOrder.planned_start_time);

          // الفريق الأساسي
          const entryTeamId =
              workOrder.team_ids && workOrder.team_ids.length > 0
                  ? workOrder.team_ids[0]
                  : null;

          if (!entryTeamId) return null;

          // 🔥 تصفية Work Orders حسب نفس اليوم ونفس الفريق
          const dayEntries = allEntries.filter(e => {
            if (!e.planned_start_time) return false;

              const eDate = new Date(e.planned_start_time);
              const sameDay =
                  eDate.getFullYear() === entryDate.getFullYear() &&
                  eDate.getMonth() === entryDate.getMonth() &&
                  eDate.getDate() === entryDate.getDate();

              if (!sameDay) return false;

              const eTeam =
                  e.team_ids && e.team_ids.length > 0
                      ? e.team_ids[0]
                      : null;

              return eTeam === entryTeamId;
        });

        // ترتيب حسب الوقت
        dayEntries.sort((a, b) =>
            new Date(a.planned_start_time).getTime() -
            new Date(b.planned_start_time).getTime()
        );

        const position = dayEntries.findIndex(e => e.id === workOrder.id) + 1;

        return {
            position,
            total: dayEntries.length
        };
      };
      // ⚡ جلب كل الإدخالات لحساب sequence
            const allEntriesForSequence = await base44.asServiceRole.entities.TimeEntry.list();

            const enrichedWorkOrders = await Promise.all(
                workOrders.map(async wo => {
                    const sequence = await calculateSequence(wo, allEntriesForSequence);

                    return {
                        ...wo,
                        employees: [
                            ...(wo.employee_id ? [employeeMap[wo.employee_id]] : []),
                            ...(wo.employee_ids ? wo.employee_ids.map(id => employeeMap[id]).filter(Boolean) : [])
                        ],

                        project: wo.project_id 
                            ? { 
                                ...projectMap[wo.project_id],
                                customer: projectMap[wo.project_id]?.customer_id
                                    ? customerMap[projectMap[wo.project_id].customer_id]
                                    : null
                            }
                            : null,

                        teams: [
                            ...(wo.team_id ? [teamMap[wo.team_id]] : []),
                            ...(wo.team_ids ? wo.team_ids.map(id => teamMap[id]).filter(Boolean) : [])
                        ],

                        branch: wo.branch_id ? branchMap[wo.branch_id] : null,

                        // 🔥 إضافة سيكوانس لكل وورك أوردر
                        sequence
                    };
                })
                );



                    // إضافة بيانات الموظفين والمشاريع والفرق والفروع لكل Work Order
                    // const enrichedWorkOrders = workOrders.map(wo => ({
                    //   ...wo,
                    //   employees: [
                    //     ...(wo.employee_id ? [employeeMap[wo.employee_id]] : []),
                    //     ...(wo.employee_ids ? wo.employee_ids.map(id => employeeMap[id]).filter(Boolean) : [])
                    //   ],
                    //   // project: wo.project_id ? projectMap[wo.project_id] : null,

                    //   project: wo.project_id 
                    //     ? { 
                    //         ...projectMap[wo.project_id], 
                    //         customer: projectMap[wo.project_id]?.customer_id 
                    //           ? customerMap[projectMap[wo.project_id].customer_id] 
                    //           : null
                    //       }
                    //     : null,


                    //   teams: [
                    //     ...(wo.team_id ? [teamMap[wo.team_id]] : []),
                    //     ...(wo.team_ids ? wo.team_ids.map(id => teamMap[id]).filter(Boolean) : [])
                    //   ],
                    //   branch: wo.branch_id ? branchMap[wo.branch_id] : null,  
                    
                    // }));

                    // Apply pagination
                    const paginatedWorkOrders = enrichedWorkOrders.slice(offset, offset + limit);

                    return Response.json({
                      success: true,
                      data: paginatedWorkOrders,
                      pagination: {
                        total: enrichedWorkOrders.length,
                        limit,
                        offset,
                        hasMore: enrichedWorkOrders.length > offset + limit
                      },
                      authenticated_as: {
                        user_id: user.id,
                        email: user.email,
                        role: user.role
                      }
                    });
                  } catch (error) {
                    console.error('Error listing work orders:', error);
                    return Response.json({
                      success: false,
                      error: 'Failed to list work orders',
                      details: error.message
                    }, { status: 500 });
                  }

  }

    // -------------------------------------------------------------
    // ACTION 2: GET SINGLE WORK ORDER
    // -------------------------------------------------------------
    // if (action === "get") {
    //     const id = url.searchParams.get("id");

    //     if (!id) {
    //         return Response.json({ error: "ID is required" }, { status: 400 });
    //     }

    //     const list = await base44.asServiceRole.entities.TimeEntry.list();
    //     const wo = list.find(w => w.id === id);

    //     if (!wo) {
    //         return Response.json({ error: "Work order not found" }, { status: 404 });
    //     }

    //     return Response.json({
    //         success: true,
    //         data: wo
    //     });
    // }
// -------------------------------------------------------------
// ACTION 2: GET SINGLE WORK ORDER (ENRICHED LIKE LIST)
// -------------------------------------------------------------
if (action === "get") {
    try {
        const id = url.searchParams.get("id");

        if (!id) {
            return Response.json({ error: "ID is required" }, { status: 400 });
        }

        // 1️⃣ جلب الـ Work Order
        const allEntries = await base44.asServiceRole.entities.TimeEntry.list();
        const wo = allEntries.find(w => w.id === id);

        if (!wo) {
            return Response.json({ error: "Work order not found" }, { status: 404 });
        }

        // 2️⃣ تجميع المعرفات
        const employeeIds = new Set();
        const projectIds = new Set();
        const teamIds = new Set();
        const branchIds = new Set();

        if (wo.employee_id) employeeIds.add(wo.employee_id);
        if (Array.isArray(wo.employee_ids)) wo.employee_ids.forEach(id => employeeIds.add(id));

        if (wo.project_id) projectIds.add(wo.project_id);

        if (wo.team_id) teamIds.add(wo.team_id);
        if (Array.isArray(wo.team_ids)) wo.team_ids.forEach(id => teamIds.add(id));

        if (wo.branch_id) branchIds.add(wo.branch_id);

        // 3️⃣ جلب العلاقات
        const [employees, projects, teams, branches] = await Promise.all([
            employeeIds.size
                ? base44.asServiceRole.entities.User.filter({ id: { $in: [...employeeIds] } })
                : [],
            projectIds.size
                ? base44.asServiceRole.entities.Project.filter({ id: { $in: [...projectIds] } })
                : [],
            teamIds.size
                ? base44.asServiceRole.entities.Team.filter({ id: { $in: [...teamIds] } })
                : [],
            branchIds.size
                ? base44.asServiceRole.entities.Branch.filter({ id: { $in: [...branchIds] } })
                : []
        ]);

        const employeeMap = Object.fromEntries(employees.map(e => [e.id, e]));
        const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));
        const teamMap = Object.fromEntries(teams.map(t => [t.id, t]));
        const branchMap = Object.fromEntries(branches.map(b => [b.id, b]));

        // 4️⃣ جلب Customer الخاص بالمشروع
        let customer = null;
        const project = projectMap[wo.project_id];

        if (project?.customer_id) {
            const customers = await base44.asServiceRole.entities.Customer.filter({
                id: { $in: [project.customer_id] }
            });
            customer = customers[0] || null;
        }

        // 5️⃣ حساب sequence (نفس list تمامًا)
        const calculateSequence = async (workOrder, allEntries) => {
            if (!workOrder?.planned_start_time) return null;

            const entryDate = new Date(workOrder.planned_start_time);
            const entryTeamId =
                workOrder.team_ids?.length ? workOrder.team_ids[0] : null;

            if (!entryTeamId) return null;

            const dayEntries = allEntries.filter(e => {
                if (!e.planned_start_time) return false;

                const d = new Date(e.planned_start_time);
                const sameDay =
                    d.getFullYear() === entryDate.getFullYear() &&
                    d.getMonth() === entryDate.getMonth() &&
                    d.getDate() === entryDate.getDate();

                const team =
                    e.team_ids?.length ? e.team_ids[0] : null;

                return sameDay && team === entryTeamId;
            });

            dayEntries.sort(
                (a, b) =>
                    new Date(a.planned_start_time) -
                    new Date(b.planned_start_time)
            );

            return {
                position: dayEntries.findIndex(e => e.id === workOrder.id) + 1,
                total: dayEntries.length
            };
        };

        const sequence = await calculateSequence(wo, allEntries);

        // 6️⃣ بناء نفس شكل list حرفيًا
        const enrichedWorkOrder = {
            ...wo,

            employees: [
                ...(wo.employee_id ? [employeeMap[wo.employee_id]] : []),
                ...(wo.employee_ids
                    ? wo.employee_ids.map(id => employeeMap[id]).filter(Boolean)
                    : [])
            ],

            project: wo.project_id
                ? {
                    ...projectMap[wo.project_id],
                    customer
                }
                : null,

            teams: [
                ...(wo.team_id ? [teamMap[wo.team_id]] : []),
                ...(wo.team_ids
                    ? wo.team_ids.map(id => teamMap[id]).filter(Boolean)
                    : [])
            ],

            branch: wo.branch_id ? branchMap[wo.branch_id] : null,
            sequence
        };

        return Response.json({
            success: true,
            data: enrichedWorkOrder
        });

    } catch (error) {
        console.error("Error getting work order:", error);
        return Response.json({
            success: false,
            error: "Failed to get work order",
            details: error.message
        }, { status: 500 });
    }
}

   

if (action === "generatePdf") {
    const id = url.searchParams.get("id");

    if (!id) {
        return Response.json({ success: false, message: "id required" }, { status: 400 });
    } 

    try {
        // جلب بيانات الوورك اوردر
        const workOrder = await base44.asServiceRole.entities.TimeEntry.get(id);
        if (!workOrder) {
            return Response.json({ success: false, message: "Work order not found" }, { status: 404 });
        }

        // جلب المشاريع والزبون والفرع
        const project = workOrder.project_id
            ? await base44.asServiceRole.entities.Project.get(workOrder.project_id)
            : null;

        const customer = project?.customer_id
            ? await base44.asServiceRole.entities.Customer.get(project.customer_id)
            : null;

        const branch = project?.branch_id
            ? await base44.asServiceRole.entities.Branch.get(project.branch_id)
            : null;

        const shiftType = workOrder?.shift_type_id
            ? await base44.asServiceRole.entities.ShiftType.get(workOrder.shift_type_id)
            : null;

        // جلب المستخدمين، الفرق، الأصول، المعدات
        const [users, teams, assets, clientEquipments] = await Promise.all([
            base44.asServiceRole.entities.User.list(),
            base44.asServiceRole.entities.Team.list(),
            base44.asServiceRole.entities.Asset.list(),
            base44.asServiceRole.entities.ClientEquipment.list()
        ]);

        const assignedUsers = (users || []).filter(u => (workOrder.employee_ids || []).includes(u.id));
        const assignedTeams = (teams || []).filter(t => (workOrder.team_ids || []).includes(t.id));

        const assignedAssets = (workOrder.equipment_ids || []).map(id => {
            const asset = assets.find(a => a.id === id);
            if (asset) return { ...asset, type: 'Asset' };
            const ce = clientEquipments.find(e => e.id === id);
            if (ce) return { ...ce, type: 'Client Equipment' };
            return null;
        }).filter(Boolean);

        const woCategory = workOrder.work_order_category_id
            ? await base44.asServiceRole.entities.WorkOrderCategory.get(workOrder.work_order_category_id)
            : null;

        const logoUrl = branch?.logo_forms_url || branch?.logo_url;
        const companyName = branch?.name || "COMPANY NAME";
        const phoneText = branch?.phone || "";
        const companyEmail = branch?.email || "";
        const trnText = branch?.tax_number || "";
        const asset = assignedAssets[0] || {};

        const formatTime = (iso) => iso ? new Date(iso).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:true, timeZone:'Asia/Dubai' }) : '-';
        const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-GB', { timeZone:'Asia/Dubai' }) : '-';

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Work Order ${workOrder.work_order_number}</title>
                     <style>
                    @page {
                        size: A4;
                        margin: 10mm;
                    }
                    body {
                        font-family: Arial, sans-serif;
                        font-size: 12px;
                        margin: 0;
                        padding: 0;
                        background: #f0f0f0;
                    }
                    .container {
                        width: 210mm;
                        min-height: 297mm;
                        margin: auto;
                        background: #fff;
                        padding: 10mm;
                        box-sizing: border-box;
                    }
                    h1 { color: #b91c1c; margin:0; font-size:18px; }
                    h2 { margin: 5px 0; font-size:16px; }
                    table { width: 100%; border-collapse: collapse; margin-top:10px; font-size:12px; }
                    th, td { border: 1px solid #ccc; padding: 4px; }
                    th { background: #b91c1c; color: white; text-align:left; }
                    .header { display: flex; justify-content: space-between; }
                    .logo { max-width:200px; max-height:100px; object-fit:contain; }
                    .red-line { border-top:2px solid #b91c1c; margin:10px 0; }
                    .section-title { font-weight:bold; margin-top:10px; margin-bottom:5px; }
                    @media print {
                        body { background: #fff; }
                        .container { box-shadow: none; }
                    }
                </style>
        </head>
        <body>
            <div class="container">
                <!-- Header -->
                <div class="header">
                    <div>
                        <h1>${companyName}</h1>
                        <p>Tel: ${phoneText}</p>
                        <p>Email: ${companyEmail}</p>
                        <p>TRN: ${trnText}</p>
                    </div>
                    <div>
                        ${logoUrl ? `<img src="${logoUrl}" class="logo" />` : '<div style="width:200px;height:80px;background:#ddd;text-align:center;line-height:80px;color:#888;">No Logo</div>'}
                        <p>WO #: ${workOrder.work_order_number}</p>
                    </div>
                </div>
                <div class="red-line"></div>

                <!-- General Info -->
                <h2 class="section-title">GENERAL INFORMATION</h2>
                <table>
                    <tr>
                        <th>Customer</th><td>${customer?.name||'-'}</td>
                        <th>Category</th><td>${woCategory?.name||'-'}</td>
                    </tr>
                    <tr>
                        <th>Project</th><td>${project?.name||'-'}</td>
                        <th>Location</th><td>${project?.location_name||project?.address||'-'}</td>
                    </tr>
                    <tr>
                        <th>Shift</th><td>${shiftType?.name ||'-'}</td>
                        <th>Date</th><td>${formatDate(workOrder.planned_start_time)}</td>
                    </tr>
                    <tr>
                        <th>Equipment</th><td>${assignedAssets.map(a=>a.name).join(', ')||'-'}</td>
                        <th>Start</th><td>${formatTime(workOrder.planned_start_time)}</td>
                    </tr>
                    <tr>
                        <th>Title</th><td>${workOrder.title||'-'}</td>
                        <th>End</th><td>${workOrder.end_time ? formatTime(workOrder.end_time) : formatTime(workOrder.planned_end_time)}</td>
                    </tr>
                </table>

                <!-- Assigned Resources -->
                <h2 class="section-title">ASSIGNED RESOURCES</h2>
                <table>
                    <tr>
                        <th>Teams</th><td>${assignedTeams.map(t=>t.name).join(', ')||'-'}</td>
                    </tr>
                    <tr>
                        <th>Workers</th><td>${assignedUsers.map(u=>u.full_name||u.email).join(', ')||'-'}</td>
                    </tr>
                </table>

                <!-- Work Done / Pending -->
                ${workOrder.work_done_items?.length ? `
                <h2 class="section-title">WORK DONE / PENDING</h2>
                <table>
                    <tr><th>Description</th><th>Done</th></tr>
                    ${workOrder.work_done_items.map(item=>`<tr><td>${item.text}</td><td style="text-align:center">[X]</td></tr>`).join('')}
                </table>
                `: ''}

                <!-- Time Tracker -->
                <h2 class="section-title">TIME TRACKER</h2>
                <table>
                    <tr>
                        <th>Clock In</th><td>${formatDate(workOrder.start_time)} ${formatTime(workOrder.start_time)}</td>
                        <th>Clock Out</th><td>${formatDate(workOrder.end_time)} ${formatTime(workOrder.end_time)}</td>
                    </tr>
                </table>

                <!-- Signatures -->
                <h2 class="section-title">SIGNATURES</h2>
                <table>
                    <tr>
                        <th>Company Workers</th><td>${assignedUsers.map(u=>u.full_name||u.email).join(', ')}</td>
                        <th>Client Representative</th><td>${workOrder.client_representative_name||''}</td>
                    </tr>
                </table>
            </div>
        </body>
        </html>
        `;

        return new Response(html, { headers: { "Content-Type": "text/html" }, status: 200 });

    } catch (err) {
        console.error(err);
        return Response.json({ success:false, error:"Internal server error", details: err.message }, { status:500 });
    }
}

    return Response.json({ error: "Unknown action" }, { status: 400 });
}


// if (method === 'POST' && url.searchParams.get('action') === 'create') {
//   // Only admins can create work orders
//   if (!isAdmin()) {
//     return Response.json({ 
//       error: 'Only admins can create work orders',
//       your_role: user.role
//     }, { status: 403 });
//   }

//   try {
//     const body = await req.json();

//     // Validate required fields
//     if (!body.project_id) {
//       return Response.json({ error: 'project_id is required' }, { status: 400 });
//     }

//     if (!body.planned_start_time) {
//       return Response.json({ error: 'planned_start_time is required' }, { status: 400 });
//     }

//     // Generate work order number if not provided
//     if (!body.work_order_number) {
//       body.work_order_number = `N${Math.floor(Math.random() * 100000)}`;
//     }

//     const workOrders = await base44.asServiceRole.entities.TimeEntry.list();

//     const dateTime = parseISO(body.planned_start_time);
//     const dateStr = format(dateTime, 'yyyy-MM-dd');

//     const existingWOs = workOrders.filter(e => {
//       if (e.status === 'on_queue') return false;
//       if (!e.planned_start_time) return false;
//       if (e.project_id !== body.project_id) return false;
//       const entryDate = format(parseISO(e.planned_start_time), 'yyyy-MM-dd');
//       return entryDate === dateStr;
//     });

//     const existingNumbers = existingWOs
//       .map(e => parseInt(e.work_order_number?.match(/N(\d+)/)?.[1] || '0'))
//       .filter(n => !isNaN(n));

//     const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

//     const workOrderData = {
//       title: body.title || '',
//       project_id: body.project_id,
//       work_notes: body.work_notes || '',
//       planned_start_time: body.planned_start_time,
//       planned_end_time: body.planned_end_time || null,
//       employee_ids: body.employee_ids || [],
//       team_ids: body.team_ids || [],
//       employee_id: body.employee_id || body.employee_ids?.[0] || null,
//       team_id: body.team_id || body.team_ids?.[0] || null,
//       work_order_category_id: body.work_order_category_id || null,
//       shift_type_id: body.shift_type_id || null,
//       status: body.status || 'ongoing',
//       work_order_number: `N${nextNumber}`,
//       task: body.task || '',
//       archived: false,
//       is_active: false
//     };

//     const createdWorkOrder = await base44.asServiceRole.entities.TimeEntry.create(workOrderData);

//     return Response.json({
//       success: true,
//       data: createdWorkOrder,
//       message: 'Work order created successfully',
//       created_by: {
//         user_id: user.id,
//         email: user.email
//       }
//     }, { status: 201 });
//   } catch (error) {
//     console.error('Error creating work order:', error);
//     return Response.json({
//       success: false,
//       error: 'Failed to create work order',
//       details: error.message
//     }, { status: 500 });
//   }
// }

if (method === 'POST' && url.searchParams.get('action') === 'create') {
  // Only admins can create work orders
  // if (!isAdmin()) {
  //   return Response.json({
  //     error: 'Only admins can create work orders',
  //     your_role: user.role
  //   }, { status: 403 });
  // }

  try {
    const body = await req.json();

    // Validate required fields
    if (!body.project_id) {
      return Response.json({ error: 'project_id is required' }, { status: 400 });
    }
      // Normalize team_ids
      if (!body.team_ids || !Array.isArray(body.team_ids) || body.team_ids.length === 0) {
          if (body.team_id) {
              body.team_ids = [body.team_id];
          }
      }


      if (!body.planned_start_time) {
          body.planned_start_time = new Date().toISOString();
      }



    // --- تحويل بيانات Flutter إلى Schema Base44 ---
    const mappedInstructions = convertToChecklistArray(body.work_instructions_items);
    const mappedWorkDone = convertToChecklistArray(body.work_done_items);
    const mappedSparesInstalled = convertToChecklistArray(body.spare_parts_installed);


    // Generate work order number if not provided
    const workOrders = await base44.asServiceRole.entities.TimeEntry.list();
    const dateTime = body.planned_start_time ? new Date(body.planned_start_time) : new Date();
    const dateStr = dateTime.toISOString().split('T')[0];

    const existingWOs = workOrders.filter(e => {
      if (e.status === 'on_queue') return false;
      if (!e.planned_start_time) return false;
      if (e.project_id !== body.project_id) return false;
      const entryDate = e.planned_start_time.split('T')[0];
      return entryDate === dateStr;
    });

    const existingNumbers = existingWOs
      .map(e => parseInt(e.work_order_number?.match(/N(\d+)/)?.[1] || '0'))
      .filter(n => !isNaN(n));

    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;


    // Build the work order object
    const workOrderData = {
      title: body.title || '',
      project_id: body.project_id,
      branch_id: body.branch_id || null,
      work_notes: body.work_notes || '',
      task: body.task || '',
      planned_start_time: body.planned_start_time || null,
      planned_end_time: body.planned_end_time || null,
      start_time: body.start_time || null,
      end_time: body.end_time || null,
      duration_minutes: body.duration_minutes || 0,
      employee_ids: body.employee_ids || [],
      team_ids: body.team_ids || [],
      employee_id: body.employee_id || body.employee_ids?.[0] || null,
      team_id: body.team_id || body.team_ids?.[0] || null,
      equipment_ids: body.equipment_ids || [],
      equipment_id: body.equipment_id || body.equipment_ids?.[0] || null,
      work_order_number: body.work_order_number || `N${nextNumber}`,
      work_order_category_id: body.work_order_category_id || null,
      shift_type_id: body.shift_type_id || null,
      status: body.status || 'open',
      task_status: body.task_status || 'open',
      job_completion_status: body.job_completion_status || null,
      client_feedback_comments: body.client_feedback_comments || '',
      client_representative_name: body.client_representative_name || '',
      client_representative_phone: body.client_representative_phone || '',
      archived: body.archived || false,
      is_active: body.is_active || false,
      is_repeating: body.is_repeating || false,
      recurrence_type: body.recurrence_type || null,
      recurrence_interval: body.recurrence_interval || 1,
      recurrence_end_date: body.recurrence_end_date || null,
      skip_weekends: body.skip_weekends || false,
      moved_from_sunday: body.moved_from_sunday || false,
      task_document_url: body.task_document_url || '',
      start_coords: body.start_coords || null,
      end_coords: body.end_coords || null,
      start_address: body.start_address || '',
      end_address: body.end_address || '',
      file_urls: body.file_urls || [],
      other_file_urls: body.other_file_urls || [],
      breaks: body.breaks || [],
    
      note_1: body.note_1 || '',
      note_2: body.note_2 || '',
      note_3: body.note_3 || '',
      note_4: body.note_4 || '',
      work_done_description: body.work_done_description || '',
      spare_parts: body.spare_parts || '',

      work_description_items: mappedInstructions || [],
      work_done_items: mappedWorkDone || [],
      spare_parts_items: mappedSparesInstalled || [],
      
      work_pending_items: body.work_pending_items || [],
      spare_parts_pending_items: body.spare_parts_pending_items || [],

      updated_by: user.email,

      activity_log: [
        ...(body.activity_log || []),
        {
          timestamp: new Date().toISOString(),
          action: 'Created',
          user_email: user.email,
          user_name: user.name,
          details: 'Work order created'
        }
      ]
    };

    const createdWorkOrder = await base44.asServiceRole.entities.TimeEntry.create(workOrderData);


    return Response.json({
      success: true,
      data: createdWorkOrder,
      message: 'Work order created successfully',
      created_by: {
        user_id: user.id,
        email: user.email
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating work order:', error);
    return Response.json({
      success: false,
      error: 'Failed to create work order',
      details: error.message
    }, { status: 500 });
  }
}

    // DELETE /api/work-orders/:id - Delete work order
    if (method === 'DELETE') {
      // Only admins can delete work orders
      if (!isAdmin()) {
        return Response.json({ 
          error: 'Only admins can delete work orders',
          your_role: user.role
        }, { status: 403 });
      }

      const pathParts = url.pathname.split('/');
      const workOrderId = pathParts[pathParts.length - 1];

      if (!workOrderId || !workOrderId.match(/^[a-f0-9-]{36}$/i)) {
        return Response.json({ error: 'Invalid work order ID' }, { status: 400 });
      }

      try {
        await base44.asServiceRole.entities.TimeEntry.delete(workOrderId);

        return Response.json({
          success: true,
          message: 'Work order deleted successfully',
          deleted_by: {
            user_id: user.id,
            email: user.email
          }
        });
      } catch (error) {
        console.error('Error deleting work order:', error);
        return Response.json({
          success: false,
          error: 'Failed to delete work order',
          details: error.message
        }, { status: 500 });
      }
    }

// ---------------------------------------------------------
// POST /api/work-orders?action=upload-signature&id_work_order=<id>
// Upload client signature
if (method === 'POST' && url.searchParams.get('action') === 'upload-signature') {
  const workOrderId = url.searchParams.get('id_work_order');

  if (!workOrderId) {
    return Response.json({
      error: 'id_work_order parameter is required',
      example: 'POST /api/work-orders?action=upload-signature&id_work_order=<work-order-id>'
    }, { status: 400 });
  }

  try {
    // Parse multipart form data
    const formData = await req.formData();
    const signatureFile = formData.get('signature');

    if (!signatureFile) {
      return Response.json({
        error: 'Signature file is required',
        example: 'Send multipart/form-data with field name "signature"'
      }, { status: 400 });
    }

    // Get work order
    const workOrders = await base44.asServiceRole.entities.TimeEntry.list();
    const workOrder = workOrders.find(wo => wo.id === workOrderId);

    if (!workOrder) {
      return Response.json({ error: 'Work order not found' }, { status: 404 });
    }

    // Permission check
    const isAssigned = (workOrder.employee_ids || []).includes(user.id);
    if (!isAdmin() && !isAssigned) {
      return Response.json({
        error: 'You do not have permission to upload signature for this work order',
        your_role: user.role
      }, { status: 403 });
    }

    // Upload signature
    console.log(`Uploading signature: ${signatureFile.name}`);

    const uploadResult = await base44
      .asServiceRole
      .integrations
      .Core
      .UploadFile({ file: signatureFile });

    if (!uploadResult || !uploadResult.file_url) {
      throw new Error('Signature upload failed');
    }

    // Update work order
    const updatedWorkOrder = await base44
      .asServiceRole
      .entities
      .TimeEntry
      .update(workOrderId, {
        client_signature_url: uploadResult.file_url,
        client_signature_uploaded_at: new Date().toISOString(),
        updated_by: user.email,
        activity_log: [
          ...(workOrder.activity_log || []),
          {
            timestamp: new Date().toISOString(),
            action: 'Signature Uploaded',
            user_email: user.email,
            user_name: user.name,
            details: 'Client signature uploaded'
          }
        ]
      });

    return Response.json({
      success: true,
      message: 'Signature uploaded successfully',
      data: {
        signature_url: uploadResult.file_url,
        work_order: updatedWorkOrder
      },
      uploaded_by: {
        user_id: user.id,
        email: user.email
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error uploading signature:', error);
    return Response.json({
      success: false,
      error: 'Failed to upload signature',
      details: error.message
    }, { status: 500 });
  }
}

    // ---------------------------------------------------------
// POST /api/work-orders?action=upload-files&id_work_order=<id> - Upload files
    if (method === 'POST' && url.searchParams.get('action') === 'upload-files') {
      const workOrderId = url.searchParams.get('id_work_order');

      if (!workOrderId) {
        return Response.json({ 
          error: 'id_work_order parameter is required',
          example: 'POST /api/work-orders?action=upload-files&id_work_order=<work-order-id>&user_id=<user-id>'
        }, { status: 400 });
      }

      try {
        // Parse multipart form data
        const formData = await req.formData();
        const files = formData.getAll('file_urls');

        if (!files || files.length === 0) {
          return Response.json({ 
            error: 'No files uploaded. Include files in form-data with key "files"',
            example: 'Send multipart/form-data with field name "files"'
          }, { status: 400 });
        }

        // Get the work order
        const workOrders = await base44.asServiceRole.entities.TimeEntry.list();
        const workOrder = workOrders.find(wo => wo.id === workOrderId);

        if (!workOrder) {
          return Response.json({ error: 'Work order not found' }, { status: 404 });
        }

        // Check if user has permission to upload to this work order
        const isAssigned = (workOrder.employee_ids || []).includes(user.id);
        if (!isAdmin() && !isAssigned) {
          return Response.json({ 
            error: 'You do not have permission to upload files to this work order',
            your_role: user.role
          }, { status: 403 });
        }

        const uploadedFileUrls = [];
        const failedUploads = [];

        // Upload each file
        for (const file of files) {
          try {
            console.log(`Uploading file: ${file.name}, size: ${file.size} bytes`);
            
            // Upload file using Base44 integration
            const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ file });
            
            if (!uploadResult || !uploadResult.file_url) {
              throw new Error('Upload failed - no file URL returned');
            }

            uploadedFileUrls.push({
              name: file.name,
              size: file.size,
              url: uploadResult.file_url,
              uploaded_at: new Date().toISOString()
            });

            console.log(`✅ Successfully uploaded: ${file.name}`);
          } catch (uploadError) {
            console.error(`❌ Failed to upload ${file.name}:`, uploadError);
            failedUploads.push({
              name: file.name,
              error: uploadError.message
            });
          }
        }

        // Update work order with new file URLs
        const existingFileUrls = workOrder.file_urls || [];
        const newFileUrls = uploadedFileUrls.map(f => f.url);
        
        const updatedWorkOrder = await base44.asServiceRole.entities.TimeEntry.update(workOrderId, {
          file_urls: [...existingFileUrls, ...newFileUrls],
          updated_by: user.email
        });

        return Response.json({
          success: true,
          message: `Uploaded ${uploadedFileUrls.length} file(s) successfully`,
          data: {
            work_order: updatedWorkOrder,
            uploaded_files: uploadedFileUrls,
            failed_uploads: failedUploads.length > 0 ? failedUploads : undefined
          },
          uploaded_by: {
            user_id: user.id,
            email: user.email
          }
        }, { status: 200 });

      } catch (error) {
        console.error('Error uploading files:', error);
        return Response.json({
          success: false,
          error: 'Failed to upload files',
          details: error.message
        }, { status: 500 });
      }
    }


function convertToChecklistArray(arr) {
  if (!Array.isArray(arr)) return [];

  return arr.map(item => {
    if (typeof item === "string") {
      return {
        id: null,
        text: item,
        checked: false
      };
    }
    if (typeof item === "object") {
      return {
        id: item.id ?? null,
        text: item.text ?? "",
        checked: item.checked ?? false
      };
    }
    return { id: null, text: "", checked: false };
  });
}

if (method === 'POST' && url.searchParams.get('action') === 'update') {
  // if (!isAdmin()) {
  //   return Response.json({
  //     error: 'Only admins can update work orders'
  //   }, { status: 403 });
  // }

  try {
    const body = await req.json();

    if (!body.id) {
      return Response.json({ error: 'Work order ID is required' }, { status: 400 });
    }

    const existing = await base44.asServiceRole.entities.TimeEntry.get(body.id);

    if (!existing) {
      return Response.json({ error: 'Work order not found' }, { status: 404 });
    }

    const mappedData = { ...body };

    // تحويل البيانات من Flutter إلى Schema Base44
    mappedData.work_description_items = convertToChecklistArray(body.work_instructions_items);
    mappedData.work_done_items = convertToChecklistArray(body.work_done_items);
    mappedData.spare_parts_items = convertToChecklistArray(body.spare_parts_installed);

    // حذف الحقول التي ليست في الـ schema
    delete mappedData.work_instructions_items;
    delete mappedData.spare_parts_installed;

    mappedData.work_order_number = existing.work_order_number;

    const updated = await base44.asServiceRole.entities.TimeEntry.update(body.id, mappedData);

    return Response.json({
      success: true,
      message: "Work order updated successfully",
      data: updated
    });

  } catch (e) {
    return Response.json({
      success: false,
      error: "Failed to update work order",
      details: e.message
    }, { status: 500 });
  }
}

// -----------------------------


    // PATCH /api/work-orders/:id/archive - Archive work order
    if (method === 'PATCH' && url.pathname.includes('/archive')) {
      // Only admins can archive work orders
      if (!isAdmin()) {
        return Response.json({ 
          error: 'Only admins can archive work orders',
          your_role: user.role
        }, { status: 403 });
      }

      const pathParts = url.pathname.split('/');
      const workOrderId = pathParts[pathParts.length - 2];

      if (!workOrderId || !workOrderId.match(/^[a-f0-9-]{36}$/i)) {
        return Response.json({ error: 'Invalid work order ID' }, { status: 400 });
      }

      try {
        const updatedWorkOrder = await base44.asServiceRole.entities.TimeEntry.update(workOrderId, {
          archived: true
        });

        return Response.json({
          success: true,
          data: updatedWorkOrder,
          message: 'Work order archived successfully',
          archived_by: {
            user_id: user.id,
            email: user.email
          }
        });
      } catch (error) {
        console.error('Error archiving work order:', error);
        return Response.json({
          success: false,
          error: 'Failed to archive work order',
          details: error.message
        }, { status: 500 });
      }
    }

    // PATCH /api/work-orders/bulk-delete - Bulk delete work orders
    if (method === 'PATCH' && url.pathname.includes('/bulk-delete')) {
      // Only admins can bulk delete
      if (!isAdmin()) {
        return Response.json({ 
          error: 'Only admins can delete work orders',
          your_role: user.role
        }, { status: 403 });
      }

      try {
        const body = await req.json();
        const { ids } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
          return Response.json({ error: 'ids array is required' }, { status: 400 });
        }

        const results = [];
        for (const id of ids) {
          try {
            await base44.asServiceRole.entities.TimeEntry.delete(id);
            results.push({ id, success: true });
          } catch (error) {
            results.push({ id, success: false, error: error.message });
          }
        }

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        return Response.json({
          success: true,
          message: `Deleted ${successCount} work orders, ${failCount} failed`,
          results,
          deleted_by: {
            user_id: user.id,
            email: user.email
          }
        });
      } catch (error) {
        console.error('Error bulk deleting work orders:', error);
        return Response.json({
          success: false,
          error: 'Failed to bulk delete work orders',
          details: error.message
        }, { status: 500 });
      }
    }

    // PATCH /api/work-orders/bulk-archive - Bulk archive work orders
    if (method === 'PATCH' && url.pathname.includes('/bulk-archive')) {
      // Only admins can bulk archive
      if (!isAdmin()) {
        return Response.json({ 
          error: 'Only admins can archive work orders',
          your_role: user.role
        }, { status: 403 });
      }

      try {
        const body = await req.json();
        const { ids } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
          return Response.json({ error: 'ids array is required' }, { status: 400 });
        }

        const results = [];
        for (const id of ids) {
          try {
            await base44.asServiceRole.entities.TimeEntry.update(id, { archived: true });
            results.push({ id, success: true });
          } catch (error) {
            results.push({ id, success: false, error: error.message });
          }
        }

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        return Response.json({
          success: true,
          message: `Archived ${successCount} work orders, ${failCount} failed`,
          results,
          archived_by: {
            user_id: user.id,
            email: user.email
          }
        });
      } catch (error) {
        console.error('Error bulk archiving work orders:', error);
        return Response.json({
          success: false,
          error: 'Failed to bulk archive work orders',
          details: error.message
        }, { status: 500 });
      }
    }

// PATCH /api/work-orders?action=complete&id_work_order=...
if ( method === 'PUT') {
  const action = url.searchParams.get('action');
  const workOrderId = url.searchParams.get('id_work_order');

if (action === 'complete') {
  if (!workOrderId) {
    return Response.json({ error: 'id_work_order parameter is required' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const newStatus = body.status || 'closed';

    // const updatedWorkOrder = await base44.asServiceRole.entities.TimeEntry.update(workOrderId, {
    //   status: newStatus,
    //   completed_date: new Date().toISOString()
    // });

    const updatedWorkOrder = await base44.asServiceRole.entities.TimeEntry.update(workOrderId, body);


    return Response.json({
      success: true,
      data: updatedWorkOrder,
      message: `Work order marked as ${newStatus}`,
      updated_by: {
        user_id: user.id,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error completing work order:', error);
    return Response.json({
      success: false,
      error: 'Failed to update work order',
      details: error.message
    }, { status: 500 });
  }
}

}


    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return Response.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
});