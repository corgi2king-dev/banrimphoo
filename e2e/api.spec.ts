import { test as base, expect, request as pwRequest, type APIRequestContext } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resetDb, sql } from './helpers';
import { PASSWORD, USERS, NOW } from './seed.mjs';

async function as(role: keyof typeof USERS | null): Promise<APIRequestContext> {
  const c = await pwRequest.newContext({ baseURL: process.env.E2E_BASE, ignoreHTTPSErrors: true });
  if (role) expect((await c.post('/api/login', { data: { username: USERS[role][0], password: PASSWORD } })).status()).toBe(200);
  return c;
}
const test = base;
test.beforeEach(() => { resetDb(); });
const body = { upsert: { expenses: [{ id: 'n1', date: '2026-11-01', cat: 'ค่าน้ำ', amount: 1 }] } };
test('ไม่เข้าระบบ: API ตอบ 401 หน้าเว็บไป login', async () => {
  const c = await as(null);
  for (const u of ['/api/data', '/api/version', '/api/history?period=2026-11', '/api/export?period=2026']) expect((await c.get(u)).status(), u).toBe(401);
  expect((await c.post('/api/changes', { data: body })).status()).toBe(401);
  const r = await c.get('/', { maxRedirects: 0 });
  expect(r.status()).toBe(302); expect(r.headers().location).toContain('/login');
  expect(await (await c.get('/api/me')).json()).toMatchObject({ user: null });
});
test('viewer: อ่านได้ เขียนและดูประวัติไม่ได้', async () => {
  const c = await as('viewer');
  expect((await c.get('/api/data?year=2026')).status()).toBe(200);
  expect((await c.get('/api/export?period=2026')).status()).toBe(200);
  expect((await c.post('/api/changes', { data: body })).status()).toBe(403);
  expect((await c.get('/api/history?period=2026-11')).status()).toBe(403);
  const v = await (await c.get('/api/version?since=0')).json();
  expect(v.n).toBeUndefined();
});
test('admin: เพิ่ม แก้ ลบ พร้อมบันทึกประวัติ', async () => {
  const c = await as('admin');
  expect((await c.post('/api/changes', { data: body })).status()).toBe(200);
  expect(sql(`SELECT action FROM history WHERE item_id='n1'`)).toBe('create');
  await c.post('/api/changes', { data: { upsert: { expenses: [{ ...body.upsert.expenses[0], amount: 5 }] } } });
  await c.post('/api/changes', { data: { delete: { expenses: ['n1'] } } });
  expect(sql(`SELECT group_concat(action) FROM history WHERE item_id='n1'`)).toBe('create,update,delete');
  await c.post('/api/changes', { data: { upsert: { rooms: [{ id: 'rz', name: 'z' }] } } });
  expect(sql(`SELECT count(*) FROM history WHERE item_id='rz'`)).toBe('0');
});
test('admin: ข้อมูลผิดถูกปฏิเสธ และไม่บันทึกครึ่งเดียว', async () => {
  const c = await as('admin');
  const bad = async (data: any) => (await c.post('/api/changes', { data })).status();
  expect(await bad({ upsert: { entries: [{ id: 'b', date: 'xx', roomId: 'r1' }] } })).toBe(400);
  expect(await bad({ upsert: { entries: [{ id: 'b', date: '2026-01-01' }] } })).toBe(400);
  expect(await bad({ upsert: { entries: [{ id: 'b', date: '2026-01-01', roomId: 'r1', amount: -5 }] } })).toBe(400);
  expect(await bad({ upsert: { expenses: 'x' } })).toBe(400);
  expect(sql(`SELECT count(*) FROM entries WHERE id='b'`)).toBe('0');
});
test('/api/data ตามปี รวมค้างชำระทุกปีและรายชื่อปี', async () => {
  const c = await as('admin');
  const d = await (await c.get('/api/data?year=2026&unpaid=1')).json();
  expect(d.user).toBe('tadmin'); expect(d.role).toBe('admin');
  expect(d.years).toEqual([2026, 2025]);
  expect(d.unpaid.map((e: any) => e.id)).toContain('o2');
  expect(d.entries.map((e: any) => e.id)).not.toContain('o1');
  const y = await (await c.get('/api/data?year=2025')).json();
  expect(y.entries.map((e: any) => e.id)).toContain('o1');
});
test('/api/version เปลี่ยนเมื่อแก้ข้อมูลหรือห้อง และนับเฉพาะผู้ใช้อื่น', async () => {
  const c = await as('admin');
  const a = await (await c.get('/api/version?since=20')).json();
  expect(a.n).toBe(3);
  await c.post('/api/changes', { data: body });
  const b = await (await c.get('/api/version?since=20')).json();
  expect(b.v).not.toBe(a.v); expect(b.n).toBe(3);
  await c.post('/api/changes', { data: { upsert: { rooms: [{ id: 'r1', name: 'แก้ชื่อ' }] } } });
  expect((await (await c.get('/api/version')).json()).v).not.toBe(b.v);
});
test('/api/history กรองและตรวจพารามิเตอร์', async () => {
  const c = await as('admin');
  const h = await (await c.get('/api/history?period=2026-11&kind=expenses')).json();
  expect(h.total).toBe(1);
  expect((await c.get('/api/history?period=bad')).status()).toBe(400);
  expect((await c.get('/api/history?period=2026-11&kind=bad')).status()).toBe(400);
});
test('/api/export ไฟล์ xlsx ถูกชนิด และตรวจ period', async () => {
  const c = await as('admin');
  const r = await c.get('/api/export?period=2026-11');
  expect(r.headers()['content-type']).toContain('spreadsheetml');
  expect(r.headers()['content-disposition']).toContain('banrimphoo-2026-11.xlsx');
  expect((await c.get('/api/export?period=bad')).status()).toBe(400);
});
test('รหัสผ่านใหม่สั้นเกินถูกปฏิเสธ · เปลี่ยนรหัสแล้วเครื่องอื่นต้องเข้าใหม่', async () => {
  const a = await as('pw'), b = await as('pw');
  expect((await a.post('/api/password', { data: { old: PASSWORD, new: 'short' } })).status()).toBe(400);
  expect((await a.post('/api/password', { data: { old: PASSWORD, new: 'new-password-1' } })).status()).toBe(200);
  expect((await b.get('/api/data')).status()).toBe(401);
  expect((await a.get('/api/data')).status()).toBe(200);
  sql(`UPDATE users SET salt=(SELECT salt FROM users WHERE username='tadmin'), hash=(SELECT hash FROM users WHERE username='tadmin'), iter=(SELECT iter FROM users WHERE username='tadmin') WHERE username='tpw'`);
});
test('ล็อกตามชื่อผู้ใช้เมื่อผิดครบ 10 ครั้ง · สำเร็จแล้วล้างตัวนับ', async () => {
  const c = await as(null);
  sql(`INSERT INTO fails (ip,n,last) VALUES ('u:tadmin',10,strftime('%s','now'));`);
  const r = await c.post('/api/login', { data: { username: 'tadmin', password: PASSWORD } });
  expect(r.status()).toBe(429);
  sql('DELETE FROM fails;');
  await c.post('/api/login', { data: { username: 'tadmin', password: 'wrong-password' } });
  expect(sql(`SELECT n FROM fails WHERE ip='u:tadmin'`)).toBe('1');
  await c.post('/api/login', { data: { username: 'tadmin', password: PASSWORD } });
  expect(sql(`SELECT count(*) FROM fails`)).toBe('0');
});
test('cookie ปลอดภัย และ security header ครบ', async () => {
  const c = await as(null);
  const r = await c.post('/api/login', { data: { username: 'tadmin', password: PASSWORD } });
  const ck = r.headers()['set-cookie'];
  for (const x of ['HttpOnly', 'Secure', 'SameSite=Strict']) expect(ck).toContain(x);
  const h = (await c.get('/login')).headers();
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(h['x-frame-options']).toBe('DENY');
  expect(h['x-content-type-options']).toBe('nosniff');
});
test('Cron ลบเฉพาะประวัติที่เก่ากว่า 1 เดือน', async () => {
  const c = await as(null), t = Date.parse(NOW);
  const old = t / 1000 - 86400 * 90;  // เกิน 1 เดือนแน่นอน ไม่ว่า cron จะใช้เวลาจริงหรือเวลาที่ส่ง
  sql(`INSERT INTO history (at,user,kind,action,item_id) VALUES (${old},'x','entries','create','old');`);
  const n = +sql('SELECT count(*) FROM history');
  expect((await c.get(`/__scheduled?cron=30+17+*+*+*&time=${t}`)).status()).toBe(200);
  expect(+sql('SELECT count(*) FROM history')).toBe(n - 1);
  expect(sql(`SELECT count(*) FROM history WHERE item_id='old'`)).toBe('0');
});
