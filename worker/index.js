// บ้านริมภู · Cloudflare Worker (แทน serve.py เมื่อรันบน Cloudflare)
// หน้าเว็บอยู่ใน public/ (assets) · ข้อมูลอยู่ใน D1 (binding DB) แยกคอลัมน์ — ดู worker/schema.sql, worker/columns.js
// สิทธิ์: admin ทำได้ทุกอย่าง · viewer ดูอย่างเดียว (ห้าม /api/changes, /api/history)
// API เหมือน serve.py: /api/me, /api/login, /api/logout, /api/password, GET /api/data, POST /api/changes, /api/export
// สร้างผู้ใช้: npm run user (scripts/create-user.mjs) — ไม่มีหน้าตั้งผู้ใช้ครั้งแรกบนเว็บ เพราะเว็บเปิดให้ทุกคนเข้าถึง
// งานรายวัน (cron ใน wrangler.jsonc): ลบประวัติ (เมนูประวัติ) ที่เก่ากว่า 1 เดือน
import { buildXlsx } from './xlsx.js';
import { fromRow, toRow, upsertSql } from './columns.js';

const COOKIE = 'brp_session';
const SESSION_TTL = 7 * 24 * 3600;
const ITER = 100_000; // เพดาน PBKDF2 ของ Workers
const PUBLIC = new Set(['/login', '/login.html', '/scene.js', '/photo.jpg', '/favicon.svg', '/api/me', '/api/login']);
// ไม่ต้องเช็ก session (ไม่แตะ D1) — หน้าล็อกอินเช็กเองผ่าน /api/me แล้ว redirect ฝั่งเบราว์เซอร์
const NO_SESSION = new Set(['/login', '/login.html', '/scene.js', '/photo.jpg', '/favicon.svg', '/api/login']);
// cache: รูป → เก็บไว้ 1 วัน · scene.js / หน้า html → ถามใหม่ทุกครั้งแต่ได้ 304 ถ้าไม่เปลี่ยน (ETag) — แก้ scene.js แล้วเห็นผลทันทีหลัง deploy
const CACHE = { '/scene.js': 'public, no-cache', '/photo.jpg': 'public, max-age=86400', '/favicon.svg': 'public, max-age=86400' };
const KINDS = ['rooms', 'entries', 'expenses'];
const VIEW_ONLY = 'บัญชีนี้ดูได้อย่างเดียว — เพิ่ม/แก้ไข/ลบไม่ได้';
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

// security headers ทุก response · CSP อนุญาต inline เพราะหน้าเว็บเขียน script/style ไว้ในไฟล์ html
const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; "
    + "img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};
function secure(res) {
  const out = new Response(res.body, res);  // redirect/asset response ปิดแก้ header → สร้างใหม่
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) out.headers.set(k, v);
  return out;
}

// กันเดารหัส: ต่อ IP ผิด ≥5 → รอ 2,4,8,… วินาที (สูงสุด 15 นาที) · ต่อชื่อผู้ใช้ ผิด ≥10 → ล็อก 15 นาที
// (ล็อกตามชื่อผู้ใช้กันคนที่สลับหลาย IP) · ไม่ได้ผิดนาน 24 ชม. → นับใหม่
const LOCK_MAX = 15 * 60, FAIL_RESET = 24 * 3600;
const lockWait = (key, n) => key.startsWith('u:') ? (n >= 10 ? LOCK_MAX : 0) : (n >= 5 ? Math.min(LOCK_MAX, 2 ** (n - 4)) : 0);
async function lockedFor(env, keys) {
  let left = 0;
  for (const key of keys) {
    const f = await env.DB.prepare('SELECT n, last FROM fails WHERE ip = ?').bind(key).first();
    if (!f || now() - f.last > FAIL_RESET) continue;
    left = Math.max(left, lockWait(key, f.n) - (now() - f.last));
  }
  return left;
}
const waitText = s => s >= 90 ? `${Math.ceil(s / 60)} นาที` : `${s} วินาที`;

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
  // JOIN users: ผู้ใช้ที่ถูกลบแล้ว session ใช้ไม่ได้ทันที · สิทธิ์ที่ไม่รู้จัก = viewer (ปลอดภัยไว้ก่อน)
  const s = await env.DB.prepare('SELECT s.user, s.exp, u.role FROM sessions s JOIN users u ON u.username = s.user WHERE s.token = ?')
    .bind(await sha256(tok)).first();
  return s && s.exp > now() ? { tok, user: s.user, role: s.role === 'admin' ? 'admin' : 'viewer' } : null;
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
// ประวัติ: อ่านแถวเดิมก่อนแก้ → บันทึก create / update / delete พร้อมข้อมูลก่อน-หลัง (อยู่ใน batch เดียวกับการแก้)
const LOGGED = ['entries', 'expenses'];
async function historyStmts(env, user, up, de) {
  const ids = LOGGED.flatMap(k => [...(up[k] || []).map(x => [k, String(x.id)]), ...(de[k] || []).map(id => [k, String(id)])]);
  if (!ids.length) return [];
  const found = await env.DB.batch(ids.map(([k, id]) => env.DB.prepare(`SELECT * FROM ${k} WHERE id = ?`).bind(id)));
  const old = new Map(ids.map(([k, id], i) => [`${k}:${id}`, found[i].results[0] ? fromRow(k, found[i].results[0]) : null]));
  const t = now(), out = [];
  const log = (k, action, id, date, before, after) => out.push(env.DB.prepare(
    'INSERT INTO history (at, user, kind, action, item_id, item_date, before, after) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(t, user, k, action, id, date, before && JSON.stringify(before), after && JSON.stringify(after)));
  for (const k of LOGGED) {
    for (const x of up[k] || []) {
      const row = toRow(k, x), b = old.get(`${k}:${x.id}`);
      const a = fromRow(k, Object.fromEntries(row.cols.map((c, i) => [c, row.vals[i]])));  // รูปแบบเดียวกับที่อ่านจากตาราง → เทียบได้ตรง
      if (!b) log(k, 'create', x.id, x.date, null, a);
      else if (JSON.stringify(b) !== JSON.stringify(a)) log(k, 'update', x.id, x.date, b, a);
    }
    for (const id of de[k] || []) {
      const b = old.get(`${k}:${id}`);
      if (b) log(k, 'delete', String(id), b.date, b, null);
    }
  }
  return out;
}

async function applyChanges(env, ch, user) {
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
  stmts.push(...await historyStmts(env, user, up, de));
  try { await env.DB.batch(stmts); } catch (e) {  // batch = ทั้งหมดหรือไม่มีเลย
    return /FOREIGN KEY/i.test(e.message) ? 'มีการจองที่อ้างถึงห้องที่ไม่มีแล้ว — โหลดหน้าใหม่แล้วลองอีกครั้ง'
      : /CHECK/i.test(e.message) ? 'ข้อมูลไม่ถูกต้อง (เช่น ตัวเลขติดลบ หรือวันที่ผิดรูปแบบ)' : `บันทึกไม่สำเร็จ: ${e.message}`;
  }
  return null;
}

// ประวัติของเดือนที่ทำรายการ (เวลาไทย UTC+7) ใหม่สุดก่อน · โหลดทีละช่วง: offset / limit (สูงสุด 100) · kind = entries | expenses
// ตอบ { total, rows } — total = จำนวนทั้งหมดของเดือน (ตามตัวกรอง) ใช้คำนวณจำนวนหน้า
async function history(env, q) {
  const period = q.get('period') || '', kind = q.get('kind') || '';
  if (!/^\d{4}-\d{2}$/.test(period)) return json(400, { error: 'period ต้องเป็น YYYY-MM' });
  if (kind && !LOGGED.includes(kind)) return json(400, { error: 'kind ต้องเป็น entries หรือ expenses' });
  const limit = Math.min(100, Math.max(1, +q.get('limit') || 50)), offset = Math.max(0, +q.get('offset') || 0);
  const y = +period.slice(0, 4), m = +period.slice(5) - 1, TZ = 7 * 3600;
  const from = Date.UTC(y, m, 1) / 1000 - TZ, to = Date.UTC(y, m + 1, 1) / 1000 - TZ;
  const where = 'WHERE at >= ? AND at < ?' + (kind ? ' AND kind = ?' : ''), args = kind ? [from, to, kind] : [from, to];
  const [cnt, rows] = await env.DB.batch([
    env.DB.prepare(`SELECT count(*) AS n FROM history ${where}`).bind(...args),
    env.DB.prepare(`SELECT * FROM history ${where} ORDER BY at DESC, id DESC LIMIT ? OFFSET ?`).bind(...args, limit, offset),
  ]);
  return json(200, {
    total: cnt.results[0].n,
    rows: rows.results.map(h => ({ ...h, before: h.before && JSON.parse(h.before), after: h.after && JSON.parse(h.after) })),
  });
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
  const user = String(body.username || '').trim().slice(0, 40), pw = String(body.password || '').slice(0, 200);
  const keys = [`ip:${req.headers.get('CF-Connecting-IP') || 'local'}`, `u:${user.toLowerCase()}`];  // ตาราง fails คอลัมน์ ip = key
  const left = await lockedFor(env, keys);
  if (left > 0) return json(429, { error: `ลองผิดหลายครั้ง รอ ${waitText(left)} แล้วลองใหม่` });
  if (!await checkPw(env, user, pw)) {
    const t = now();
    await env.DB.batch(keys.map(k => env.DB.prepare(
      'INSERT INTO fails (ip, n, last) VALUES (?, 1, ?) ON CONFLICT(ip) DO UPDATE SET n = CASE WHEN ? - last > ? THEN 1 ELSE n + 1 END, last = excluded.last')
      .bind(k, t, t, FAIL_RESET)));
    return json(401, { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
  }
  await env.DB.batch(keys.map(k => env.DB.prepare('DELETE FROM fails WHERE ip = ?').bind(k)));
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
    return secure(await handle(req, env));
  },
  // งานรายวัน: เก็บประวัติไว้แค่ 1 เดือน (นับย้อนจากเวลาที่รัน)
  async scheduled(event, env) {
    const cut = new Date(event.scheduledTime);
    cut.setUTCMonth(cut.getUTCMonth() - 1);
    const r = await env.DB.prepare('DELETE FROM history WHERE at < ?').bind(Math.floor(cut / 1000)).run();
    console.log(`ลบประวัติก่อน ${cut.toISOString()} จำนวน ${r.meta.changes} รายการ`);
  },
};

async function handle(req, env) {
  const url = new URL(req.url), p = url.pathname;
  const s = NO_SESSION.has(p) ? null : await session(req, env);

  if (req.method === 'GET') {
    if (p === '/api/me') return json(200, { user: s?.user || null, role: s?.role || null, setup: false });
    if (!PUBLIC.has(p) && !s) return p.startsWith('/api/') ? json(401, { error: 'login' }) : Response.redirect(new URL('/login', url), 302);
    if (p === '/api/data') return json(200, { ...await loadDb(env), user: s.user, role: s.role });  // รวมชื่อผู้ใช้/สิทธิ์มาด้วย ไม่ต้องเรียก /api/me อีกรอบ
    if (p === '/api/export') return exportXlsx(env, url.searchParams.get('period') || '');
  if (p === '/api/history') return s.role === 'admin' ? history(env, url.searchParams) : json(403, { error: VIEW_ONLY });
    if (p.startsWith('/api/')) return json(404, { error: 'not found' });
    const res = await env.ASSETS.fetch(req);
    const out = new Response(res.body, res);
    out.headers.set('Cache-Control', CACHE[p] || 'private, no-cache');
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
    if (s.role !== 'admin') return json(403, { error: VIEW_ONLY });  // viewer: ห้ามเพิ่ม/แก้/ลบ
    const err = await applyChanges(env, body, s.user);
    return err ? json(400, { error: err }) : json(200, { ok: true });
  }
  return json(404, { error: 'not found' });
}
