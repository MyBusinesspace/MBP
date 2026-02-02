import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Time Tracker API Handler
 * 
 * Authentication: User ID in header (X-User-ID)
 * 
 * Endpoints (passed as URL parameters):
 * 
 * User Endpoints:
 * - GET ?action=getActiveTimesheet - Get user's active timesheet
 * - GET ?action=getMyTimesheets&date=YYYY-MM-DD - Get user's timesheets for a specific date
 * - GET ?action=getMyTimesheets&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD - Get user's timesheets for date range
 * - POST ?action=clockIn - Clock in (body: { work_order_id, clock_in_coords, clock_in_photo_url, clock_in_address })
 * - POST ?action=clockOut - Clock out (body: { clock_out_coords, clock_out_photo_url, clock_out_address, notes })
 * - POST ?action=switchWorkOrder - Switch work order (body: { work_order_id, switch_photo_url })
 * - PUT ?action=requestEdit&id=xxx - Request timesheet edit (body: { clock_in_time, clock_out_time, notes })
 * - POST ?action=addTrackingPoint - Add GPS tracking point (body: { lat, lon })
 * 
 * Admin Endpoints:
 * - GET ?action=getAllTimesheets&date=YYYY-MM-DD - Get all timesheets for a date
 * - GET ?action=getAllTimesheets&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD - Get all timesheets for date range
 * - GET ?action=getTimesheetById&id=xxx - Get specific timesheet by ID
 * - GET ?action=getUserTimesheets&employee_id=xxx - Get all timesheets for a specific employee
 * - PUT ?action=updateTimesheet&id=xxx - Admin update timesheet (body: any timesheet fields)
 * - DELETE ?action=deleteTimesheet&id=xxx - Delete timesheet
 * - PUT ?action=approveEdit&id=xxx - Approve timesheet edit request (body: { approval_notes })
 * - PUT ?action=rejectEdit&id=xxx - Reject timesheet edit request (body: { approval_notes })
 * - GET ?action=getPendingEdits - Get all pending edit requests
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const method = req.method;

    // Get user ID from header
    const userId = req.headers.get('X-User-ID') || req.headers.get('x-user-id');
    
    if (!userId) {
      return Response.json({ 
        error: 'Unauthorized - User ID header missing',
        details: 'Please provide X-User-ID header'
      }, { status: 401 });
    }

    // Fetch user using service role
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

    // ==================== USER ENDPOINTS ====================

// ✅ GET Time Tracker Settings (Dynamic from DB only)
// ✅ GET Time Tracker Settings (fetch individual keys)
if (method === 'GET' && action === 'getSettings') {
  try {
    // جلب جميع الإعدادات المطلوبة فقط
    const keys = [
      'timesheet_require_photo_clock_out',
      'timesheet_require_photo_switch',
      'timesheet_require_photo_clock_in',
      'timesheet_track_gps'
    ];

    const settings = await base44.asServiceRole.entities.AppSettings.filter({
      setting_key: { $in: keys }
    });

    // نحول القائمة إلى كائن يحتوي القيم حسب المفتاح
    const settingsMap = {};
    for (const s of settings) {
      let value = s.setting_value;

      // نحول الأنواع حسب setting_type
      if (s.setting_type === 'boolean') {
        value = value === 'true';
      } else if (s.setting_type === 'number') {
        value = Number(value);
      }

      settingsMap[s.setting_key] = value;
    }

    // إذا لم توجد أي إعدادات، نرجع null
    if (Object.keys(settingsMap).length === 0) {
      return Response.json({
        success: true,
        data: null
      });
    }

    // ✅ نعيد القيم بشكل منسق
    return Response.json({
      success: true,
      data: {
        require_photo_clock_out: settingsMap.timesheet_require_photo_clock_out ?? false,
        require_photo_switch: settingsMap.timesheet_require_photo_switch ?? false,
        require_photo_clock_in: settingsMap.timesheet_require_photo_clock_in ?? false,
        track_gps: settingsMap.timesheet_track_gps ?? false
      }
    });

  } catch (error) {
    console.error('❌ Failed to get settings:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// ✅ GET Active Timesheet + Include Work Order Details
// if (method === 'GET' && action === 'getActiveTimesheet') {

//   const timesheets = await base44.asServiceRole.entities.TimesheetEntry.filter({
//     employee_id: userId,
//     is_active: true
//   });

//   const activeTimesheet = timesheets.length > 0 ? timesheets[0] : null;

//   if (!activeTimesheet) {
//     return Response.json({
//       success: true,
//       data: null
//     });
//   }

//   // ✅ فلترة المقاطع التي تحتوي على work_order_id فقط
//   const validSegments = (activeTimesheet.work_order_segments || []).filter(s => s.work_order_id);

//   // ✅ جلب بيانات الورك أوردر وأيضًا بيانات المشروع المرتبط به
//   const enrichedSegments = await Promise.all(
//     validSegments.map(async segment => {
//       try {
//         // 📌 جلب بيانات الورك أوردر
//         const workOrder = await base44.asServiceRole.entities.TimeEntry.get(segment.work_order_id);

//         // 📌 جلب بيانات المشروع باستخدام project_id
//         let project = null;
//         if (workOrder?.project_id) {
//           try {
//             project = await base44.asServiceRole.entities.Project.get(workOrder.project_id);
//           } catch (_) {
//             project = null;
//           }
//         }

//         return {
//           ...segment,

//           // بيانات الورك أوردر
//           work_order_number: workOrder?.work_order_number || null,
//           work_order_title: workOrder?.title || null,
//           work_order_address: workOrder?.start_address || null,
//           work_order_status: workOrder?.status || null,
//           work_order_project_id: workOrder?.project_id || null,

//           // 🆕 بيانات المشروع
//           work_order_project_name: project?.name || null,
//           work_order_project_logo: project?.logo || null,

//           work_order_raw: workOrder || null
//         };
 
//       } catch (e) {
//         // في حال لم يتم العثور على الورك أوردر لأي سبب
//         return {
//           ...segment,
//           work_order_number: null,
//           work_order_title: null,
//           work_order_address: null,
//           work_order_status: null,
//           work_order_project_id: null,

//           // 🆕 إرجاع قيم null للمشروع
//           work_order_project_name: null,
//           work_order_project_logo: null,

//           work_order_raw: null
//         };
//       }
//     })
//   );

//   // ✅ إرجاع التايم شيت النشطة مع تفاصيل الورك أوردر + المشروع
//   return Response.json({
//     success: true,
//     data: {
//       ...activeTimesheet,
//       work_order_segments: enrichedSegments
//     }
//   });
// }
if (method === 'GET' && action === 'getActiveTimesheet') {

  const timesheets = await base44.asServiceRole.entities.TimesheetEntry.filter({
    employee_id: userId,
    is_active: true
  });

  const activeTimesheet = timesheets.length > 0 ? timesheets[0] : null;

  if (!activeTimesheet) {
    return Response.json({
      success: true,
      data: null
    });
  }

  // فلترة المقاطع التي تحتوي على work_order_id فقط
  const validSegments = (activeTimesheet.work_order_segments || []).filter(s => s.work_order_id);

  // جلب بيانات الورك أوردر وأيضًا بيانات المشروع المرتبط به
  const enrichedSegments = await Promise.all(
    validSegments.map(async segment => {
      try {
        // جلب بيانات الورك أوردر
        const workOrder = await base44.asServiceRole.entities.TimeEntry.get(segment.work_order_id);

        // جلب بيانات المشروع باستخدام project_id
        let project = null;
        if (workOrder?.project_id) {
          try {
            project = await base44.asServiceRole.entities.Project.get(workOrder.project_id);
          } catch (_) {
            project = null;
          }
        }

             // 3️⃣ جلب كل العملاء مرة واحدة فقط
    const customers = await base44.asServiceRole.entities.Customer.list();


    // 4️⃣ تحويل قائمة العملاء إلى Map للوصول السريع
    const customerMap = {};
    customers.forEach(c => {
        customerMap[c.id] = c;
    });
        const customer = project.customer_id ? customerMap[project.customer_id] : null;

        return {
          ...segment,

          // بيانات الورك أوردر
          work_order_number: workOrder?.work_order_number || null,
          work_order_title: workOrder?.title || null,
          work_order_address: workOrder?.start_address || null,
          work_order_status: workOrder?.status || null,
          work_order_project_id: workOrder?.project_id || null,

          // بيانات المشروع
          work_order_project_name: project?.name || null,
            work_order_customer_name: customer.name || null,   // ← ← تم الإصلاح هنا
          work_order_project_logo: project?.logo || null,

          work_order_raw: workOrder || null
        };

      } catch (e) {
        // في حال لم يتم العثور على الورك أوردر لأي سبب
        return {
          ...segment,
          work_order_number: null,
          work_order_title: null,
          work_order_address: null,
          work_order_status: null,
          work_order_project_id: null,
          work_order_project_name: null,
          work_order_customer_name:null,
          work_order_project_logo: null,
          work_order_raw: null
        };
      }
    })
  );
 const allTimesheets = await base44.asServiceRole.entities.TimesheetEntry.filter({
    employee_id: userId
  });

 const today = new Date().toISOString().split('T')[0]; // تاريخ اليوم بالشكل YYYY-MM-DD

const filteredTimesheets = allTimesheets.filter(ts => {
  const clockInDate = ts.clock_in_time ? ts.clock_in_time.split('T')[0] : null;
  return clockInDate === today; // فقط التايم شيتات اليوم الحالي
});

// حساب إجمالي وقت العمل لليوم لكل التايم شيتات اليوم
const totalDurationMinutesToday = filteredTimesheets.reduce((sum, ts) => {
  return sum + (ts.total_duration_minutes || 0);
}, 0);


    // جلب بيانات جميع الموظفين
    const employeeIds = [...new Set(timesheets.map(ts => ts.employee_id))];
    const employees = await base44.asServiceRole.entities.User.filter({
        id: { $in: employeeIds }
    });

    const employeeMap = {};
    for (const emp of employees) {
        employeeMap[emp.id] = emp;
    }



  // إرجاع التايم شيت النشطة مع تفاصيل الورك أوردر + المشروع + إجمالي الوقت
  return Response.json({
    success: true,
    data: {
      ...activeTimesheet,
      work_order_segments: enrichedSegments,
      total_duration_minutes_today: totalDurationMinutesToday,
      employee: employeeMap[activeTimesheet.employee_id] || null,


    }
  });
}


    // GET My Timesheets
    if (method === 'GET' && action === 'getMyTimesheets') {
      const date = url.searchParams.get('date');
      const startDate = url.searchParams.get('start_date');
      const endDate = url.searchParams.get('end_date');

      let timesheets;

      if (date) {
        // Get timesheets for specific date
        timesheets = await base44.asServiceRole.entities.TimesheetEntry.list('-clock_in_time', 1000);
        timesheets = timesheets.filter(ts => 
          ts.employee_id === userId &&
          ts.clock_in_time &&
          ts.clock_in_time.startsWith(date)
        );
      } else if (startDate && endDate) {
        // Get timesheets for date range
        timesheets = await base44.asServiceRole.entities.TimesheetEntry.list('-clock_in_time', 1000);
        timesheets = timesheets.filter(ts => 
          ts.employee_id === userId &&
          ts.clock_in_time &&
          ts.clock_in_time >= startDate &&
          ts.clock_in_time <= endDate + 'T23:59:59'
        );
      } else {
        // Get all user's timesheets
        timesheets = await base44.asServiceRole.entities.TimesheetEntry.filter({
          employee_id: userId
        });
      }

      return Response.json({
        success: true,
        data: timesheets,
        count: timesheets.length
      });
    }



// POST Clock In
if (method === 'POST' && action === 'clockIn') {
  const body = await req.json();
  const {
    work_order_id,
    clock_in_coords,
    clock_in_photo_url,
    clock_in_address,
    timesheet_type,
    department_name
  } = body;

  if (!work_order_id) {
    return Response.json({ error: 'work_order_id is required' }, { status: 400 });
  }

  // Check if user already has active timesheet
  const activeTimesheets = await base44.asServiceRole.entities.TimesheetEntry.filter({
    employee_id: userId,
    is_active: true
  });

  if (activeTimesheets.length > 0) {
    return Response.json({ 
      error: 'User already has an active timesheet',
      active_timesheet: activeTimesheets[0]
    }, { status: 400 });
  }

  // ✅ Get department_id from department_name
  let department_id = null;
  if (department_name) {
    const departments = await base44.asServiceRole.entities.Department.filter({
      name: department_name
    });

    if (departments && departments.length > 0) {
      department_id = departments[0].id;
    }
  }

  // Create new timesheet
  const newTimesheet = await base44.asServiceRole.entities.TimesheetEntry.create({
    employee_id: userId,
    clock_in_time: new Date().toISOString(),
    clock_in_coords: clock_in_coords || null,
    clock_in_photo_url: clock_in_photo_url || null,
    clock_in_address: clock_in_address || null,
    timesheet_type: timesheet_type || null,  // ← إضافة timesheet_type
    department_id: department_id,            // ← إضافة department_id
    is_active: true,
    status: 'active',
    work_order_segments: [{
      work_order_id,
      start_time: new Date().toISOString(),
      end_time: null,
      duration_minutes: 0
    }],
    live_tracking_points: [],
    // total_duration_minutes: 0,
    was_edited: false
  });

  return Response.json({
    success: true,
    data: newTimesheet,
    message: 'Clocked in successfully'
  }, { status: 200 });
}



// POST Clock Out
if (method === 'POST' && action === 'clockOut') {
  try {
    const body = await req.json();
    const {
      clock_out_coords,
      clock_out_photo_url,
      clock_out_address,
      notes,
      work_order_id,   // 👈 معرف الوورك اوردر (اختياري)
      status           // 👈 الحالة الجديدة (اختياري)
    } = body;

    // 🔹 جلب الـ Timesheet النشط
    const activeTimesheets = await base44.asServiceRole.entities.TimesheetEntry.filter({
      employee_id: userId,
      is_active: true
    });

    if (activeTimesheets.length === 0) {
      return Response.json({ error: 'No active timesheet found' }, { status: 404 });
    }

    const timesheet = activeTimesheets[0];
    const clockOutTime = new Date();
    const clockInTime = new Date(timesheet.clock_in_time);
    const totalDurationMinutes = Math.round((clockOutTime - clockInTime) / 60000);

    // 🔹 إغلاق آخر جزء عمل مرتبط بالـ Work Order
    const segments = timesheet.work_order_segments || [];
    if (segments.length > 0) {
      const lastSegment = segments[segments.length - 1];
      if (!lastSegment.end_time) {
        const segmentStartTime = new Date(lastSegment.start_time);
        const segmentDuration = Math.round((clockOutTime - segmentStartTime) / 60000);
        lastSegment.end_time = clockOutTime.toISOString();
        lastSegment.duration_minutes = segmentDuration;
      }
    }

    // 🔹 تحديث الـ Timesheet
    const updatedTimesheet = await base44.asServiceRole.entities.TimesheetEntry.update(timesheet.id, {
      clock_out_time: clockOutTime.toISOString(),
      clock_out_coords: clock_out_coords || null,
      clock_out_photo_url: clock_out_photo_url || null,
      clock_out_address: clock_out_address || null,
      notes: notes || timesheet.notes,
      is_active: false,
      status: 'completed',
      total_duration_minutes: totalDurationMinutes,
      work_order_segments: segments
    });

    // 🔹 في حال تم إرسال work_order_id و status، يتم تعديل حالة الـ Work Order
    let updatedWorkOrder = null;
    if (work_order_id && status) {
      try {
        updatedWorkOrder = await base44.asServiceRole.entities.TimeEntry.update(work_order_id, {
          status: status,
          completed_date: new Date().toISOString()
        });
      } catch (err) {
        console.warn(`⚠️ Work order ${work_order_id} not updated:`, err.message);
        // لا ترجع خطأ للمستخدم، فقط تخزن التحذير في الرد النهائي
      }
    }

    // ✅ الرد النهائي
    return Response.json({
      success: true,
      message: 'Clocked out successfully',
      data: {
        timesheet: updatedTimesheet,
        work_order_updated: !!updatedWorkOrder,
        work_order: updatedWorkOrder || null
      }
    });

  } catch (error) {
    console.error('Error during clockOut:', error);
    return Response.json({
      success: false,
      error: 'Failed to process clock out',
      details: error.message
    }, { status: 500 });
  }
}




    // POST Switch Work Order
    // if (method === 'POST' && action === 'switchWorkOrder') {
    //   const body = await req.json();
    //   const { work_order_id, switch_photo_url } = body;

    //   if (!work_order_id) {
    //     return Response.json({ error: 'work_order_id is required' }, { status: 400 });
    //   }

    //   // Get active timesheet
    //   const activeTimesheets = await base44.asServiceRole.entities.TimesheetEntry.filter({
    //     employee_id: userId,
    //     is_active: true
    //   });

    //   if (activeTimesheets.length === 0) {
    //     return Response.json({ error: 'No active timesheet found' }, { status: 404 });
    //   }

    //   const timesheet = activeTimesheets[0];
    //   const now = new Date();
    //   const segments = timesheet.work_order_segments || [];

    //   // Close current segment
    //   if (segments.length > 0) {
    //     const lastSegment = segments[segments.length - 1];
    //     if (!lastSegment.end_time) {
    //       const segmentStartTime = new Date(lastSegment.start_time);
    //       const segmentDuration = Math.round((now - segmentStartTime) / 60000);
    //       lastSegment.end_time = now.toISOString();
    //       lastSegment.duration_minutes = segmentDuration;
    //     }
    //   }

    //   // Add new segment
    //   segments.push({
    //     work_order_id,
    //     start_time: now.toISOString(),
    //     end_time: null,
    //     duration_minutes: 0
    //   });

    //   // Add switch photo if provided
    //   const switchPhotos = timesheet.switch_photo_urls || [];
    //   if (switch_photo_url) {
    //     switchPhotos.push(switch_photo_url);
    //   }

    //   // Update timesheet
    //   const updatedTimesheet = await base44.asServiceRole.entities.TimesheetEntry.update(timesheet.id, {
    //     work_order_segments: segments,
    //     switch_photo_urls: switchPhotos
    //   });

    //   return Response.json({
    //     success: true,
    //     data: updatedTimesheet,
    //     message: 'Switched work order successfully'
    //   });
    // }

// POST Switch Work Order
if (method === 'POST' && action === 'switchWorkOrder') {
  const body = await req.json();
  const { work_order_id, switch_photo_url } = body;

  if (!work_order_id) {
    return Response.json({ error: 'work_order_id is required' }, { status: 400 });
  }

  // ✅ احضار التايم شيت النشطة
  const activeTimesheets = await base44.asServiceRole.entities.TimesheetEntry.filter({
    employee_id: userId,
    is_active: true
  });

  if (activeTimesheets.length === 0) {
    return Response.json({ error: 'No active timesheet found' }, { status: 404 });
  }

  const timesheet = activeTimesheets[0];
  const now = new Date();
  const segments = timesheet.work_order_segments || [];

  // ✅ اغلاق السِجل الأخير إذا لم يُغلق بعد
  if (segments.length > 0) {
    const lastSegment = segments[segments.length - 1];
    if (!lastSegment.end_time) {
      const segmentStartTime = new Date(lastSegment.start_time);
      const segmentDuration = Math.round((now - segmentStartTime) / 60000);
      lastSegment.end_time = now.toISOString();
      lastSegment.duration_minutes = segmentDuration;
    }
  }

  // ✅ إضافة السِجل الجديد للـ work order
  segments.push({
    work_order_id,
    start_time: now.toISOString(),
    end_time: null,
    duration_minutes: 0
  });

  // ✅ إضافة الصورة إن وُجدت
  const switchPhotos = timesheet.switch_photo_urls || [];
  if (switch_photo_url) {
    switchPhotos.push(switch_photo_url);
  }

  // ✅ تحديث الـ Timesheet
  const updatedTimesheet = await base44.asServiceRole.entities.TimesheetEntry.update(timesheet.id, {
    work_order_segments: segments,
    switch_photo_urls: switchPhotos
  });

  // ✅ فلترة المقاطع لتجاهل التي بدون work_order_id
  const validSegments = (updatedTimesheet.work_order_segments || []).filter(
    s => s.work_order_id
  );

  // ✅ جلب بيانات الورك أوردرات الفعلية
  const enrichedSegments = await Promise.all(
    validSegments.map(async segment => {
      try {
        const workOrder = await base44.asServiceRole.entities.WorkOrders.get(segment.work_order_id);
        return {
          ...segment,
          work_order_number: workOrder?.work_order_number || null,
          work_order_title: workOrder?.title || null,
          work_order_address: workOrder?.start_address || null,
          work_order_raw: workOrder || null
        };
      } catch (e) {
        return {
          ...segment,
          work_order_number: null,
          work_order_title: null,
          work_order_address: null,
          work_order_raw: null
        };
      }
    })
  );

  // ✅ إرجاع الرد بعد التنظيف
  return Response.json({
    success: true,
    data: {
      ...updatedTimesheet,
      work_order_segments: enrichedSegments
    },
    message: 'Switched work order successfully'
  });
}


    // PUT Request Edit
    if (method === 'PUT' && action === 'requestEdit') {
      const id = url.searchParams.get('id');
      if (!id) {
        return Response.json({ error: 'Timesheet ID is required' }, { status: 400 });
      }

      const body = await req.json();
      const { clock_in_time, clock_out_time, notes } = body;

      // Get timesheet
      const timesheets = await base44.asServiceRole.entities.TimesheetEntry.filter({ id });
      if (timesheets.length === 0) {
        return Response.json({ error: 'Timesheet not found' }, { status: 404 });
      }

      const timesheet = timesheets[0];

      // Check ownership
      if (timesheet.employee_id !== userId) {
        return Response.json({ error: 'Forbidden - You can only edit your own timesheets' }, { status: 403 });
      }

      // Update timesheet with edit request
      const updatedTimesheet = await base44.asServiceRole.entities.TimesheetEntry.update(id, {
        clock_in_time: clock_in_time || timesheet.clock_in_time,
        clock_out_time: clock_out_time || timesheet.clock_out_time,
        notes: notes || timesheet.notes,
        was_edited: true,
        is_active: false,
        status: 'pending_approval'
      });

      return Response.json({
        success: true,
        data: updatedTimesheet,
        message: 'Edit request submitted for approval'
      });
    }

    // POST Add Tracking Point
    if (method === 'POST' && action === 'addTrackingPoint') {
      const body = await req.json();
      const { lat, lon } = body;

      if (!lat || !lon) {
        return Response.json({ error: 'lat and lon are required' }, { status: 400 });
      }

      // Get active timesheet
      const activeTimesheets = await base44.asServiceRole.entities.TimesheetEntry.filter({
        employee_id: userId,
        is_active: true
      });

      if (activeTimesheets.length === 0) {
        return Response.json({ error: 'No active timesheet found' }, { status: 404 });
      }

      const timesheet = activeTimesheets[0];
      const trackingPoints = timesheet.live_tracking_points || [];

      trackingPoints.push({
        timestamp: new Date().toISOString(),
        lat,
        lon
      });

      // Update timesheet
      const updatedTimesheet = await base44.asServiceRole.entities.TimesheetEntry.update(timesheet.id, {
        live_tracking_points: trackingPoints
      });

      return Response.json({
        success: true,
        data: updatedTimesheet,
        message: 'Tracking point added'
      });
    }

    // ==================== ADMIN ENDPOINTS ====================

    // if (!isAdmin) {
    //   return Response.json({ 
    //     error: 'Forbidden - Admin access required',
    //     details: `User role: ${currentUser.role}`
    //   }, { status: 403 });
    // }

  
/// all timesheet just lase one for one employee  
if (method === 'GET' && action === 'getAllTimesheets') {
    const date = url.searchParams.get('date');
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');

    // جلب كل التايم شيتس
    let timesheets = await base44.asServiceRole.entities.TimesheetEntry.list(
        '-clock_in_time',
        2000
    );

    // فلترة حسب التاريخ
    if (date) {
        timesheets = timesheets.filter(ts =>
            ts.clock_in_time && ts.clock_in_time.startsWith(date)
        );
    } else if (startDate && endDate) {
        timesheets = timesheets.filter(ts =>
            ts.clock_in_time &&
            ts.clock_in_time >= startDate &&
            ts.clock_in_time <= endDate + 'T23:59:59'
        );
    }

    // ترتيب التايم شيت حسب clock_in_time تنازلي
    timesheets.sort((a, b) => new Date(b.clock_in_time) - new Date(a.clock_in_time));

    // الاحتفاظ بأحدث تايم شيت لكل موظف
    const latestTimesheetMap = {};
    for (const ts of timesheets) {
        if (!latestTimesheetMap[ts.employee_id]) {
            latestTimesheetMap[ts.employee_id] = ts;
        }
    }

    const latestTimesheets = Object.values(latestTimesheetMap);

    // جلب بيانات الموظفين
    const employeeIds = latestTimesheets.map(ts => ts.employee_id);
    const employees = await base44.asServiceRole.entities.User.filter({
        id: { $in: employeeIds }
    });

    const employeeMap = {};
    for (const emp of employees) {
        employeeMap[emp.id] = emp;
    }

    // دمج بيانات الموظف مع التايم شيت
    const enriched = latestTimesheets.map(ts => ({
        ...ts,
        employee: employeeMap[ts.employee_id] || null
    }));

    return Response.json({
        success: true,
        data: enriched,
        count: enriched.length
    });
}

if (method === 'GET' && action === 'getAllTimesheetsSessions') {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // جلب كل التايم شيتس
    let timesheets = await base44.asServiceRole.entities.TimesheetEntry.list(
        '-clock_in_time',
        2000
    );

    // فلترة حسب اليوم الحالي
    timesheets = timesheets.filter(ts =>
        ts.clock_in_time && ts.clock_in_time.startsWith(today)
    );

    // عد التايم شيت لكل مستخدم
    const sessionCountMap = {};
    for (const ts of timesheets) {
        sessionCountMap[ts.employee_id] = (sessionCountMap[ts.employee_id] || 0) + 1;
    }

    // جلب بيانات جميع الموظفين
    const employeeIds = [...new Set(timesheets.map(ts => ts.employee_id))];
    const employees = await base44.asServiceRole.entities.User.filter({
        id: { $in: employeeIds }
    });

    const employeeMap = {};
    for (const emp of employees) {
        employeeMap[emp.id] = emp;
    }

        // استخراج كل work_order_id من السيغمنت
        const workOrderIds = [
        ...new Set(
            timesheets.flatMap(ts =>
            (ts.work_order_segments || []).map(s => s.work_order_id)
            )
        )
        ];

        // جلب الورك أوردرز
        const workOrders = await base44.asServiceRole.entities.TimeEntry.filter({
        id: { $in: workOrderIds }
        });

        // ماب للوصول السريع
        const workOrderMap = {};
        for (const wo of workOrders) {
            workOrderMap[wo.id] = wo;
        }
        // const workOrder = workOrderMap[seg.work_order_id];

          // let project = null;
        // project = await base44.asServiceRole.entities.Project.get(
        //   workOrder.project_id
        // );

       
        // if (workOrder?.project_id) {
        //   try {
        //     project = await base44.asServiceRole.entities.Project.get(workOrder.project_id);
        //   } catch (_) {
        //     project = null;
        //   }
        // }
    // دمج بيانات الموظف وعدد الجلسات لكل تايم شيت
    // const enriched = timesheets.map(ts => ({
    //     ...ts,
    //     employee: employeeMap[ts.employee_id] || null,
    //     session: sessionCountMap[ts.employee_id] || 0
    // }));

        // const enriched = timesheets.map(ts => ({
        // ...ts,
        // employee: employeeMap[ts.employee_id] || null,
        // session: sessionCountMap[ts.employee_id] || 0,
        // work_order_segments: (ts.work_order_segments || []).map(seg => ({
        //     ...seg,
        //     work_order_title: workOrderMap[seg.work_order_id]?.title || null,
        //     work_order_project_name: project?.name || null,

        //     work_order_raw:workOrderMap[seg.work_order_id] || []
        // }))
        // }));

        const enriched = await Promise.all(
          timesheets.map(async ts => ({
            ...ts,
            employee: employeeMap[ts.employee_id] || null,
            session: sessionCountMap[ts.employee_id] || 0,

            work_order_segments: await Promise.all(
              (ts.work_order_segments || []).map(async seg => {
                const workOrder = workOrderMap[seg.work_order_id] || null;

                let project = null;
                if (workOrder?.project_id) {
                  try {
                    project = await base44.asServiceRole.entities.Project.get(
                      workOrder.project_id
                    );
                  } catch (_) {
                    project = null;
                  }
                }

                return {
                  ...seg,
                  work_order_title: workOrder?.title || null,
                  work_order_project_name: project?.name || null,
                  work_order_raw:workOrderMap[seg.work_order_id] || []
                };
              })
            )
          }))
        );


    return Response.json({
        success: true,
        data: enriched,
        count: enriched.length
    });
}
if (method === 'GET' && action === 'getAllUsersTimesheets') {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // جلب كل التايم شيتات
    let timesheets = await base44.asServiceRole.entities.TimesheetEntry.list(
      '-clock_in_time',
      2000
    );

    // فلترة حسب اليوم الحالي
    const todayTimesheets = timesheets.filter(ts =>
      ts.clock_in_time && ts.clock_in_time.startsWith(today)
    );

    // عد التايم شيت لكل مستخدم
    const sessionCountMap = {};
    for (const ts of todayTimesheets) {
      sessionCountMap[ts.employee_id] = (sessionCountMap[ts.employee_id] || 0) + 1;
    }

    // جلب بيانات كل المستخدمين
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 2000);

    // دمج بيانات الموظف وعدد الجلسات لكل تايم شيت (حتى لو لا توجد تايم شيت)
    const enriched = allUsers.map(user => {
      // التايم شيت الخاص بالمستخدم
      const userTimesheets = todayTimesheets.filter(ts => ts.employee_id === user.id);
      
      return {
        employee: user,
        session: sessionCountMap[user.id] || 0,
        timesheets: userTimesheets
      };
    });

    return Response.json({
      success: true,
      data: enriched,
      count: enriched.length
    });
  } catch (error) {
    console.error('Error fetching users timesheets:', error);
    return Response.json({
      success: false,
      error: 'Failed to fetch users timesheets',
      details: error.message
    }, { status: 500 });
  }
}

    // GET Timesheet By ID
    // if (method === 'GET' && action === 'getTimesheetById') {
    //   const id = url.searchParams.get('id');
    //   if (!id) {
    //     return Response.json({ error: 'Timesheet ID is required' }, { status: 400 });
    //   }

    //   const timesheets = await base44.asServiceRole.entities.TimesheetEntry.filter({ id });
    //   if (timesheets.length === 0) {
    //     return Response.json({ error: 'Timesheet not found' }, { status: 404 });
    //   }

    //   return Response.json({
    //     success: true,
    //     data: timesheets[0]
    //   });
    // }

    // GET Timesheet By ID
if (method === 'GET' && action === 'getTimesheetById') {
  const id = url.searchParams.get('id');
  if (!id) {
    return Response.json({ error: 'Timesheet ID is required' }, { status: 400 });
  }
 
  // جلب التايم شيت
  const timesheets = await base44.asServiceRole.entities.TimesheetEntry.filter({ id });
  if (timesheets.length === 0) {
    return Response.json({ error: 'Timesheet not found' }, { status: 404 });
  }


    const today = new Date().toISOString().split('T')[0]; 
    // جلب كل التايم شيتس
    let all_timesheets = await base44.asServiceRole.entities.TimesheetEntry.list(
        '-clock_in_time',
        2000
    );

    // فلترة حسب اليوم الحالي
   let  timesheetsToday = all_timesheets.filter(ts =>
        ts.clock_in_time && ts.clock_in_time.startsWith(today)
    );

    // عد التايم شيت لكل مستخدم
    const sessionCountMap = {};
    for (const ts of timesheetsToday) {
        sessionCountMap[ts.employee_id] = (sessionCountMap[ts.employee_id] || 0) + 1;
    }



  const ts = timesheets[0];

  // جلب بيانات الموظف للتايم شيت
  let employee = null;
  if (ts.employee_id) {
    const employees = await base44.asServiceRole.entities.User.filter({ id: ts.employee_id });
    if (employees.length > 0) {
      employee = employees[0];
    }
  }

  // ✅ إضافة بيانات الورك أوردر لكل Segment مع اسم المشروع والزبون
  const validSegments = (ts.work_order_segments || []).filter(s => s.work_order_id);
  const enrichedSegments = await Promise.all(
    validSegments.map(async segment => {
      try {
        const workOrder = await base44.asServiceRole.entities.TimeEntry.get(segment.work_order_id);

        // جلب المشروع والزبون
        let project = null;
        let customer = null;
        if (workOrder?.project_id) {
          try {
            project = await base44.asServiceRole.entities.Project.get(workOrder.project_id);

            if (project?.customer_id) {
              try {
                customer = await base44.asServiceRole.entities.Customer.get(project.customer_id);
              } catch (_) {
                customer = null;
              }
            }
          } catch (_) {
            project = null;
          }
        }

        return {
          ...segment,
          work_order_number: workOrder?.work_order_number || null,
          work_order_title: workOrder?.title || null,
          work_order_address: workOrder?.start_address || null,
          work_order_status: workOrder?.status || null,
          work_order_project_id: workOrder?.project_id || null,
          work_order_project_name: project?.name || null,
          work_order_project_logo: project?.logo || null,
          work_order_raw: workOrder || null,
          work_order_customer_id: project?.customer_id || null,
          work_order_customer_name: customer?.name || null,
          work_order_customer: customer || null,
        };
      } catch (_) {
        return {
          ...segment,
          work_order_number: null,
          work_order_title: null,
          work_order_address: null,
          work_order_status: null,
          work_order_project_id: null,
          work_order_project_name: null,
          work_order_project_logo: null,
          work_order_raw: null,
          work_order_customer_name: null,
        };
      }
    })
  );

  // إرجاع التايم شيت مع الموظف وSegments
  return Response.json({
    success: true,
    data: {
      ...ts,
      work_order_segments: enrichedSegments,
      employee: employee || null, 
      session: sessionCountMap[ts.employee_id] || 0,
      
    }
  });
}
// GET User Timesheets
    // if (method === 'GET' && action === 'getUserTimesheets') {
    //   const employeeId = url.searchParams.get('employee_id');
    //   if (!employeeId) {
    //     return Response.json({ error: 'employee_id is required' }, { status: 400 });
    //   }

    //   const timesheets = await base44.asServiceRole.entities.TimesheetEntry.filter({
    //     employee_id: employeeId
    //   });

    //   return Response.json({
    //     success: true,
    //     data: timesheets,
    //     count: timesheets.length
    //   });
    // }

// GET User Timesheets /// my day log
// if (method === 'GET' && action === 'getUserTimesheets') {
//   const employeeId = url.searchParams.get('employee_id');
//   const dateParam = url.searchParams.get('date'); // optional
//   const allParam = url.searchParams.get('all');   // optional

//   if (!employeeId) {
//     return Response.json({ error: 'employee_id is required' }, { status: 400 });
//   }

//   // جلب كل التايم شيتات الخاصة بالمستخدم
//   let timesheets = await base44.asServiceRole.entities.TimesheetEntry.filter({
//     employee_id: employeeId
//   });

//   // فلترة حسب التاريخ إذا تم الإرسال
//   if (dateParam && !allParam) {
//     const filterDate = new Date(dateParam);
//     const dateStr = filterDate.toISOString().slice(0, 10); // YYYY-MM-DD
//     timesheets = timesheets.filter(ts => {
//       const tsDateStr = ts.clock_in_time?.slice(0, 10);
//       return tsDateStr === dateStr;
//     });
//   }

//   // إذا لم يتم إرسال أي تاريخ ولا all=true، اعرض اليوم الحالي فقط
//   if (!dateParam && !allParam) {
//     const todayStr = new Date().toISOString().slice(0, 10);
//     timesheets = timesheets.filter(ts => {
//       const tsDateStr = ts.clock_in_time?.slice(0, 10);
//       return tsDateStr === todayStr;
//     });
//   }

//   // ✅ إضافة بيانات الورك أوردر لكل Segment مع اسم المشروع
//   const enrichedTimesheets = await Promise.all(
//     timesheets.map(async ts => {
//       const validSegments = (ts.work_order_segments || []).filter(s => s.work_order_id);
//       const enrichedSegments = await Promise.all(
//         validSegments.map(async segment => {
//           try {
//             // const workOrder = await base44.asServiceRole.entities.TimeEntry.get(segment.work_order_id);
            
//             // // جلب المشروع
//             // let project = null;
//             // if (workOrder?.project_id) {
//             //   try {
//             //     project = await base44.asServiceRole.entities.Project.get(workOrder.project_id);
//             //   } catch (_) {
//             //     project = null;
//             //   }
//             // }

//             const workOrder = await base44.asServiceRole.entities.TimeEntry.get(segment.work_order_id);

//             // جلب المشروع
//             let project = null;
//             let customer = null;

//             if (workOrder?.project_id) {
//               try {
//                 project = await base44.asServiceRole.entities.Project.get(workOrder.project_id);

//                 // 🔥 جلب الزبون المرتبط بالمشروع
//                 if (project?.customer_id) {
//                   try {
//                     customer = await base44.asServiceRole.entities.Customer.get(project.customer_id);
//                   } catch (_) {
//                     customer = null;
//                   }
//                 }
//               } catch (_) {
//                 project = null;
//               }
//             }


//             return {
//               ...segment,
//               work_order_number: workOrder?.work_order_number || null,
//               work_order_title: workOrder?.title || null,
//               work_order_address: workOrder?.start_address || null,
//               work_order_status: workOrder?.status || null,
//               work_order_project_id: workOrder?.project_id || null,
//               work_order_project_name: project?.name || null,
          
//               work_order_project_logo: project?.logo || null,
//               work_order_raw: workOrder || null,
//               work_order_customer_id: project?.customer_id || null,
//               work_order_customer_name: customer?.name || null,
//               work_order_customer: customer || null,
//             };
//           } catch (_) {
//             return {
//               ...segment,
//               work_order_number: null,
//               work_order_title: null,
//               work_order_address: null,
//               work_order_status: null,
//               work_order_project_id: null,
//               work_order_project_name: null,
//               work_order_project_logo: null,
//               work_order_raw: null
//             };
//           }
//         })
//       );

//       return {
//         ...ts,
//         work_order_segments: enrichedSegments
//       };
//     })
//   );

//   return Response.json({
//     success: true,
//     data: enrichedTimesheets,
//     count: enrichedTimesheets.length
//   });
// }


if (method === 'GET' && action === 'getUserTimesheets') {
  const employeeId = url.searchParams.get('employee_id');
  const dateParam = url.searchParams.get('date'); // optional
  const allParam = url.searchParams.get('all');   // optional

  if (!employeeId) {
    return Response.json({ error: 'employee_id is required' }, { status: 400 });
  }

  // جلب كل التايم شيتات الخاصة بالمستخدم
  let timesheets = await base44.asServiceRole.entities.TimesheetEntry.filter({
    employee_id: employeeId
  });

  // فلترة حسب التاريخ إذا تم الإرسال
  if (dateParam && !allParam) {
    const filterDate = new Date(dateParam);
    const dateStr = filterDate.toISOString().slice(0, 10); // YYYY-MM-DD
    timesheets = timesheets.filter(ts => {
      const clockInDate = ts.clock_in_time?.slice(0, 10);
      const clockOutDate = ts.clock_out_time?.slice(0, 10);
      return clockInDate === dateStr || clockOutDate === dateStr;
    });
  }

  // إذا لم يتم إرسال أي تاريخ ولا all=true، اعرض اليوم الحالي
  // 🔥 يشمل clock_in اليوم أو clock_out اليوم
  if (!dateParam && !allParam) {
    const todayStr = new Date().toISOString().slice(0, 10);
    timesheets = timesheets.filter(ts => {
      const clockInDate = ts.clock_in_time?.slice(0, 10);
      const clockOutDate = ts.clock_out_time?.slice(0, 10);
      return clockInDate === todayStr || clockOutDate === todayStr;
    });
  }


 // جلب بيانات جميع الموظفين
    const employeeIds = [...new Set(timesheets.map(ts => ts.employee_id))];
    const employees = await base44.asServiceRole.entities.User.filter({
        id: { $in: employeeIds }
    });

    const employeeMap = {};
    for (const emp of employees) {
        employeeMap[emp.id] = emp;
    }
    
  // ✅ إضافة بيانات الورك أوردر لكل Segment مع اسم المشروع والزبون
  const enrichedTimesheets = await Promise.all(
    timesheets.map(async ts => {
      const validSegments = (ts.work_order_segments || []).filter(s => s.work_order_id);
      const enrichedSegments = await Promise.all(
        validSegments.map(async segment => {
          try {
            const workOrder = await base44.asServiceRole.entities.TimeEntry.get(segment.work_order_id);

            // جلب المشروع والزبون
            let project = null;
            let customer = null;

            if (workOrder?.project_id) {
              try {
                project = await base44.asServiceRole.entities.Project.get(workOrder.project_id);

                if (project?.customer_id) {
                  try {
                    customer = await base44.asServiceRole.entities.Customer.get(project.customer_id);
                  } catch (_) {
                    customer = null;
                  }
                }
              } catch (_) {
                project = null;
              }
            }

            return {
                   
              ...segment,
              work_order_number: workOrder?.work_order_number || null,
              work_order_title: workOrder?.title || null,
              work_order_address: workOrder?.start_address || null,
              work_order_status: workOrder?.status || null,
              work_order_project_id: workOrder?.project_id || null,
              work_order_project_name: project?.name || null,
              work_order_project_logo: project?.logo || null,
              work_order_raw: workOrder || null,
              work_order_customer_id: project?.customer_id || null,
              work_order_customer_name: customer?.name || null,
              work_order_customer: customer || null,
       
            };
          } catch (_) {
            return {
              ...segment,
              work_order_number: null,
              work_order_title: null,
              work_order_address: null,
              work_order_status: null,
              work_order_project_id: null,
              work_order_project_name: null,
              work_order_project_logo: null,
              work_order_raw: null
            };
          }
        })
      );

      return {
        ...ts,
        work_order_segments: enrichedSegments,
          employee: employeeMap[ts.employee_id] || null,
      };
    })
  );

  return Response.json({
    success: true,
    data: enrichedTimesheets,
    count: enrichedTimesheets.length
  });
}


    // PUT Update Timesheet (Admin)
    if (method === 'PUT' && action === 'updateTimesheet') {
      const id = url.searchParams.get('id');
      if (!id) {
        return Response.json({ error: 'Timesheet ID is required' }, { status: 400 });
      }

      const body = await req.json();

      // Check if timesheet exists
      const timesheets = await base44.asServiceRole.entities.TimesheetEntry.filter({ id });
      if (timesheets.length === 0) {
        return Response.json({ error: 'Timesheet not found' }, { status: 404 });
      }

      const updatedTimesheet = await base44.asServiceRole.entities.TimesheetEntry.update(id, body);

      return Response.json({
        success: true,
        data: updatedTimesheet,
        message: 'Timesheet updated successfully'
      });
    }

    // DELETE Timesheet
    if (method === 'DELETE' && action === 'deleteTimesheet') {
      const id = url.searchParams.get('id');
      if (!id) {
        return Response.json({ error: 'Timesheet ID is required' }, { status: 400 });
      }

      // Check if timesheet exists
      const timesheets = await base44.asServiceRole.entities.TimesheetEntry.filter({ id });
      if (timesheets.length === 0) {
        return Response.json({ error: 'Timesheet not found' }, { status: 404 });
      }

      await base44.asServiceRole.entities.TimesheetEntry.delete(id);

      return Response.json({
        success: true,
        message: 'Timesheet deleted successfully'
      });
    }

    // PUT Approve Edit
    if (method === 'PUT' && action === 'approveEdit') {
      const id = url.searchParams.get('id');
      if (!id) {
        return Response.json({ error: 'Timesheet ID is required' }, { status: 400 });
      }

      const body = await req.json();
      const { approval_notes } = body;

      // Get timesheet
      const timesheets = await base44.asServiceRole.entities.TimesheetEntry.filter({ id });
      if (timesheets.length === 0) {
        return Response.json({ error: 'Timesheet not found' }, { status: 404 });
      }

      const updatedTimesheet = await base44.asServiceRole.entities.TimesheetEntry.update(id, {
        status: 'approved',
        approval_notes: approval_notes || 'Edit approved'
      });

      return Response.json({
        success: true,
        data: updatedTimesheet,
        message: 'Edit request approved'
      });
    }

    // PUT Reject Edit
    if (method === 'PUT' && action === 'rejectEdit') {
      const id = url.searchParams.get('id');
      if (!id) {
        return Response.json({ error: 'Timesheet ID is required' }, { status: 400 });
      }

      const body = await req.json();
      const { approval_notes } = body;

      // Get timesheet
      const timesheets = await base44.asServiceRole.entities.TimesheetEntry.filter({ id });
      if (timesheets.length === 0) {
        return Response.json({ error: 'Timesheet not found' }, { status: 404 });
      }

      const updatedTimesheet = await base44.asServiceRole.entities.TimesheetEntry.update(id, {
        status: 'rejected',
        approval_notes: approval_notes || 'Edit rejected'
      });

      return Response.json({
        success: true,
        data: updatedTimesheet,
        message: 'Edit request rejected'
      });
    }

    // GET Pending Edits
    if (method === 'GET' && action === 'getPendingEdits') {
      const timesheets = await base44.asServiceRole.entities.TimesheetEntry.filter({
        status: 'pending_approval'
      });

      return Response.json({
        success: true,
        data: timesheets,
        count: timesheets.length
      });
    }

    return Response.json({ error: 'Invalid action or endpoint not found' }, { status: 404 });

  } catch (error) {
    console.error('Time Tracker API Error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
});