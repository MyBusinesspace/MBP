/**
 * API Assets Endpoint
 * 
 * This endpoint provides CRUD operations for managing assets and their documents.
 * 
 * AUTHENTICATION:
 * - Pass user ID in the header: x-user-id: <user_id>
 * 
 * USAGE:
 * - Method: POST or GET
 * - Action can be passed via query parameter: ?action=list
 *   OR in the request body: { "action": "list", ...params }
 * 
 * AVAILABLE ACTIONS:
 * - list: Get all assets (supports filter, sort, limit)
 * - get: Get single asset by id
 * - create: Create new asset (requires assetData)
 * - update: Update existing asset (requires id, assetData)
 * - delete: Delete asset by id
 * - getDocuments: Get documents for an asset by id
 * - addDocument: Add document to asset (requires id, documentUrl)
 * - removeDocument: Remove document from asset (requires id, documentUrl)
 * - updateDocuments: Bulk update documents (requires id, documentUrls array)
 * - search: Search assets (supports query, category, status, assigned_to_user_id)
 * 
 * EXAMPLES:
 * 
 * List all assets:
 *   POST /apiAssets?action=list
 *   Body: { "limit": 100, "sort": "-updated_date" }
 * 
 * Get single asset:
 *   POST /apiAssets?action=get
 *   Body: { "id": "asset_id_here" }
 * 
 * Create asset:
 *   POST /apiAssets?action=create
 *   Body: { "assetData": { "name": "New Asset", "category": "Vehicle", "status": "Available" } }
 * 
 * Add document:
 *   POST /apiAssets?action=addDocument
 *   Body: { "id": "asset_id", "documentUrl": "https://..." }
 * 
 * Search assets:
 *   POST /apiAssets?action=search
 *   Body: { "query": "Ford", "category": "Vehicle" }
 */

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

        const userId = req.headers.get('x-user-id');
        if (!userId) {
            return Response.json({ success: false, error: 'Missing x-user-id header' }, { status: 401, headers: corsHeaders });
        }

        const base44 = createClientFromRequest(req);

        let currentUser;
        try {
            const users = await base44.asServiceRole.entities.User.filter({ id: userId });
            if (!users || users.length === 0) {
                return Response.json({ success: false, error: 'Invalid user ID' }, { status: 401, headers: corsHeaders });
            }
            currentUser = users[0];
        } catch (error) {
            return Response.json({ success: false, error: 'User verification failed: ' + error.message }, { status: 401, headers: corsHeaders });
        }

        const url = new URL(req.url);
        let actionFromQuery = url.searchParams.get('action');

        let body = {};
        if (req.method === 'POST') {
            try {
                const text = await req.text();
                if (text) {
                    body = JSON.parse(text);
                }
            } catch (error) {
                return Response.json({ success: false, error: 'Invalid JSON body' }, { status: 400, headers: corsHeaders });
            }
        }

        const action = actionFromQuery || body.action;
        const params = { ...body };
        delete params.action;

        const idFromQuery = url.searchParams.get('id');
        if (idFromQuery && !params.id) {
            params.id = idFromQuery;
        }

        if (!action) {
            return Response.json({ success: false, error: 'Missing action parameter' }, { status: 400, headers: corsHeaders });
        }

        console.log(`📦 [apiAssets] Action: ${action}, User: ${currentUser.email}`);

        // ✅ Helper to add assigned_to_user_name to asset
        async function enrichAsset(asset) {
            if (asset.assigned_to_user_id || asset.project_id ) {
                try {
                    const users = await base44.asServiceRole.entities.User.filter({ id: asset.assigned_to_user_id });
                      const projects = await base44.asServiceRole.entities.Project.filter({ id: asset.project_id });

                      const u = users[0];
                       const p = projects[0];
                       asset.assigned_to_user_name = `${u.first_name || ''} ${u.last_name || ''}`.trim();
                      asset.project_name = `${p.name || ''}`.trim();

                } catch {
                    asset.assigned_to_user_name = null;
                        asset.project_name = null;
                }
            } else {
                asset.assigned_to_user_name = null;
                                        asset.project_name = null;

            }
            return asset;
        }

        switch (action) {
                 case 'categories': {
                const { limit = 1000, sort = '-updated_date', filter = {} } = params;
                let assets = await base44.asServiceRole.entities.AssetCategory.filter(filter, sort, limit);
                assets = await Promise.all(assets.map(enrichAsset));
                return Response.json({ success: true, data: assets, count: assets.length }, { status: 200, headers: corsHeaders });
            }
            
            case 'list': {
                const { limit = 1000, sort = '-updated_date', filter = {} } = params;
                let assets = await base44.asServiceRole.entities.Asset.filter(filter, sort, limit);
                assets = await Promise.all(assets.map(enrichAsset));
                return Response.json({ success: true, data: assets, count: assets.length }, { status: 200, headers: corsHeaders });
            }

            case 'get': {
                const { id } = params;
                if (!id) return Response.json({ success: false, error: 'Missing id parameter' }, { status: 400, headers: corsHeaders });

                const assets = await base44.asServiceRole.entities.Asset.filter({ id });
                if (!assets || assets.length === 0) return Response.json({ success: false, error: 'Asset not found' }, { status: 404, headers: corsHeaders });

                const asset = await enrichAsset(assets[0]);
                return Response.json({ success: true, data: asset }, { status: 200, headers: corsHeaders });
            }

            case 'create': {
                const { assetData } = params;
                if (!assetData) return Response.json({ success: false, error: 'Missing assetData parameter' }, { status: 400, headers: corsHeaders });
                if (!assetData.name || !assetData.category || !assetData.status) return Response.json({ success: false, error: 'Missing required fields: name, category, status' }, { status: 400, headers: corsHeaders });

                const newAsset = await base44.asServiceRole.entities.Asset.create(assetData);
                const asset = await enrichAsset(newAsset);
                return Response.json({ success: true, data: asset }, { status: 201, headers: corsHeaders });
            }

            case 'update': {
                const { id, assetData } = params;
                if (!id || !assetData) return Response.json({ success: false, error: 'Missing id or assetData parameter' }, { status: 400, headers: corsHeaders });

                const existingAssets = await base44.asServiceRole.entities.Asset.filter({ id });
                if (!existingAssets || existingAssets.length === 0) return Response.json({ success: false, error: 'Asset not found' }, { status: 404, headers: corsHeaders });

                await base44.asServiceRole.entities.Asset.update(id, assetData);
                const updatedAssets = await base44.asServiceRole.entities.Asset.filter({ id });
                const asset = await enrichAsset(updatedAssets[0]);

                return Response.json({ success: true, data: asset }, { status: 200, headers: corsHeaders });
            }

            case 'delete': {
                const { id } = params;
                if (!id) return Response.json({ success: false, error: 'Missing id parameter' }, { status: 400, headers: corsHeaders });

                const existingAssets = await base44.asServiceRole.entities.Asset.filter({ id });
                if (!existingAssets || existingAssets.length === 0) return Response.json({ success: false, error: 'Asset not found' }, { status: 404, headers: corsHeaders });

                await base44.asServiceRole.entities.Asset.delete(id);
                return Response.json({ success: true, message: 'Asset deleted successfully' }, { status: 200, headers: corsHeaders });
            }

            case 'getDocuments': {
                const { id } = params;
                if (!id) return Response.json({ success: false, error: 'Missing id parameter' }, { status: 400, headers: corsHeaders });

                const assets = await base44.asServiceRole.entities.Asset.filter({ id });
                if (!assets || assets.length === 0) return Response.json({ success: false, error: 'Asset not found' }, { status: 404, headers: corsHeaders });

                const asset = await enrichAsset(assets[0]);
                const documents = asset.document_urls || [];
                return Response.json({ success: true, data: { assetId: id, assetName: asset.name, assigned_to_user_name: asset.assigned_to_user_name, documents, documentCount: documents.length } }, { status: 200, headers: corsHeaders });
            }

            case 'addDocument': {
                const { id, documentUrl } = params;
                if (!id || !documentUrl) return Response.json({ success: false, error: 'Missing id or documentUrl parameter' }, { status: 400, headers: corsHeaders });

                const assets = await base44.asServiceRole.entities.Asset.filter({ id });
                if (!assets || assets.length === 0) return Response.json({ success: false, error: 'Asset not found' }, { status: 404, headers: corsHeaders });

                const asset = assets[0];
                const currentDocuments = asset.document_urls || [];
                const updatedDocuments = [...currentDocuments, documentUrl];

                await base44.asServiceRole.entities.Asset.update(id, { document_urls: updatedDocuments });
                const updatedAssets = await base44.asServiceRole.entities.Asset.filter({ id });
                const updatedAsset = await enrichAsset(updatedAssets[0]);

                return Response.json({ success: true, message: 'Document added successfully', data: updatedAsset }, { status: 200, headers: corsHeaders });
            }

            case 'removeDocument': {
                const { id, documentUrl } = params;
                if (!id || !documentUrl) return Response.json({ success: false, error: 'Missing id or documentUrl parameter' }, { status: 400, headers: corsHeaders });

                const assets = await base44.asServiceRole.entities.Asset.filter({ id });
                if (!assets || assets.length === 0) return Response.json({ success: false, error: 'Asset not found' }, { status: 404, headers: corsHeaders });

                const asset = assets[0];
                const currentDocuments = asset.document_urls || [];
                const updatedDocuments = currentDocuments.filter(url => url !== documentUrl);

                if (updatedDocuments.length === currentDocuments.length) return Response.json({ success: false, error: 'Document URL not found in asset' }, { status: 404, headers: corsHeaders });

                await base44.asServiceRole.entities.Asset.update(id, { document_urls: updatedDocuments });
                const updatedAssets = await base44.asServiceRole.entities.Asset.filter({ id });
                const updatedAsset = await enrichAsset(updatedAssets[0]);

                return Response.json({ success: true, message: 'Document removed successfully', data: updatedAsset }, { status: 200, headers: corsHeaders });
            }

            case 'updateDocuments': {
                const { id, documentUrls } = params;
                if (!id || !Array.isArray(documentUrls)) return Response.json({ success: false, error: 'Missing id or documentUrls array parameter' }, { status: 400, headers: corsHeaders });

                const assets = await base44.asServiceRole.entities.Asset.filter({ id });
                if (!assets || assets.length === 0) return Response.json({ success: false, error: 'Asset not found' }, { status: 404, headers: corsHeaders });

                await base44.asServiceRole.entities.Asset.update(id, { document_urls: documentUrls });
                const updatedAssets = await base44.asServiceRole.entities.Asset.filter({ id });
                const updatedAsset = await enrichAsset(updatedAssets[0]);

                return Response.json({ success: true, message: 'Documents updated successfully', data: updatedAsset }, { status: 200, headers: corsHeaders });
            }

            case 'search': {
                const { query, category, status, assigned_to_user_id } = params;
                if (!query && !category && !status && !assigned_to_user_id) return Response.json({ success: false, error: 'At least one search parameter required' }, { status: 400, headers: corsHeaders });

                const filter = {};
                if (category) filter.category = category;
                if (status) filter.status = status;
                if (assigned_to_user_id) filter.assigned_to_user_id = assigned_to_user_id;

                let assets = await base44.asServiceRole.entities.Asset.filter(filter, '-updated_date', 1000);

                if (query) {
                    const lowerQuery = query.toLowerCase();
                    assets = assets.filter(asset => asset.name?.toLowerCase().includes(lowerQuery) || asset.identifier?.toLowerCase().includes(lowerQuery) || asset.notes?.toLowerCase().includes(lowerQuery));
                }

                assets = await Promise.all(assets.map(enrichAsset));

                return Response.json({ success: true, data: assets, count: assets.length, query: { query, category, status, assigned_to_user_id } }, { status: 200, headers: corsHeaders });
            }

            default: {
                return Response.json({ success: false, error: `Unknown action: ${action}`, availableActions: ['list','get','create','update','delete','getDocuments','addDocument','removeDocument','updateDocuments','search'] }, { status: 400, headers: corsHeaders });
            }
        }

    } catch (error) {
        console.error('❌ [apiAssets] Error:', error);
        return Response.json({ success: false, error: error.message, stack: error.stack }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } });
    }
});
