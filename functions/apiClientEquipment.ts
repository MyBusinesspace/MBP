import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
       const origin = req.headers.get('Origin') || '*';
        const corsHeaders = {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-user-id, Authorization',
            'Access-Control-Allow-Credentials': 'true',
        };

        if (req.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders });
        }

        
    // Parse action from URL
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    
    if (!action) {
      return Response.json({ error: 'Missing action parameter' }, { status: 400 });
    }

        const userId = req.headers.get('x-user-id');
        if (!userId) {
            return Response.json({ success: false, error: 'Missing x-user-id header' }, { status: 401, headers: corsHeaders });
        }

        const base44 = createClientFromRequest(req);


    console.log('📥 API Request:', { action, userId, method: req.method });
        async function enrichُEquiment(equement) {
            if (equement.customer_id || equement.project_id ) {
                try {
                    const users = await base44.asServiceRole.entities.User.filter({ id: equement.customer_id });
                      const projects = await base44.asServiceRole.entities.Project.filter({ id: equement.project_id });

                      const u = users[0];
                       const p = projects[0];
                       equement.assigned_to_client_name = `${u.first_name || ''} ${u.last_name || ''}`.trim();
                      equement.project_name = `${p.name || ''}`.trim();

                } catch {
                    equement.assigned_to_client_name = null;
                        equement.project_name = null;
                }
            } else {
                equement.assigned_to_client_name = null;
                  equement.project_name = null;

            }
            return equement;
        }

    // Handle different actions
    switch (action) {

case 'projectsWithEquipment': {
    // 1️⃣ جلب كل المشاريع
    const projects = await base44.asServiceRole.entities.Project.list();

    // 2️⃣ جلب كل المعدات مرة واحدة (أفضل من طلبات متعددة)
    const allEquipments = await base44.asServiceRole.entities.ClientEquipment.list();

    // 3️⃣ تجميع المعدات حسب project_id
    const grouped = {};

    allEquipments.forEach(eq => {
        if (!grouped[eq.project_id]) grouped[eq.project_id] = [];
        grouped[eq.project_id].push(eq);
    });

 // 3️⃣ جلب كل العملاء مرة واحدة فقط
    const customers = await base44.asServiceRole.entities.Customer.list();

    // 4️⃣ تحويل قائمة العملاء إلى Map للوصول السريع
    const customerMap = {};
    customers.forEach(c => {
        customerMap[c.id] = c;
    });

  

    // 6️⃣ بناء البيانات النهائية مع customer_name
    const result = projects.map(project => {
        const customer = project.customer_id ? customerMap[project.customer_id] : null;

        return {
            id: project.id,
            name: project.name || '-',
            address: project.address || project.location_name || '-',
            customer_id: project.customer_id || null,
            customer: customer,   // 👈 تمت الإضافة هنا
            branch_id: project.branch_id || null,
            equipments: grouped[project.id] || []
        };
    });

    
    return Response.json(
        { success: true, data: result, count: result.length },
        { status: 200, headers: corsHeaders }
    );
}


      case 'list': {
        // const sortBy = url.searchParams.get('sort') || '-updated_date';
        // const limit = parseInt(url.searchParams.get('limit') || '1000');
          let equipment = await base44.asServiceRole.entities.ClientEquipment.list();
        
        // console.log('✅ Listed equipment:', equipment.length);
        // return Response.json({ success: true, data: equipment });

                        equipment = await Promise.all(equipment.map(enrichُEquiment));
                return Response.json({ success: true, data: equipment, count: equipment.length }, { status: 200, headers: corsHeaders });

      }

      case 'get': {
        const id = url.searchParams.get('id');
        if (!id) {
          return Response.json({ error: 'Missing id parameter' }, { status: 400 });
        }
        
        const equipment = await base44.asServiceRole.entities.ClientEquipment.get(id);
        if (!equipment) {
          return Response.json({ error: 'Equipment not found' }, { status: 404 });
        }
        
        console.log('✅ Retrieved equipment:', id);
        return Response.json({ success: true, data: equipment });
      }

      case 'create': {
        if (req.method !== 'POST') {
          return Response.json({ error: 'Method must be POST for create' }, { status: 405 });
        }
        
        const body = await req.json();
        
        if (!body.name) {
          return Response.json({ error: 'Equipment name is required' }, { status: 400 });
        }
        
        if (!body.project_id) {
          return Response.json({ error: 'Project ID is required' }, { status: 400 });
        }

        const equipmentData = {
          name: body.name,
          customer_id: body.customer_id || null,
          client_name: body.client_name || '',
          project_id: body.project_id,
          brand: body.brand || null,
          serial_number: body.serial_number || null,
          year_of_manufacture: body.year_of_manufacture || null,
          category: body.category || null,
          status: body.status || 'Available',
          notes: body.notes || null,
          document_urls: body.document_urls || []
        };

        const newEquipment = await base44.asServiceRole.entities.ClientEquipment.create(equipmentData);
        
        console.log('✅ Created equipment:', newEquipment.id);
        return Response.json({ success: true, data: newEquipment }, { status: 201 });
      }

      case 'update': {
        if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH') {
          return Response.json({ error: 'Method must be POST/PUT/PATCH for update' }, { status: 405 });
        }
        
        const id = url.searchParams.get('id');
        if (!id) {
          return Response.json({ error: 'Missing id parameter' }, { status: 400 });
        }
        
        const body = await req.json();
        
        // Check if equipment exists
        const existing = await base44.asServiceRole.entities.ClientEquipment.get(id);
        if (!existing) {
          return Response.json({ error: 'Equipment not found' }, { status: 404 });
        }

        const updateData = {
          name: body.name,
          customer_id: body.customer_id,
          client_name: body.client_name,
          project_id: body.project_id,
          brand: body.brand,
          serial_number: body.serial_number,
          year_of_manufacture: body.year_of_manufacture,
          category: body.category,
          status: body.status,
          notes: body.notes,
          document_urls: body.document_urls
        };

        // Remove undefined values
        Object.keys(updateData).forEach(key => {
          if (updateData[key] === undefined) {
            delete updateData[key];
          }
        });

        const updatedEquipment = await base44.entities.ClientEquipment.update(id, updateData);
        
        console.log('✅ Updated equipment:', id);
        return Response.json({ success: true, data: updatedEquipment });
      }

      case 'delete': {
        if (req.method !== 'POST' && req.method !== 'DELETE') {
          return Response.json({ error: 'Method must be POST/DELETE for delete' }, { status: 405 });
        }
        
        const id = url.searchParams.get('id');
        if (!id) {
          return Response.json({ error: 'Missing id parameter' }, { status: 400 });
        }
        
        // Check if equipment exists
        const existing = await base44.entities.ClientEquipment.get(id);
        if (!existing) {
          return Response.json({ error: 'Equipment not found' }, { status: 404 });
        }

        await base44.entities.ClientEquipment.delete(id);
        
        console.log('✅ Deleted equipment:', id);
        return Response.json({ success: true, message: 'Equipment deleted successfully' });
      }

      case 'filter': {
        if (req.method !== 'POST') {
          return Response.json({ error: 'Method must be POST for filter' }, { status: 405 });
        }
        
        const body = await req.json();
        const query = body.query || {};
        const sortBy = body.sort || '-updated_date';
        const limit = body.limit || 1000;
        
        const equipment = await base44.entities.ClientEquipment.filter(query, sortBy, limit);
        
        console.log('✅ Filtered equipment:', equipment.length);
        return Response.json({ success: true, data: equipment });
      }

      default:
        return Response.json({ 
          error: 'Invalid action. Valid actions: list, get, create, update, delete, filter' 
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ API Error:', error);
    return Response.json({ 
      error: error.message || 'Internal server error',
      details: error.toString()
    }, { status: 500 });
  }
});