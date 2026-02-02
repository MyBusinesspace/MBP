import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { addDays, addWeeks, addMonths, addYears, format, parseISO } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        const {
            baseWorkOrder,
            recurrence_type,
            recurrence_interval = 1,
            recurrence_end_date,
            skip_weekends = false,
            branch_id
        } = payload;

        if (!baseWorkOrder || !recurrence_type || !recurrence_end_date) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const userName = user.nickname || user.first_name || user.full_name || user.email || 'Unknown';
        const startDate = parseISO(baseWorkOrder.planned_start_time);
        const endDate = baseWorkOrder.planned_end_time ? parseISO(baseWorkOrder.planned_end_time) : null;
        const recurrenceEndDate = parseISO(recurrence_end_date);

        // Calculate duration in hours
        let durationHours = 1;
        if (endDate) {
            durationHours = (endDate - startDate) / (1000 * 60 * 60);
        }

        // Generate all occurrences
        const occurrences = [];
        let currentDate = new Date(startDate);
        let iterationCount = 0;
        const maxIterations = 365;

        while (currentDate <= recurrenceEndDate && iterationCount < maxIterations) {
            const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
            let effectiveDate = new Date(currentDate);
            let movedFromSunday = false;

            if (skip_weekends) {
                if (dayOfWeek === 0) { // Sunday -> move to Saturday
                    effectiveDate.setDate(effectiveDate.getDate() - 1);
                    movedFromSunday = true;
                } else if (dayOfWeek === 6) { // Saturday -> skip
                    // Advance to next occurrence
                    if (recurrence_type === 'daily') {
                        currentDate = addDays(currentDate, recurrence_interval);
                    } else if (recurrence_type === 'weekly') {
                        currentDate = addWeeks(currentDate, recurrence_interval);
                    } else if (recurrence_type === 'monthly') {
                        currentDate = addMonths(currentDate, recurrence_interval);
                    } else if (recurrence_type === 'yearly') {
                        currentDate = addYears(currentDate, recurrence_interval);
                    } else {
                        currentDate = addDays(currentDate, 1);
                    }
                    iterationCount++;
                    continue;
                }
            }

            // Create occurrence times
            const newStartTime = new Date(effectiveDate);
            newStartTime.setHours(startDate.getHours(), startDate.getMinutes(), 0, 0);

            const newEndTime = new Date(effectiveDate);
            newEndTime.setHours(startDate.getHours() + durationHours, startDate.getMinutes(), 0, 0);

            occurrences.push({
                planned_start_time: newStartTime.toISOString(),
                planned_end_time: newEndTime.toISOString(),
                moved_from_sunday: movedFromSunday
            });

            // Advance to next occurrence
            if (recurrence_type === 'daily') {
                currentDate = addDays(currentDate, recurrence_interval);
            } else if (recurrence_type === 'weekly') {
                currentDate = addWeeks(currentDate, recurrence_interval);
            } else if (recurrence_type === 'monthly') {
                currentDate = addMonths(currentDate, recurrence_interval);
            } else if (recurrence_type === 'yearly') {
                currentDate = addYears(currentDate, recurrence_interval);
            } else {
                currentDate = addDays(currentDate, 1);
            }

            iterationCount++;
        }

        // Get next work order number
        const getNextWorkOrderNumber = async () => {
            try {
                const allEntries = await base44.entities.TimeEntry.list('-created_date', 1);
                if (!allEntries || allEntries.length === 0) return 'N1';
                const lastEntry = allEntries[0];
                if (!lastEntry.work_order_number) return 'N1';
                const match = lastEntry.work_order_number.match(/N(\d+)/);
                if (match) {
                    const lastNumber = parseInt(match[1], 10);
                    return `N${lastNumber + 1}`;
                }
                return 'N1';
            } catch {
                return `N${Date.now()}`;
            }
        };

        // Create work orders
        const createdWorkOrders = [];
        let lastWorkOrderNumber = null;

        for (const occurrence of occurrences) {
            // Get next number
            let activityDetails = `Working report created (recurring).`;
            if (occurrence.moved_from_sunday) {
                activityDetails += ` Moved from Sunday to Saturday.`;
            }

            const activity_log = [{
                timestamp: new Date().toISOString(),
                action: 'Created',
                user_email: user.email || 'unknown',
                user_name: userName,
                details: activityDetails
            }];

            // Build new work order
            const {
                id,
                is_repeating,
                recurrence_type: rt,
                recurrence_end_date: red,
                recurrence_interval: ri,
                skip_weekends: sw,
                created_date,
                updated_date,
                created_by,
                ...woData
            } = baseWorkOrder;

            const newWO = {
                ...woData,
                planned_start_time: occurrence.planned_start_time,
                planned_end_time: occurrence.planned_end_time,
                moved_from_sunday: occurrence.moved_from_sunday || false,
                branch_id: branch_id || woData.branch_id,
                updated_by: user.email || 'unknown',
                activity_log
            };

            try {
                const created = await base44.entities.TimeEntry.create(newWO);

                // Sync teams
                try {
                    await base44.functions.invoke('syncWorkOrderTeams', {
                        work_order_id: created.id
                    });
                } catch {
                    // Silently fail team sync
                }

                createdWorkOrders.push({
                    id: created.id,
                    date: format(parseISO(occurrence.planned_start_time), 'yyyy-MM-dd'),
                    moved_from_sunday: occurrence.moved_from_sunday
                });
            } catch (error) {
                // Continue with next occurrence
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return Response.json({
            success: true,
            total_created: createdWorkOrders.length,
            total_occurrences: occurrences.length,
            work_orders: createdWorkOrders
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});