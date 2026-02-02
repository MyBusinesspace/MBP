import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-User-ID'
      }
    });
  }

  try {
    // Get user ID from header (not using base44 auth)
    const userId = req.headers.get('X-User-ID');
    
    if (!userId) {
      return new Response(JSON.stringify({ error: 'X-User-ID header is required' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Parse action from URL parameters
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'list';

    // Initialize base44 client with service role
    const base44 = createClientFromRequest(req);

    if (action === 'list') {
      // Get all customers
      const customers = await base44.asServiceRole.entities.Customer.list();
      
      // Get all projects
      const projects = await base44.asServiceRole.entities.Project.list();
      
      // Attach projects to their respective customers
      const customersWithProjects = customers.map(customer => ({
        ...customer,
        projects: projects.filter(project => project.customer_id === customer.id)
      }));

      return new Response(JSON.stringify({
        success: true,
        data: customersWithProjects,
        userId: userId
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('API Customer Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
});