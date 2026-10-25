// แปลงข้อมูลหน้าเว็บ (object) ⇄ แถวในตาราง D1 (แยกคอลัมน์) — ช่องที่ไม่รู้จักเก็บรวมใน extra (JSON)
// [ชื่อในหน้าเว็บ, คอลัมน์, ชนิด]  ชนิด: text | num | int | bool
export const COLS = {
  rooms: [['name', 'name', 'text'], ['type', 'type', 'text'], ['price', 'price', 'num'], ['capacity', 'capacity', 'int'],
    ['status', 'status', 'text'], ['note', 'note', 'text']],
  entries: [['date', 'date', 'text'], ['roomId', 'room_id', 'text'], ['guest', 'guest', 'text'], ['amount', 'amount', 'num'],
    ['paid', 'paid', 'bool'], ['deposit', 'deposit', 'num'], ['channel', 'channel', 'text'], ['note', 'note', 'text'], ['group', 'grp', 'text']],
  expenses: [['date', 'date', 'text'], ['cat', 'cat', 'text'], ['amount', 'amount', 'num'], ['channel', 'channel', 'text'], ['note', 'note', 'text']],
};
const DEFAULTS = { status: 'open', name: '', cat: 'อื่น ๆ' };

function toDb(v, type, key) {
  if (type === 'bool') return v ? 1 : 0;
  if (type === 'num') return Number(v) || 0;              // ติดลบ → ตาราง CHECK ปฏิเสธ (ไม่แอบแก้เป็น 0)
  if (type === 'int') return Math.round(Number(v) || 0);
  return v === undefined || v === null ? (DEFAULTS[key] ?? null) : String(v);
}

// object → { cols, vals } (รวม id และ extra)
export function toRow(kind, obj) {
  const known = new Set(['id', ...COLS[kind].map(c => c[0])]);
  const rest = Object.fromEntries(Object.entries(obj).filter(([k]) => !known.has(k)));
  return {
    cols: ['id', ...COLS[kind].map(c => c[1]), 'extra'],
    vals: [String(obj.id), ...COLS[kind].map(([k, , t]) => toDb(obj[k], t, k)), Object.keys(rest).length ? JSON.stringify(rest) : null],
  };
}

// แถว → object แบบที่หน้าเว็บใช้ (ไม่ใส่ช่องที่ว่าง/NULL)
export function fromRow(kind, row) {
  const obj = { id: row.id };
  for (const [k, col, t] of COLS[kind]) {
    const v = row[col];
    if (v === null || v === undefined) continue;
    obj[k] = t === 'bool' ? !!v : v;
  }
  return row.extra ? { ...JSON.parse(row.extra), ...obj } : obj;
}

// INSERT ... ON CONFLICT DO UPDATE (ไม่ใช้ REPLACE เพราะจะลบแถวเดิม → การจองของห้องโดนลบตาม CASCADE)
export function upsertSql(kind) {
  const cols = ['id', ...COLS[kind].map(c => c[1]), 'extra'];
  const insCols = kind === 'rooms' ? [...cols, 'pos'] : cols;
  const ph = insCols.map(() => '?').join(', ');
  const set = cols.filter(c => c !== 'id').map(c => `${c} = excluded.${c}`).join(', ');
  return `INSERT INTO ${kind} (${insCols.join(', ')}) VALUES (${ph}) ON CONFLICT(id) DO UPDATE SET ${set}`;
}
