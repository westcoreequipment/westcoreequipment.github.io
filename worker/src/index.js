const ALLOWED_ORIGIN = 'https://westcoreequipment.com';
const RATE_LIMIT_WINDOW = 60;  // seconds
const RATE_LIMIT_MAX    = 3;   // max submissions per IP per window

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return corsResponse(new Response(null, { status: 204 }));
    }

    if (request.method !== 'POST') {
      return corsResponse(new Response('Method not allowed', { status: 405 }));
    }

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (await isRateLimited(env.RATE_KV, ip)) {
      return corsResponse(new Response('Too many requests — please wait a minute.', { status: 429 }));
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return corsResponse(new Response('Invalid request body', { status: 400 }));
    }

    const { firstName, lastName, company, email, phone, industry, message } = body;

    if (!firstName || !company || !email || !industry) {
      return corsResponse(new Response('Missing required fields', { status: 400 }));
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return corsResponse(new Response('Invalid email address', { status: 400 }));
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Westcore Leads <leads@westcoreequipment.com>',
        to:   ['info@westcoreequipment.com'],
        subject: `New Lead: ${company} (${industry})`,
        html: buildEmail({ firstName, lastName, company, email, phone, industry, message }),
        reply_to: email,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.text();
      console.error('Resend error:', err);
      return corsResponse(new Response('Email delivery failed', { status: 502 }));
    }

    return corsResponse(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
  },
};

function buildEmail({ firstName, lastName, company, email, phone, industry, message }) {
  const row = (label, value) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#5a6685;font-size:13px;white-space:nowrap;vertical-align:top"><b>${label}</b></td><td style="padding:6px 0;font-size:13px;color:#1a2035">${value || '—'}</td></tr>`;

  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <div style="background:#0d1b3e;padding:20px 28px;border-bottom:3px solid #e8a020">
        <h2 style="margin:0;color:#ffffff;font-size:18px">New Lead — Westcore Equipment</h2>
      </div>
      <div style="padding:24px 28px;background:#f4f7fc">
        <table style="border-collapse:collapse;width:100%">
          ${row('Name',     `${firstName} ${lastName || ''}`)}
          ${row('Company',  company)}
          ${row('Email',    `<a href="mailto:${email}">${email}</a>`)}
          ${row('Phone',    phone)}
          ${row('Industry', industry)}
          ${row('Message',  message ? message.replace(/\n/g, '<br>') : null)}
        </table>
      </div>
      <div style="padding:12px 28px;background:#dde4f0;font-size:11px;color:#5a6685">
        Submitted via westcoreequipment.com contact form
      </div>
    </div>
  `;
}

async function isRateLimited(kv, ip) {
  const key = `rl:${ip}`;
  const raw = await kv.get(key);
  const count = raw ? parseInt(raw, 10) : 0;
  if (count >= RATE_LIMIT_MAX) return true;
  await kv.put(key, String(count + 1), { expirationTtl: RATE_LIMIT_WINDOW });
  return false;
}

function corsResponse(response) {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin',  ALLOWED_ORIGIN);
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return new Response(response.body, { status: response.status, headers });
}
