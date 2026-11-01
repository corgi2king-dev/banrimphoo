'use client';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { store } from '@/lib/store';
import { baht } from '@/lib/format';
import { received, remaining } from '@/lib/pay';
import { roomTypeKey } from '@/lib/rooms';
import type { Entry, PayState } from '@/lib/types';

export const useStore = () => { useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot); return store; };

// หน้าต่าง: กดพื้นหลังหรือ Esc = ปิด
export function Modal({ id, open, onClose, children, style }: { id: string; open: boolean; onClose: () => void; children: ReactNode; style?: React.CSSProperties }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !store.askState) onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);
  return <div className={`mask${open ? ' on' : ''}`} id={id} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className="modal" style={style}>{children}</div></div>;
}
export const CloseX = ({ onClick }: { onClick: () => void }) => <button type="button" className="x" data-close onClick={onClick}>×</button>;

// กล่องถาม (แทน confirm) · มีช่องตัวเลขหรือตัวเลือกได้
export function AskDialog() {
  const s = useStore(), a = s.askState;
  const yes = useRef<HTMLButtonElement>(null), inp = useRef<HTMLInputElement>(null), sel = useRef<HTMLSelectElement>(null);
  const [, redraw] = useState(0);
  useEffect(() => {
    if (!a) return;
    if (a.input) { inp.current!.focus(); inp.current!.select(); } else if (a.choice) sel.current!.focus(); else yes.current!.focus();
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') store.closeAsk(false); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [a]);
  return (
    <div className={`mask${a ? ' on' : ''}`} id="askMask" style={{ zIndex: 30, alignItems: 'center' }} onMouseDown={e => { if (e.target === e.currentTarget) store.closeAsk(false); }}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div id="askMsg" style={{ whiteSpace: 'pre-line', fontSize: 16 }}>{a?.msg}</div>
        <input id="askInput" ref={inp} type="number" min="0" step="1" hidden={!a?.input} style={{ marginTop: 12 }} value={a?.input?.value ?? ''}
          onChange={e => { a!.input!.value = e.target.value; redraw(n => n + 1); }} onKeyDown={e => { if (e.key === 'Enter') store.closeAsk(true); }} />
        <select id="askSelect" ref={sel} hidden={!a?.choice} style={{ marginTop: 12 }} value={a?.choice?.value ?? ''} onChange={e => { a!.choice!.value = e.target.value; redraw(n => n + 1); }}>
          {a?.choice?.options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
        </select>
        <div className="row" style={{ marginTop: 18 }}><div className="sp" />
          <button type="button" className="btn" id="askNo" onClick={() => store.closeAsk(false)}>{a?.no}</button>
          <button type="button" className="btn pri" id="askYes" ref={yes} style={a?.danger ? { background: 'var(--danger)', borderColor: 'var(--danger)' } : undefined} onClick={() => store.closeAsk(true)}>{a?.yes}</button>
        </div>
      </div>
    </div>
  );
}

// ป้ายสถานะการชำระเงินแบบเลือกได้ · ระหว่างรอถาม ป้ายแสดงค่าที่เพิ่งเลือก ยกเลิกแล้วกลับค่าเดิม
export function PaySelect({ state, depText, data, onPick }: { state: PayState; depText: string; data: Record<string, string>; onPick: (v: string) => Promise<void> }) {
  const [pending, setPending] = useState<string | null>(null);
  const s = useStore();
  return (
    <select className={`tag ${state} pay`} {...data} disabled={s.readonly} title={s.readonly ? 'สถานะการชำระเงิน' : 'เปลี่ยนสถานะการชำระเงิน'} value={pending ?? state}
      onChange={async e => { setPending(e.target.value); try { await onPick(e.target.value); } finally { setPending(null); } }}>
      <option value="ok">ชำระแล้ว ✓</option>
      <option value="dep">{state === 'dep' ? depText : 'มัดจำ…'}</option>
      <option value="due">ค้างชำระ</option>
    </select>
  );
}
export const RoomTypeIcon = ({ type }: { type?: string }) => {
  const k = roomTypeKey(type);
  return <span className={`rtype${k ? ' rt-' + k : ''}`} title={type || 'ไม่ระบุประเภท'}><svg><use href={`#rt-${k || 'single'}`} /></svg></span>;
};
// เบอร์โทร: กดแล้วโทรออก (มือถือ)
export const TelLink = ({ phone, first }: { phone?: string; first?: boolean }) => phone
  ? <>{' '}<span className="nw">{first ? '' : '· '}<a href={`tel:${phone.replace(/[^\d+]/g, '')}`} style={{ color: 'var(--c2)' }} onClick={e => e.stopPropagation()}>📞 {phone}</a></span></> : null;
// ยอดค้าง (มัดจำแล้ว) ในบรรทัดรองของรายการ
export const DueTxt = ({ e, first }: { e: Entry; first?: boolean }) => <>
  {' '}<span className="nw">{first ? '' : '· '}ค้าง <b style={{ display: 'inline', color: 'var(--danger)' }}>{baht(remaining(e))}</b></span>
  {received(e) ? <>{' '}<span className="nw">(มัดจำแล้ว <b style={{ display: 'inline', color: 'var(--accent)' }}>{baht(received(e))}</b>)</span></> : null}
</>;

// กระดาษสีปลิว + พลุ: สุ่มตำแหน่ง/ขนาด/รูปทรง/ความเร็ว/ทางปลิว · ปลิว 1 นาทีแล้วจางหาย
export function Confetti({ pieces, bursts, topMin = 40, topMax = 60, id, seedKey }: { pieces: number; bursts: number; topMin?: number; topMax?: number; id?: string; seedKey?: string | number }) {
  const [phase, setPhase] = useState(0);  // 0 ปลิว · 1 จาง · 2 หาย
  useEffect(() => {
    setPhase(0);
    const a = setTimeout(() => setPhase(1), 60000), b = setTimeout(() => setPhase(2), 61500);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [seedKey]);
  const parts = useMemo(() => {
    const R = (a: number, b: number) => a + Math.random() * (b - a), cols = ['#f0b429', '#e8833a', '#4f8fc0', '#3f9a6e', '#e27d96', '#ffffff'];
    return { spans: Array.from({ length: pieces }, () => {
      const k = Math.random(), w = k < .2 ? R(6, 9) : k < .6 ? R(7, 11) : R(3, 5), h = k < .2 ? w : k < .6 ? R(10, 16) : R(16, 24), t = R(2.4, 4.8);
      const x1 = R(-22, 22), x2 = x1 + R(-22, 22), x3 = x2 + R(-18, 18);
      return { left: `${R(0, 100).toFixed(1)}%`, '--t': `${t.toFixed(2)}s`, '--d': `${(-R(0, t)).toFixed(2)}s`, '--f': `${R(1, 2.6).toFixed(2)}s`, '--x1': `${x1.toFixed(0)}px`, '--x2': `${x2.toFixed(0)}px`, '--x3': `${x3.toFixed(0)}px`, '--ax': R(.2, 1).toFixed(2), '--ay': R(.2, 1).toFixed(2),
        i: { width: `${w.toFixed(1)}px`, height: `${h.toFixed(1)}px`, background: cols[Math.floor(R(0, cols.length))], borderRadius: k < .2 ? '50%' : '2px' } };
    }), ems: Array.from({ length: bursts }, (_, n) => {  // พลุ: ระเบิดเป็นวงจากจุดสุ่ม คนละจังหวะ
      const t = R(2.2, 3.4);
      return { c: cols[n % 5], style: { left: `${((n + .5) * 100 / bursts + R(-6, 6)).toFixed(1)}%`, top: `${R(topMin, topMax).toFixed(0)}%`, '--t': `${t.toFixed(2)}s`, '--d': `${(-R(0, t)).toFixed(2)}s`, '--s': R(.8, 1.15).toFixed(2) } };
    }) };
  }, [pieces, bursts, topMin, topMax, seedKey]);
  if (phase === 2 || !pieces) return <div className="confetti" id={id} aria-hidden="true" />;
  return (
    <div className={`confetti${phase === 1 ? ' off' : ''}`} id={id} aria-hidden="true">
      {parts.spans.map(({ i, ...st }, n) => <span key={n} style={st as any}><i style={i} /></span>)}
      {parts.ems.map((e, n) => <em key={n} style={e.style as any}>{Array.from({ length: 14 }, (_, k) => <b key={k} style={{ '--a': `${(k * 360 / 14).toFixed(0)}deg`, background: e.c } as any} />)}</em>)}
    </div>
  );
}
