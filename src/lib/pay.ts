import { baht } from './format';
import type { Entry, PayState } from './types';

// การชำระเงิน: ชำระแล้ว / มัดจำ (จ่ายบางส่วน) / ค้างชำระ
export const received = (e: Entry) => e.paid ? (+e.amount || 0) : Math.min(+(e.deposit as number) || 0, +e.amount || 0);
export const remaining = (e: Entry) => (+e.amount || 0) - received(e);
export const payState = (e: Entry): PayState => e.paid ? 'ok' : (+(e.deposit as number) > 0 ? 'dep' : 'due');
export const payColor = (e: Entry) => ({ ok: 'var(--accent)', dep: 'var(--dep)', due: 'var(--danger)' })[payState(e)];
export const payText = (e: Entry) => e.paid ? 'ชำระแล้ว' : +(e.deposit as number) > 0 ? `มัดจำ ${baht(e.deposit)}` : 'ค้างชำระ';
// แบ่งมัดจำให้คืนแรก ๆ ตามลำดับวันจนครบยอด
export function spreadDeposit(nights: Entry[], amt: number) {
  let left = amt;
  [...nights].sort((a, b) => a.date < b.date ? -1 : 1).forEach(n => {
    const d = Math.min(left, +n.amount || 0); left -= d; Object.assign(n, { paid: false, deposit: d });
  });
}
