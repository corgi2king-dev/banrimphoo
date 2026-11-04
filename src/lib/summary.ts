import { TH_MON, addDays, be, guestKey, TH_MONTHS, sumAmount } from './format';
import { received } from './pay';
import { stayIndex } from './stay';
import type { Db } from './types';

// ตัวเลขทั้งหมดของหน้าสรุป (ไม่แตะหน้าจอ เทสแยกได้) · m = null คือทั้งปี
export function computeSummary(db: Db, y: number, m: number | null) {
  const inYear = db.entries.filter(e => +e.date.slice(0, 4) === y);
  const sel = m === null ? inYear : inYear.filter(e => +e.date.slice(5, 7) - 1 === m);
  const days = m === null ? ((y % 4 === 0 && y % 100) || y % 400 === 0 ? 366 : 365) : new Date(y, m + 1, 0).getDate();
  const total = sumAmount(sel), paid = sumAmount(sel.filter(e => e.paid));
  const dep = sel.filter(e => !e.paid).reduce((a, e) => a + received(e), 0), got = paid + dep;
  const nights = sel.length;
  const openRooms = db.rooms.filter(r => r.status !== 'closed').length || db.rooms.length;
  const occ = openRooms ? nights / (openRooms * days) * 100 : 0;
  const period = m === null ? `ปี ${be(y)}` : `${TH_MONTHS[m]} ${be(y)}`;
  const exYear = db.expenses.filter(e => +e.date.slice(0, 4) === y);
  const exSel = m === null ? exYear : exYear.filter(e => +e.date.slice(5, 7) - 1 === m);
  const exTotal = sumAmount(exSel), profit = total - exTotal;
  const mSum = (list: { date: string; amount: number }[], i: number) => sumAmount(list.filter(e => +e.date.slice(5, 7) - 1 === i));
  const revM = TH_MON.map((_, i) => mSum(inYear, i)), exM = TH_MON.map((_, i) => mSum(exYear, i));
  const nightsM = TH_MON.map((_, i) => inYear.filter(e => +e.date.slice(5, 7) - 1 === i).length);
  const perDay = m === null ? [] : Array.from({ length: days }, (_, i) => sel.filter(e => +e.date.slice(8) === i + 1));
  const exDay = m === null ? [] : Array.from({ length: days }, (_, i) => sumAmount(exSel.filter(e => +e.date.slice(8) === i + 1)));
  const cats: Record<string, number> = {};
  exSel.forEach(e => cats[e.cat] = (cats[e.cat] || 0) + (+e.amount || 0));
  const catRows = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  const perRoom = db.rooms.map(r => { const es = sel.filter(e => e.roomId === r.id); return { r, sum: sumAmount(es), n: es.length }; }).sort((a, b) => b.sum - a.sum);
  // ลูกค้าที่เช่าเยอะสุด: รวมตามชื่อผู้เข้าพัก เรียงตามจำนวนคืน แล้วตามยอดเงิน
  const { nightOf } = stayIndex(db.entries), gmap = new Map<string, { name: string; nights: number; sum: number; visits: number; rooms: Set<string>; last: string }>();
  sel.forEach(e => {
    const name = (e.guest || '').trim();
    if (!name) return;
    const k = guestKey(name), g = gmap.get(k) || { name, nights: 0, sum: 0, visits: 0, rooms: new Set<string>(), last: '' };
    g.nights++; g.sum += +e.amount || 0; g.rooms.add(db.rooms.find(r => r.id === e.roomId)?.name || '?');
    if (!nightOf(e, addDays(e.date, -1))) g.visits++;  // คืนแรกของการเข้าพัก = มา 1 ครั้ง
    if (e.date > g.last) g.last = e.date;
    gmap.set(k, g);
  });
  const top = [...gmap.values()].sort((a, b) => b.nights - a.nights || b.sum - a.sum).slice(0, 10);
  const noName = sel.filter(e => !(e.guest || '').trim()).length;
  const guests = new Set(sel.map(e => e.guest).filter(Boolean)).size;
  return { inYear, sel, days, total, paid, dep, got, nights, openRooms, occ, period, exSel, exTotal, profit, revM, exM, nightsM, perDay, exDay, catRows, perRoom, top, noName, guests };
}
