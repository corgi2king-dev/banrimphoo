import { describe, expect, it } from 'vitest';
import { addDays, baht, guestKey, monthCells, niceMax, parseYmd, shortTh, short, thDate, ymd } from '@/lib/format';
import { payState, payText, received, remaining, spreadDeposit } from '@/lib/pay';
import { sameStay, stayIndex } from '@/lib/stay';
import { changesOf, dayLabel, roomNameOf } from '@/lib/history';
import { exColor, roomColor, roomTypeKey } from '@/lib/rooms';
import { computeSummary } from '@/lib/summary';
import { versionText } from '@/lib/version';
import type { Db, Entry } from '@/lib/types';

const E = (x: Partial<Entry>): Entry => ({ id: 'a', date: '2026-11-15', roomId: 'r1', amount: 500, ...x });
describe('format', () => {
  it('เงินปัดเศษและค่าว่าง', () => { expect(baht(1234.6)).toBe('฿1,235'); expect(baht(undefined)).toBe('฿0'); });
  it('วันที่ข้ามเดือน ปี และปีอธิกสุรทิน', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01'); expect(addDays('2028-02-28', 1)).toBe('2028-02-29'); expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(ymd(parseYmd('2026-01-05'))).toBe('2026-01-05');
  });
  it('ข้อความวันที่ไทย', () => { expect(thDate('2026-11-15')).toBe('อา. 15 พฤศจิกายน 2569'); expect(shortTh('2026-02-03')).toBe('3 ก.พ.'); });
  it('ชื่อแขกไม่สนช่องว่างและตัวพิมพ์', () => expect(guestKey('  Som   CHAI ')).toBe('som chai'));
  it('ปฏิทินครบสัปดาห์ เริ่มวันอาทิตย์', () => {
    const c = monthCells(2026, 10);
    expect(c.length % 7).toBe(0); expect(c[0].getDay()).toBe(0); expect(ymd(c[0])).toBe('2026-11-01');
    expect(monthCells(2026, 1).length % 7).toBe(0);
  });
  it('แกนกราฟ', () => { expect(niceMax(0)).toBe(0); expect(niceMax(130)).toBe(200); expect(niceMax(2300)).toBe(2500); expect(short(1500)).toBe('1.5k'); expect(short(2000000)).toBe('2M'); expect(short(40)).toBe('40'); });
});
describe('pay', () => {
  it('สถานะและยอด', () => {
    expect(payState(E({ paid: true }))).toBe('ok'); expect(payState(E({ deposit: 100 }))).toBe('dep'); expect(payState(E({}))).toBe('due');
    expect(received(E({ deposit: 100 }))).toBe(100); expect(remaining(E({ deposit: 100 }))).toBe(400);
    expect(received(E({ paid: true, deposit: 100 }))).toBe(500); expect(remaining(E({ paid: true }))).toBe(0);
    expect(received(E({ deposit: 900 }))).toBe(500);
  });
  it('ข้อความสถานะ', () => { expect(payText(E({ paid: true }))).toBe('ชำระแล้ว'); expect(payText(E({ deposit: 100 }))).toBe('มัดจำ ฿100'); expect(payText(E({}))).toBe('ค้างชำระ'); });
  it('แบ่งมัดจำให้คืนแรกตามลำดับวัน', () => {
    const a = E({ id: 'a', date: '2026-11-02' }), b = E({ id: 'b', date: '2026-11-01' });
    spreadDeposit([a, b], 700);
    expect(b.deposit).toBe(500); expect(a.deposit).toBe(200); expect(a.paid).toBe(false);
  });
});
describe('stay', () => {
  it('รวมคืนต่อเนื่องด้วยชื่อ และแยกเมื่อชื่อหรือห้องต่าง', () => {
    const a = E({ id: 'a', date: '2026-11-14', guest: 'ก' }), b = E({ id: 'b', date: '2026-11-15', guest: ' ก ' }), c = E({ id: 'c', date: '2026-11-16', guest: 'ข' });
    const { stayOf, nightOf } = stayIndex([a, b, c]);
    expect(stayOf(b).nights.map(n => n.id)).toEqual(['a', 'b']); expect(stayOf(b).out).toBe('2026-11-16');
    expect(stayOf(c).nights).toHaveLength(1); expect(nightOf(a, '2026-11-13')).toBeUndefined();
    expect(sameStay(a, E({ roomId: 'r2', guest: 'ก' }))).toBe(false);
  });
  it('group ใช้เหนือชื่อ', () => expect(sameStay(E({ group: 'g', guest: 'ก' }), E({ group: 'g', guest: 'ข' }))).toBe(true));
});
describe('history', () => {
  const rooms = [{ id: 'r1', name: '1' }, { id: 'r2', name: '2' }];
  it('บอกเฉพาะช่องที่เปลี่ยน รวมสถานะ', () => {
    const c = changesOf('entries', E({}), E({ amount: 700, paid: true, roomId: 'r2' }), rooms);
    expect(c).toEqual([{ label: 'ห้อง', from: 'ห้อง 1', to: 'ห้อง 2' }, { label: 'จำนวนเงิน', from: '฿500', to: '฿700' }, { label: 'สถานะ', from: 'ค้างชำระ', to: 'ชำระแล้ว' }]);
    expect(changesOf('entries', E({}), E({}), rooms)).toEqual([]);
  });
  it('ห้องที่ลบแล้ว และหัวกลุ่มวัน', () => {
    expect(roomNameOf(rooms, 'x')).toBe('(ห้องที่ลบแล้ว)');
    const now = new Date(2026, 10, 15, 8);
    expect(dayLabel(new Date(2026, 10, 15, 1), now).main).toBe('วันนี้');
    expect(dayLabel(new Date(2026, 10, 14, 23), now).main).toBe('เมื่อวาน');
    expect(dayLabel(new Date(2026, 10, 12), now)).toEqual({ main: 'พฤ. 12 พ.ย.', small: '' });
  });
});
describe('rooms', () => {
  it('รูปตามคำในชื่อประเภท', () => { expect(roomTypeKey('บ้านครอบครัว')).toBe('family'); expect(roomTypeKey('เตียงคู่แอร์')).toBe('double'); expect(roomTypeKey('อื่น')).toBe(''); expect(roomTypeKey()).toBe(''); });
  it('สีห้องวนซ้ำ และหมวดไม่รู้จักใช้สีอื่น ๆ', () => {
    const db: Db = { rooms: Array.from({ length: 9 }, (_, i) => ({ id: 'r' + i, name: '' })), entries: [], expenses: [] };
    expect(roomColor(db, 'r8')).toBe('var(--c1)'); expect(exColor('ไม่มี')).toBe('var(--c8)');
  });
});
describe('summary', () => {
  const db: Db = {
    rooms: [{ id: 'r1', name: '1' }, { id: 'r2', name: '2' }, { id: 'r3', name: '3', status: 'closed' }],
    entries: [E({ id: 'a', date: '2026-11-01', guest: 'ก', paid: true }), E({ id: 'b', date: '2026-11-02', guest: 'ก', paid: true }), E({ id: 'c', date: '2026-11-05', guest: 'ก', roomId: 'r2', deposit: 100 }), E({ id: 'd', date: '2026-12-01' }), E({ id: 'e', date: '2025-11-01', paid: true })],
    expenses: [{ id: 'x', date: '2026-11-03', cat: 'ค่าน้ำ', amount: 1800 }],
  };
  it('ตัวเลขเดือน', () => {
    const c = computeSummary(db, 2026, 10);
    expect([c.total, c.paid, c.dep, c.got, c.exTotal, c.profit, c.nights, c.days, c.openRooms]).toEqual([1500, 1000, 100, 1100, 1800, -300, 3, 30, 2]);
    expect(c.occ).toBeCloseTo(5); expect(c.period).toBe('พฤศจิกายน 2569');
  });
  it('ทั้งปี ปีอธิกสุรทิน และลูกค้า', () => {
    const c = computeSummary(db, 2026, null);
    expect(c.nights).toBe(4); expect(c.days).toBe(365); expect(c.noName).toBe(1);
    expect(computeSummary(db, 2028, null).days).toBe(366);
    expect(c.top[0]).toMatchObject({ name: 'ก', nights: 3, sum: 1500, visits: 2, last: '2026-11-05' });
  });
  it('ไม่มีห้องเปิดเลย ใช้จำนวนห้องทั้งหมด', () => expect(computeSummary({ ...db, rooms: [{ id: 'r', name: 'r', status: 'closed' }] }, 2026, 10).openRooms).toBe(1));
});
describe('version', () => {
  it('เลขรอบ, commit และวันที่เวลาไทย', () => expect(versionText({ version: '12', commit: 'a58e086abcdef', time: '2026-11-01T18:30:00Z' })).toBe('เวอร์ชัน 12 · a58e086 · 2 พ.ย. 2569'));
  it('build ในเครื่องไม่มีเลขรอบ', () => expect(versionText({ version: undefined, commit: undefined, time: undefined })).toBe('เวอร์ชันทดสอบในเครื่อง'));
});
