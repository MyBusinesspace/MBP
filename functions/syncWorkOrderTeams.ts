import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Synchronizes team_ids with employee_ids for work orders.
 * Ensures that team_ids always reflects the current teams of assigned employees.
 * 
 * Usage from frontend:
 * ```javascript
 * import { syncWorkOrderTeams } from "@/functions/syncWorkOrderTeams";
 * await syncWorkOrderTeams({ work_order_id: "xxx" });
 * ```
 * 
 * Or to sync all work orders:
 * ```javascript
 * await syncWorkOrderTeams({ sync_all: true });
 * ```
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { work_order_id, sync_all = false } = body;

    console.log('🔄 [SYNC TEAMS] Starting sync...', { work_order_id, sync_all });

    let workOrders = [];

    if (sync_all) {
      // Sync all work orders (admin only)
      if (user.role !== 'admin') {
        return Response.json({ error: 'Admin access required for sync_all' }, { status: 403 });
      }
      
      console.log('📋 [SYNC TEAMS] Syncing ALL work orders...');
      workOrders = await base44.asServiceRole.entities.TimeEntry.list('-updated_date', 10000);
      console.log(`📋 [SYNC TEAMS] Found ${workOrders.length} work orders to sync`);
    } else if (work_order_id) {
      // Sync single work order
      const wo = await base44.entities.TimeEntry.filter({ id: work_order_id });
      if (!wo || wo.length === 0) {
        return Response.json({ error: 'Work order not found' }, { status: 404 });
      }
      workOrders = wo;
      console.log('📋 [SYNC TEAMS] Syncing single work order:', work_order_id);
    } else {
      return Response.json({ error: 'work_order_id or sync_all required' }, { status: 400 });
    }

    // Load all users to get their current team assignments
    const allUsers = await base44.asServiceRole.entities.User.list();
    console.log(`👥 [SYNC TEAMS] Loaded ${allUsers.length} users`);

    // Create a map of user_id -> team_id for quick lookup
    const userTeamMap = new Map();
    allUsers.forEach(u => {
      if (u.id && u.team_id) {
        userTeamMap.set(u.id, u.team_id);
      }
    });

    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const results = [];

    for (const wo of workOrders) {
      try {
        const employee_ids = wo.employee_ids || [];
        
        // Skip if no employees assigned
        if (employee_ids.length === 0) {
          skippedCount++;
          continue;
        }

        // Extract unique team_ids from current employees
        const correctTeamIds = new Set();
        employee_ids.forEach(userId => {
          const teamId = userTeamMap.get(userId);
          if (teamId) {
            correctTeamIds.add(teamId);
          }
        });

        const correctTeamIdsArray = Array.from(correctTeamIds);
        const currentTeamIds = wo.team_ids || [];

        // Check if team_ids need updating
        const needsUpdate = 
          correctTeamIdsArray.length !== currentTeamIds.length ||
          !correctTeamIdsArray.every(id => currentTeamIds.includes(id)) ||
          !currentTeamIds.every(id => correctTeamIdsArray.includes(id));

        if (needsUpdate) {
          console.log(`🔧 [SYNC TEAMS] Updating ${wo.work_order_number}:`, {
            old_teams: currentTeamIds,
            new_teams: correctTeamIdsArray,
            employees: employee_ids.length
          });

          // Update the work order with correct team_ids
          await base44.asServiceRole.entities.TimeEntry.update(wo.id, {
            team_ids: correctTeamIdsArray,
            updated_by: user.email
          });

          syncedCount++;
          results.push({
            work_order_id: wo.id,
            work_order_number: wo.work_order_number,
            status: 'synced',
            old_teams: currentTeamIds,
            new_teams: correctTeamIdsArray
          });
        } else {
          skippedCount++;
        }

      } catch (error) {
        errorCount++;
        console.error(`❌ [SYNC TEAMS] Error syncing ${wo.work_order_number}:`, error.message);
        results.push({
          work_order_id: wo.id,
          work_order_number: wo.work_order_number,
          status: 'error',
          error: error.message
        });
      }
    }

    console.log('✅ [SYNC TEAMS] Sync complete:', {
      total: workOrders.length,
      synced: syncedCount,
      skipped: skippedCount,
      errors: errorCount
    });

    return Response.json({
      success: true,
      summary: {
        total: workOrders.length,
        synced: syncedCount,
        skipped: skippedCount,
        errors: errorCount
      },
      results: results.length > 0 ? results : undefined
    });

  } catch (error) {
    console.error('❌ [SYNC TEAMS] Fatal error:', error);
    return Response.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});