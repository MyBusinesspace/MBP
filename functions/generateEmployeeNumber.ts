import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Genera el siguiente employee number automáticamente
 * Reglas:
 * 1. Se ordena por antigüedad (employment_start_date)
 * 2. Si un empleado se da de baja, su número queda sin usar
 * 3. Formato: 001, 002, 003...
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all users sorted by employment_start_date (oldest first)
    const { User } = await import('@/entities/all');
    const allUsers = await User.list();
    
    // Filter users with employment_start_date and sort by it
    const usersWithEmploymentDate = allUsers
      .filter(u => u.employment_start_date && !u.is_ghost)
      .sort((a, b) => {
        const dateA = new Date(a.employment_start_date);
        const dateB = new Date(b.employment_start_date);
        return dateA - dateB;
      });
    
    // Assign employee numbers sequentially starting from 001
    const updates = [];
    for (let i = 0; i < usersWithEmploymentDate.length; i++) {
      const employeeNumber = String(i + 1).padStart(3, '0');
      const userId = usersWithEmploymentDate[i].id;
      
      // Only update if the employee number has changed
      if (usersWithEmploymentDate[i].employee_number !== employeeNumber) {
        updates.push({
          id: userId,
          employee_number: employeeNumber
        });
      }
    }
    
    // Batch update all users
    for (const update of updates) {
      await User.update(update.id, { employee_number: update.employee_number });
    }
    
    return Response.json({
      success: true,
      updated_count: updates.length,
      total_users: usersWithEmploymentDate.length,
      message: `Employee numbers regenerated for ${updates.length} users`
    });
    
  } catch (error) {
    console.error('Error generating employee numbers:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});