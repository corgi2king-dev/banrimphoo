// ข้อมูลเทสชุดเดียว ใช้ทั้งเว็บเดิมและเว็บใหม่ · วันนี้ของเทสคงที่ = อา. 15 พ.ย. 2569 เวลาไทย
import { pbkdf2Sync } from 'node:crypto';
export const NOW = '2026-11-15T10:00:00+07:00', TODAY = '2026-11-15';
export const PASSWORD = 'test-only-password';
const nowSec = Date.parse(NOW) / 1000;
export const USERS = { admin: ['tadmin', 'admin'], viewer: ['tviewer', 'viewer'], pw: ['tpw', 'admin'], other: ['tother', 'admin'] };
export const rooms = [
  { id: 'r1', name: '1', type: 'ห้องเตียงเดี่ยว', price: 500, capacity: 1, status: 'open', note: 'ชั้นล่าง' },
  { id: 'r2', name: '2', type: 'ห้องเตียงคู่', price: 700, capacity: 2, status: 'open', note: '' },
  { id: 'r3', name: '3', type: 'ห้องแฟมิลี่', price: 900, capacity: 4, status: 'open', note: '' },
  { id: 'r4', name: '10', type: 'ห้องแอร์', price: 800, capacity: 2, status: 'open', note: '' },
  { id: 'r5', name: 'ปิดซ่อม', type: 'ห้องพัดลม', price: 300, capacity: 2, status: 'closed', note: 'ซ่อมหลังคา' },
];
const E = (id, date, roomId, guest, amount, paid, x = {}) => ({ id, date, roomId, guest, amount, paid, deposit: 0, phone: null, channel: null, note: null, group: null, ...x });
export const entries = [
  E('e1', '2026-11-14', 'r1', 'สมชาย', 500, true, { phone: '0811111111', channel: 'โอน' }),
  E('e2', '2026-11-15', 'r1', 'สมชาย', 500, true, { phone: '0811111111', channel: 'โอน' }),
  E('e3', '2026-11-16', 'r1', 'สมชาย', 500, true, { phone: '0811111111', channel: 'โอน' }),
  E('e4', '2026-11-15', 'r2', 'สมหญิง', 700, false, { deposit: 300, phone: '0822222222', channel: 'เงินสด' }),
  E('e5', '2026-11-15', 'r3', '', 900, false),
  ...['r1', 'r2', 'r3', 'r4'].map((r, i) => E(`f${i}`, '2026-11-20', r, `เต็ม${i}`, rooms[i].price, true)),
  ...['r1', 'r2', 'r3', 'r4'].map((r, i) => E(`u${i}`, '2026-11-21', r, `ไม่ครบ${i}`, rooms[i].price, i < 3)),
  E('g1', '2026-11-25', 'r2', 'กลุ่ม', 700, false, { group: 'grp1' }),
  E('g2', '2026-11-26', 'r2', 'กลุ่ม', 700, false, { group: 'grp1' }),
  E('p1', '2026-11-10', 'r4', 'พักต่อ', 800, true, { phone: '0899999999' }),
  E('o1', '2025-07-20', 'r1', 'ลูกค้าเก่า', 500, true),
  E('o2', '2025-08-01', 'r2', 'เก่าค้าง', 700, false, { deposit: 200 }),
];
const X = (id, date, cat, amount, channel = null, note = null) => ({ id, date, cat, amount, channel, note });
export const expenses = [
  X('x1', '2026-11-15', 'ค่าน้ำ', 300, 'โอน', 'บิลน้ำ'), X('x2', '2026-11-15', 'ค่าไฟ', 1200),
  X('x3', '2026-11-03', 'ค่าแม่บ้าน', 500), X('x4', '2026-11-05', 'ค่าแปลก', 100), X('x5', '2025-07-01', 'ค่าน้ำ', 250),
];
const base = entries[3], ex = expenses[0];
export const history = [
  ...Array.from({ length: 20 }, (_, i) => ({ id: i + 1, at: nowSec - 3600 * 24 * 2 - i * 60, user: 'tadmin', kind: 'entries', action: 'create', item_id: 'e4', item_date: base.date, before: null, after: { ...base, guest: `สร้าง${i + 1}` } })),
  { id: 21, at: nowSec - 3600 * 24, user: 'tother', kind: 'expenses', action: 'create', item_id: 'x1', item_date: ex.date, before: null, after: ex },
  { id: 22, at: nowSec - 120, user: 'tother', kind: 'entries', action: 'delete', item_id: 'e5', item_date: '2026-11-15', before: entries[4], after: null },
  { id: 23, at: nowSec - 60, user: 'tother', kind: 'entries', action: 'update', item_id: 'e4', item_date: base.date, before: { ...base, amount: 600, paid: false, deposit: 0 }, after: base },
];
const q = v => v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`;
export function usersSql() {
  const salt = '00112233445566778899aabbccddeeff', iter = 1000;
  const hash = pbkdf2Sync(PASSWORD, Buffer.from(salt, 'hex'), iter, 32, 'sha256').toString('hex');
  return `DELETE FROM users;` + Object.values(USERS).map(([u, role]) => `INSERT INTO users (username,salt,hash,iter,role) VALUES (${q(u)},${q(salt)},${q(hash)},${iter},${q(role)});`).join('');
}
export function dataSql() {
  return `PRAGMA foreign_keys=OFF;DELETE FROM entries;DELETE FROM expenses;DELETE FROM rooms;DELETE FROM history;DELETE FROM fails;DELETE FROM sqlite_sequence WHERE name='history';`
    + rooms.map((r, i) => `INSERT INTO rooms (id,pos,name,type,price,capacity,status,note) VALUES (${[r.id, i, r.name, r.type, r.price, r.capacity, r.status, r.note].map(q).join(',')});`).join('')
    + entries.map(e => `INSERT INTO entries (id,date,room_id,guest,phone,amount,paid,deposit,channel,note,grp) VALUES (${[e.id, e.date, e.roomId, e.guest, e.phone, e.amount, e.paid ? 1 : 0, e.deposit, e.channel, e.note, e.group].map(q).join(',')});`).join('')
    + expenses.map(x => `INSERT INTO expenses (id,date,cat,amount,channel,note) VALUES (${[x.id, x.date, x.cat, x.amount, x.channel, x.note].map(q).join(',')});`).join('')
    + history.map(h => `INSERT INTO history (id,at,user,kind,action,item_id,item_date,before,after) VALUES (${[h.id, h.at, h.user, h.kind, h.action, h.item_id, h.item_date, h.before && JSON.stringify(h.before), h.after && JSON.stringify(h.after)].map(q).join(',')});`).join('');
}
