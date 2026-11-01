import { addDays, guestKey } from './format';
import type { Entry } from './types';

// ข้อมูลเก็บเป็นรายคืน → การเข้าพักต่อเนื่อง = คืนติดกัน ห้องเดียวกัน (group เดียวกัน หรือชื่อผู้เข้าพักเดียวกัน)
export const sameStay = (a: Entry, b: Entry) => a.roomId === b.roomId && (a.group ? a.group === b.group : guestKey(a.guest) === guestKey(b.guest));
export function stayIndex(entries: Entry[]) {
  const idx = new Map<string, Entry[]>();
  entries.forEach(e => { if (!idx.has(e.date)) idx.set(e.date, []); idx.get(e.date)!.push(e); });
  const nightOf = (e: Entry, key: string) => (idx.get(key) || []).find(x => sameStay(x, e));
  const stayOf = (e: Entry) => {  // ทุกคืนของการเข้าพักนี้ (เรียงวัน)
    let start = e.date, end = e.date;
    while (nightOf(e, addDays(start, -1))) start = addDays(start, -1);
    while (nightOf(e, addDays(end, 1))) end = addDays(end, 1);
    const nights: Entry[] = [];
    for (let k = start; k <= end; k = addDays(k, 1)) nights.push(nightOf(e, k)!);
    return { start, end, nights, out: addDays(end, 1) };
  };
  return { nightOf, stayOf };
}
