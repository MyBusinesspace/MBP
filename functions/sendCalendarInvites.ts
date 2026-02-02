import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { format } from 'npm:date-fns@3.0.0';

/**
 * Sends calendar event invitations to participants
 * - Internal users (by user_id)
 * - External customers (by email)
 * Creates .ics calendar files for proper calendar integration
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { event } = body;

        if (!event) {
            return Response.json({ error: 'Event data is required' }, { status: 400 });
        }

        console.log('📧 Sending calendar invites for event:', event.title);

        const emailsSent = [];
        const emailsFailed = [];

        // ✅ Formatear fechas
        const startDate = new Date(event.start_time);
        const endDate = new Date(event.end_time);
        const formattedDate = format(startDate, 'EEEE, MMMM d, yyyy');
        const formattedTime = `${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}`;

        // ✅ Crear archivo .ics para adjuntar
        const createIcsFile = () => {
            const formatIcsDate = (date) => {
                return format(date, "yyyyMMdd'T'HHmmss'Z'");
            };

            const now = new Date();
            const uid = `${event.id || now.getTime()}@mybusinesspace.com`;
            
            return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//MyBusinessPace//Calendar//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${formatIcsDate(now)}
DTSTART:${formatIcsDate(startDate)}
DTEND:${formatIcsDate(endDate)}
SUMMARY:${event.title}
DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}
LOCATION:${event.location || ''}
ORGANIZER;CN=${user.first_name} ${user.last_name}:mailto:${user.email}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Reminder
END:VALARM
END:VEVENT
END:VCALENDAR`;
        };

        const icsContent = createIcsFile();

        // ✅ Crear email HTML mejorado
        const createHtmlEmail = (recipientName) => {
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const dayOfMonth = startDate.getDate();
            const monthName = monthNames[startDate.getMonth()];

            return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                                📅 Meeting Invitation
                            </h1>
                        </td>
                    </tr>

                    <!-- Date Badge -->
                    <tr>
                        <td style="padding: 30px; text-align: center;">
                            <div style="display: inline-block; background-color: #667eea; border-radius: 12px; padding: 20px 30px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                                <div style="color: #ffffff; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">
                                    ${monthName}
                                </div>
                                <div style="color: #ffffff; font-size: 48px; font-weight: bold; line-height: 1;">
                                    ${dayOfMonth}
                                </div>
                            </div>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 0 30px 30px 30px;">
                            <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px;">
                                Hello ${recipientName},
                            </p>
                            
                            <p style="margin: 0 0 25px 0; color: #666666; font-size: 14px;">
                                You have been invited to the following meeting:
                            </p>

                            <!-- Event Details Card -->
                            <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
                                <h2 style="margin: 0 0 15px 0; color: #333333; font-size: 20px; font-weight: 600;">
                                    ${event.title}
                                </h2>
                                
                                <div style="margin-bottom: 10px;">
                                    <span style="color: #667eea; font-weight: 600;">📅 Date:</span>
                                    <span style="color: #333333; margin-left: 10px;">${formattedDate}</span>
                                </div>
                                
                                <div style="margin-bottom: 10px;">
                                    <span style="color: #667eea; font-weight: 600;">🕐 Time:</span>
                                    <span style="color: #333333; margin-left: 10px;">${formattedTime}</span>
                                </div>
                                
                                ${event.location ? `
                                <div style="margin-bottom: 10px;">
                                    <span style="color: #667eea; font-weight: 600;">📍 Location:</span>
                                    <span style="color: #333333; margin-left: 10px;">${event.location}</span>
                                </div>
                                ` : ''}
                                
                                ${event.description ? `
                                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
                                    <span style="color: #667eea; font-weight: 600; display: block; margin-bottom: 8px;">📝 Description:</span>
                                    <div style="color: #666666; line-height: 1.6; white-space: pre-wrap;">${event.description}</div>
                                </div>
                                ` : ''}
                            </div>

                            ${event.meeting_link ? `
                            <!-- Join Button -->
                            <div style="text-align: center; margin-bottom: 25px;">
                                <a href="${event.meeting_link}" 
                                   style="display: inline-block; background-color: #667eea; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                                    🎥 Join Video Call
                                </a>
                            </div>
                            ` : ''}

                            <!-- Organizer Info -->
                            <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                                <p style="margin: 0; color: #999999; font-size: 13px;">
                                    <strong>Organized by:</strong> ${user.first_name || ''} ${user.last_name || ''} (${user.email})
                                </p>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px; text-align: center;">
                            <p style="margin: 0; color: #999999; font-size: 12px;">
                                This is an automated invitation from MyBusinessPace Calendar
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
        };

        // ✅ Subir archivo .ics como adjunto
        const icsBlob = new Blob([icsContent], { type: 'text/calendar' });
        const icsFile = new File([icsBlob], `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`);
        
        let icsFileUrl;
        try {
            const uploadResponse = await base44.asServiceRole.integrations.Core.UploadFile({ file: icsFile });
            icsFileUrl = uploadResponse.file_url;
            console.log('✅ ICS file uploaded:', icsFileUrl);
        } catch (error) {
            console.error('❌ Failed to upload ICS file:', error);
            // Continuar sin el archivo .ics si falla la subida
        }

        // ✅ Enviar a usuarios internos
        if (event.participant_user_ids && event.participant_user_ids.length > 0) {
            const users = await base44.asServiceRole.entities.User.list('sort_order', 1000);
            const participantUsers = users.filter(u => event.participant_user_ids.includes(u.id));

            for (const participant of participantUsers) {
                if (!participant.email) continue;

                const userName = `${participant.first_name || ''} ${participant.last_name || ''}`.trim() || participant.email;
                const htmlBody = createHtmlEmail(userName);

                try {
                    await base44.asServiceRole.integrations.Core.SendEmail({
                        to: participant.email,
                        subject: `📅 Meeting Invitation: ${event.title}`,
                        body: htmlBody,
                        from_name: 'MyBusinessPace Calendar'
                    });
                    emailsSent.push(participant.email);
                    console.log(`✅ Email sent to: ${participant.email}`);
                } catch (error) {
                    console.error(`❌ Failed to send email to ${participant.email}:`, error);
                    emailsFailed.push({ email: participant.email, error: error.message });
                }
            }
        }

        // ✅ Enviar a clientes externos
        if (event.participant_customer_emails && event.participant_customer_emails.length > 0) {
            for (const customerEmail of event.participant_customer_emails) {
                if (!customerEmail || !customerEmail.includes('@')) continue;

                const htmlBody = createHtmlEmail('Guest');

                try {
                    await base44.asServiceRole.integrations.Core.SendEmail({
                        to: customerEmail,
                        subject: `📅 Meeting Invitation: ${event.title}`,
                        body: htmlBody,
                        from_name: 'MyBusinessPace Calendar'
                    });
                    emailsSent.push(customerEmail);
                    console.log(`✅ Email sent to: ${customerEmail}`);
                } catch (error) {
                    console.error(`❌ Failed to send email to ${customerEmail}:`, error);
                    emailsFailed.push({ email: customerEmail, error: error.message });
                }
            }
        }

        return Response.json({
            success: true,
            emailsSent: emailsSent.length,
            emailsFailed: emailsFailed.length,
            sentTo: emailsSent,
            failed: emailsFailed
        });

    } catch (error) {
        console.error('Error sending calendar invites:', error);
        return Response.json({ 
            error: 'Failed to send calendar invites',
            details: error.message 
        }, { status: 500 });
    }
});