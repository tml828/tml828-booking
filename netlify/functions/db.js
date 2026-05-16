// Through My Lens 828 — Shared Database Function
// Uses Netlify Blobs for cross-device data storage
// All bookings, blocked dates, and blocked times stored in the cloud

const { getStore } = require('@netlify/blobs');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }

  const store = getStore('tml828');

  // ── GET — load all data ──
  if (event.httpMethod === 'GET') {
    try {
      const bookings = await store.get('bookings', { type: 'json' }).catch(() => []);
      const blockedDates = await store.get('blockedDates', { type: 'json' }).catch(() => ({}));
      const blockedTimes = await store.get('blockedTimes', { type: 'json' }).catch(() => ({}));
      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ bookings: bookings||[], blockedDates: blockedDates||{}, blockedTimes: blockedTimes||{} }),
      };
    } catch (e) {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
    }
  }

  // ── POST — save data ──
  if (event.httpMethod === 'POST') {
    try {
      const { action, payload } = JSON.parse(event.body);

      if (action === 'save_booking') {
        const bookings = await store.get('bookings', { type: 'json' }).catch(() => []);
        const list = bookings || [];
        const idx = list.findIndex(b => b.id === payload.id);
        if (idx >= 0) list[idx] = payload;
        else list.push(payload);
        await store.setJSON('bookings', list);
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
      }

      if (action === 'update_booking') {
        const bookings = await store.get('bookings', { type: 'json' }).catch(() => []);
        const list = bookings || [];
        const idx = list.findIndex(b => b.id === payload.id);
        if (idx >= 0) list[idx] = { ...list[idx], ...payload };
        await store.setJSON('bookings', list);
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
      }

      if (action === 'save_blocked') {
        await store.setJSON('blockedDates', payload.blockedDates);
        await store.setJSON('blockedTimes', payload.blockedTimes);
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
      }

      if (action === 'save_all') {
        if (payload.bookings) await store.setJSON('bookings', payload.bookings);
        if (payload.blockedDates) await store.setJSON('blockedDates', payload.blockedDates);
        if (payload.blockedTimes) await store.setJSON('blockedTimes', payload.blockedTimes);
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
      }

      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Unknown action' }) };
    } catch (e) {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
    }
  }

  return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' };
};
