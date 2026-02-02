import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function getYearParts(iso) {
  const d = iso ? new Date(iso) : new Date();
  const full = d.getFullYear();
  const yy = String(full).slice(-2);
  return { full: String(full), yy };
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

Deno.serve(async (req) => {
  try {
    // No user auth required; used internally by other backend functions
    createClientFromRequest(req); // initialize for context/logging

    let payload = {};
    try { payload = await req.json(); } catch { payload = {}; }

    const branchId = payload?.branch_id;
    const date = payload?.date || new Date().toISOString();
    if (!branchId) return Response.json({ error: 'branch_id is required' }, { status: 400 });

    const { full, yy } = getYearParts(date);

    const kv = await Deno.openKv();
    const key = ["wo_counter", branchId, String(full)];

    // Atomic CAS loop
    for (let attempt = 0; attempt < 10; attempt++) {
      const entry = await kv.get<number>(key);
      const current = typeof entry.value === 'number' ? entry.value : 0;
      const nextVal = current + 1;

      const tx = kv.atomic();
      tx.check(entry); // ensure no one changed since read (if nonexistent, ensures still nonexistent)
      tx.set(key, nextVal);
      const res = await tx.commit();
      if (res.ok) {
        const formatted = String(nextVal).padStart(4, '0') + '/' + yy;
        return Response.json(formatted);
      }
      await sleep(10 + Math.floor(Math.random() * 40));
    }

    return Response.json({ error: 'Counter busy, please retry' }, { status: 503 });
  } catch (error) {
    return Response.json({ error: error?.message || 'Failed to get next WO number atomically' }, { status: 500 });
  }
});