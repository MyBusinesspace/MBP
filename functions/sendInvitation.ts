import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { nanoid } from 'npm:nanoid@4.0.2';

Deno.serve(async (req) => {
    let base44;
    try {
        console.log("[sendInvitation] Function execution started.");
        base44 = createClientFromRequest(req);
        
        console.log("[sendInvitation] Authenticating current user...");
        const currentUser = await base44.auth.me();
        if (!currentUser || currentUser.role !== 'admin') {
            console.error("[sendInvitation] Auth failed: User not authenticated or not an admin.");
            return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
        }
        console.log(`[sendInvitation] Admin user ${currentUser.email} authenticated successfully.`);

        const userData = await req.json();
        console.log("[sendInvitation] Received user data:", JSON.stringify(userData));
        if (!userData.email) {
            console.error("[sendInvitation] Validation failed: Email is required.");
            return Response.json({ error: 'Email is required' }, { status: 400 });
        }

        const invitationToken = nanoid(32);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const invitationData = {
            email: userData.email,
            first_name: userData.first_name || null,
            last_name: userData.last_name || null,
            job_role: userData.job_role || null,
            invited_role: userData.role || 'user',
            status: 'sent',
            invitation_token: invitationToken,
            invited_by: currentUser.email,
            expires_at: expiresAt.toISOString()
        };

        let invitation;
        try {
            console.log('[sendInvitation] Attempting to create UserInvitation record:', JSON.stringify(invitationData));
            invitation = await base44.asServiceRole.entities.UserInvitation.create(invitationData);
            console.log(`[sendInvitation] UserInvitation record created successfully with ID: ${invitation.id}`);
        } catch (dbError) {
            console.error('[sendInvitation] FATAL: Failed to create UserInvitation record in database.', dbError);
            throw new Error(`Database error: ${dbError.message}`);
        }

        try {
            console.log(`[sendInvitation] Attempting to send email to ${userData.email}`);
            const displayName = (userData.first_name && userData.last_name) 
                ? `${userData.first_name} ${userData.last_name}`.trim()
                : userData.email;

            const roleText = userData.role === 'admin' ? 'Administrator' : 'User';
            const emailSubject = `Welcome to Chronos - Your ${roleText} Invitation`;
            const invitationLink = `https://preview--chronos-8ee5fab2.base44.app?invitation_token=${invitationToken}`;
            const emailBody = `
Dear ${displayName},

You have been invited to join Chronos as a ${roleText}.

To get started:
1. Click the link below to access the application.
2. Sign in with your Google account using this email address: ${userData.email}
3. Your account will be automatically set up with the correct permissions.

Access Chronos: ${invitationLink}

This invitation will expire in 7 days.

If you have any questions, please contact your administrator.

Welcome to the team!
Best regards,
The Chronos Team
            `;

            await base44.asServiceRole.integrations.Core.SendEmail({
                to: userData.email,
                subject: emailSubject,
                body: emailBody,
                from_name: 'Chronos App'
            });

            console.log(`[sendInvitation] Invitation email sent successfully to ${userData.email}`);
        } catch (emailError) {
            console.error('[sendInvitation] FATAL: Failed to send invitation email after creating DB record.', emailError);
            // Attempt to clean up by marking the invitation as expired
            await base44.asServiceRole.entities.UserInvitation.update(invitation.id, {
                status: 'expired'
            });
            console.log(`[sendInvitation] Cleaned up invitation ${invitation.id} by marking it as expired.`);
            throw new Error(`Email sending error: ${emailError.message}`);
        }

        console.log("[sendInvitation] Function execution finished successfully.");
        return Response.json({ 
            success: true, 
            invitation: invitation,
            message: `Invitation sent successfully to ${userData.email}` 
        });
        
    } catch (error) {
        console.error('[sendInvitation] A critical error occurred in the main try-catch block.', error);
        return Response.json({ 
            error: 'A critical error occurred while sending the invitation.',
            details: error.message,
            stack: error.stack,
        }, { status: 500 });
    }
});