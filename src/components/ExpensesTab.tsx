'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { store } from '@/lib/store';
import { TH_DOW, TH_MONTHS, baht, be, monthCells, sumAmount, thDate, uid, ymd } from '@/lib/format';
import { EX_CATS, EX_CHANNELS, exColor } from '@/lib/rooms';
import type { Expense } from '@/lib/types';
import { CloseX, Modal, useStore } from './common';

const exGo = async () => { await store.ensureYear(store.exY); store.notify(); };
export function ExpensesTab() {
  const s = useStore(), y = s.exY, m = s.exM, [day, setDay] = useState<string | null>(null);
  const byDate: Record<string, Expense[]> = {};
  s.db.expenses.forEach(e => (byDate[e.date] ||= []).push(e));
  const cells = monthCells(y, m), byCat: Record<string, number> = {};
  let monthSum = 0;
  cells.filter(d => d.getMonth() === m).forEach(d => (byDate[ymd(d)] || []).forEach(e => { monthSum += +e.amount || 0; byCat[e.cat] = (byCat[e.cat] || 0) + (+e.amount || 0); }));
  return <div className="card">
    <div className="row" style={{ marginBottom: 12 }}>
      <button className="btn" id="exPrev" onClick={() => { if (--store.exM < 0) { store.exM = 11; store.exY--; } exGo(); }}>‹</button>
      <h2 id="exTitle" style={{ minWidth: 170, textAlign: 'center' }}>{TH_MONTHS[m]} {be(y)}</h2>
      <button className="btn" id="exNext" onClick={() => { if (++store.exM > 11) { store.exM = 0; store.exY++; } exGo(); }}>›</button>
      <button className="btn sm" id="exToday" onClick={() => { store.exY = s.today.getFullYear(); store.exM = s.today.getMonth(); exGo(); }}>วันนี้</button>
      <div className="sp" /><div id="exMonthSum" style={{ fontWeight: 600, color: 'var(--danger)' }}>รวมเดือนนี้ {baht(monthSum)}</div>
    </div>
    <div className="cal" id="exCal">
      {TH_DOW.map(d => <div className="h" key={d}>{d}</div>)}
      {cells.map(d => {
        const key = ymd(d), list = byDate[key] || [], sum = sumAmount(list);
        return <div key={key} className={`d ${d.getMonth() === m ? '' : 'other'} ${key === ymd(s.today) ? 'today' : ''}`} data-exdate={key} onClick={() => setDay(key)}>
          <div className="dn"><span>{d.getDate()}</span>{sum > 0 && <span className="sum" style={{ color: 'var(--danger)' }}>{baht(sum)}</span>}</div>
          {list.slice(0, 4).map(e => <div key={e.id} className="chip" style={{ background: exColor(e.cat) }} title={`${e.cat} ${baht(e.amount)}${e.note ? ' · ' + e.note : ''}`}>{e.cat} {baht(e.amount)}</div>)}
          {list.length > 4 && <div style={{ fontSize: 11, color: 'var(--muted)' }}>+{list.length - 4} รายการ</div>}
        </div>;
      })}
    </div>
    <div className="legend" id="exLegend" style={{ marginTop: 10 }}>
      {EX_CATS.map(([c]) => <span key={c}><span className="dot" style={{ background: exColor(c) }} />{c}{byCat[c] ? <>{' '}<b>{baht(byCat[c])}</b></> : null}</span>)}
      {Object.keys(byCat).filter(c => !EX_CATS.some(x => x[0] === c)).map(c => <span key={c}>{c} <b>{baht(byCat[c])}</b></span>)}
    </div>
    <ExModal day={day} onClose={() => setDay(null)} />
  </div>;
}
const blank = { cat: EX_CATS[0][0], amount: '' as string | number, channel: '', note: '' };
function ExModal({ day, onClose }: { day: string | null; onClose: () => void }) {
  const s = useStore(), [editing, setEditing] = useState<string | null>(null), [f, setF] = useState(blank), amount = useRef<HTMLInputElement>(null);
  const reset = () => { setEditing(null); setF(blank); };
  useEffect(() => { if (day) reset(); }, [day]);
  const list = s.db.expenses.filter(e => e.date === day), edE = s.db.expenses.find(e => e.id === editing);
  const cats = [...EX_CATS.map(c => c[0]), ...(edE && !EX_CATS.some(c => c[0] === edE.cat) ? [edE.cat] : [])];
  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    const x = { cat: f.cat, amount: Number(f.amount) || 0, channel: f.channel, note: f.note.trim() };
    if (edE) Object.assign(edE, x); else s.db.expenses.push({ id: uid(), date: day!, ...x });
    s.save(); reset();
  };
  return <Modal id="exMask" open={!!day} onClose={onClose}>
    <div className="row"><h2 id="exDayTitle">{day && '🧾 ' + thDate(day)}</h2><div className="sp" /><CloseX onClick={onClose} /></div>
    <div id="exList" style={{ margin: '10px 0' }}>
      {list.length ? <table><tbody>{list.map(e => <tr key={e.id} style={e.id === editing ? { background: 'var(--accent-soft)' } : undefined}>
        <td><span className="dot" style={{ background: exColor(e.cat) }} /><b>{e.cat}</b><div style={{ fontSize: 13, color: 'var(--muted)' }}>{e.note || '-'}{e.channel ? ' · ' + e.channel : ''}</div></td>
        <td className="num" style={{ color: 'var(--danger)', fontWeight: 600 }}>{baht(e.amount)}</td>
        <td className="num" style={{ whiteSpace: 'nowrap' }}><button className="btn sm" data-exedit={e.id} onClick={() => { setEditing(e.id); setF({ cat: e.cat, amount: e.amount, channel: e.channel || '', note: e.note || '' }); setTimeout(() => amount.current?.focus()); }}>แก้ไข</button>{' '}
          <button className="btn sm dang" data-exdel={e.id} onClick={async () => { if (!await s.ask('ลบค่าใช้จ่ายนี้?', 'ลบ', 'ยกเลิก', true)) return; s.db.expenses = s.db.expenses.filter(x => x.id !== e.id); if (editing === e.id) reset(); s.save(); }}>ลบ</button></td></tr>)}
        <tr><td><b>รวม</b></td><td className="num" style={{ color: 'var(--danger)', fontWeight: 700 }}>{baht(sumAmount(list))}</td><td /></tr></tbody></table>
        : <div className="empty" style={{ padding: 10 }}>ยังไม่มีค่าใช้จ่ายในวันนี้</div>}
    </div>
    <form id="exForm" style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }} onSubmit={submit}>
      <h3 id="exFormTitle">{edE ? `แก้ไข: ${edE.cat}` : 'เพิ่มค่าใช้จ่าย'}</h3>
      <div className="grid2">
        <label>หมวด *<select name="cat" required value={f.cat} onChange={e => setF({ ...f, cat: e.target.value })}>{cats.map(c => <option key={c}>{c}</option>)}</select></label>
        <label>จำนวนเงิน (บาท) *<input name="amount" ref={amount} type="number" min="1" step="1" required value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} /></label>
        <label>จ่ายด้วย<select name="channel" value={f.channel} onChange={e => setF({ ...f, channel: e.target.value })}><option value="">-</option>{EX_CHANNELS.map(c => <option key={c}>{c}</option>)}</select></label>
      </div>
      <label style={{ marginTop: 10 }}>รายละเอียด<input name="note" placeholder="เช่น บิลเดือน ต.ค., ค่าจ้างแม่บ้าน 2 วัน" value={f.note} onChange={e => setF({ ...f, note: e.target.value })} /></label>
      <div className="row" style={{ marginTop: 14 }}><div className="sp" />
        <button type="button" className="btn" id="exCancel" hidden={!editing} onClick={reset}>ยกเลิกแก้ไข</button><button className="btn pri">บันทึก</button></div>
    </form>
  </Modal>;
}
