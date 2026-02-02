import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

function generateCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

Deno.serve(async (req) => {
  try {
 const base44 = createClientFromRequest(req);
const url = new URL(req.url);
    /* =========================
   GET USER BY ID (HEADER)
==========================*/
if (req.method === 'GET'&& url.searchParams.get('action') === 'getCurrentUser') {
  const userId = req.headers.get('x-user-id');

  if (!userId) {
    return Response.json(
      { error: 'x-user-id header is required' },
      { status: 400 }
    );
  }

  const user = await base44.asServiceRole.entities.User.get(userId);

  if (!user) {
    return Response.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  // إزالة الحقول الحساسة
  const {
    verification_code,
    verification_code_expires_at,
    password,
    ...safeUser
  } = user;

  return Response.json({
    success: true,
    user: safeUser
  });
}

   
    /* =========================
       GET ALL USERS (GET)
    ==========================*/
    if (req.method === 'GET' && url.searchParams.get('action') === 'getAllUsers') {
      const users = await base44.asServiceRole.entities.User.list('-created_date', 1000);

      const safeUsers = users.map((user) => {
        const {
          verification_code,
          verification_code_expires_at,
          password,
          ...safeUser
        } = user;
        return safeUser;
      });

      return Response.json({
        success: true,
        count: safeUsers.length,
        users: safeUsers,
      });
    }

    const { action, email, code } = await req.json();

    if (!action) {
      return Response.json({ error: 'Action is required' }, { status: 400 });
    }

/* =========================
   GET USER BY EMAIL (POST)
==========================*/
if (action === 'getUser') {
  if (!email) {
    return Response.json(
      { error: 'Email is required' },
      { status: 400 }
    );
  }

  const users = await base44.asServiceRole.entities.User.filter({ email });

  if (!users || users.length === 0) {
    return Response.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }

  const user = users[0];

  // إزالة الحقول الحساسة
  const {
    verification_code,
    verification_code_expires_at,
    password,
    ...safeUser
  } = user;

  return Response.json({
    success: true,
    user: safeUser
  });
}

    /* =========================
       SEND VERIFICATION CODE
    ==========================*/
    if (action === 'send') {
      if (!email) {
        return Response.json({ error: 'Email is required' }, { status: 400 });
      }

      const users = await base44.asServiceRole.entities.User.filter({ email });

      if (!users || users.length === 0) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }

      const user = users[0];

      const verificationCode = generateCode();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      // ✅ تخزين الرمز ووقت الانتهاء داخل User Entity
      await base44.asServiceRole.entities.User.update(user.id, {
        verification_code: verificationCode,
        verification_code_expires_at: expiresAt
      });

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: 'Your Verification Code',
        body: `Your verification code is: ${verificationCode}\n\nThis code will expire in 5 minutes.`
      });

      return Response.json({
        success: true,
        message: 'Verification code sent to your email'
      });
    }

    /* =========================
       VERIFY CODE
    ==========================*/
    if (action === 'verify') {
      if (!email || !code) {
        return Response.json(
          { error: 'Email and code are required' },
          { status: 400 }
        );
      }

      const users = await base44.asServiceRole.entities.User.filter({ email });

      if (!users || users.length === 0) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }

      const user = users[0];

      if (!user.verification_code || !user.verification_code_expires_at) {
        return Response.json(
          { error: 'No verification code found or code expired' },
          { status: 400 }
        );
      }

      if (new Date() > new Date(user.verification_code_expires_at)) {
        return Response.json(
          { error: 'Verification code expired' },
          { status: 400 }
        );
      }

      if (user.verification_code !== code) {
        return Response.json(
          { error: 'Invalid verification code' },
          { status: 400 }
        );
      }

      // ✅ تنظيف الرمز بعد النجاح
      await base44.asServiceRole.entities.User.update(user.id, {
        verification_code: null,
        verification_code_expires_at: null
      });
        const {
                verification_code,
                verification_code_expires_at,
                ...safeUser
                } = user;

            return Response.json({
            success: true,
            message: 'Login successful',
            user: safeUser
            });

    //   return Response.json({
    //     success: true,
    //     message: 'Login successful',
    //     user
    //   });
    }

    return Response.json(
      { error: 'Invalid action. Use "send" or "verify"' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Auth error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
