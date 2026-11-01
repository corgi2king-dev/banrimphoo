'use client';
import { useEffect, useRef, useState } from 'react';
import { store } from '@/lib/store';
import { TH_MONTHS, baht, be, pad, shortTh, ymd } from '@/lib/format';
import { ACT, changesOf, dayLabel, roomNameOf } from '@/lib/history';
import { payText } from '@/lib/pay';
import type { HistoryRow } from '@/lib/types';
import { useStore } from './common';

// แบ่งหน้า: แสดงหน้าละ HI_PER แถว · ดึงจากเซิร์ฟเวอร์ทีละ HI_BATCH แถว · เปลี่ยนเดือน/ตัวกรอง = เริ่มหน้า 1 ใหม่
const HI_PER = 10, HI_BATCH = 50;
export function HistoryTab() {
  const s = useStore(), [rows, setRows] = useState<HistoryRow[] | null>(null), [total, setTotal] = useState(0), [page, setPage] = useState(1), [busy, setBusy] = useState(false);
  const seq = useRef(0);
  const fetchPart = async (offset: number) => {
    const me = seq.current;
    const r = await fetch(`/api/history?period=${s.hiY}-${pad(s.hiM + 1)}&kind=${s.hiKind}&offset=${offset}&limit=${HI_BATCH}`, { cache: 'no-store' });
    if (r.status === 401) { await s.toLogin(); return null; }
    const d = r.ok ? await r.json() : { total: 0, rows: [] };
    return me === seq.current ? d as { total: number; rows: HistoryRow[] } : null;  // เปลี่ยนเดือน/ตัวกรองระหว่างโหลด → ทิ้งผลเก่า
  };
  useEffect(() => {
    if (s.mode !== 'server') return;
    seq.current++; setRows(null); setPage(1);
    fetchPart(0).then(d => { if (d) { setTotal(d.total); setRows(d.rows); } });
  }, [s.hiY, s.hiM, s.hiKind, s.tabTick]);
  const go = async (n: number) => {
    setPage(n);
    if ((rows?.length || 0) < Math.min(n * HI_PER, total)) {  // หน้านี้ยังไม่ได้โหลด
      setBusy(true);
      const d = await fetchPart(rows!.length);
      setBusy(false);
      if (d) { setTotal(d.total); setRows([...rows!, ...d.rows]); }
    }
  };
  const pages = Math.max(1, Math.ceil(total / HI_PER)), cur = Math.min(Math.max(1, page), pages);
  const list = (rows || []).slice((cur - 1) * HI_PER, cur * HI_PER);
  let lastDay = '';
  return <div className="card">
    <div className="row" style={{ marginBottom: 12 }}>
      <button className="btn" id="hiPrev" onClick={() => { if (--store.hiM < 0) { store.hiM = 11; store.hiY--; } store.notify(); }}>‹</button>
      <h2 id="hiTitle" style={{ minWidth: 170, textAlign: 'center' }}>{TH_MONTHS[s.hiM]} {be(s.hiY)}</h2>
      <button className="btn" id="hiNext" onClick={() => { if (++store.hiM > 11) { store.hiM = 0; store.hiY++; } store.notify(); }}>›</button>
      <div className="sp" />
      <label style={{ width: 'auto' }}>แสดง <select id="hiKind" style={{ width: 'auto' }} value={s.hiKind} onChange={e => { store.hiKind = e.target.value; store.notify(); }}><option value="">ทั้งหมด</option><option value="entries">ค่าเช่า</option><option value="expenses">ค่าใช้จ่าย</option></select></label>
    </div>
    <div className="hinew" id="hiNew" hidden={!s.hiNewCount}><span id="hiNewTxt">🔔 มี {s.hiNewCount} รายการใหม่ ตั้งแต่เปิดดูครั้งล่าสุด</span><div className="sp" /><button className="btn sm" id="hiNewOk" onClick={() => s.ackHistoryNew()}>รับทราบ</button></div>
    <div id="hiList">
      {s.mode !== 'server' ? <div className="empty">ประวัติใช้ได้เมื่อเปิดผ่านเซิร์ฟเวอร์</div>
        : !rows ? <div className="empty">กำลังโหลด…</div>
        : !list.length ? <div className="empty">ยังไม่มีการทำรายการในเดือนนี้</div>
        : <div className="hist">{list.map(h => {
          const d = new Date(h.at * 1000), e = h.after || h.before, day = ymd(d), isNew = h.id > s.hiNewSince && h.user !== s.user;
          const head = day !== lastDay ? dayLabel(d) : null; lastDay = day;
          const chg = h.action === 'update' ? changesOf(h.kind, h.before, h.after, s.db.rooms) : [];
          return <div key={h.id} style={{ display: 'contents' }}>
            {head && <div className="hday">{head.main}{head.small && <small>{head.small}</small>}</div>}
            <div className={`hrow ${h.action}${isNew ? ' new' : ''}`}>
              <div className="top"><span className={`act ${h.action}`}>{ACT[h.action]}</span>
                {h.kind === 'entries' ? <b>🛏 ห้อง {roomNameOf(s.db.rooms, e.roomId)} · {e.guest || 'ไม่ระบุชื่อ'}</b> : <b>🧾 {e.cat}</b>}
                {isNew && <span className="newtag">ใหม่</span>}<span className="who">{pad(d.getHours())}:{pad(d.getMinutes())} · {h.user || '-'}</span></div>
              <div className="sub">{h.kind === 'entries' ? `คืน ${shortTh(e.date)} · ${baht(e.amount)} · ${payText(e)}` : `${shortTh(e.date)} · ${baht(e.amount)}${e.note ? ' · ' + e.note : ''}`}</div>
              {h.action === 'update' && <div className="chg">{chg.length ? chg.map(c => <span key={c.label}>{c.label}: <s>{c.from}</s> → <ins>{c.to}</ins></span>) : <span>ไม่มีการเปลี่ยนที่แสดงได้</span>}</div>}
            </div></div>;
        })}</div>}
    </div>
    <div className="row" id="hiPager" style={{ justifyContent: 'center', marginTop: 12 }} hidden={!rows || total <= HI_PER}>
      <button className="btn sm" id="hiPgPrev" disabled={busy || cur <= 1} onClick={() => go(cur - 1)}>‹ ก่อนหน้า</button>
      <span id="hiPgInfo" style={{ fontSize: 13.5, color: 'var(--muted)', minWidth: 150, textAlign: 'center' }}>{busy ? 'กำลังโหลด…' : `หน้า ${cur} / ${pages} · ${total} รายการ`}</span>
      <button className="btn sm" id="hiPgNext" disabled={busy || cur >= pages} onClick={() => go(cur + 1)}>ถัดไป ›</button>
    </div>
    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>แสดงตามเวลาที่ทำรายการ (ใหม่สุดก่อน) · บันทึกอัตโนมัติทุกครั้งที่เพิ่ม/แก้/ลบ การจองและค่าใช้จ่าย</div>
  </div>;
}
