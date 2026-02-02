import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { nanoid } from 'npm:nanoid@4.0.2';

Deno.serve(async (req) => {
    try {
        console.log("[createInvitation] Function execution started.");
        const base44 = createClientFromRequest(req);
        
        const currentUser = await base44.auth.me();
        if (!currentUser || currentUser.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
        }
        console.log(`[createInvitation] Admin user ${currentUser.email} authenticated.`);

        const userData = await req.json();
        if (!userData.email) {
            return Response.json({ error: 'Email is required' }, { status: 400 });
        }

        // Generate invitation token
        const invitationToken = nanoid(32);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const fullName = userData.first_name && userData.last_name 
            ? `${userData.first_name} ${userData.last_name}`.trim()
            : userData.email;

        // Create invitation record
        const invitationData = {
            email: userData.email,
            first_name: userData.first_name || null,
            last_name: userData.last_name || null,
            job_role: userData.job_role || null,
            invited_role: userData.role || 'user',
            status: 'pending',
            invitation_token: invitationToken,
            invited_by: currentUser.email,
            expires_at: expiresAt.toISOString()
        };

        let invitation;
        try {
            invitation = await base44.entities.UserInvitation.create(invitationData);
            console.log(`[createInvitation] Invitation record created for ${userData.email}.`);
        } catch (invError) {
            console.error('[createInvitation] Failed to create invitation record:', invError);
            throw new Error(`Failed to create invitation: ${invError.message}`);
        }

        // Send invitation email
        const invitationLink = `https://preview--chronos-8ee5fab2.base44.app?invitation_token=${invitationToken}`;
        const displayName = fullName;
        const roleText = userData.role === 'admin' ? 'Administrator' : 'User';
        
        const emailSubject = `Welcome to Chronos - Your ${roleText} Invitation`;
        const emailBody = `
Dear ${displayName},

You have been invited to join Chronos as a ${roleText}.

To get started:

1. Click the link below to access the application
2. Sign in with your Google account using this email address: ${userData.email}
3. Your account will be automatically created with the correct permissions
4. You'll see your dashboard and any tasks already assigned to you

Access Chronos: ${invitationLink}

${userData.job_role ? `Your role: ${userData.job_role}` : ''}
Account type: ${roleText}

This invitation will expire in 7 days.

If you have any questions, please contact your administrator.

Welcome to the team!

Best regards,
Chronos Team
        `;

        let emailSent = false;
        try {
            await base44.integrations.Core.SendEmail({
                to: userData.email,
                subject: emailSubject,
                body: emailBody,
                from_name: 'Chronos App'
            });
            console.log(`[createInvitation] Invitation email sent successfully to ${userData.email}`);
            emailSent = true;
        } catch (emailError) {
            console.error('[createInvitation] Failed to send email:', emailError);
            // Don't fail the whole operation if email fails
        }

        console.log("[createInvitation] Function execution finished successfully.");
        return Response.json({ 
            success: true, 
            invitation: invitation,
            invitationLink: invitationLink,
            emailSent: emailSent,
            message: `Invitation created${emailSent ? ' and email sent' : ''} to ${userData.email}. User account will be created when they first log in.`
        });
        
    } catch (error) {
        console.error('[createInvitation] A critical error occurred:', error);
        return Response.json({ 
            error: 'Failed to create user invitation',
            details: error.message,
            stack: error.stack,
        }, { status: 500 });
    }
});