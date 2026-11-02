import type { Db } from './types';

// สีห้อง — ไม่มีสีแดง (สงวนไว้ให้ "ค้างชำระ")
const COLORS = ['--c1', '--c2', '--c3', '--c4', '--c5', '--c6', '--c7', '--c8'];
export const roomColor = (db: Db, id: string) => `var(${COLORS[Math.max(0, db.rooms.findIndex(r => r.id === id)) % COLORS.length]})`;
// ประเภทที่ตั้งเอง → ดูจากคำในชื่อ ไม่เข้าเลย = เตียงเดี่ยวพื้นเทา
export function roomTypeKey(type?: string) {
  const t = type || '';
  return /แฟมิลี่|ครอบครัว|family/i.test(t) ? 'family' : /คู่|double|twin/i.test(t) ? 'double' : /เดี่ยว|single/i.test(t) ? 'single'
    : /แอร์|air/i.test(t) ? 'ac' : /พัดลม|fan/i.test(t) ? 'fan' : /รายเดือน|month/i.test(t) ? 'month' : '';
}
export const ROOM_TYPES = ['ห้องเตียงเดี่ยว', 'ห้องเตียงคู่', 'ห้องแฟมิลี่', 'ห้องพัดลม', 'ห้องแอร์', 'ห้องรายเดือน'];
export const NEW_TYPE = '__new__';
export const EX_CATS: [string, string][] = [['ค่าน้ำ', '--c2'], ['ค่าไฟ', '--c3'], ['ค่าแม่บ้าน', '--c4'], ['ค่าซ่อมแซม', '--c5'], ['ค่าของใช้ในห้อง', '--c6'], ['ค่าอินเทอร์เน็ต', '--c7'], ['ค่างวดรีสอร์ท', '--c1'], ['อื่น ๆ', '--c8']];
export const exColor = (cat: string) => `var(${(EX_CATS.find(c => c[0] === cat) || EX_CATS[EX_CATS.length - 1])[1]})`;
export const ENTRY_CHANNELS = ['เงินสด', 'โอน', 'Agoda', 'Booking', 'Airbnb', 'อื่น ๆ'];
export const EX_CHANNELS = ['เงินสด', 'โอน', 'บัตร', 'หักบัญชี'];
