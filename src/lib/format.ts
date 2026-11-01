export const baht = (n?: number | null) => '฿' + Math.round(n || 0).toLocaleString('th-TH');
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const pad = (n: number) => String(n).padStart(2, '0');
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseYmd = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
export const TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
export const TH_DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
export const be = (y: number) => y + 543;
export const addDays = (key: string, n: number) => { const d = parseYmd(key); return ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)); };
export const thDate = (key: string) => { const d = parseYmd(key); return `${TH_DOW[d.getDay()]}. ${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${be(d.getFullYear())}`; };
export const shortTh = (key: string) => `${+key.slice(8)} ${TH_MON[+key.slice(5, 7) - 1]}`;
export const guestKey = (g?: string) => (g || '').trim().toLowerCase().replace(/\s+/g, ' ');  // ชื่อเดียวกัน ไม่สนช่องว่าง/ตัวพิมพ์
export const sumAmount = (l: { amount?: number }[]) => l.reduce((a, e) => a + (+(e.amount as number) || 0), 0);
// กราฟ
export function niceMax(v: number) {
  if (v <= 0) return 0;
  const p = 10 ** Math.floor(Math.log10(v)), n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}
export function short(v: number) { return v >= 1e6 ? (v / 1e6).toFixed(v % 1e6 ? 1 : 0) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(v % 1e3 ? 1 : 0) + 'k' : String(Math.round(v)); }
// เดือนในปฏิทิน: วันเริ่มต้นและจำนวนช่อง (ครบสัปดาห์)
export function monthCells(y: number, m: number) {
  const first = new Date(y, m, 1), start = new Date(y, m, 1 - first.getDay());
  const cells = Math.ceil((first.getDay() + new Date(y, m + 1, 0).getDate()) / 7) * 7;
  return Array.from({ length: cells }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}
