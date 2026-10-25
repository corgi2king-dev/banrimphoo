// บ้านริมภู · Cloudflare Worker (แทน serve.py เมื่อรันบน Cloudflare)
// หน้าเว็บอยู่ใน public/ (assets) · ข้อมูลอยู่ใน D1 (binding DB) แยกคอลัมน์ — ดู worker/schema.sql, worker/columns.js
// API เหมือน serve.py: /api/me, /api/login, /api/logout, /api/password, GET /api/data, POST /api/changes, /api/export
// สร้างผู้ใช้: npm run user (scripts/create-user.mjs) — ไม่มีหน้าตั้งผู้ใช้ครั้งแรกบนเว็บ เพราะเว็บเปิดให้ทุกคนเข้าถึง
import { buildXlsx } from './xlsx.js';
import { fromRow, toRow, upsertSql } from './columns.js';

const COOKIE = 'brp_session';
const SESSION_TTL = 7 * 24 * 3600;
const ITER = 100_000; // เพดาน PBKDF2 ของ Workers
const PUBLIC = new Set(['/login', '/login.html', '/scene.js', '/photo.jpg', '/api/me', '/api/login']);
const KINDS = ['rooms', 'entries', 'expenses'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

const json = (status, obj, headers = {}) => new Response(JSON.stringify(obj), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
});
const cookie = (tok, age) => `${COOKIE}=${tok}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
const now = () => Math.floor(Date.now() / 1000);
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const unhex = h => new Uint8Array(h.match(/../g).map(b => parseInt(b, 16)));
const sha256 = async s => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));

async function pbkdf2(pw, saltHex, iter) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(saltHex), iterations: iter }, key, 256));
}
function sameHex(a, b) {
  const x = unhex(a), y = unhex(b);
  return x.length === y.length && crypto.subtle.timingSafeEqual(x, y);
}
async function hashPw(pw) {
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  return { salt, hash: await pbkdf2(pw, salt, ITER), iter: ITER };
}
async function checkPw(env, user, pw) {
  const u = await env.DB.prepare('SELECT salt, hash, iter FROM users WHERE username = ?').bind(user).first();
  if (!u) { await hashPw(pw); return false; } // ใช้เวลาเท่ากัน ไม่บอกว่าชื่อผู้ใช้มีอยู่ไหม
  return sameHex(await pbkdf2(pw, u.salt, u.iter), u.hash);
}

function readCookie(req) {
  const m = (req.headers.get('Cookie') || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return m ? m[1] : null;
}
async function session(req, env) {
  const tok = readCookie(req);
  if (!tok) return null;
  const s = await env.DB.prepare('SELECT user, exp FROM sessions WHERE token = ?').bind(await sha256(tok)).first();
  return s && s.exp > now() ? { tok, user: s.user } : null;
}
async function newSession(env, user) {
  const tok = hex(crypto.getRandomValues(new Uint8Array(32)));
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE exp < ?').bind(now()),
    env.DB.prepare('INSERT INTO sessions (token, user, exp) VALUES (?, ?, ?)').bind(await sha256(tok), user, now() + SESSION_TTL),
  ]);
  return cookie(tok, SESSION_TTL);
}

async function loadDb(env, period = '') {
  const like = period ? `${period}%` : '%';
  const [rooms, entries, expenses] = await env.DB.batch([
    env.DB.prepare('SELECT * FROM rooms ORDER BY pos'),
    env.DB.prepare('SELECT * FROM entries WHERE date LIKE ? ORDER BY date').bind(like),
    env.DB.prepare('SELECT * FROM expenses WHERE date LIKE ? ORDER BY date').bind(like),
  ]);
  return {
    rooms: rooms.results.map(r => fromRow('rooms', r)),
    entries: entries.results.map(r => fromRow('entries', r)),
    expenses: expenses.results.map(r => fromRow('expenses', r)),
  };
}

// แก้ทีละรายการ: {upsert: {kind: [...]}, delete: {kind: [id]}, roomOrder: [id]}
async function applyChanges(env, ch) {
  const up = ch.upsert || {}, de = ch.delete || {}, stmts = [];
  for (const k of KINDS) {
    const ups = up[k] || [], dels = de[k] || [];
    if (!Array.isArray(ups) || !Array.isArray(dels)) return `${k} ต้องเป็น list`;
    for (const x of ups) {
      if (!x || typeof x !== 'object' || !x.id) return `${k} ทุกรายการต้องมี id`;
      if (k !== 'rooms' && !DATE.test(String(x.date || ''))) return `${k} ต้องมี date แบบ YYYY-MM-DD`;
      if (k === 'entries' && !x.roomId) return 'การจองต้องระบุห้อง';
      const { vals } = toRow(k, x);
      stmts.push(env.DB.prepare(upsertSql(k)).bind(...vals, ...(k === 'rooms' ? [9999] : [])));  // ห้องใหม่: pos ตั้งจาก roomOrder ด้านล่าง
    }
    for (const id of dels) stmts.push(env.DB.prepare(`DELETE FROM ${k} WHERE id = ?`).bind(String(id)));
  }
  (ch.roomOrder || []).forEach((id, i) => stmts.push(env.DB.prepare('UPDATE rooms SET pos = ? WHERE id = ?').bind(i, String(id))));
  if (!stmts.length) return null;
  try { await env.DB.batch(stmts); } catch (e) {  // batch = ทั้งหมดหรือไม่มีเลย
    return /FOREIGN KEY/i.test(e.message) ? 'มีการจองที่อ้างถึงห้องที่ไม่มีแล้ว — โหลดหน้าใหม่แล้วลองอีกครั้ง'
      : /CHECK/i.test(e.message) ? 'ข้อมูลไม่ถูกต้อง (เช่น ตัวเลขติดลบ หรือวันที่ผิดรูปแบบ)' : `บันทึกไม่สำเร็จ: ${e.message}`;
  }
  return null;
}

async function exportXlsx(env, period) {
  if (!/^\d{4}(-\d{2})?$/.test(period)) return json(400, { error: 'period ต้องเป็น YYYY หรือ YYYY-MM' });
  const db = await loadDb(env, period), y = +period.slice(0, 4);
  const title = period.length === 7 ? `บ้านริมภู · รายงานค่าเช่า ${TH_MONTHS[+period.slice(5) - 1]} ${y + 543}` : `บ้านริมภู · รายงานค่าเช่า ปี ${y + 543}`;
  return new Response(buildXlsx(db.rooms, db.entries, title, db.expenses), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="banrimphoo-${period}.xlsx"`, 'Cache-Control': 'no-store',
    },
  });
}

async function login(req, env, body) {
  const ip = req.headers.get('CF-Connecting-IP') || 'local';
  const f = await env.DB.prepare('SELECT n, last FROM fails WHERE ip = ?').bind(ip).first() || { n: 0, last: 0 };
  const wait = f.n >= 5 ? Math.min(60, 2 ** (f.n - 4)) : 0;
  if (now() - f.last < wait) return json(429, { error: `ลองผิดหลายครั้ง รอ ${wait - (now() - f.last) + 1} วินาที` });
  const user = String(body.username || '').trim(), pw = String(body.password || '');
  if (!await checkPw(env, user, pw)) {
    await env.DB.prepare('INSERT INTO fails (ip, n, last) VALUES (?, 1, ?) ON CONFLICT(ip) DO UPDATE SET n = n + 1, last = excluded.last')
      .bind(ip, now()).run();
    return json(401, { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
  }
  await env.DB.prepare('DELETE FROM fails WHERE ip = ?').bind(ip).run();
  return json(200, { ok: true }, { 'Set-Cookie': await newSession(env, user) });
}

async function changePassword(env, s, body) {
  const oldPw = String(body.old || ''), newPw = String(body.new || '');
  if (!await checkPw(env, s.user, oldPw)) return json(400, { error: 'รหัสผ่านเดิมไม่ถูกต้อง' });
  if (newPw.length < 8) return json(400, { error: 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร' });
  const h = await hashPw(newPw), mine = await sha256(s.tok);
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET salt = ?, hash = ?, iter = ? WHERE username = ?').bind(h.salt, h.hash, h.iter, s.user),
    env.DB.prepare('DELETE FROM sessions WHERE user = ? AND token != ?').bind(s.user, mine), // เครื่องอื่นต้องล็อกอินใหม่
  ]);
  return json(200, { ok: true });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), p = url.pathname;
    const s = await session(req, env);

    if (req.method === 'GET') {
      if (p === '/api/me') return json(200, { user: s?.user || null, setup: false });
      if (!PUBLIC.has(p) && !s) return p.startsWith('/api/') ? json(401, { error: 'login' }) : Response.redirect(new URL('/login', url), 302);
      if ((p === '/login' || p === '/login.html') && s) return Response.redirect(new URL('/', url), 302);
      if (p === '/api/data') return json(200, await loadDb(env));
      if (p === '/api/export') return exportXlsx(env, url.searchParams.get('period') || '');
      if (p.startsWith('/api/')) return json(404, { error: 'not found' });
      const res = await env.ASSETS.fetch(req);
      const out = new Response(res.body, res);
      out.headers.set('Cache-Control', 'no-store');
      return out;
    }

    if (req.method !== 'POST') return json(405, { error: 'method not allowed' });
    let body;
    try { body = await req.json(); } catch { body = {}; }
    if (p === '/api/login') return login(req, env, body);
    if (!s) return json(401, { error: 'login' });
    if (p === '/api/logout') {
      await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(await sha256(s.tok)).run();
      return json(200, { ok: true }, { 'Set-Cookie': cookie('', 0) });
    }
    if (p === '/api/password') return changePassword(env, s, body);
    if (p === '/api/changes') {
      const err = await applyChanges(env, body);
      return err ? json(400, { error: err }) : json(200, { ok: true });
    }
    return json(404, { error: 'not found' });
  },
};
