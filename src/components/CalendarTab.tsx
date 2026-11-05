'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { store } from '@/lib/store';
import { TH_DOW, TH_MON, TH_MONTHS, baht, be, guestKey, monthCells, parseYmd, sumAmount, uid, ymd } from '@/lib/format';
import { payColor, payState, received, remaining } from '@/lib/pay';
import { ENTRY_CHANNELS, roomColor } from '@/lib/rooms';
import type { Entry } from '@/lib/types';
import { CloseX, Confetti, Modal, PaySelect, TelLink, useStore } from './common';

const calGo = async () => { await store.ensureYear(store.calY); store.notify(); };
export function CalendarTab() {
  const s = useStore(), db = s.db, y = s.calY, m = s.calM, [day, setDay] = useState<string | null>(null);
  const byDate: Record<string, Entry[]> = {};
  db.entries.forEach(e => (byDate[e.date] ||= []).push(e));
  const openIds = new Set(db.rooms.filter(r => r.status !== 'closed').map(r => r.id));  // ห้องปิดปรับปรุงไม่นับ
  const cells = monthCells(y, m);
  const monthSum = cells.filter(d => d.getMonth() === m).reduce((a, d) => a + sumAmount(byDate[ymd(d)] || []), 0);
  return <div className="card">
    <div className="row" style={{ marginBottom: 12 }}>
      <button className="btn" id="calPrev" onClick={() => { if (--store.calM < 0) { store.calM = 11; store.calY--; } calGo(); }}>‹</button>
      <h2 id="calTitle" style={{ minWidth: 170, textAlign: 'center' }}>{TH_MONTHS[m]} {be(y)}</h2>
      <button className="btn" id="calNext" onClick={() => { if (++store.calM > 11) { store.calM = 0; store.calY++; } calGo(); }}>›</button>
      <button className="btn sm" id="calToday" onClick={() => { store.calY = s.today.getFullYear(); store.calM = s.today.getMonth(); calGo(); }}>วันนี้</button>
      <div className="sp" /><div id="calMonthSum" style={{ fontWeight: 600 }}>รวมเดือนนี้ {baht(monthSum)}</div>
    </div>
    <div className="cal" id="cal">
      {TH_DOW.map(d => <div className="h" key={d}>{d}</div>)}
      {cells.map(d => {
        const key = ymd(d), list = byDate[key] || [], sum = sumAmount(list), inMonth = d.getMonth() === m;
        const free = openIds.size - new Set(list.map(e => e.roomId).filter(id => openIds.has(id))).size;
        const party = inMonth && openIds.size > 0 && !free && list.every(e => e.paid);  // เต็มและชำระครบ → ภาพฉลอง
        return <div key={key} className={`d ${inMonth ? '' : 'other'} ${key === ymd(s.today) ? 'today' : ''} ${party ? 'party' : ''}`} data-date={key} onClick={() => setDay(key)}>
          {party && <Confetti pieces={8} bursts={2} topMin={25} topMax={75} seedKey={`${y}-${m}-${s.tabTick}`} />}
          <div className="dn"><span>{d.getDate()}</span>{sum > 0 && <span className="sum">{baht(sum)}</span>}</div>
          {list.slice(0, 4).map(e => { const r = s.roomById(e.roomId); return <div key={e.id} className={`chip ${payState(e) === 'dep' ? 'dep' : e.paid ? 'paid' : 'pend'}`} style={{ background: payColor(e) }} title={`${r?.name || '?'} ${e.guest || ''}`}>{r?.name || '?'}{e.guest ? ' · ' + e.guest : ''}</div>; })}
          {list.length > 4 && <div style={{ fontSize: 11, color: 'var(--muted)' }}>+{list.length - 4} รายการ</div>}
          {openIds.size > 0 && <div className={`avail ${free ? '' : 'full'}`} title={`ว่าง ${free} จาก ${openIds.size} ห้อง`}>{free ? `${free}/${openIds.size}` : 'เต็ม'}</div>}
        </div>;
      })}
    </div>
    <div className="legend" id="calLegend" style={{ marginTop: 10 }}>
      {db.rooms.length ? <><span><span className="dot" style={{ background: 'var(--accent)' }} />แถบเขียว = ชำระแล้ว</span>
        <span><span className="avail" style={{ fontSize: 11.5, fontWeight: 700, padding: '0 7px', borderRadius: 99, background: 'var(--accent-soft)', color: 'var(--accent)' }}>2/8</span> = ห้องว่าง/ทั้งหมด</span>
        <span><span className="dot" style={{ background: 'var(--dep)' }} />แถบเหลือง = มัดจำ</span><span><span className="dot" style={{ background: 'var(--danger)' }} />แถบแดง = ค้างชำระ</span></> : <span>ยังไม่มีห้อง — ไปที่ &quot;จัดการห้องพัก&quot; ก่อน</span>}
    </div>
    <DayModal day={day} onClose={() => setDay(null)} />
  </div>;
}

const blank = { roomId: '', guest: '', phone: '', amount: '' as string | number, paid: '1', deposit: '' as string | number, channel: '', note: '' };
function DayModal({ day, onClose }: { day: string | null; onClose: () => void }) {
  const s = useStore(), db = s.db;
  const [editing, setEditing] = useState<string | null>(null), [f, setF] = useState(blank);
  const [autoPhone, setAutoPhone] = useState(false), [hint, setHint] = useState(''), [names, setNames] = useState<string[]>([]);
  const refs = useRef<{ paid?: HTMLSelectElement | null; deposit?: HTMLInputElement | null }>({});
  const set = (p: Partial<typeof blank>) => setF(v => ({ ...v, ...p }));
  // ห้องที่จองแล้ว / ปิดปรับปรุง → เลือกไม่ได้ (ไม่นับรายการที่กำลังแก้)
  const booked = new Set(db.entries.filter(e => e.id !== editing && e.date === day).map(e => e.roomId));
  const why = (r: { id: string; status?: string }) => r.status === 'closed' ? 'ปิดปรับปรุง' : booked.has(r.id) ? 'จองแล้ว' : '';
  const free = db.rooms.filter(r => !why(r));
  // ห้องเพิ่มเติม (เพิ่มรายการพร้อมกันหลายห้อง): ห้องแรกอยู่ใน f.roomId / f.amount
  const [extra, setExtra] = useState<{ roomId: string; amount: string | number; paid: string; deposit: string | number }[]>([]);  // แต่ละห้องมีการชำระของตัวเอง
  const chosen = new Set([f.roomId, ...extra.map(x => x.roomId)]);
  const nextFree = () => free.find(r => !chosen.has(r.id));
  const reset = () => {
    setEditing(null); setAutoPhone(false); setHint(''); setExtra([]);
    const first = db.rooms.filter(r => r.status !== 'closed' && !db.entries.some(e => e.date === day && e.roomId === r.id))[0];
    setF({ ...blank, roomId: first?.id || '', amount: first?.price || '' });
  };
  useEffect(() => { if (day) reset(); }, [day]);
  // ข้อมูลเปลี่ยน: ห้องที่เลือกถูกจองไปแล้ว → เลือกห้องว่างแรกแทน
  useEffect(() => {
    if (!day || editing) return;
    if (!free.some(r => r.id === f.roomId)) { const r = free.find(x => !extra.some(y => y.roomId === x.id)); set({ roomId: r?.id || '', amount: r?.price || '' }); }
    setExtra(xs => xs.filter(x => free.some(r => r.id === x.roomId)));
  }, [day, editing, free.map(r => r.id).join()]);
  const list = db.entries.filter(e => e.date === day), open = db.rooms.filter(r => r.status !== 'closed');
  const freeOpen = open.filter(r => !list.some(e => e.roomId === r.id)).map(r => r.name);
  const fillPhone = (guest: string, roomId: string) => {
    if (editing || (f.phone && !autoPhone)) return;
    const { phone, cont } = s.guestPhone(day!, roomId, guestKey(guest));
    set({ phone }); setAutoPhone(!!phone);
    setHint(!phone ? '' : cont ? `↻ พักต่อจากคืนก่อนหน้า (ห้อง ${s.roomById(roomId)?.name || '?'}) — ใช้เบอร์เดิม` : '↻ ลูกค้าเก่าใช้เบอร์');
  };
  const edit = (e: Entry) => {
    setEditing(e.id); setAutoPhone(false); setHint(''); setExtra([]);
    setF({ roomId: e.roomId, guest: e.guest || '', phone: e.phone || '', amount: e.amount, paid: e.paid ? '1' : +(e.deposit || 0) > 0 ? 'dep' : '0', deposit: +(e.deposit || 0) > 0 ? e.deposit! : '', channel: e.channel || '', note: e.note || '' });
    setTimeout(() => refs.current.paid?.focus());
  };
  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const base = { roomId: f.roomId, guest: f.guest.trim(), phone: f.phone.trim(), amount: Number(f.amount) || 0, paid: f.paid === '1', deposit: f.paid === 'dep' ? Number(f.deposit) || 0 : 0, channel: f.channel, note: f.note.trim() };
    if (editing && f.paid === 'dep' && base.deposit >= base.amount) return store.toast('เงินมัดจำต้องน้อยกว่าค่าเช่า — ถ้าจ่ายครบให้เลือก "ชำระแล้ว"');
    if (editing) {
      const e = db.entries.find(x => x.id === editing)!;
      (await store.groupTargets(e)).forEach(t => Object.assign(t, base));
    } else {
      const rows = [{ roomId: base.roomId, amount: base.amount, paid: base.paid, deposit: base.deposit, pay: f.paid },
        ...extra.map(x => ({ roomId: x.roomId, amount: Number(x.amount) || 0, paid: x.paid === '1', deposit: x.paid === 'dep' ? Number(x.deposit) || 0 : 0, pay: x.paid }))];
      if (rows.some(r => !r.roomId || booked.has(r.roomId)) || new Set(rows.map(r => r.roomId)).size !== rows.length) return store.toast('ห้องนี้ถูกจองแล้วในช่วงวันที่เลือก');  // กันจองซ้อน
      const bad = rows.find(r => r.pay === 'dep' && !(r.deposit > 0 && r.deposit < r.amount));
      if (bad) return store.toast(`ห้อง ${s.roomById(bad.roomId)?.name || '?'}: เงินมัดจำต้องน้อยกว่าค่าเช่า — ถ้าจ่ายครบให้เลือก "ชำระแล้ว"`);
      const added = rows.map(({ pay, ...r }) => ({ id: uid(), date: day!, ...base, ...r }));
      db.entries.push(...added);
    }
    store.save(); reset();
  };
  const d = day ? parseYmd(day) : null;
  const edE = db.entries.find(x => x.id === editing);
  const title = edE ? `แก้ไขรายการ: ${s.roomById(edE.roomId)?.name || '?'}${edE.guest ? ' · ' + edE.guest : ''}` : db.rooms.length ? 'เพิ่มรายการเช่า' : 'เพิ่มห้องที่ "จัดการห้องพัก" ก่อน';
  const k = guestKey(f.guest);
  return <Modal id="dayMask" open={!!day} onClose={onClose}>
    <div className="row"><h2 id="dayTitle">{d && `${TH_DOW[d.getDay()]}. ${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${be(d.getFullYear())}`}</h2><div className="sp" /><CloseX onClick={onClose} /></div>
    <div id="dayList" style={{ margin: '10px 0' }}>
      {list.length ? <table><tbody>{list.map(e => { const r = s.roomById(e.roomId); return <tr key={e.id} style={e.id === editing ? { background: 'var(--accent-soft)' } : undefined}>
        <td><span className="dot" style={{ background: roomColor(db, e.roomId) }} /><b>{r?.name || '?'}</b>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>{e.guest || '-'}<TelLink phone={e.phone} />{e.channel ? ' · ' + e.channel : ''}{e.note ? ' · ' + e.note : ''}</div></td>
        <td className="num">{baht(e.amount)}<div><PaySelect state={payState(e)} depText={`มัดจำ ${baht(received(e))} · ค้าง ${baht(remaining(e))}`} data={{ 'data-epay': e.id }} onPick={async v => { if (await s.setPay(await s.groupTargets(e), v)) await s.save(); }} /></div></td>
        <td className="num" style={{ whiteSpace: 'nowrap' }}><button className="btn sm" data-eedit={e.id} onClick={() => edit(e)}>แก้ไข</button>{' '}
          <button className="btn sm dang" data-edel={e.id} onClick={async () => { if (!await s.ask('ลบรายการนี้?', 'ลบ', 'ยกเลิก', true)) return; s.db.entries = s.db.entries.filter(x => x.id !== e.id); if (editing === e.id) reset(); s.save(); }}>ลบ</button></td></tr>; })}</tbody></table>
        : <div className="empty" style={{ padding: 10 }}>ยังไม่มีรายการในวันนี้</div>}
      {open.length > 0 && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>ห้องว่าง: {freeOpen.length ? freeOpen.join(', ') : 'เต็มทุกห้อง'}</div>}
    </div>
    <form id="entryForm" style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }} onSubmit={submit}>
      <h3 id="entryFormTitle">{title}</h3>
      <div id="entryRooms">
        <div className="erow"><label>ห้อง *<select name="roomId" required value={f.roomId} onChange={e => { const roomId = e.target.value; set({ roomId, ...(editing ? {} : { amount: s.roomById(roomId)?.price || '' }) }); fillPhone(f.guest, roomId); }}>
          {((cur: string) => db.rooms.map(r => { const w = why(r) || (r.id !== cur && chosen.has(r.id) ? 'เลือกแล้ว' : ''); return <option key={r.id} value={r.id} disabled={!!w}>{r.name}{w ? ` (${w})` : ''}</option>; }))(f.roomId)}</select></label>
          <label>ค่าเช่า/คืน (บาท) *<input name="amount" type="number" min="0" step="1" required value={f.amount} onChange={e => set({ amount: e.target.value })} /></label>{extra.length > 0 && <span className="edel" />}
          <div className="epay"><label>การชำระเงิน<select name="paid" ref={el => { refs.current.paid = el; }} value={f.paid} onChange={e => { const paid = e.target.value; set({ paid, ...(paid === 'dep' ? {} : { deposit: '' }) }); if (paid === 'dep') setTimeout(() => refs.current.deposit?.focus()); }}><option value="1">ชำระแล้ว</option><option value="dep">มัดจำ</option><option value="0">ค้างชำระ</option></select></label>
          <label id="depWrap" hidden={f.paid !== 'dep'}>เงินมัดจำ (บาท) *<input name="deposit" ref={el => { refs.current.deposit = el; }} type="number" min="1" step="1" required={f.paid === 'dep'} value={f.deposit} onChange={e => set({ deposit: e.target.value })} /></label></div></div>
        {extra.map((x, n) => <div className="erow" key={n} data-extra={n}>
          <label>ห้อง *<select name="extraRoom" required value={x.roomId} onChange={e => { const roomId = e.target.value; setExtra(xs => xs.map((y, k) => k === n ? { ...y, roomId, amount: s.roomById(roomId)?.price || '' } : y)); }}>
            {((cur: string) => db.rooms.map(r => { const w = why(r) || (r.id !== cur && chosen.has(r.id) ? 'เลือกแล้ว' : ''); return <option key={r.id} value={r.id} disabled={!!w}>{r.name}{w ? ` (${w})` : ''}</option>; }))(x.roomId)}</select></label>
          <label>ค่าเช่า/คืน (บาท) *<input name="extraAmount" type="number" min="0" step="1" required value={x.amount} onChange={e => setExtra(xs => xs.map((y, k) => k === n ? { ...y, amount: e.target.value } : y))} /></label>
          <button type="button" className="btn sm dang edel" aria-label="เอาห้องนี้ออก" onClick={() => setExtra(xs => xs.filter((_, k) => k !== n))}>✕</button>
          <div className="epay"><label>การชำระเงิน<select name="extraPaid" value={x.paid} onChange={e => { const paid = e.target.value; setExtra(xs => xs.map((y, k) => k === n ? { ...y, paid, ...(paid === 'dep' ? {} : { deposit: '' }) } : y)); }}><option value="1">ชำระแล้ว</option><option value="dep">มัดจำ</option><option value="0">ค้างชำระ</option></select></label>
            <label hidden={x.paid !== 'dep'}>เงินมัดจำ (บาท) *<input name="extraDeposit" type="number" min="1" step="1" required={x.paid === 'dep'} value={x.deposit} onChange={e => setExtra(xs => xs.map((y, k) => k === n ? { ...y, deposit: e.target.value } : y))} /></label></div></div>)}
        {!editing && nextFree() && <button type="button" className="btn sm" id="addRoomRow" onClick={() => { const r = nextFree()!; setExtra(xs => [...xs, { roomId: r.id, amount: r.price || '', paid: f.paid, deposit: '' }]); }}>+ เพิ่มห้อง</button>}
        {extra.length > 0 && <div id="entryTotal" style={{ fontSize: 13, color: 'var(--muted)' }}>{extra.length + 1} ห้อง · รวม <b style={{ color: 'var(--accent)' }}>{baht((Number(f.amount) || 0) + extra.reduce((a, x) => a + (Number(x.amount) || 0), 0))}</b></div>}
      </div>
      <div className="grid2" style={{ marginTop: 10 }}>
        <label>ชื่อผู้เข้าพัก<input name="guest" list="guestList" autoComplete="off" value={f.guest}
          onFocus={() => { const m = new Map<string, string>(); db.entries.forEach(e => { if (e.guest) m.set(guestKey(e.guest), e.guest.trim()); }); setNames([...m.values()]); }}
          onChange={e => { set({ guest: e.target.value }); const t = (e.nativeEvent as InputEvent).inputType; if (!t || t === 'insertReplacementText') fillPhone(e.target.value, f.roomId); /* เลือกจากรายชื่อ = เติมเบอร์ทันที */ }} onBlur={e => fillPhone(e.target.value, f.roomId)} /></label>
        <label>เบอร์โทร<input name="phone" type="tel" inputMode="tel" maxLength={20} placeholder="08x-xxx-xxxx" autoComplete="off" value={f.phone} onChange={e => { set({ phone: e.target.value }); setAutoPhone(false); setHint(''); }} /></label>
        <label>ช่องทาง<select name="channel" value={f.channel} onChange={e => set({ channel: e.target.value })}><option value="">-</option>{ENTRY_CHANNELS.map(c => <option key={c}>{c}</option>)}</select></label>
      </div>
      <div id="roomHint" style={{ fontSize: 13, marginTop: 6 }}>{db.rooms.length > 0 && (free.length ? <span style={{ color: 'var(--muted)' }}>ว่าง {free.length}/{db.rooms.length} ห้อง</span> : <span style={{ color: 'var(--danger)' }}>ไม่มีห้องว่างในวันนี้</span>)}</div>
      <div id="phoneHint" style={{ fontSize: 13, marginTop: 4, color: 'var(--accent)' }} hidden={!hint}>{hint}</div>
      <datalist id="guestList">{k ? names.filter(n => guestKey(n).startsWith(k)).slice(0, 20).map(n => <option key={n} value={n} />) : null}</datalist>
      <label style={{ marginTop: 10 }}>หมายเหตุ<input name="note" value={f.note} onChange={e => set({ note: e.target.value })} /></label>
      <div className="row" style={{ marginTop: 14 }}><div className="sp" />
        <button type="button" className="btn" id="entryCancel" hidden={!editing} onClick={reset}>ยกเลิกแก้ไข</button>
        <button className="btn pri" id="entrySubmit" disabled={!free.length}>{extra.length ? `บันทึก ${extra.length + 1} ห้อง` : 'บันทึก'}</button></div>
    </form>
  </Modal>;
}
