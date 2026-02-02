/**
 * AI Assistant API Endpoint
 * 
 * Usage:
 * - listConversations: GET /apiAiAssistant?action=listConversations
 * - createConversation: POST /apiAiAssistant?action=createConversation with body: { metadata: {...} }
 * - getConversation: GET /apiAiAssistant?action=getConversation&id=<conversationId>
 * - sendMessage: POST /apiAiAssistant?action=sendMessage with body: { conversationId: "...", message: "..." }
 * 
 * Required Headers:
 * - X-User-Id: User ID for authentication
 * - X-App-Key: Application API key
 */

import { createClient } from 'npm:@base44/sdk@0.8.4';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.env.get('BASE44_SERVICE_ROLE_KEY');

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-App-Key',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {


    const base44 = createClientFromRequest(req);
    const method = req.method;

    // Get user ID from headers or query params
    const userId = req.headers.get('X-User-ID') || 
                   req.headers.get('user_id') ||
                   url.searchParams.get('user_id');

    const apiKey = req.headers.get('X-API-Key') || 
                   req.headers.get('api_key') ||
                   url.searchParams.get('api_key');

    if (!userId && !apiKey) {
      return Response.json({ 
        error: 'Authentication required. Provide user_id or api_key in headers or query params.',
        example: 'Headers: X-User-ID: your-user-id or X-API-Key: your-api-key'
      }, { status: 401 });
    } 
 
    // Verify user exists and get their role
    let user = null;
    
    if (userId) {
      const users = await base44.asServiceRole.entities.User.list();
      user = users.find(u => u.id === userId);
      
      if (!user) {
        return Response.json({ error: 'Invalid user_id' }, { status: 401 });
      }

      if (user.archived) {
        return Response.json({ error: 'User account is archived' }, { status: 403 });
      }
    } else if (apiKey) {
      const users = await base44.asServiceRole.entities.User.list();
      user = users.find(u => u.id === apiKey || u.email === apiKey);
      
      if (!user) {
        return Response.json({ error: 'Invalid api_key' }, { status: 401 });
      }
    }

    // Helper function to check if user is admin
    const isAdmin = () => user && user.role === 'admin';

    // Get action from query params
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (!action) {
      return Response.json(
        { error: 'Action parameter required (e.g., ?action=list)' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Route to appropriate handler
    switch (action) {
      case 'sendMessage':
        return await handleSendMessage(base44, userId, req, corsHeaders);

      case 'getConversation':
        return await handleGetConversation(base44, userId, url, corsHeaders);

      case 'createConversation':
        return await handleCreateConversation(base44, userId, req, corsHeaders);

      case 'listConversations':
        return await handleListConversations(req);

      default:
        return Response.json(
          { error: `Unknown action: ${action}. Available actions: sendMessage, getConversation, createConversation, listConversations` },
          { status: 400, headers: corsHeaders }
        );
    }






    
  } catch (error) {
    console.error('API Error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
});

// Send message to business_secretary agent and get response
async function handleSendMessage(base44, userId, req, corsHeaders) {
  const body = await req.json();
  const { message, conversationId } = body;

  if (!message) {
    return Response.json(
      { error: 'Message is required' },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    let conversation;
    
    if (conversationId) {
      conversation = await base44.asServiceRole.agents.getConversation(conversationId);
    } else {
      conversation = await base44.asServiceRole.agents.createConversation({
        agent_name: 'business_secretary',
        metadata: { created_by: userId }
      });
    }

    const result = await base44.asServiceRole.agents.addMessage(conversation, {
      role: 'user',
      content: message
    });

    return Response.json(result, { headers: corsHeaders });
  } catch (error) {
    console.error('Error sending message:', error);
    return Response.json(
      { error: error.message || 'Failed to send message to agent' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Get conversation history from business_secretary agent
async function handleGetConversation(base44, userId, url, corsHeaders) {
  const conversationId = url.searchParams.get('id');
  
  if (!conversationId) {
    return Response.json(
      { error: 'Conversation ID required' },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const conversation = await base44.asServiceRole.agents.getConversation(conversationId);
    
    if (!conversation) {
      return Response.json(
        { error: 'Conversation not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    return Response.json(conversation, { headers: corsHeaders });
  } catch (error) {
    console.error('Error getting conversation:', error);
    return Response.json(
      { error: error.message || 'Failed to get conversation' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Create a new conversation with business_secretary agent
async function handleCreateConversation(base44, userId, req, corsHeaders) {
  const body = await req.json();
  const { metadata } = body;

  try {
    const conversation = await base44.asServiceRole.agents.createConversation({
      agent_name: 'business_secretary',
      metadata: {
        ...metadata,
        created_by: userId
      }
    });

    return Response.json(conversation, { headers: corsHeaders });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return Response.json(
      { error: error.message || 'Failed to create conversation' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// List all conversations for business_secretary agent


// async function handleListConversations(base44, userId, corsHeaders) {
//   try {
//     // SDK fetch
//     const allConversations = await base44.asServiceRole.agents.listConversations({
//       agent_name: 'business_secretary'
//     });

//     // فلترة حسب الحقل الصحيح
//     const userConversations = allConversations.filter(conv => 
//       conv.created_by_id === userId ||
//       (conv.metadata && conv.metadata.created_by === userId)
//     );

//     return Response.json({ conversations: userConversations }, { headers: corsHeaders });
//   } catch (error) {
//     console.error('Error listing conversations:', error);
//     return Response.json(
//       { error: error.message || 'Failed to list conversations' },
//       { status: 500, headers: corsHeaders }
//     );
//   }
// }


async function handleListConversations(req) {
  const responseHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*', // أو اسم نطاقك (Domain) المحدد
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-App-Key, X-User-ID, Authorization',
  };

  try {
       const userId = req.headers.get('X-User-ID') || 
                   req.headers.get('user_id') ||
                   url.searchParams.get('user_id');

    const apiKey = req.headers.get('X-API-Key') || 
                   req.headers.get('api_key') ||
                   url.searchParams.get('api_key');
                   
                   
       if (!apiKey) {
      return new Response(JSON.stringify({ error: 'X-App-Key header is required' }), {
        status: 401,
        headers: responseHeaders
      });
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'X-User-ID header is required' }), {
        status: 401,
        headers: responseHeaders
      });
    }
    const apiUrl = 'https://chronos-8ee5fab2.base44.app/api/apps/68be895889fc1a618ee5fab2/agents/conversations';

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'api_key': "8d4640853d204d8f925511151a6c88be",
        'Content-Type': 'application/json',
        "X-User-ID" : userId       
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch conversations: ${response.status}. API response: ${errorText}`);
    }

    const allConversations = await response.json();
    
    const userConversations = allConversations.filter(conv => {
      return String(conv.created_by_id) === userId; 
    });

    return new Response(JSON.stringify({ conversations: userConversations }), {
      headers: responseHeaders
    });
  } catch (error) {
    console.error('Error listing conversations:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to list conversations' }), {
      status: 500,
      headers: responseHeaders
    });
  }
}



// async function handleListConversations(base44, userId, corsHeaders) {
//   try {
//     const conversations = await base44.asServiceRole.agents.listConversations({
//       agent_name: 'business_secretary'
//     });

//     return Response.json({ conversations: conversations || [] }, { headers: corsHeaders });
//   } catch (error) {
//     console.error('Error listing conversations:', error);
//     return Response.json(
//       { error: error.message || 'Failed to list conversations' },
//       { status: 500, headers: corsHeaders }
//     );
//   }
// }