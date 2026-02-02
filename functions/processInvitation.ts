import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verificar que el usuario esté autenticado
        const currentUser = await base44.auth.me();
        if (!currentUser) {
            return Response.json({ error: 'User must be authenticated' }, { status: 401 });
        }

        const { invitation_token } = await req.json();
        
        if (!invitation_token) {
            return Response.json({ error: 'Invitation token is required' }, { status: 400 });
        }

        // Buscar la invitación
        const invitations = await base44.asServiceRole.entities.UserInvitation.filter({
            invitation_token: invitation_token,
            status: 'sent'
        });

        if (invitations.length === 0) {
            return Response.json({ error: 'Invalid or expired invitation' }, { status: 404 });
        }

        const invitation = invitations[0];

        // Verificar que no haya expirado
        const now = new Date();
        const expiryDate = new Date(invitation.expires_at);
        if (now > expiryDate) {
            return Response.json({ error: 'Invitation has expired' }, { status: 400 });
        }

        // Verificar que el email coincida
        if (currentUser.email !== invitation.email) {
            return Response.json({ 
                error: 'This invitation is for a different email address',
                expected_email: invitation.email,
                current_email: currentUser.email
            }, { status: 400 });
        }

        // Actualizar el usuario actual con la información de la invitación
        const updateData = {
            role: invitation.invited_role,
            status: 'Active'
        };

        if (invitation.first_name) updateData.first_name = invitation.first_name;
        if (invitation.last_name) updateData.last_name = invitation.last_name;
        if (invitation.job_role) updateData.job_role = invitation.job_role;

        // Actualizar usando updateMyUserData para el usuario actual
        await base44.auth.updateMyUserData(updateData);

        // Marcar la invitación como activada
        await base44.asServiceRole.entities.UserInvitation.update(invitation.id, {
            status: 'activated'
        });

        return Response.json({ 
            success: true,
            message: 'Invitation processed successfully',
            user_role: invitation.invited_role
        });
        
    } catch (error) {
        console.error('Error processing invitation:', error);
        return Response.json({ 
            error: error.message || 'Failed to process invitation',
            details: error.toString()
        }, { status: 500 });
    }
});