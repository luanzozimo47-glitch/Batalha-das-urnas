const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
const TIKTOK_USERNAME = (process.env.TIKTOK_USERNAME || '').replace(/^@/, '').trim();
// Configure these after checking the exact gift names/IDs from the live event feed.
const RED_GIFT_IDS = new Set((process.env.RED_GIFT_IDS || '').split(',').map(x => x.trim()).filter(Boolean));
const WHITE_GIFT_IDS = new Set((process.env.WHITE_GIFT_IDS || '').split(',').map(x => x.trim()).filter(Boolean));
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
let state = { blue: 0, red: 0, total: 0, startedAt: Date.now(), running: true, connected: false, lastEvent: null };
const seen = new Set();
const clients = new Set();
let connection = null;

function broadcast() {
  const data = `data: ${JSON.stringify(state)}\n\n`;
  for (const res of clients) res.write(data);
}
function applyGift(side, gift, uniqueId) {
  if (!uniqueId || seen.has(uniqueId)) return false;
  seen.add(uniqueId);
  if (seen.size > 50000) seen.clear();
  const count = Math.max(1, Number(gift.repeatCount || 1));
  state[side] += count;
  state.total += count;
  state.lastEvent = { side, giftName: gift.giftName || 'Presente configurado', count, at: Date.now() };
  broadcast();
  return true;
}
app.get('/api/state', (_req, res) => res.json(state));
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.write(`data: ${JSON.stringify(state)}\n\n`);
  clients.add(res);
  req.on('close', () => clients.delete(res));
});
app.post('/api/admin/score', (req, res) => {
  if (!ADMIN_TOKEN || req.get('authorization') !== `Bearer ${ADMIN_TOKEN}`) return res.status(401).json({ error: 'Admin token inválido ou não configurado.' });
  const { side, amount } = req.body || {};
  if (!['blue', 'red'].includes(side) || !Number.isInteger(amount) || amount < 0) return res.status(400).json({ error: 'Informe side blue/red e amount inteiro >= 0.' });
  state[side] = amount;
  state.total = state.blue + state.red;
  broadcast();
  res.json(state);
});
app.post('/api/admin/timer', (req, res) => {
  if (!ADMIN_TOKEN || req.get('authorization') !== `Bearer ${ADMIN_TOKEN}`) return res.status(401).json({ error: 'Admin token inválido ou não configurado.' });
  const { running, reset } = req.body || {};
  if (reset) state.startedAt = Date.now();
  if (typeof running === 'boolean') state.running = running;
  broadcast(); res.json(state);
});

app.get('/api/tiktok/status', (_req, res) => res.json({ configured: Boolean(TIKTOK_USERNAME), connected: state.connected, username: TIKTOK_USERNAME || null, note: 'Conector comunitário não oficial; precisa ser testado com uma LIVE real.' }));

async function connectTikTok() {
  if (!TIKTOK_USERNAME) {
    console.log('TikTok não conectado: defina TIKTOK_USERNAME nas variáveis de ambiente.');
    return;
  }
  try {
    connection = new WebcastPushConnection(TIKTOK_USERNAME, { processInitialData: false, enableExtendedGiftInfo: true });
    connection.on('connected', () => { state.connected = true; broadcast(); console.log('Conectado ao TikTok LIVE de @' + TIKTOK_USERNAME); });
    connection.on('disconnected', () => { state.connected = false; broadcast(); });
    connection.on('error', err => console.error('Erro TikTok LIVE:', err?.message || err));
    connection.on('gift', data => {
      // Count only configured gifts. Streak gifts are counted on streak end to avoid duplicate increments.
      if (data.giftType === 1 && !data.repeatEnd) return;
      const giftId = String(data.giftId ?? '');
      const uniqueId = String(data.msgId || data.logId || data.common?.msgId || crypto.createHash('sha256').update(JSON.stringify([data.userId, giftId, data.repeatCount, data.timestamp])).digest('hex'));
      const gift = { giftName: data.giftName, repeatCount: data.repeatCount || 1 };
      if (RED_GIFT_IDS.has(giftId)) applyGift('blue', gift, uniqueId);
      else if (WHITE_GIFT_IDS.has(giftId)) applyGift('red', gift, uniqueId);
    });
    await connection.connect();
  } catch (err) {
    state.connected = false; broadcast(); console.error('Não foi possível conectar ao TikTok LIVE:', err?.message || err);
  }
}
app.listen(PORT, () => { console.log(`Batalha das Urnas rodando na porta ${PORT}`); connectTikTok(); });
