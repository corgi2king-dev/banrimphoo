'use client';
import { Fragment, useState } from 'react';
import { store } from '@/lib/store';
import { TH_DOW, TH_MONTHS, addDays, baht, be, parseYmd, shortTh, sumAmount, thDate, ymd } from '@/lib/format';
import { remaining } from '@/lib/pay';
import { stayIndex } from '@/lib/stay';
import type { Entry } from '@/lib/types';
import { Confetti, DueTxt, PaySelect, RoomTypeIcon, TelLink, useStore } from './common';

// สถานะชำระของรายการ
function PaidTag({ e }: { e: Entry }) {
  const state = e.paid ? 'ok' : (e.deposit && +e.deposit > 0 && Math.min(+e.deposit, +e.amount) > 0) ? 'dep' : 'due';
  return <PaySelect state={state} depText="มัดจำ" data={{ 'data-tdpay': e.id }} onPick={async v => { if (await store.setPay([e], v)) await store.save(); }} />;
}
const Ico = ({ id }: { id: string }) => <svg><use href={`#st-${id}`} /></svg>;
const tdGo = async (d: string) => { store.tdDay = d; await store.ensureYear(+d.slice(0, 4)); store.notify(); };

export function TodayTab() {
  const s = useStore(), db = s.db, key = s.tdDay, isToday = key === ymd(s.today);
  const { nightOf, stayOf } = stayIndex(db.entries);
  const tonight = db.entries.filter(e => e.date === key), open = db.rooms.filter(r => r.status !== 'closed');
  const busy = new Set(tonight.map(e => e.roomId)), free = open.filter(r => !busy.has(r.id));
  const roomPos = new Map(db.rooms.map((r, i) => [r.id, i]));
  // ค้างชำระ: 1 คืน = 1 แถว เรียงตามวันที่ แล้วตามลำดับห้อง
  const dueEs = db.entries.filter(e => !e.paid).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (roomPos.get(a.roomId) ?? 99) - (roomPos.get(b.roomId) ?? 99));
  const dueSum = dueEs.reduce((a, e) => a + remaining(e), 0);
  const dueTonight = tonight.filter(e => remaining(e) > 0), dueTonightSum = dueTonight.reduce((a, e) => a + remaining(e), 0);
  const word = isToday ? 'วันนี้' : 'วันนั้น';
  const kpis: [string, React.ReactNode, string][] = [
    [`เข้าพัก${word}`, `${busy.size} ห้อง`, busy.size ? `ห้อง ${db.rooms.filter(r => busy.has(r.id)).map(r => r.name).join(', ')}` : '-'],
    [`ห้องว่าง${word}`, `${free.length} ห้อง`, free.length ? `ห้อง ${free.map(r => r.name).join(', ')}` : 'เต็มทุกห้อง'],
    [`รายได้${word}`, <span key="v" style={{ color: 'var(--accent)' }}>{baht(sumAmount(tonight))}</span>, `จาก ${busy.size} ห้อง`],
    [`ค้างชำระ${word}`, <span key="v" style={{ color: 'var(--danger)' }}>{baht(dueTonightSum)}</span>, dueTonight.length ? `${new Set(dueTonight.map(e => e.roomId)).size} ห้อง` : 'ชำระครบแล้ว'],
  ];
  const rname = (e: Entry) => s.roomById(e.roomId)?.name || '';
  const list = [...tonight].sort((a, b) => rname(a).localeCompare(rname(b), 'th', { numeric: true }));  // เรียงแบบตัวเลข
  // ห้องที่เปิดเต็มทุกห้อง และชำระครบทุกรายการ → หัวการ์ดฉลอง
  const party = open.length > 0 && open.every(r => busy.has(r.id)) && tonight.every(e => e.paid);
  // ย่อ/ขยายรายเดือน: เปิดเมนูมา ขยายเฉพาะเดือนปัจจุบัน
  const [openMon, setOpenMon] = useState(() => new Set([ymd(s.today).slice(0, 7)]));
  const toggleMon = (k: string) => setOpenMon(o => { const n = new Set(o); if (!n.delete(k)) n.add(k); return n; });
  const dueByMon = new Map<string, Entry[]>();
  dueEs.forEach(n => { const k = n.date.slice(0, 7); dueByMon.set(k, [...(dueByMon.get(k) || []), n]); });
  const empty = (t: string) => <div className="empty" style={{ padding: 12 }}>{t}</div>;

  // ฟังก์ชันวาดแถว (ไม่ใช่ component ซ้อน) — ไม่ให้ dropdown ถูกสร้างใหม่ทุกครั้งที่หน้าจออัปเดต
  const item = (e: Entry) => {
    const r = s.roomById(e.roomId), st = stayOf(e);
    const nth = st.nights.findIndex(n => n.date === key) + 1, isIn = nth === 1, out = st.out === addDays(key, 1);
    const badge = (w: string) => <span className={`sbdg ${w}`}>
      {isIn ? <span className="sbd in" title={isToday ? 'เช็คอินวันนี้' : 'เช็คอิน'}><Ico id="key" /></span>
        : <span className="sbd co n" title={`พักต่อ คืนที่ ${nth}/${st.nights.length}`}><Ico id="sleep" />{nth}/{st.nights.length}</span>}
      {out && <span className="sbd out" title={`ออก${isToday ? 'พรุ่งนี้' : 'วันถัดไป'}`}><Ico id="out" /></span>}
    </span>;
    const phone = e.phone || st.nights.find(n => n.phone)?.phone;
    return <div className="titem" key={e.id}><RoomTypeIcon type={r?.type} />
      <div className="who"><b>ห้อง {r?.name || '?'} · {e.guest || 'ไม่ระบุชื่อ'}{badge('wide')}</b>
        <span>{e.paid && <b style={{ display: 'inline', color: 'var(--accent)' }}>{baht(e.amount)}</b>}
          <TelLink phone={phone} first={!e.paid} />{!e.paid && <DueTxt e={e} first={!phone} />}
          {e.channel && <>{' '}<span className="nw">· {e.channel}</span></>}</span></div>
      <div className="side">{badge('narrow')}<PaidTag e={e} /></div></div>;
  };
  return <>
    <div className="card row">
      <div className="daynav"><button className="btn" id="tdPrev" onClick={() => tdGo(addDays(key, -1))}>‹</button><h2 id="tdTitle" style={{ minWidth: 190, textAlign: 'center' }}>{(isToday ? 'วันนี้ · ' : '') + thDate(key)}</h2><button className="btn" id="tdNext" onClick={() => tdGo(addDays(key, 1))}>›</button></div>
      <button className="btn sm" id="tdToday" onClick={() => tdGo(ymd(s.today))}>วันนี้</button>
    </div>
    <div className="kpis" id="tdKpis">{kpis.map(([l, v, sub]) => <div className="kpi" key={l}><div className="l">{l}</div><div className="v">{v}</div><div className="s">{sub}</div></div>)}</div>
    <div className="tday">
      <div className="card focus"><div className="row fhead">
        {party ? <Confetti pieces={26} bursts={5} id="tdConfetti" seedKey={key} /> : <div className="confetti" id="tdConfetti" aria-hidden="true" />}
        <h3 id="tdInTitle" style={{ margin: 0 }}>{party ? '🎉 เต็มทุกห้อง ชำระครบแล้ว' : isToday ? '🛏 เข้าพักคืนนี้' : `🛏 เข้าพักคืน ${shortTh(key)}`}</h3><div className="sp" />
        <span className="fcount" id="tdInCount" hidden={!tonight.length}>{party ? `${open.length}/${open.length} ห้อง` : `${tonight.length} ห้อง`}</span></div>
        <div className="tlist" id="tdIn">{list.length ? list.map(item) : empty(isToday ? 'ไม่มีผู้เข้าพักคืนนี้' : 'ไม่มีผู้เข้าพักคืนนั้น')}</div>
        <div className="slegend"><span><span className="sbd in"><Ico id="key" /></span>เช็คอิน</span><span><span className="sbd co n"><Ico id="sleep" />2/3</span>พักต่อ (คืนที่/ทั้งหมด)</span><span><span className="sbd out"><Ico id="out" /></span>ออกวันถัดไป</span></div></div>
    </div>
    <div className="card subtle" style={{ marginTop: 16 }}><div className="row" style={{ marginBottom: 12 }}><h3 style={{ margin: 0 }}>💸 ค้างชำระทั้งหมด</h3><div className="sp" />
      <div id="tdDueSum" style={{ textAlign: 'right' }}>{dueEs.length > 0 && <><b style={{ fontSize: 18, color: 'var(--danger)' }}>{baht(dueSum)}</b><div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{new Set(dueEs.map(e => e.roomId)).size} ห้อง · {dueEs.length} คืน</div></>}</div></div>
      <div className="tlist" id="tdDue">{dueEs.length ? [...dueByMon].map(([k, l]) => <Fragment key={k}>
        <div className="tmon" role="button" tabIndex={0} aria-expanded={openMon.has(k)} data-mon={k} onClick={() => toggleMon(k)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMon(k); } }}>
          <span className="chev" aria-hidden="true">▸</span>📅 {TH_MONTHS[+k.slice(5) - 1]} {be(+k.slice(0, 4))}<div className="sp" /><small>{new Set(l.map(n => n.roomId)).size} ห้อง · {l.length} คืน · </small><span style={{ color: 'var(--danger)' }}>{baht(l.reduce((a, n) => a + remaining(n), 0))}</span></div>
        {openMon.has(k) && l.map(n => <div className="titem" key={n.id}><RoomTypeIcon type={s.roomById(n.roomId)?.type} />
          <div className="who"><b>ห้อง {s.roomById(n.roomId)?.name || '?'} · {n.guest || 'ไม่ระบุชื่อ'}</b>
            <span>{TH_DOW[parseYmd(n.date).getDay()]}. {shortTh(n.date)}{n.date.slice(0, 4) !== String(s.today.getFullYear()) ? ' ' + be(+n.date.slice(0, 4)) : ''}<TelLink phone={n.phone} /><DueTxt e={n} /></span></div>
          <PaidTag e={n} /></div>)}
      </Fragment>) : empty('ไม่มีค้างชำระ 🎉')}</div></div>
  </>;
}
