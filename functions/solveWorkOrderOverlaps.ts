import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { overlapping_work_orders, teams } = await req.json();

        if (!overlapping_work_orders || !Array.isArray(overlapping_work_orders) || overlapping_work_orders.length === 0) {
            return Response.json({ error: 'No work orders provided' }, { status: 400 });
        }

        // Group work orders by team AND employee to detect all overlaps
        const entityGroups = new Map();
        
        overlapping_work_orders.forEach(wo => {
            const teamIds = wo.team_ids || [];
            const employeeIds = wo.employee_ids || [];
            
            // Add to team groups
            teamIds.forEach(teamId => {
                const key = `team-${teamId}`;
                if (!entityGroups.has(key)) {
                    entityGroups.set(key, []);
                }
                entityGroups.get(key).push(wo);
            });
            
            // Add to employee groups
            employeeIds.forEach(empId => {
                const key = `user-${empId}`;
                if (!entityGroups.has(key)) {
                    entityGroups.set(key, []);
                }
                entityGroups.get(key).push(wo);
            });
        });

        console.log('📊 Entity groups found:', entityGroups.size);

        // Resolve overlaps by creating tightly-packed sequential timelines
        const updates = [];
        
        entityGroups.forEach((wos, entityKey) => {
            if (wos.length <= 1) return;
            
            // Remove duplicates
            const uniqueWOs = Array.from(new Map(wos.map(wo => [wo.id, wo])).values());
            
            // Sort by work order number to maintain sequence
            uniqueWOs.sort((a, b) => {
                const numA = parseInt(a.work_order_number.replace(/\D/g, '')) || 0;
                const numB = parseInt(b.work_order_number.replace(/\D/g, '')) || 0;
                return numA - numB;
            });
            
            console.log(`🔧 Processing ${entityKey}: ${uniqueWOs.length} work orders`);
            
            // Group by day
            const wosByDay = new Map();
            uniqueWOs.forEach(wo => {
                const startDate = new Date(wo.planned_start_time);
                const dayKey = startDate.toDateString();
                
                if (!wosByDay.has(dayKey)) {
                    wosByDay.set(dayKey, []);
                }
                wosByDay.get(dayKey).push(wo);
            });
            
            // Process each day
            wosByDay.forEach((dayWOs, dayKey) => {
                if (dayWOs.length <= 1) return;
                
                console.log(`📅 Processing ${dayKey}: ${dayWOs.length} work orders`);
                
                // Calculate total duration
                let totalDuration = 0;
                dayWOs.forEach(wo => {
                    const start = new Date(wo.planned_start_time);
                    const end = new Date(wo.planned_end_time || start);
                    totalDuration += (end - start);
                });
                
                // Find earliest start time
                const earliestStart = new Date(Math.min(...dayWOs.map(wo => new Date(wo.planned_start_time).getTime())));
                
                console.log(`  ⏰ Earliest start: ${earliestStart.toISOString()}`);
                console.log(`  ⏱️ Total duration: ${totalDuration / (1000 * 60)} minutes`);
                
                // Reorganize WOs tightly packed from earliest start
                let currentTime = new Date(earliestStart);
                
                dayWOs.forEach((wo, index) => {
                    const originalStart = new Date(wo.planned_start_time);
                    const originalEnd = new Date(wo.planned_end_time || originalStart);
                    const duration = originalEnd - originalStart;
                    
                    const newStart = new Date(currentTime);
                    const newEnd = new Date(currentTime.getTime() + duration);
                    
                    console.log(`  🔄 ${wo.work_order_number}: ${newStart.toISOString()} → ${newEnd.toISOString()}`);
                    
                    updates.push({
                        work_order_id: wo.id,
                        new_start_time: newStart.toISOString(),
                        new_end_time: newEnd.toISOString(),
                        reasoning: `Reorganized to position ${index + 1}/${dayWOs.length} in tightly-packed sequence`
                    });
                    
                    // Next WO starts exactly when this one ends
                    currentTime = newEnd;
                });
            });
        });

        console.log(`✅ Generated ${updates.length} updates`);
        const summary = `Resolved ${updates.length} work order(s) by creating tightly-packed sequential timeline`;

        console.log('✅ Timeline-based resolution complete. Updates:', updates.length);

        // Aplicar las actualizaciones
        const userName = user.nickname || user.first_name || user.full_name || user.email || 'Unknown';
        const updatedWorkOrders = [];

        for (const update of updates) {
            try {
                const woId = update.work_order_id;
                const originalWO = overlapping_work_orders.find(w => w.id === woId);
                
                if (!originalWO) {
                    console.warn(`⚠️ Work order ${woId} not found, skipping`);
                    continue;
                }

                const activity_log = [...(originalWO.activity_log || [])];
                activity_log.push({
                    timestamp: new Date().toISOString(),
                    action: 'Edited',
                    user_email: user.email,
                    user_name: userName,
                    details: `Times adjusted by AI to resolve overlap. ${update.reasoning || ''}`
                });

                await base44.asServiceRole.entities.TimeEntry.update(woId, {
                    planned_start_time: update.new_start_time,
                    planned_end_time: update.new_end_time,
                    updated_by: user.email,
                    activity_log
                });

                updatedWorkOrders.push({
                    id: woId,
                    work_order_number: originalWO.work_order_number,
                    new_start: update.new_start_time,
                    new_end: update.new_end_time
                });
            } catch (error) {
                console.error(`❌ Failed to update work order ${update.work_order_id}:`, error);
            }
        }

        return Response.json({
            success: true,
            updated_count: updatedWorkOrders.length,
            summary: summary,
            updated_work_orders: updatedWorkOrders
        });

    } catch (error) {
        console.error('❌ Error solving overlaps:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});