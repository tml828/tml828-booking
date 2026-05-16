// Through My Lens 828 — Shared Database
// Uses @netlify/blobs with context-provided credentials

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

const empty = () => ({ bookings: [], blockedDates: {}, blockedTimes: {} });

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }

  // Get site ID and token from Netlify context
  const siteID = process.env.SITE_ID || process.env.NETLIFY_SITE_ID || context.clientContext?.custom?.netlify;
  const token = process.env.NETLIFY_API_TOKEN || process.env.NETLIFY_AUTH_TOKEN;

  let store;
  try {
    const { getStore } = require('@netlify/blobs');
    const storeOpts = { name: 'tml828', consistency: 'strong' };
    if (siteID) storeOpts.siteID = siteID;
    if (token) storeOpts.token = token;
    store = getStore(storeOpts);
  } catch(e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Init failed: ' + e.message }) };
  }

  // ── GET ──
  if (event.httpMethod === 'GET') {
    try {
      const raw = await store.get('data').catch(() => null);
      const data = raw ? JSON.parse(raw) : empty();
      return { statusCode: 200, headers: CORS, body: JSON.stringify(data) };
    } catch (e) {
      return { statusCode: 200, headers: CORS, body: JSON.stringify(empty()) };
    }
  }

  // ── POST ──
  if (event.httpMethod === 'POST') {
    try {
      const { action, payload } = JSON.parse(event.body);
      const raw = await store.get('data').catch(() => null);
      const data = raw ? JSON.parse(raw) : empty();

      if (action === 'save_all') {
        if (payload.bookings !== undefined) data.bookings = payload.bookings;
        if (payload.blockedDates !== undefined) data.blockedDates = payload.blockedDates;
        if (payload.blockedTimes !== undefined) data.blockedTimes = payload.blockedTimes;
        await store.set('data', JSON.stringify(data));
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
      }

      if (action === 'save_booking') {
        const idx = data.bookings.findIndex(b => b.id === payload.id);
        if (idx >= 0) data.bookings[idx] = payload;
        else data.bookings.push(payload);
        await store.set('data', JSON.stringify(data));
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
      }

      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Unknown action' }) };
    } catch (e) {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
    }
  }

  return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' };
};
