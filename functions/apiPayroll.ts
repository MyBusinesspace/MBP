import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Payroll API Handler
 * 
 * Authentication: Uses x-user-id header instead of Base44 SDK auth
 * 
 * Endpoints (use 'action' parameter):
 * 
 * PayrollRun:
 * - GET ?action=list_payroll_runs
 * - GET ?action=get_payroll_run&id=xxx
 * - POST ?action=create_payroll_run
 * - PUT ?action=update_payroll_run&id=xxx
 * - DELETE ?action=delete_payroll_run&id=xxx
 * 
 * PayStub:
 * - GET ?action=list_pay_stubs&employee_id=xxx (optional)
 * - GET ?action=get_pay_stub&id=xxx
 * - POST ?action=create_pay_stub
 * - PUT ?action=update_pay_stub&id=xxx
 * - DELETE ?action=delete_pay_stub&id=xxx
 * 
 * EmployeePayrollProfile:
 * - GET ?action=list_payroll_profiles
 * - GET ?action=get_payroll_profile&employee_id=xxx
 * - POST ?action=create_payroll_profile
 * - PUT ?action=update_payroll_profile&id=xxx
 * - DELETE ?action=delete_payroll_profile&id=xxx
 *  
 * LeaveRequest:
 * - GET ?action=list_leave_requests&employee_id=xxx (optional)
 * - GET ?action=get_leave_request&id=xxx
 * - POST ?action=create_leave_request
 * - PUT ?action=update_leave_request&id=xxx
 * - DELETE ?action=delete_leave_request&id=xxx
 * - POST ?action=approve_leave_request&id=xxx
 * - POST ?action=reject_leave_request&id=xxx
 * 
 * PayItemType:
 * - GET ?action=list_pay_item_types
 * - GET ?action=get_pay_item_type&id=xxx
 * - POST ?action=create_pay_item_type
 * - PUT ?action=update_pay_item_type&id=xxx
 * - DELETE ?action=delete_pay_item_type&id=xxx
 * 
 * PayItem:
 * - GET ?action=list_pay_items
 * - GET ?action=get_pay_item&id=xxx
 * - POST ?action=create_pay_item
 * - PUT ?action=update_pay_item&id=xxx
 * - DELETE ?action=delete_pay_item&id=xxx
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const method = req.method;
    const action = url.searchParams.get('action');

    // Get user ID from header instead of Base44 SDK auth
    const userId = req.headers.get('x-user-id');
    
    if (!userId) {
      return Response.json({ 
        success: false,
        error: 'Missing x-user-id header' 
      }, { status: 401 });
    }

    // Verify user exists and get user data
    const users = await base44.asServiceRole.entities.User.filter({ id: userId });
    const currentUser = users[0];

    if (!currentUser) {
      return Response.json({ 
        success: false,
        error: 'Invalid user ID' 
      }, { status: 401 });
    }

    const isAdmin = currentUser.role === 'admin';

    if (!action) {
      return Response.json({ 
        success: false,
        error: 'Missing action parameter' 
      }, { status: 400 });
    }

    // ==================== PAYROLL RUN OPERATIONS ====================
    
    if (action === 'list_payroll_runs') {
      if (!isAdmin) {
        return Response.json({ success: false, error: 'Admin access required' }, { status: 403 });
      }

      const runs = await base44.asServiceRole.entities.PayrollRun.list('-created_date', 1000);
      return Response.json({ success: true, data: runs });
    }

    if (action === 'get_payroll_run') {
      if (!isAdmin) {
        return Response.json({ success: false, error: 'Admin access required' }, { status: 403 });
      }

      const id = url.searchParams.get('id');
      if (!id) {
        return Response.json({ success: false, error: 'Missing id parameter' }, { status: 400 });
      }

      const runs = await base44.asServiceRole.entities.PayrollRun.filter({ id });
      if (runs.length === 0) {
        return Response.json({ success: false, error: 'Payroll run not found' }, { status: 404 });
      }

      return Response.json({ success: true, data: runs[0] });
    }

    if (action === 'create_payroll_run') {
      if (!isAdmin) {
        return Response.json({ success: false, error: 'Admin access required' }, { status: 403 });
      }

      const body = await req.json();
      const newRun = await base44.asServiceRole.entities.PayrollRun.create(body);
      return Response.json({ success: true, data: newRun }, { status: 201 });
    }

    if (action === 'update_payroll_run') {
      if (!isAdmin) {
        return Response.json({ success: false, error: 'Admin access required' }, { status: 403 });
      }

      const id = url.searchParams.get('id');
      if (!id) {
        return Response.json({ success: false, error: 'Missing id parameter' }, { status: 400 });
      }

      const body = await req.json();
      const updated = await base44.asServiceRole.entities.PayrollRun.update(id, body);
      return Response.json({ success: true, data: updated });
    }

    if (action === 'delete_payroll_run') {
      if (!isAdmin) {
        return Response.json({ success: false, error: 'Admin access required' }, { status: 403 });
      }

      const id = url.searchParams.get('id');
      if (!id) {
        return Response.json({ success: false, error: 'Missing id parameter' }, { status: 400 });
      }

      await base44.asServiceRole.entities.PayrollRun.delete(id);
      return Response.json({ success: true, message: 'Payroll run deleted' });
    }

    // ==================== PAY STUB OPERATIONS ====================

    // if (action === 'list_pay_stubs') {
    //   const employeeId = url.searchParams.get('employee_id');
      
    //   // Users can only see their own pay stubs
    //   if (!isAdmin && employeeId !== userId) {
    //     return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
    //   }

    //   let filters = {};
    //   if (employeeId) {
    //     filters.employee_id = employeeId;
    //   }

    //   const stubs = await base44.asServiceRole.entities.PayStub.filter(filters);
    //   const sorted = stubs.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      
    //   return Response.json({ success: true, data: sorted });
    // }

    // if (action === 'get_pay_stub') {
    //   const id = url.searchParams.get('id');
    //   if (!id) {
    //     return Response.json({ success: false, error: 'Missing id parameter' }, { status: 400 });
    //   }

    //   const stubs = await base44.asServiceRole.entities.PayStub.filter({ id });
    //   if (stubs.length === 0) {
    //     return Response.json({ success: false, error: 'Pay stub not found' }, { status: 404 });
    //   }

    //   const stub = stubs[0];
      
    //   // Users can only view their own pay stubs
    //   if (!isAdmin && stub.employee_id !== userId) {
    //     return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
    //   }

      // return Response.json({ success: true, data: stub });
    // }

if (action === 'list_pay_stubs') {
  const employeeId = url.searchParams.get('employee_id');

  // Users can only see their own pay stubs
  if (!isAdmin && employeeId !== userId) {
    return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  let filters = {};
  if (employeeId) {
    filters.employee_id = employeeId;
  }

  const stubs = await base44.asServiceRole.entities.PayStub.filter(filters);

  // 🟣 جلب المستخدمين المرتبطين بالـ stubs
  const employeeIds = [...new Set(stubs.map(s => s.employee_id))];
  const employees = await base44.asServiceRole.entities.User.filter({ id: { $in: employeeIds } });

  // 🗺️ خريطة ID → اسم
  const employeeMap = {};
  employees.forEach(emp => {
    employeeMap[emp.id] = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
  });

  // 🔄 إضافة الاسم داخل كل stub
  const enriched = stubs.map(s => ({
    ...s,
    employee_name: employeeMap[s.employee_id] || 'Unknown'
  }));

  const sorted = enriched.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  return Response.json({ success: true, data: sorted });
}

if (action === 'get_pay_stub') {
  const id = url.searchParams.get('id');
  if (!id) {
    return Response.json({ success: false, error: 'Missing id parameter' }, { status: 400 });
  }

  const stubs = await base44.asServiceRole.entities.PayStub.filter({ id });
  if (stubs.length === 0) {
    return Response.json({ success: false, error: 'Pay stub not found' }, { status: 404 });
  }

  const stub = stubs[0];

  // Users can only view their own pay stubs
  if (!isAdmin && stub.employee_id !== userId) {
    return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  // 🟣 جلب بيانات الموظف
  const employees = await base44.asServiceRole.entities.User.filter({ id: stub.employee_id });
  const employee = employees.length ? employees[0] : null;

  const result = {
    ...stub,
    employee_name: employee ? `${employee.first_name || ''} ${employee.last_name || ''}`.trim() : 'Unknown'
  };

  return Response.json({ success: true, data: result });
}

    if (action === 'create_pay_stub') {
      if (!isAdmin) {
        return Response.json({ success: false, error: 'Admin access required' }, { status: 403 });
      }

      const body = await req.json();
      const newStub = await base44.asServiceRole.entities.PayStub.create(body);
      return Response.json({ success: true, data: newStub }, { status: 201 });
    }

    if (action === 'update_pay_stub') {
      if (!isAdmin) {
        return Response.json({ success: false, error: 'Admin access required' }, { status: 403 });
      }

      const id = url.searchParams.get('id');
      if (!id) {
        return Response.json({ success: false, error: 'Missing id parameter' }, { status: 400 });
      }

      const body = await req.json();
      const updated = await base44.asServiceRole.entities.PayStub.update(id, body);
      return Response.json({ success: true, data: updated });
    }

    if (action === 'delete_pay_stub') {
      if (!isAdmin) {
        return Response.json({ success: false, error: 'Admin access required' }, { status: 403 });
      }

      const id = url.searchParams.get('id');
      if (!id) {
        return Response.json({ success: false, error: 'Missing id parameter' }, { status: 400 });
      }

      await base44.asServiceRole.entities.PayStub.delete(id);
      return Response.json({ success: true, message: 'Pay stub deleted' });
    }

    // ==================== EMPLOYEE PAYROLL PROFILE OPERATIONS ====================

    if (action === 'list_payroll_profiles') {
      if (!isAdmin) {
        return Response.json({ success: false, error: 'Admin access required' }, { status: 403 });
      }

      const profiles = await base44.asServiceRole.entities.EmployeePayrollProfile.list('-created_date', 1000);
      return Response.json({ success: true, data: profiles });
    }

    if (action === 'get_payroll_profile') {
      const employeeId = url.searchParams.get('employee_id');
      if (!employeeId) {
        return Response.json({ success: false, error: 'Missing employee_id parameter' }, { status: 400 });
      }

      if (!isAdmin) {
        return Response.json({ success: false, error: 'Admin access required' }, { status: 403 });
      }

      const profiles = await base44.asServiceRole.entities.EmployeePayrollProfile.filter({ employee_id: employeeId });
      
      return Response.json({ 
        success: true, 
        data: profiles[0] || null,
        exists: profiles.length > 0 
      });
    }

    if (action === 'create_payroll_profile') {
      if (!isAdmin) {
        return Response.json({ success: false, error: 'Admin access required' }, { status: 403 });
      }

      const body = await req.json();
      const newProfile = await base44.asServiceRole.entities.EmployeePayrollProfile.create(body);
      return Response.json({ success: true, data: newProfile }, { status: 201 });
    }

    if (action === 'update_payroll_profile') {
      if (!isAdmin) {
        return Response.json({ success: false, error: 'Admin access required' }, { status: 403 });
      }

      const id = url.searchParams.get('id');
      if (!id) {
        return Response.json({ success: false, error: 'Missing id parameter' }, { status: 400 });
      }

      const body = await req.json();
      const updated = await base44.asServiceRole.entities.EmployeePayrollProfile.update(id, body);
      return Response.json({ success: true, data: updated });
    }

    if (action === 'delete_payroll_profile') {
      if (!isAdmin) {
        return Response.json({ success: false, error: 'Admin access required' }, { status: 403 });
      }

      const id = url.searchParams.get('id');
      if (!id) {
        return Response.json({ success: false, error: 'Missing id parameter' }, { status: 400 });
      }

      await base44.asServiceRole.entities.EmployeePayrollProfile.delete(id);
      return Response.json({ success: true, message: 'Payroll profile deleted' });
    }

    // ==================== LEAVE REQUEST OPERATIONS ====================

    // if (action === 'list_leave_requests') {
    //   const employeeId = url.searchParams.get('employee_id');
      
    //   let filters = {};
    //   if (employeeId) {
    //     // Users can only see their own leave requests
    //     if (!isAdmin && employeeId !== userId) {
    //       return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
    //     }
    //     filters.employee_id = employeeId;
    //   } else if (!isAdmin) {
    //     // Non-admin users can only see their own requests
    //     filters.employee_id = userId;
    //   }

    //   const requests = await base44.asServiceRole.entities.LeaveRequest.filter(filters);
    //   const sorted = requests.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      
    //   return Response.json({ success: true, data: sorted });
    // }

    // if (action === 'get_leave_request') {
    //   const id = url.searchParams.get('id');
    //   if (!id) {
    //     return Response.json({ success: false, error: 'Missing id parameter' }, { status: 400 });
    //   }

    //   const requests = await base44.asServiceRole.entities.LeaveRequest.filter({ id });
    //   if (requests.length === 0) {
    //     return Response.json({ success: false, error: 'Leave request not found' }, { status: 404 });
    //   }

    //   const request = requests[0];
      
    //   // Users can only view their own leave requests
    //   if (!isAdmin && request.employee_id !== userId) {
    //     return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
    //   }

    //   return Response.json({ success: true, data: request });
    // }

// if (action === 'get_leave_request') {
//   const id = url.searchParams.get('id');
//   if (!id) {
//     return Response.json({ success: false, error: 'Missing id parameter' }, { status: 400 });
//   }

//   const requests = await base44.asServiceRole.entities.LeaveRequest.filter({ id });
//   if (requests.length === 0) {
//     return Response.json({ success: false, error: 'Leave request not found' }, { status: 404 });
//   }

//   const request = requests[0];

//   if (!isAdmin && request.employee_id !== userId) {
//     return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
//   }

//   // 🔹 جلب اسم الموظف
//   let employeeName = "Unknown";
//   try {
//     const employee = await base44.asServiceRole.entities.Employee.get(request.employee_id);
//     if (employee && employee.name) {
//       employeeName = employee.name;
//     }
//   } catch {}

//   request.employee_name = employeeName;

//   return Response.json({ success: true, data: request });
// }


if (action === 'list_leave_requests') {
  const employeeId = url.searchParams.get('employee_id');

  // 👈 تعريف الفلتر بشكل صحيح
  const filters = {};

  if (employeeId) {
    if (!isAdmin && employeeId !== userId) {
      return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    filters.employee_id = employeeId;
  } else if (!isAdmin) {
    filters.employee_id = userId;
  }

  const requests = await base44.asServiceRole.entities.LeaveRequest.filter(filters);

  // 🟢 جمع جميع employee_id ثم جلب بيانات الموظفين
  const employeeIds = [...new Set(requests.map(r => r.employee_id))];
  const employees = await base44.asServiceRole.entities.User.filter({ id: employeeIds });

  // 🗺️ خريطة لربط employee_id باسم الموظف
const employeeMap = {};
employees.forEach(emp => {
  const first = emp.first_name || "";
  const last = emp.last_name || "";
  const fullName = `${first} ${last}`.trim(); // إزالة الفراغ في حال أحدهم غير موجود
  employeeMap[emp.id] = fullName !== "" ? fullName : emp.email || "Unknown";
});

  const result = requests
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .map(r => ({
      ...r,
      employee_name: employeeMap[r.employee_id] || "Unknown"
    }));

  return Response.json({ success: true, data: result });
}
        

    if (action === 'create_leave_request') {
      const body = await req.json(); 
      
      // Users can only create leave requests for themselves
      if (!isAdmin && body.employee_id && body.employee_id !== userId) {
        return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }

      // Set employee_id to current user if not provided
      if (!body.employee_id) {
        body.employee_id = userId;
      }

      const newRequest = await base44.asServiceRole.entities.LeaveRequest.create(body);
      return Response.json({ success: true, data: newRequest }, { status: 201 });
    }

    if (action === 'update_leave_request') {
      const id = url.searchParams.get('id');
      if (!id) {
        return Response.json({ success: false, error: 'Missing id parameter' }, { status: 400 });
      }

      const requests = await base44.asServiceRole.entities.LeaveRequest.filter({ id });
      if (requests.length === 0) {
        return Response.json({ success: false, error: 'Leave request not found' }, { status: 404 });
      }

      const request = requests[0];
      
      // Users can only update their own pending requests
      if (!isAdmin) {
        if (request.employee_id !== userId) {
          return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }
        if (request.status !== 'pending') {
          return Response.json({ success: false, error: 'Cannot update non-pending requests' }, { status: 403 });
        }
      }

      const body = await req.json();
      const updated = await base44.asServiceRole.entities.LeaveRequest.update(id, body);
      return Response.json({ success: true, data: updated });
    }

    if (action === 'delete_leave_request') {
      const id = url.searchParams.get('id');
      if (!id) {
        return Response.json({ success: false, error: 'Missing id parameter' }, { status: 400 });
      }

      const requests = await base44.asServiceRole.entities.LeaveRequest.filter({ id });
      if (requests.length === 0) {
        return Response.json({ success: false, error: 'Leave request not found' }, { status: 404 });
      }

      const request = requests[0];
      
      // Users can only delete their own pending requests
      if (!isAdmin) {
        if (request.employee_id !== userId) {
          return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }
        if (request.status !== 'pending') {
          return Response.json({ success: false, error: 'Cannot delete non-pending requests' }, { status: 403 });
        }
      }

      await base44.asServiceRole.entities.LeaveRequest.delete(id);
      return Response.json({ success: true, message: 'Leave request deleted' });
    }

    if (action === 'approve_leave_request') {
      if (!isAdmin) {
        return Response.json({ success: false, error: 'Admin access required' }, { status: 403 });
      }

      const id = url.searchParams.get('id');
      if (!id) {
        return Response.json({ success: false, error: 'Missing id parameter' }, { status: 400 });
      }

      const body = await req.json();
      const { approval_notes } = body;

      // Call the existing approveLeaveRequest function
      const approveResponse = await base44.functions.invoke('approveLeaveRequest', {
        leave_request_id: id,
        approval_notes: approval_notes || ''
      });

      return Response.json({ 
        success: true, 
        data: approveResponse.data,
        message: 'Leave request approved and calendar events created'
      });
    }
 if (action === 'reject_leave_request') {
      if (!isAdmin) {
        return Response.json({ success: false, error: 'Admin access required' }, { status: 403 });
      }

       const id = url.searchParams.get('id');
  if (!id) {
    return Response.json({ success: false, error: 'Missing id parameter' }, { status: 400 });
  }

  // 👇 استقبال Body بشكل آمن بدون TypeScript
  let body = {};
  try {
    body = await req.json();
  } catch (e) {
    body = {}; // إذا لم يتم إرسال JSON لا مشكلة
  }

  const approval_notes = body.approval_notes;
 if (!approval_notes) {
        return Response.json({ success: false, error: 'approval_notes required for rejection' }, { status: 400 });
      }

  const requests = await base44.asServiceRole.entities.LeaveRequest.filter({ id });
  if (requests.length === 0) {
    return Response.json({ success: false, error: 'Leave request not found' }, { status: 404 });
  }

  const updated = await base44.asServiceRole.entities.LeaveRequest.update(id, {
    status: 'rejected',
    approval_notes: approval_notes,
    approved_by: userId,
    approved_date: new Date().toISOString()
  });

  return Response.json({
    success: true,
    data: updated,
    message: 'Leave request rejected'
  });

    }

    // ==================== PAY ITEM TYPE OPERATIONS ====================

    if (action === 'list_pay_item_types') {
      if (!isAdmin) {
        return Response.json({ success: false, error: 'Admin access required' }, { status: 403 });
      }

      const types = await base44.asServiceRole.entities.PayItemType.list('sort_order', 1000);
      return Response.json({ success: true, data: types });
    }

    if (action === 'get_pay_item_type') {
      if (!isAdmin) {
        return Response.json({ success: false, error: 'Admin access required' }, { status: 403 });
      }

      const id = url.searchParams.get('id');
      if (!id) {
        return Response.json({ success: false, error: 'Missing id parameter' }, { status: 400 });
      }

      const types = await base44.asServiceRole.entities.PayItemType.filter({ id });
      if (types.length === 0) {
        return Response.json({ success: false, error: 'Pay item type not found' }, { status: 404 });
      }

      return Response.json({ success: true, data: types[0] });
    }

    if (action === 'create_pay_item_type') {
      if (!isAdmin) {
        return Response.json({ success: false, error: 'Admin access required' }, { status: 403 });
      }

      const body = await req.json();
      const newType = await base44.asServiceRole.entities.PayItemType.create(body);
      return Response.json({ success: true, data: newType }, { status: 201 });
    }

    if (action === 'update_pay_item_type') {
      if (!isAdmin) {
        return Response.json({ success: false, error: 'Admin access required' }, { status: 403 });
      }

      const id = url.searchParams.get('id');
      if (!id) {
        return Response.json({ success: false, error: 'Missing id parameter' }, { status: 400 });
      }

      const body = await req.json();
      const updated = await base44.asServiceRole.entities.PayItemType.update(id, body);
      return Response.json({ success: true, data: updated });
    }

    if (action === 'delete_pay_item_type') {
      if (!isAdmin) {
        return Response.json({ success: false, error: 'Admin access required' }, { status: 403 });
      }

      const id = url.searchParams.get('id');
      if (!id) {
        return Response.json({ success: false, error: 'Missing id parameter' }, { status: 400 });
      }

      await base44.asServiceRole.entities.PayItemType.delete(id);
      return Response.json({ success: true, message: 'Pay item type deleted' });
    }

    // ==================== PAY ITEM OPERATIONS ====================

    if (action === 'list_pay_items') {
      if (!isAdmin) {
        return Response.json({ success: false, error: 'Admin access required' }, { status: 403 });
      }

      const items = await base44.asServiceRole.entities.PayItem.list('sort_order', 1000);
      return Response.json({ success: true, data: items });
    }

    if (action === 'get_pay_item') {
      if (!isAdmin) {
        return Response.json({ success: false, error: 'Admin access required' }, { status: 403 });
      }

      const id = url.searchParams.get('id');
      if (!id) {
        return Response.json({ success: false, error: 'Missing id parameter' }, { status: 400 });
      }

      const items = await base44.asServiceRole.entities.PayItem.filter({ id });
      if (items.length === 0) {
        return Response.json({ success: false, error: 'Pay item not found' }, { status: 404 });
      }

      return Response.json({ success: true, data: items[0] });
    }

    if (action === 'create_pay_item') {
      if (!isAdmin) {
        return Response.json({ success: false, error: 'Admin access required' }, { status: 403 });
      }

      const body = await req.json();
      const newItem = await base44.asServiceRole.entities.PayItem.create(body);
      return Response.json({ success: true, data: newItem }, { status: 201 });
    }

    if (action === 'update_pay_item') {
      if (!isAdmin) {
        return Response.json({ success: false, error: 'Admin access required' }, { status: 403 });
      }

      const id = url.searchParams.get('id');
      if (!id) {
        return Response.json({ success: false, error: 'Missing id parameter' }, { status: 400 });
      }

      const body = await req.json();
      const updated = await base44.asServiceRole.entities.PayItem.update(id, body);
      return Response.json({ success: true, data: updated });
    }

    if (action === 'delete_pay_item') {
      if (!isAdmin) {
        return Response.json({ success: false, error: 'Admin access required' }, { status: 403 });
      }

      const id = url.searchParams.get('id');
      if (!id) {
        return Response.json({ success: false, error: 'Missing id parameter' }, { status: 400 });
      }

      await base44.asServiceRole.entities.PayItem.delete(id);
      return Response.json({ success: true, message: 'Pay item deleted' });
    }

    // Unknown action
    return Response.json({ 
      success: false,
      error: `Unknown action: ${action}` 
    }, { status: 400 });

  } catch (error) {
    console.error('Payroll API Error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
});