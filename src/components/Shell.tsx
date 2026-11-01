'use client';
import { useEffect, useRef, useState } from 'react';
import { store, VIEWER_TABS } from '@/lib/store';
import { TH_DOW, TH_MONTHS, baht, be, sumAmount, ymd } from '@/lib/format';
import { CloseX, Modal, useStore } from './common';
import { versionText } from '@/lib/version';
import type { Tab } from '@/lib/types';

const NAV: [Tab, string][] = [['today', '🏠 วันนี้'], ['calendar', '📅 บันทึกค่าเช่า'], ['expenses', '🧾 ค่าใช้จ่าย'], ['rooms', '🛏 จัดการห้องพัก'], ['summary', '📊 สรุป']];
const isApp = () => matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;

export function Header() {
  const s = useStore();
  const [menu, setMenu] = useState(false), [pwOpen, setPwOpen] = useState(false), [themeTitle, setThemeTitle] = useState('');
  const syncTheme = () => setThemeTitle(document.documentElement.dataset.theme === 'dark' ? 'โหมดมืด — กดเพื่อเปลี่ยนเป็นโหมดสว่าง' : 'โหมดสว่าง — กดเพื่อเปลี่ยนเป็นโหมดมืด');
  useEffect(() => {
    syncTheme();
    const os = matchMedia('(prefers-color-scheme: dark)'), onOs = () => setTimeout(syncTheme);
    os.addEventListener('change', onOs);
    const onClick = (e: MouseEvent) => { if (!(e.target as Element).closest('#userBox')) setMenu(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    document.addEventListener('click', onClick); document.addEventListener('keydown', onKey);
    return () => { os.removeEventListener('change', onOs); document.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey); };
  }, []);
  const toggleTheme = () => {
    const w = window as any, next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    w.setTheme(next === w.osTheme() ? null : next); syncTheme();  // ตรงกับเครื่อง = กลับไปตามเครื่อง
  };
  const role = s.readonly ? 'viewer' : 'admin', user = s.user || '';
  const showBadgeBtn = s.ready && !s.readonly && isApp() && 'setAppBadge' in navigator && 'Notification' in window && Notification.permission === 'default';
  return (
    <header>
      <div className="bar">
        <div className="brand"><div className="logo" data-scene="logo" data-motion="0" /><span>บ้านริมภู<small>ระบบจัดการที่พัก</small></span></div>
        <nav>
          {NAV.map(([t, label]) => <button key={t} data-tab={t} className={s.tab === t && s.ready ? 'on' : undefined} onClick={() => store.clickTab(t)}>{label}</button>)}
          <button data-tab="history" className={s.tab === 'history' && s.ready ? 'on' : undefined} onClick={() => store.clickTab('history')}>
            <span className="nico">🕘<span className="nbadge" id="hiBadge" hidden={!(s.badge > 0)}>{s.badge > 99 ? '99+' : s.badge}</span></span> ประวัติ
          </button>
        </nav>
        <div className="user" id="userBox" hidden={!(s.ready && s.mode === 'server')}>
          <button className="themebtn" id="themeBtn" type="button" title={themeTitle} aria-label={themeTitle} onClick={toggleTheme}>
            <svg className="sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="#f2b632" /><g stroke="#f2b632" strokeWidth="2" strokeLinecap="round"><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" /></g></svg>
            <svg className="moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 3.2a8.8 8.8 0 1 0 5.3 13.2A7 7 0 0 1 15.5 3.2z" fill="#f2d16b" /><circle cx="6" cy="6" r=".9" fill="#f2d16b" /><circle cx="19" cy="4.5" r=".7" fill="#f2d16b" /></svg>
          </button>
          <div className="uinfo" id="userInfo"><b>{user}</b><span className={`rolebadge ${role}`}>{role}</span></div>
          <button className="userbtn" id="userBtn" aria-haspopup="menu" aria-expanded={menu} title={`${user} (${role})`} onClick={e => { e.stopPropagation(); setMenu(!menu); }}>{user.trim().charAt(0).toUpperCase() || '👤'}</button>
          <div className="usermenu" id="userMenu" role="menu" hidden={!menu} onClick={e => { if ((e.target as Element).closest('button')) setMenu(false); }}>
            <div className="uname" id="userName"><div className="uline">👤 <b>{user}</b></div><div className="uline">ตำแหน่ง <span className={`rolebadge ${role}`}>{s.readonly ? 'viewer · ดูอย่างเดียว' : 'admin · ผู้ดูแลระบบ'}</span></div></div>
            <button id="btnPw" role="menuitem" onClick={() => setPwOpen(true)}>🔑 เปลี่ยนรหัสผ่าน</button>
            <button id="btnAppBadge" role="menuitem" hidden={!showBadgeBtn} onClick={async () => {
              const r = await Notification.requestPermission().catch(() => 'denied');
              store.toast(r === 'granted' ? 'เปิดตัวเลขบนไอคอนแล้ว' : 'ไม่ได้อนุญาต — เปิดได้ที่ การตั้งค่า → การแจ้งเตือน → บ้านริมภู');
              store.forceSync();
            }}>🔔 เปิดตัวเลขบนไอคอน</button>
            <button id="btnLogout" role="menuitem" onClick={async () => {
              if (!await store.ask('ออกจากระบบ?', 'ออกจากระบบ')) return;
              await fetch('/api/logout', { method: 'POST' }).catch(() => {});
              store.toLogin();
            }}>🚪 ออกจากระบบ</button>
            <div className="uver" id="appVersion">{versionText()}</div>
          </div>
        </div>
      </div>
      <PasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </header>
  );
}

function PasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [err, setErr] = useState(''), form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (open) { form.current!.reset(); setErr(''); (form.current!.elements.namedItem('old') as HTMLInputElement).focus(); } }, [open]);
  return (
    <Modal id="pwMask" open={open} onClose={onClose} style={{ maxWidth: 400 }}>
      <div className="row"><h2>เปลี่ยนรหัสผ่าน</h2><div className="sp" /><CloseX onClick={onClose} /></div>
      <form id="pwForm" ref={form} style={{ marginTop: 12 }} onSubmit={async e => {
        e.preventDefault();
        const f = e.currentTarget.elements as any;
        if (f.new.value !== f.new2.value) return setErr('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน');
        const r = await fetch('/api/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ old: f.old.value, new: f.new.value }) });
        if (r.status === 401) return store.toLogin();
        const j = await r.json();
        if (!r.ok) return setErr(j.error);
        onClose(); store.toast('เปลี่ยนรหัสผ่านแล้ว');
      }}>
        <label>รหัสผ่านเดิม<input name="old" type="password" autoComplete="current-password" required /></label>
        <label style={{ marginTop: 10 }}>รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)<input name="new" type="password" autoComplete="new-password" minLength={8} required /></label>
        <label style={{ marginTop: 10 }}>ยืนยันรหัสผ่านใหม่<input name="new2" type="password" autoComplete="new-password" required /></label>
        <div id="pwErr" style={{ color: 'var(--danger)', fontSize: 14, marginTop: 10 }}>{err}</div>
        <div className="row" style={{ marginTop: 14 }}><div className="sp" /><button type="button" className="btn" data-close onClick={onClose}>ยกเลิก</button><button className="btn pri">บันทึก</button></div>
      </form>
    </Modal>
  );
}

export function Hero() {
  const s = useStore(), t = s.today, h = t.getHours(), k = ymd(t), list = s.db.entries.filter(e => e.date === k);
  const open = s.db.rooms.filter(r => r.status !== 'closed').length, booked = new Set(list.map(e => e.roomId)).size;
  const stats = s.ready ? [`🛏 คืนนี้เข้าพัก ${booked}/${open} ห้อง`, `💵 วันนี้ ${baht(sumAmount(list))}`,
    `💰 เดือนนี้ ${baht(sumAmount(s.db.entries.filter(e => e.date.startsWith(k.slice(0, 7)))))}`,
    `📈 ปีนี้ ${baht(sumAmount(s.db.entries.filter(e => e.date.startsWith(k.slice(0, 4)))))}`] : [];
  return (
    <div className="hero"><div data-scene="banner" data-motion="60" />
      <div className="txt"><b id="heroHi">{s.ready ? `${h < 12 ? 'สวัสดีตอนเช้า' : h < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น'} · ${TH_DOW[t.getDay()]}. ${t.getDate()} ${TH_MONTHS[t.getMonth()]} ${be(t.getFullYear())}` : ''}</b>
        <div className="stats" id="heroStats">{stats.map(x => <span key={x}>{x}</span>)}</div></div></div>
  );
}

// ดึงจอลงจากบนสุดของหน้า แล้วปล่อยเมื่อถึงระยะ → โหลดหน้าใหม่ · ไม่ทำงานตอนเปิดหน้าต่างกรอกข้อมูล
export function PullToRefresh() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const READY = 110, MAX = 140, el = ref.current!, arc = el.querySelector('.arc') as SVGCircleElement;
    let y0: number | null = null, x0 = 0, pull = 0;
    const place = () => {
      el.style.transform = `translateY(${pull - 48}px)`; el.style.opacity = String(Math.min(pull / READY, 1));
      arc.style.strokeDashoffset = String(81.7 * (1 - Math.min(pull / READY, 1))); el.classList.toggle('ready', pull >= READY);
    };
    const reset = () => { y0 = null; pull = 0; el.classList.add('back'); el.style.transform = ''; el.style.opacity = ''; el.classList.remove('ready'); };
    const start = (e: TouchEvent) => {
      y0 = null;
      if (e.touches.length !== 1 || scrollY > 0 || document.querySelector('.mask.on') || (e.target as Element).closest('input,textarea,select')) return;
      y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; pull = 0; el.classList.remove('back');
    };
    const move = (e: TouchEvent) => {
      if (y0 === null) return;
      const dy = e.touches[0].clientY - y0, dx = e.touches[0].clientX - x0;
      if (e.touches.length !== 1 || scrollY > 0 || dy <= 0 || (!pull && Math.abs(dx) > dy)) { if (pull) reset(); else y0 = null; return; }  // เลื่อนแนวนอน/เลื่อนขึ้น = ไม่ใช่การดึง
      if (e.cancelable) e.preventDefault();
      pull = Math.min(dy * .5, MAX); place();
    };
    const end = async () => {
      if (y0 === null) return;
      if (pull < READY) return reset();
      y0 = null; el.classList.add('back', 'spin'); pull = 60; place();
      try { await store.saving; } catch {}
      location.reload();
    };
    const cancel = () => { if (y0 !== null) reset(); };
    addEventListener('touchstart', start, { passive: true }); addEventListener('touchmove', move, { passive: false }); addEventListener('touchend', end); addEventListener('touchcancel', cancel);
    return () => { removeEventListener('touchstart', start); removeEventListener('touchmove', move); removeEventListener('touchend', end); removeEventListener('touchcancel', cancel); };
  }, []);
  return <div className="ptr" id="ptr" ref={ref} aria-hidden="true"><svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="13" /><circle className="arc" cx="16" cy="16" r="13" /></svg></div>;
}

// tooltip ของหน้าสรุป: data-tip="หัวข้อ|ค่า|รายละเอียด"
export function Tooltip() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (ev: MouseEvent) => {
      const el = (ev.target as Element).closest?.('[data-tip]') as HTMLElement | null, t = ref.current!;
      if (!el || !el.closest('#tab-summary')) { t.style.display = 'none'; return; }
      const [head, val, more] = el.dataset.tip!.split('|');
      t.textContent = ''; t.append(head, document.createElement('br'));
      const b = document.createElement('b'); b.textContent = val; t.append(b);
      if (more) t.append(document.createElement('br'), more);
      t.style.display = 'block';
      const w = t.offsetWidth, ht = t.offsetHeight;
      t.style.left = Math.min(ev.clientX + 14, innerWidth - w - 8) + 'px';
      t.style.top = (ev.clientY - ht - 12 < 4 ? ev.clientY + 16 : ev.clientY - ht - 12) + 'px';
    };
    document.addEventListener('mousemove', h);
    return () => document.removeEventListener('mousemove', h);
  }, []);
  return <div className="tip" id="tip" ref={ref} />;
}
export { VIEWER_TABS };
