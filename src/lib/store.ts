import { addDays, baht, pad, ymd } from './format';
import { received, remaining, spreadDeposit } from './pay';
import type { Db, Entry, Kind, Tab } from './types';

// สถานะของแอปทั้งหมด (ไม่ผูกกับ React): ข้อมูล การโหลดตามปี การบันทึกเฉพาะรายการที่เปลี่ยน การซิงก์ และป้ายประวัติ
// แก้ข้อมูล: เปลี่ยน db แล้วเรียก save() · หน้าจอวาดใหม่ผ่าน notify()
const KINDS: Kind[] = ['rooms', 'entries', 'expenses'];
export const VIEWER_TABS: Tab[] = ['today', 'calendar', 'expenses', 'summary'];
export const TABS: Tab[] = ['today', 'rooms', 'calendar', 'expenses', 'summary', 'history'];
const byId = <T extends { id: string }>(lists: T[][]) => [...new Map(lists.flat().map(x => [x.id, x])).values()];  // รวมหลายชุด ไม่ซ้ำ (ชุดหลังทับ)
const byDate = (a: Entry, b: Entry) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
export interface AskState { msg: string; yes: string; no: string; danger: boolean; input?: { value: string | number }; choice?: { options: [string, string][]; value: string } }

export class Store {
  db: Db = { rooms: [], entries: [], expenses: [] };
  mode: 'local' | 'server' = 'local';
  today = new Date();
  ready = false;
  user: string | null = null;
  readonly = false;
  loadedYears = new Set<number>();
  dataYears: number[] = [];
  tab: Tab = 'today';
  tabTick = 0;   // เพิ่มทุกครั้งที่เปิดเมนู/ดึงข้อมูลใหม่ — เมนูประวัติใช้โหลดซ้ำ
  // ตำแหน่งที่ดูอยู่ของแต่ละเมนู (ยังอยู่เมื่อสลับเมนู)
  tdDay = ymd(this.today);
  calY = this.today.getFullYear(); calM = this.today.getMonth();
  exY = this.today.getFullYear(); exM = this.today.getMonth();
  hiY = this.today.getFullYear(); hiM = this.today.getMonth(); hiKind = '';
  sumY = String(this.today.getFullYear()); sumM = String(this.today.getMonth());  // เปิดเมนูสรุปครั้งแรก = รายเดือน เดือนปัจจุบัน
  sumLastM = String(this.today.getMonth());  // เดือนล่าสุดที่ดู — สลับรายปีแล้วกลับมารายเดือนยังอยู่เดือนเดิม
  // ป้าย
  badge = 0; histNow = 0; hiNewSince = Infinity; hiNewCount = 0;
  toastMsg = ''; toastOn = false; private toastH: any = 0;
  askState: AskState | null = null; private askResolve: ((v: boolean) => void) | null = null;
  foot = '';
  private tick = 0; private listeners = new Set<() => void>();
  private synced = {} as Record<Kind, Map<string, string>>;
  saving: Promise<unknown> = Promise.resolve();
  private dataVer = ''; private checkedAt = 0; private syncing = false;

  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  snapshot = () => this.tick;
  notify() { this.tick++; this.listeners.forEach(f => f()); }
  roomById = (id: string) => this.db.rooms.find(r => r.id === id);
  toLogin(): Promise<never> { location.replace('/login'); return new Promise(() => {}); }
  toast(msg: string) {
    this.toastMsg = msg; this.toastOn = true; clearTimeout(this.toastH);
    this.toastH = setTimeout(() => { this.toastOn = false; this.notify(); }, 2600);
    this.notify();
  }

  // ---------- โหลด: เปิดเว็บ = ปีนี้ + การจองค้างชำระทุกปี · ไปปีอื่นค่อยโหลดปีนั้น ----------
  private async fetchYear(y: number, unpaid: boolean) {
    const r = await fetch(`/api/data?year=${y}${unpaid ? '&unpaid=1' : ''}`, { cache: 'no-store' });
    if (r.status === 401) return this.toLogin();
    if (!r.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ');
    return r.json();
  }
  async load() {
    try {
      const years = this.loadedYears.size ? [...this.loadedYears] : [this.today.getFullYear()];
      const res = await Promise.all(years.map((y, i) => this.fetchYear(y, i === 0)));
      const d = res[0];
      this.db = { rooms: d.rooms, entries: byId<Entry>([d.unpaid || [], ...res.map(x => x.entries)]).sort(byDate), expenses: byId(res.map(x => x.expenses)) };
      this.loadedYears = new Set(years); this.dataYears = d.years || [];
      this.mode = 'server'; this.checkedAt = Date.now();
      this.dataVer = res.every(x => x.v === d.v) ? d.v : '';  // ระหว่างโหลดมีคนแก้ → บังคับเช็กใหม่รอบหน้า
      this.histNow = +String(d.v).split('-')[0] || 0;
      this.user = d.user || null; this.readonly = d.role === 'viewer';
    } catch {
      this.mode = 'local';
      try { this.db = JSON.parse(localStorage.getItem('banrimphoo') || 'null') || this.db; } catch {}
    }
    this.db.rooms ||= []; this.db.entries ||= []; this.db.expenses ||= [];
    this.snap();
    this.foot = this.mode === 'server' ? '' : 'ติดต่อเซิร์ฟเวอร์ไม่ได้ — ข้อมูลเก็บในเบราว์เซอร์นี้เท่านั้น';
  }
  async ensureYear(y: number) {  // รอให้บันทึกที่ค้างเสร็จก่อน จะได้ไม่ทับของที่ยังไม่ส่ง
    if (this.mode !== 'server' || this.loadedYears.has(y)) return;
    await this.saving;
    try {
      const d = await this.fetchYear(y, false);
      this.db.entries = byId<Entry>([this.db.entries, d.entries]).sort(byDate);
      this.db.expenses = byId([this.db.expenses, d.expenses]);
      this.loadedYears.add(y); this.snap();
    } catch (e: any) { this.toast(e.message); }
  }
  // ---------- บันทึกเฉพาะรายการที่เปลี่ยน เทียบกับที่เซิร์ฟเวอร์มีล่าสุด — หลายเครื่องแก้พร้อมกันไม่ทับกัน ----------
  private snap() { this.synced = Object.fromEntries(KINDS.map(k => [k, new Map((this.db[k] as { id: string }[]).map(x => [x.id, JSON.stringify(x)]))])) as any; }
  changes() {
    const ch: any = { upsert: {}, delete: {}, roomOrder: this.db.rooms.map(r => r.id) };
    KINDS.forEach(k => {
      const list = this.db[k] as { id: string }[], now = new Map(list.map(x => [x.id, JSON.stringify(x)]));
      ch.upsert[k] = list.filter(x => this.synced[k].get(x.id) !== now.get(x.id));
      ch.delete[k] = [...this.synced[k].keys()].filter(id => !now.has(id));
    });
    return ch;
  }
  save() {
    if (this.readonly) { this.toast('บัญชีนี้ดูได้อย่างเดียว'); this.load().then(() => this.show(this.tab)); return Promise.resolve(); }  // กันไว้อีกชั้น (เซิร์ฟเวอร์ก็ปฏิเสธ)
    this.notify();
    this.saving = this.saving.then(async () => {
      try {
        if (this.mode === 'server') {
          const r = await fetch('/api/changes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(this.changes()) });
          if (r.status === 401) { this.toast('หมดเวลาเข้าสู่ระบบ — กรุณาเข้าใหม่'); setTimeout(() => this.toLogin(), 1200); return; }
          if (!r.ok) throw new Error((await r.json()).error);
          this.snap();
        } else localStorage.setItem('banrimphoo', JSON.stringify(this.db));
        this.toast('บันทึกแล้ว');
      } catch (e: any) { this.toast('บันทึกไม่สำเร็จ: ' + e.message); }
    });
    return this.saving;
  }
  // ---------- ซิงก์: เช็ก /api/version (เล็ก) → เปลี่ยนค่อยดึงข้อมูล · ข้ามถ้าจอไม่เปิด / กำลังกรอกในหน้าต่าง ----------
  private modalOpen = () => document.querySelectorAll('.mask.on').length > 0;
  async syncData(minGap = 0) {
    if (this.mode !== 'server' || this.syncing || document.visibilityState !== 'visible' || this.modalOpen() || Date.now() - this.checkedAt < minGap) return;
    this.syncing = true;
    try {
      await this.saving;
      const r = await fetch(`/api/version${this.readonly ? '' : `?since=${this.histSeen()}`}`, { cache: 'no-store' });
      if (r.status === 401) { await this.toLogin(); return; }
      this.checkedAt = Date.now();
      if (!r.ok) return;
      const x = await r.json();
      this.histNow = +String(x.v).split('-')[0] || this.histNow;
      if ('n' in x) this.setBadge(this.tab === 'history' ? 0 : x.n);
      if (x.v === this.dataVer || this.modalOpen()) return;
      await this.load(); this.show(this.tab);
    } catch {} finally { this.syncing = false; }
  }
  forceSync() { this.checkedAt = 0; return this.syncData(); }
  // ---------- ป้ายรายการประวัติใหม่: นับรายการที่ผู้ใช้คนอื่นทำ หลังเลขประวัติที่เครื่องนี้ดูล่าสุด ----------
  private histKey = () => 'brp-hist-seen:' + (this.user || '');
  histSeen() {
    let v: string | null = null; try { v = localStorage.getItem(this.histKey()); } catch {}
    if (v === null) { v = String(this.histNow); try { localStorage.setItem(this.histKey(), v); } catch {} }  // ครั้งแรกในเครื่องนี้: เริ่มนับจากตอนนี้
    return +v || 0;
  }
  setBadge(n: number) {
    this.badge = n;
    if ('setAppBadge' in navigator) (n > 0 ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {});
    this.notify();
  }
  async openHistoryNew() {  // จำจุดเริ่มของ "ใหม่" ไว้ไฮไลต์ แล้วถือว่าดูแล้ว
    if (this.readonly || this.mode !== 'server') return;
    const since = this.histSeen();
    let n = 0;
    try { const x = await (await fetch(`/api/version?since=${since}`, { cache: 'no-store' })).json(); n = x.n || 0; this.histNow = +String(x.v).split('-')[0] || this.histNow; } catch {}
    this.hiNewSince = n ? since : Infinity; this.hiNewCount = n;
    try { localStorage.setItem(this.histKey(), String(this.histNow)); } catch {}
    this.setBadge(0);
  }
  ackHistoryNew() { this.hiNewSince = Infinity; this.hiNewCount = 0; this.notify(); }
  // ---------- เมนู ----------
  show(tab: Tab) {
    if (this.readonly && !VIEWER_TABS.includes(tab)) tab = 'today';
    this.tab = tab; this.tabTick++;
    (window as any).sceneReplay?.();  // ภาพหัวเว็บขยับใหม่อีกรอบเมื่อเปลี่ยนเมนู
    if (location.hash !== '#' + tab) history.replaceState(null, '', '#' + tab);  // refresh แล้วอยู่เมนูเดิม
    this.notify();
  }
  clickTab(tab: Tab) {
    // ประวัติ: เปลี่ยนเมนูทันที แล้วค่อยเช็กรายการใหม่เบื้องหลัง
    if (tab === 'history' && this.tab !== 'history') { this.setBadge(0); this.openHistoryNew(); }
    this.show(tab); this.syncData(30000);
  }
  async start() {
    await this.load();
    if (this.mode === 'server' && !this.user) { const me = await (await fetch('/api/me', { cache: 'no-store' })).json().catch(() => ({})); if (!me.user) return this.toLogin(); this.user = me.user; }
    const hash = location.hash.slice(1) as Tab;
    const first: Tab = TABS.includes(hash) ? hash : this.db.rooms.length ? 'today' : 'rooms';
    if (first === 'history') await this.openHistoryNew();
    this.ready = true;
    this.show(first);
    if (!this.readonly && this.mode === 'server') this.syncData();  // ป้ายรายการประวัติใหม่ทันทีตอนเปิดเว็บ
    setInterval(() => this.syncData(), 60000);
    document.addEventListener('visibilitychange', () => this.syncData(30000));
  }
  // ---------- กล่องถาม ----------
  ask(msg: string, yes = 'ตกลง', no = 'ยกเลิก', danger = false, extra: Partial<AskState> = {}) {
    this.askState = { msg, yes, no, danger, ...extra }; this.notify();
    return new Promise<boolean>(r => { this.askResolve = r; });
  }
  closeAsk(v: boolean) { const r = this.askResolve; this.askState = null; this.askResolve = null; this.notify(); r?.(v); }
  async askChoice(msg: string, options: [string, string][], value: string) {
    const choice = { options, value: options.some(o => o[0] === value) ? value : options[0][0] };
    const ok = await this.ask(msg, 'บันทึก', 'ยกเลิก', false, { choice });
    return ok ? choice.value : null;
  }
  async askNumber(msg: string, value: string | number) {
    const input = { value };
    const ok = await this.ask(msg, 'บันทึก', 'ยกเลิก', false, { input });
    return ok && input.value !== '' ? Number(input.value) : null;
  }
  // ---------- การชำระเงิน: ตั้งสถานะให้ทุกคืนใน nights ----------
  async setPay(nights: Entry[], v: string) {
    if (v === 'ok') {
      const opts: [string, string][] = [['', '- ไม่ระบุ'], ...['เงินสด', 'โอน', 'Agoda', 'Booking', 'Airbnb', 'อื่น ๆ'].map(c => [c, c] as [string, string])];
      const cur = nights.find(n => n.channel)?.channel || '';
      const total = nights.reduce((a, n) => a + remaining(n), 0);
      const ch = await this.askChoice(`ชำระแล้ว ${baht(total)}\nช่องทางการชำระ`, opts, cur);
      if (ch === null) return false;
      nights.forEach(n => Object.assign(n, { paid: true, channel: ch }));
    } else if (v === 'due') nights.forEach(n => Object.assign(n, { paid: false, deposit: 0 }));
    else {
      const total = nights.reduce((a, n) => a + (+n.amount || 0), 0);
      const cur = nights.reduce((a, n) => a + (n.paid ? 0 : received(n)), 0);
      const amt = await this.askNumber(`เงินมัดจำ (บาท)\nค่าเช่ารวม ${baht(total)}`, cur || '');
      if (amt === null) return false;
      if (!(amt > 0 && amt < total)) { this.toast('เงินมัดจำต้องมากกว่า 0 และน้อยกว่าค่าเช่ารวม'); return false; }
      spreadDeposit(nights, amt);
    }
    return true;
  }
  // จองหลายคืน (group เดียวกัน) → ถามว่าจะใช้กับทุกคืนไหม
  async groupTargets(e: Entry) {
    const sibs = e.group ? this.db.entries.filter(x => x.group === e.group && x.id !== e.id) : [];
    return sibs.length && await this.ask(`รายการนี้เป็นการจอง ${sibs.length + 1} คืน — ใช้กับทุกคืนของการจองนี้ไหม?`, 'ทุกคืน', 'เฉพาะวันนี้') ? [e, ...sibs] : [e];
  }
  // พักต่อ: คืนก่อนหน้าห้องเดียวกัน + ชื่อตรงกัน → เบอร์ของคืนนั้น
  prevNightPhone(date: string, roomId: string, guestK: string) {
    if (!guestK) return '';
    const prev = this.db.entries.find(e => e.date === addDays(date, -1) && e.roomId === roomId && (e.guest || '').trim().toLowerCase().replace(/\s+/g, ' ') === guestK);
    return prev?.phone || '';
  }
  setSumMonth(m: string) { this.sumM = m; if (m !== 'all') this.sumLastM = m; this.notify(); }
  exportPeriod() { return this.sumY + (this.sumM === 'all' ? '' : '-' + pad(+this.sumM + 1)); }
}
export const store = new Store();
