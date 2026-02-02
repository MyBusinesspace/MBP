
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Creates a Daily.co video call room
 * Returns room URL for video calls
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verificar autenticación
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { chatId, chatName, roomType = 'video' } = body;

        if (!chatId) {
            return Response.json({ error: 'Chat ID is required' }, { status: 400 });
        }

        const DAILY_API_KEY = Deno.env.get('DAILY_API_KEY');
        if (!DAILY_API_KEY) {
            return Response.json({ error: 'Daily.co API key not configured' }, { status: 500 });
        }

        // ✅ Crear sala con configuración completamente abierta
        const roomName = `chat-${chatId}-${Date.now()}`;
        const dailyResponse = await fetch('https://api.daily.co/v1/rooms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DAILY_API_KEY}`
            },
            body: JSON.stringify({
                name: roomName,
                privacy: 'public',
                properties: {
                    enable_screenshare: true,
                    enable_chat: true,
                    enable_knocking: false,
                    enable_prejoin_ui: false, // ✅ Desactivar UI de prejoin
                    start_video_off: roomType === 'audio',
                    start_audio_off: false,
                    max_participants: 50,
                    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 horas
                    eject_at_room_exp: true,
                    // ✅ Permitir acceso anónimo sin restricciones
                    enable_people_ui: true,
                    enable_pip_ui: true,
                    enable_emoji_reactions: true,
                    enable_hand_raising: true,
                    enable_network_ui: true
                }
            })
        });

        if (!dailyResponse.ok) {
            const error = await dailyResponse.text();
            console.error('Daily.co API error:', error);
            return Response.json({ error: 'Failed to create video room' }, { status: 500 });
        }

        const roomData = await dailyResponse.json();

        // Guardar el mensaje en el chat con la URL de la sala
        try {
            await base44.asServiceRole.entities.Message.create({
                chatId: chatId,
                content: `📹 ${roomType === 'audio' ? '🎧 Audio' : '📹 Video'} call started\n${roomData.url}`,
                sender_user_id: user.id,
                read_by_user_ids: [user.id],
                type: 'text'
            });
        } catch (msgError) {
            console.error('Failed to save call message:', msgError);
        }

        return Response.json({
            success: true,
            room: {
                url: roomData.url,
                name: roomData.name,
                type: roomType
            }
        });

    } catch (error) {
        console.error('Error creating Daily.co room:', error);
        return Response.json({ 
            error: 'Failed to create video room',
            details: error.message 
        }, { status: 500 });
    }
});
