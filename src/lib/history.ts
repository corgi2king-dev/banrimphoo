import { TH_DOW, TH_MON, baht, shortTh } from './format';
import { payText } from './pay';
import type { Room } from './types';

export const ACT = { create: 'เพิ่ม', update: 'แก้ไข', delete: 'ลบ' } as const;
const FIELD: Record<string, string> = { date: 'วันที่', roomId: 'ห้อง', guest: 'ผู้เข้าพัก', phone: 'เบอร์โทร', amount: 'จำนวนเงิน', channel: 'ช่องทาง', note: 'หมายเหตุ', cat: 'หมวด' };
export const roomNameOf = (rooms: Room[], id: string) => rooms.find(r => r.id === id)?.name ?? '(ห้องที่ลบแล้ว)';
export interface Change { label: string; from: string; to: string }
export function changesOf(kind: string, b: any, a: any, rooms: Room[]): Change[] {
  const val = (k: string, e: any) => k === 'roomId' ? `ห้อง ${roomNameOf(rooms, e.roomId)}` : k === 'amount' ? baht(e.amount) : k === 'date' ? shortTh(e.date) : (e[k] || '-');
  const keys = kind === 'entries' ? ['date', 'roomId', 'guest', 'phone', 'amount', 'channel', 'note'] : ['date', 'cat', 'amount', 'channel', 'note'];
  const out = keys.filter(k => String(b[k] ?? '') !== String(a[k] ?? '')).map(k => ({ label: FIELD[k], from: val(k, b), to: val(k, a) }));
  if (kind === 'entries' && payText(b) !== payText(a)) out.push({ label: 'สถานะ', from: payText(b), to: payText(a) });
  return out;
}
// หัวกลุ่มวันที่: วันนี้ / เมื่อวาน / วันที่
export function dayLabel(d: Date, now = new Date()) {
  const diff = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 864e5);
  const date = `${d.getDate()} ${TH_MON[d.getMonth()]}`;
  return diff === 0 ? { main: 'วันนี้', small: date } : diff === 1 ? { main: 'เมื่อวาน', small: date } : { main: `${TH_DOW[d.getDay()]}. ${date}`, small: '' };
}
