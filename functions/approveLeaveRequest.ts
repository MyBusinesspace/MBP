import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verificar autenticación y permisos de admin
        const currentUser = await base44.auth.me();
        if (!currentUser || currentUser.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
        }

        const { leave_request_id, approval_notes } = await req.json();

        if (!leave_request_id) {
            return Response.json({ error: 'leave_request_id is required' }, { status: 400 });
        }

        // Obtener la solicitud de baja
        const leaveRequests = await base44.asServiceRole.entities.LeaveRequest.filter({ 
            id: leave_request_id 
        });

        if (!leaveRequests || leaveRequests.length === 0) {
            return Response.json({ error: 'Leave request not found' }, { status: 404 });
        }

        const leaveRequest = leaveRequests[0];

        if (leaveRequest.status !== 'pending') {
            return Response.json({ 
                error: 'Leave request has already been processed' 
            }, { status: 400 });
        }

        // Actualizar solicitud a aprobada
        await base44.asServiceRole.entities.LeaveRequest.update(leave_request_id, {
            status: 'approved',
            approver_id: currentUser.id,
            approval_date: new Date().toISOString(),
            approval_notes: approval_notes || ''
        });

        // Obtener información del empleado
        const employees = await base44.asServiceRole.entities.User.filter({ 
            id: leaveRequest.employee_id 
        });
        
        const employee = employees && employees.length > 0 ? employees[0] : null;
        const employeeName = employee ? 
            (employee.nickname || employee.full_name || employee.email) : 
            'Employee';

        // Determinar el tipo de evento de calendario
        let eventType = 'holiday';
        if (leaveRequest.request_type === 'sick_leave') {
            eventType = 'company_event';
        } else if (leaveRequest.request_type === 'day_off') {
            eventType = 'personal';
        }

        const startDate = new Date(leaveRequest.start_date);
        const endDate = new Date(leaveRequest.end_date);
        
        const createdEventIds = [];

        // ✅ CREAR DOS EVENTOS SEPARADOS para holidays
        if (leaveRequest.request_type === 'holiday') {
            // 1. Evento de INICIO de vacaciones
            const departureDateTime = new Date(startDate);
            departureDateTime.setHours(0, 0, 0, 0);
            const departureEndTime = new Date(startDate);
            departureEndTime.setHours(23, 59, 59, 999);

            const startEvent = await base44.asServiceRole.entities.CalendarEvent.create({
                title: `${employeeName} - Start Holidays`,
                description: `Leave Request: ${leaveRequest.reason}\n\nType: Vacation Start\nTotal Days: ${leaveRequest.total_days || 0}\nPayroll Impact: ${leaveRequest.payroll_impact || 'paid'}`,
                event_type: eventType,
                start_time: departureDateTime.toISOString(),
                end_time: departureEndTime.toISOString(),
                all_day: true,
                participant_user_ids: [leaveRequest.employee_id],
                color: 'blue',
                document_urls: leaveRequest.attachment_urls || [],
                document_titles: leaveRequest.attachment_urls ? 
                    leaveRequest.attachment_urls.map((_, i) => `Leave Request Attachment ${i + 1}`) : 
                    []
            });
            createdEventIds.push(startEvent.id);

            // 2. Evento de FIN de vacaciones
            const arrivalDateTime = new Date(endDate);
            arrivalDateTime.setHours(0, 0, 0, 0);
            const arrivalEndTime = new Date(endDate);
            arrivalEndTime.setHours(23, 59, 59, 999);

            const endEvent = await base44.asServiceRole.entities.CalendarEvent.create({
                title: `${employeeName} - Finish Holidays`,
                description: `Leave Request: ${leaveRequest.reason}\n\nType: Vacation End\nTotal Days: ${leaveRequest.total_days || 0}\nPayroll Impact: ${leaveRequest.payroll_impact || 'paid'}`,
                event_type: eventType,
                start_time: arrivalDateTime.toISOString(),
                end_time: arrivalEndTime.toISOString(),
                all_day: true,
                participant_user_ids: [leaveRequest.employee_id],
                color: 'blue',
                document_urls: leaveRequest.attachment_urls || [],
                document_titles: leaveRequest.attachment_urls ? 
                    leaveRequest.attachment_urls.map((_, i) => `Leave Request Attachment ${i + 1}`) : 
                    []
            });
            createdEventIds.push(endEvent.id);

        } else {
            // Para otros tipos de baja (sick_leave, day_off, etc.) crear un solo evento all-day que cubra todo el período
            const departureDateTime = new Date(startDate);
            departureDateTime.setHours(0, 0, 0, 0);
            const arrivalDateTime = new Date(endDate);
            arrivalDateTime.setHours(23, 59, 59, 999);

            const singleEvent = await base44.asServiceRole.entities.CalendarEvent.create({
                title: `${employeeName} - ${getTypeLabel(leaveRequest.request_type)}`,
                description: `Leave Request: ${leaveRequest.reason}\n\nType: ${getTypeLabel(leaveRequest.request_type)}\nDays: ${leaveRequest.total_days || 0}\nPayroll Impact: ${leaveRequest.payroll_impact || 'paid'}`,
                event_type: eventType,
                start_time: departureDateTime.toISOString(),
                end_time: arrivalDateTime.toISOString(),
                all_day: true,
                participant_user_ids: [leaveRequest.employee_id],
                color: getColorForType(leaveRequest.request_type),
                document_urls: leaveRequest.attachment_urls || [],
                document_titles: leaveRequest.attachment_urls ? 
                    leaveRequest.attachment_urls.map((_, i) => `Leave Request Attachment ${i + 1}`) : 
                    []
            });
            createdEventIds.push(singleEvent.id);
        }

        // Actualizar la solicitud con los IDs de los eventos de calendario (guardamos array de IDs)
        await base44.asServiceRole.entities.LeaveRequest.update(leave_request_id, {
            calendar_event_id: createdEventIds.join(',') // Guardamos como string separado por comas
        });

        // Actualizar el balance de días del usuario si es necesario
        if (employee && leaveRequest.payroll_impact === 'deduct_from_vacation') {
            const vacationDaysTaken = (employee.vacation_days_taken || 0) + (leaveRequest.total_days || 0);
            await base44.asServiceRole.entities.User.update(employee.id, {
                vacation_days_taken: vacationDaysTaken
            });
        }

        return Response.json({
            success: true,
            message: `Leave request approved and ${createdEventIds.length} calendar event(s) created`,
            leave_request: leaveRequest,
            calendar_event_ids: createdEventIds
        });

    } catch (error) {
        console.error('❌ Error approving leave request:', error);
        return Response.json({ 
            error: 'Failed to approve leave request',
            details: error.message 
        }, { status: 500 });
    }
});

// Helper functions
function getTypeLabel(type) {
    const labels = {
        sick_leave: 'Sick Leave',
        unjustified_leave: 'Unjustified Leave',
        holiday: 'Vacation',
        day_off: 'Day Off',
        personal_leave: 'Personal Leave',
        other: 'Other'
    };
    return labels[type] || type;
}

function getColorForType(type) {
    const colors = {
        sick_leave: 'red',
        unjustified_leave: 'gray',
        holiday: 'blue',
        day_off: 'green',
        personal_leave: 'purple',
        other: 'orange'
    };
    return colors[type] || 'blue';
}