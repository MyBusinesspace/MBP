import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * API Helper - Authentication via user_id header + request token
 * 
 * Endpoints:
 * - GET /apiHelper?action=getSidebarItems
 *   Headers: { "X-User-ID": "user_id_here" }
 * 
 * - GET /apiHelper?action=getStats&date=YYYY-MM-DD
 *   Headers: { "X-User-ID": "user_id_here" }
 */

Deno.serve(async (req) => {
  // create base44 client from the incoming request (needed for service-role operations too)
  const base44 = createClientFromRequest(req);

  try {
    const url = new URL(req.url);
    const method = req.method;
    const action = url.searchParams.get('action');

    // Get user_id from header (flexible)
    const userId = req.headers.get('X-User-ID') || req.headers.get('x-user-id') || req.headers.get('user_id');

    if (!userId) {
      return Response.json({ 
        error: 'Unauthorized - User ID header missing',
        details: 'Please provide X-User-ID header'
      }, { status: 401 });
    }
 
    // Fetch user using service role to verify existence and role
    let currentUser;
    try {
      const users = await base44.asServiceRole.entities.User.filter({ id: userId });
      if (!users || users.length === 0) {
        return Response.json({ 
          error: 'Unauthorized - User not found',
          details: `No user found with ID: ${userId}`
        }, { status: 401 });
      }
      currentUser = users[0];
    } catch (error) {
      console.error('Failed to fetch user:', error);
      return Response.json({ 
        error: 'Unauthorized - Failed to verify user',
        details: error.message
      }, { status: 401 });
    }

    const isAdmin = currentUser.role === 'admin';
// ACTION: Get Current Company Info
if (method === 'GET' && action === 'getCurrentCompany') {
    if (!currentUser.company_id) {
        return Response.json({
            success: false,
            error: 'User is not assigned to any company'
        }, { status: 400 });
    }

    try {
        // Fetch the company/branch entity
        const companies = await base44.asServiceRole.entities.Branch.filter({ id: currentUser.company_id });

        if (!companies || companies.length === 0) {
            return Response.json({
                success: false,
                error: 'Company not found'
            }, { status: 404 });
        }

        const company = companies[0];

        // Map the icons/links for the frontend easily
        const companyData = {
            id: company.id,
            name: company.name,
            email: company.email,
            phone: company.phone,
            tax_number: company.tax_number,
            address: company.address,
            logo_url: company.logo_url,
            logo_forms_url: company.logo_forms_url,
            tabIcons: {
                calendar: company.calendar_tab_icon_url,
                assets: company.documents_assets_tab_icon_url,
                clients: company.clients_tab_icon_url,
                planner: company.schedule_tab_icon_url,
                tracker: company.time_tracker_tab_icon_url,
                quickTasks: company.quick_tasks_tab_icon_url,
                projects: company.projects_tab_icon_url,
                contacts: company.contacts_tab_icon_url,
                aiAssistant: company.ai_assistant_tab_icon_url,
                chat: company.chat_tab_icon_url,
                users: company.users_tab_icon_url,
                payroll: company.payroll_tab_icon_url,
                pettyCash: company.petty_cash_tab_icon_url,
                reports: company.reports_tab_icon_url,
            }
        };

        return Response.json({
            success: true,
            data: company
        });

    } catch (error) {
        console.error('Failed to fetch current company:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

    // ACTION: Get Sidebar Items
    if (method === 'GET' && action === 'getSidebarItems') {

          let currentCompany = null;
        let companyIconUrls = {}; // لتخزين الروابط المخصصة

        // **افتراض:** نستخدم حقل company_id أو current_company_id من كيان المستخدم
        if (currentUser.company_id) { 
            try {       
                
                const companies = await base44.asServiceRole.entities.Branch.filter({ id: currentUser.company_id });

                // يفترض أن Branch هو اسم الكيان الذي يمثل الشركة/الفرع
                if (companies.length > 0) {
                    currentCompany = companies[0];
                    // استخراج الروابط من الشركة في خريطة لسهولة التطعيم
                    companyIconUrls = {
                        calendar: currentCompany.calendar_tab_icon_url,
                        assets: currentCompany.documents_assets_tab_icon_url,
                        clients: currentCompany.clients_tab_icon_url,
                        planner: currentCompany.schedule_tab_icon_url,
                        tracker: currentCompany.time_tracker_tab_icon_url,
                        quickTasks: currentCompany.quick_tasks_tab_icon_url,
                        projects: currentCompany.projects_tab_icon_url,
                        contacts: currentCompany.contacts_tab_icon_url,
                        aiAssistant: currentCompany.ai_assistant_tab_icon_url,
                        chat: currentCompany.chat_tab_icon_url,
                        // ✅ العنصر المطلوب: Users
                        users: currentCompany.users_tab_icon_url, 
                        payroll: currentCompany.payroll_tab_icon_url,
                        pettyCash: currentCompany.petty_cash_tab_icon_url,
                        reports: currentCompany.reports_tab_icon_url,
                    };
                }
            } catch (e) {
                console.warn('Failed to fetch current company details:', e);
            }
        }



      try {
        // Get navigation config or use default
        let navConfig;
        try {
          const configs = await base44.entities.NavigationConfig.filter({ is_active: true });
          navConfig = configs[0];
        } catch (e) {
          console.log('No navigation config found, using default');
        }



        // Default navigation structure
        const defaultNavigation = [
            {
                title: 'Admin',
                items: [
                  { name: 'Calendar', icon: 'CalendarDays', path: '/calendar', type: 'page', color: 'bg-purple-100 text-purple-600'
                  , customIconUrl:currentCompany.calendar_tab_icon_url},
                  // { name: 'Docs', icon: 'FolderOpen', path: '/documents', type: 'page', color: 'bg-blue-100 text-blue-600'
                  //  , customIconUrl:currentCompany.documents_assets_tab_icon_url },
                  { name: 'Clients', icon: 'Building2', path: '/clients', type: 'page', color: 'bg-indigo-100 text-indigo-600'
                   , customIconUrl:currentCompany.clients_tab_icon_url }
                ]
              },
              {
                title: 'Operations',
                items: [
                  { name: 'Planner', icon: 'ClipboardList', path: '/work-orders', type: 'page', color: 'bg-orange-100 text-orange-600'  
                   , customIconUrl:currentCompany.calendar_tab_icon_url                },
                  { name: 'Time Tracker', icon: 'Clock', path: '/time-tracker', type: 'page', color: 'bg-blue-600 text-white' 
                   , customIconUrl:currentCompany.time_tracker_tab_icon_url},
                  { name: 'Quick Tasks', icon: 'ListTodo', path: '/quick-tasks', type: 'page', color: 'bg-emerald-100 text-emerald-600'
                   , customIconUrl:currentCompany.quick_tasks_tab_icon_url },
                  { name: 'Projects', icon: 'Briefcase', path: '/projects', type: 'page', color: 'bg-pink-100 text-pink-600'
                   , customIconUrl:currentCompany.projects_tab_icon_url },
                  { name: 'Contacts', icon: 'Building', path: '/contacts', type: 'page', color: 'bg-cyan-100 text-cyan-600'
                   , customIconUrl:currentCompany.contacts_tab_icon_url }
                ]
              },
              {
                title: 'Connection',
                items: [
                  { name: 'AI Assistant', icon: 'Bot', path: '/ai-assistant', type: 'page', badge: 'AI', color: 'bg-violet-100 text-violet-600' 
                   , customIconUrl:currentCompany.ai_assistant_tab_icon_url || 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68be895889fc1a618ee5fab2/ddfcb84fc_Gemini_Generated_Image_8uh0068uh0068uh0.png' },

                  { name: 'Chat', icon: 'MessageSquare', path: '/chat', type: 'page', color: 'bg-green-100 text-green-600'
                   , customIconUrl:currentCompany.chat_tab_icon_url || 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68be895889fc1a618ee5fab2/5280bc6a8_Gemini_Generated_Image_lxhgu9lxhgu9lxhg.png' }

                ]
              },
              {
            title: 'Resources',
            items: [
            
              { name: 'Assets', icon: 'Package', path: '/assets', type: 'page' , customIconUrl:currentCompany.documents_assets_tab_icon_url },
              { name: 'Client Equipment', icon: 'Equipment', path: '/contacts', type: 'page' , customIconUrl:currentCompany.calendar_tab_icon_url },

            ]
          },
          // {
          //   title: 'Team',
          //   items: [
          //     { name: 'Organization', icon: 'GitBranch', path: '/organization-chart', type: 'page', adminOnly: true },
          //     { name: 'Branches', icon: 'MapPin', path: '/branches', type: 'page', adminOnly: true },
          //   ]
          // },
          {
            title: 'HR',
            items: [
              { name: 'Users', icon: 'Users', path: '/users', type: 'page', adminOnly: true  ,
               customIconUrl:currentCompany.users_tab_icon_url },
              { name: 'Petty Cash', icon: 'Wallet', path: '/petty-cash', type: 'page' ,
               customIconUrl:currentCompany.payroll_tab_icon_url || 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68be895889fc1a618ee5fab2/e4658121a_payroll.png' },
              { name: 'Payroll', icon: 'Dollar', path: '/payroll', type: 'page' ,
               customIconUrl:currentCompany.petty_cash_tab_icon_url || 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68be895889fc1a618ee5fab2/69f93a109_Gemini_Generated_Image_hfvozihfvozihfvo.png' }

            ]
          },
        //   {
        //     title: 'Analytics',
        //     items: [
        //       { name: 'Reports', icon: 'BarChart3', path: '/reports', type: 'page' },
        //     ]
        //   },
        ];

        const navigation = navConfig?.sections || defaultNavigation;

        // Filter based on user permissions
        const filteredNavigation = navigation.map(section => ({
          ...section,
          items: section.items.filter(item => {
            if (item.adminOnly === true && !isAdmin) return false;
            return true;
          })
        })).filter(section => section.items.length > 0);

        return Response.json({
          success: true,
          data: {
            user: {
              id: currentUser.id,
              full_name: currentUser.full_name,
              email: currentUser.email,
              role: currentUser.role,
              avatar_url: currentUser.avatar_url
            },
            navigation: filteredNavigation
          }
        });
      } catch (error) {
        console.error('Failed to get sidebar items:', error);
        return Response.json({
          success: false,
          error: error.message
        }, { status: 500 });
      }
    }





    // ACTION: Get Statistics
    if (method === 'GET' && action === 'getStats') {
      const date = url.searchParams.get('date'); // Format: YYYY-MM-DD
      
      if (!date) {
        return Response.json({ 
          error: 'date parameter is required (format: YYYY-MM-DD)' 
        }, { status: 400 });
      }

      try {
        // Parse date range (validate)
        const targetDate = new Date(date);
        if (isNaN(targetDate.getTime())) {
          return Response.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
        }

        const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
        const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);

        // Get timesheets for the day (for this user)
        const allTimesheets = await base44.asServiceRole.entities.TimesheetEntry.filter({
          employee_id: userId
        });

        const dayTimesheets = allTimesheets.filter(ts => {
          if (!ts.clock_in_time) return false;
          const clockIn = new Date(ts.clock_in_time);
          return clockIn >= startOfDay && clockIn < endOfDay;
        });

        // Get work orders for the day (TimeEntry entity holds work orders)
        const allWorkOrders = await base44.asServiceRole.entities.TimeEntry.list('-planned_start_time', 500);
        
        const dayWorkOrders = allWorkOrders.filter(wo => {
          if (!wo.planned_start_time) return false;
          
          const woDate = new Date(wo.planned_start_time);
          const isToday = woDate >= startOfDay && woDate < endOfDay;
          
          // Check if user is assigned
          const employeeIds = wo.employee_ids || (wo.employee_id ? [wo.employee_id] : []);
          const isAssigned = employeeIds.includes(userId);
          
          return isToday && isAssigned && wo.status !== 'closed';
        });

        // Calculate statistics
        const totalMinutes = dayTimesheets.reduce((sum, ts) => {
          return sum + (ts.total_duration_minutes || 0);
        }, 0);

        const totalHours = (totalMinutes / 60).toFixed(2);

        const workOrdersByStatus = {
          on_queue: dayWorkOrders.filter(wo => wo.status === 'on_queue').length,
          ongoing: dayWorkOrders.filter(wo => wo.status === 'ongoing').length,
          closed: dayWorkOrders.filter(wo => wo.status === 'closed').length
        };

        // Get projects (only those referenced)
        const projectIds = [...new Set(dayWorkOrders.map(wo => wo.project_id).filter(Boolean))];
        const projects = projectIds.length > 0
          ? await base44.asServiceRole.entities.Project.filter({ id: { $in: projectIds } })
          : [];

        return Response.json({
          success: true,
          data: {
            date: date,
            user_id: userId,
            timesheets: {
              count: dayTimesheets.length,
              total_hours: totalHours,
              total_minutes: totalMinutes,
              active: dayTimesheets.filter(ts => ts.is_active === true).length
            },
            work_orders: {
              count: dayWorkOrders.length,
              by_status: workOrdersByStatus,
              items: dayWorkOrders.map(wo => ({
                id: wo.id,
                work_order_number: wo.work_order_number,
                title: wo.title,
                status: wo.status,
                project_id: wo.project_id,
                planned_start_time: wo.planned_start_time,
                planned_end_time: wo.planned_end_time
              }))
            },
            projects: projects.map(p => ({
              id: p.id,
              name: p.name,
              customer_id: p.customer_id
            }))
          }
        });
      } catch (error) {
        console.error('Failed to get stats:', error);
        return Response.json({
          success: false,
          error: error.message
        }, { status: 500 });
      }
    }

    return Response.json({ 
      error: 'Invalid action. Available actions: getSidebarItems, getStats' 
    }, { status: 400 });

  } catch (error) {
    console.error('API Helper Error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
});
