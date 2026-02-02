
const HOOK = (Deno.env.get("ZAPIER_WEBHOOK_URL") || "").trim();
const ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const JSON_HEADERS = { "Content-Type": "application/json" };

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());
}

Deno.serve(async (req) => {
  // Basic preflight and method guards
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: JSON_HEADERS });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "POST only" }), {
      status: 405,
      headers: JSON_HEADERS,
    });
  }

  // Optional origin allowlist for public apps
  const origin = req.headers.get("Origin");
  if (origin && ORIGINS.length && !ORIGINS.includes(origin)) {
    return new Response(JSON.stringify({ ok: false, error: "Origin not allowed" }), {
      status: 403,
      headers: JSON_HEADERS,
    });
  }

  if (!HOOK.startsWith("https://hooks.zapier.com/")) {
    return new Response(JSON.stringify({ ok: false, error: "Missing ZAPIER_WEBHOOK_URL" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }

  try {
    const payload = await req.json().catch(() => ({}));

    // Required fields for meeting workflows
    const client_email = String(payload.client_email || "");
    const start_iso = String(payload.start_iso || "");
    if (!isValidEmail(client_email)) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid client_email" }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }
    if (!start_iso || Number.isNaN(Date.parse(start_iso))) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid start_iso" }), {
        status: 400,
        headers: JSON_HEADERS,
      });
    }

    // Idempotency key helps avoid duplicate events in Zapier
    const meeting_id = String(payload.meeting_id || `${client_email}|${start_iso}`);

    // Clean, consistent payload for Zapier mapping
    const out = {
      event: payload.event ?? "meeting_scheduled",
      meeting_id,
      client_name: String(payload.client_name || "Unknown"),
      client_email,
      start_iso,
      duration_minutes: Number(payload.duration_minutes ?? 30),
      notes: String(payload.notes || ""),
      // Pass through all custom fields
      customer_id: String(payload.customer_id || ""),
      document_uri: String(payload.document_uri || ""),
      document_name: String(payload.document_name || ""),
      document_download_url: String(payload.document_download_url || ""),
      uploaded_by_email: String(payload.uploaded_by_email || ""),
      app_env: String(payload.app_env || "prod"),
      timestamp: new Date().toISOString(),
    };

    // Server-side POST to Zapier
    const res = await fetch(HOOK, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Base44-Zapier-Relay/1.0",
      },
      body: JSON.stringify(out),
    });

    const text = await res.text();

    // Echo upstream status for transparent debugging
    const status = res.status;
    const body = text.slice(0, 200); // do not flood logs
    return new Response(
      JSON.stringify({ ok: res.ok, upstream_status: status, upstream_body: body }),
      { status: res.ok ? 200 : 502, headers: JSON_HEADERS }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err?.message || err) }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
});
