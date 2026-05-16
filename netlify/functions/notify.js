// Through My Lens 828 — SMS Notification Function
// Sends texts to Noha and customers via Twilio
//
// Set these in Netlify → Site Settings → Environment Variables:
//   TWILIO_SID    → Account SID from twilio.com/console
//   TWILIO_TOKEN  → Auth Token from twilio.com/console
//   TWILIO_FROM   → Your Twilio phone number e.g. +12165550100
//   NOHA_PHONE    → Noha's phone number e.g. +12165550100
//   APP_URL       → Your Netlify URL

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { type, booking } = payload;

  const TWILIO_SID   = process.env.TWILIO_SID;
  const TWILIO_TOKEN = process.env.TWILIO_TOKEN;
  const TWILIO_FROM  = process.env.TWILIO_FROM;
  const NOHA_PHONE   = process.env.NOHA_PHONE;
  const APP_URL      = process.env.APP_URL || '';

  const sl       = booking.sesLabel || 'Session';
  const pkg      = booking.pkgName ? ` · ${booking.pkgName}` : '';
  const tl       = booking.timeLabel || booking.time || '';
  const dateStr  = booking.dateLabel || booking.date || '';
  const custName = `${booking.form.firstName} ${booking.form.lastName}`;
  const custPhone = booking.form.phone?.replace(/\D/g, '');
  const custPhoneE164 = custPhone?.length === 10
    ? `+1${custPhone}`
    : custPhone ? `+${custPhone}` : null;
  const ref = `#${booking.id?.slice(-6) || '000000'}`;

  const errors = [];

  async function sendSMS(to, body) {
    if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM || !to) {
      errors.push(`SMS skipped — missing Twilio config or phone number`);
      return;
    }
    try {
      const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64');
      const r = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ To: to, From: TWILIO_FROM, Body: body }).toString(),
        }
      );
      if (!r.ok) {
        const t = await r.text();
        errors.push(`SMS to ${to} failed: ${r.status} — ${t}`);
      }
    } catch (e) {
      errors.push(`SMS error: ${e.message}`);
    }
  }

  // ── NEW BOOKING ──
  if (type === 'new_booking') {

    // Text to Noha
    await sendSMS(
      NOHA_PHONE,
      `📸 NEW BOOKING\n` +
      `${custName}\n` +
      `${sl}${pkg}\n` +
      `${dateStr} at ${tl}\n` +
      `📱 ${booking.form.phone}\n` +
      `Ref ${ref}\n` +
      `${APP_URL}`
    );

    // Text to customer
    if (custPhoneE164) {
      await sendSMS(
        custPhoneE164,
        `Hi ${booking.form.firstName}! Your ${sl} booking request with Through My Lens 828 has been received for ${dateStr} at ${tl}. Ref ${ref}. Noha will confirm shortly. Questions? ${NOHA_PHONE || ''}`
      );
    }
  }

  // ── BOOKING CONFIRMED ──
  if (type === 'confirmed') {

    // Text to customer
    if (custPhoneE164) {
      await sendSMS(
        custPhoneE164,
        `Hi ${booking.form.firstName}! Your ${sl} session with Through My Lens 828 is CONFIRMED ✓ for ${dateStr} at ${tl}. See you then! 📷 Questions? ${NOHA_PHONE || ''}`
      );
    }

    // Text to Noha
    await sendSMS(
      NOHA_PHONE,
      `✅ CONFIRMED\n${custName}\n${sl}${pkg}\n${dateStr} at ${tl}\nRef ${ref}`
    );
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      errors: errors.length ? errors : undefined,
    }),
  };
};
