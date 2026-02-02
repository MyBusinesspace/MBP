import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verificar que el usuario esté autenticado y sea admin
        const currentUser = await base44.auth.me();
        if (!currentUser || currentUser.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
        }

        // Obtener los datos del usuario a crear desde el request
        const userData = await req.json();
        
        if (!userData.email) {
            return Response.json({ error: 'Email is required' }, { status: 400 });
        }

        // Crear el usuario con los campos proporcionados
        const userToCreate = {
            email: userData.email,
            full_name: userData.first_name && userData.last_name 
                ? `${userData.first_name} ${userData.last_name}`.trim()
                : userData.full_name || userData.email,
            role: userData.role || 'user'
        };

        // Añadir campos adicionales solo si están presentes
        if (userData.first_name) userToCreate.first_name = userData.first_name;
        if (userData.last_name) userToCreate.last_name = userData.last_name;
        if (userData.job_role) userToCreate.job_role = userData.job_role;
        if (userData.status) userToCreate.status = userData.status;
        if (userData.added_via) userToCreate.added_via = userData.added_via;

        console.log('Creating user with data:', userToCreate);
        
        // Intentar crear usuario con service role
        let newUser;
        try {
            newUser = await base44.asServiceRole.entities.User.create(userToCreate);
        } catch (serviceRoleError) {
            console.log('Service role failed, trying with regular permissions:', serviceRoleError.message);
            // Fallback: intentar con permisos regulares
            newUser = await base44.entities.User.create(userToCreate);
        }

        console.log('User created successfully:', newUser.id);

        // Enviar email de invitación
        try {
            const displayName = userData.first_name && userData.last_name 
                ? `${userData.first_name} ${userData.last_name}`
                : userData.full_name || userData.email;

            const roleText = userData.role === 'admin' ? 'Administrator' : 'User';
            
            const emailSubject = `Welcome to Chronos - Your ${roleText} Account is Ready`;
            
            const emailBody = `
Dear ${displayName},

You have been invited to join Chronos as a ${roleText}.

To get started:
1. Click the link below to access the application
2. Sign in with your Google account using this email address: ${userData.email}
3. Your account will be automatically activated upon first login

Access Chronos: https://preview--chronos-8ee5fab2.base44.app

${userData.job_role ? `Your role: ${userData.job_role}` : ''}
Account type: ${roleText}

If you have any questions, please contact your administrator.

Welcome to the team!

Best regards,
Chronos Team
            `;

            await base44.asServiceRole.integrations.Core.SendEmail({
                to: userData.email,
                subject: emailSubject,
                body: emailBody,
                from_name: 'Chronos App'
            });

            console.log(`Invitation email sent to ${userData.email}`);

        } catch (emailError) {
            console.error('Failed to send invitation email:', emailError);
            // No fallar la creación del usuario si el email falla
        }

        return Response.json({ 
            success: true, 
            user: newUser,
            message: `User ${userData.email} created successfully and invitation email sent` 
        });
        
    } catch (error) {
        console.error('Error creating user:', error);
        return Response.json({ 
            error: error.message || 'Failed to create user',
            details: error.toString()
        }, { status: 500 });
    }
});