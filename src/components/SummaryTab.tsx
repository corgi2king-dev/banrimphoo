'use client';
import { useState } from 'react';
import { store } from '@/lib/store';
import { TH_MON, TH_MONTHS, baht, be, niceMax, shortTh, short as shortNum } from '@/lib/format';
import { computeSummary } from '@/lib/summary';
import { exColor, roomColor } from '@/lib/rooms';
import { useStore } from './common';

const Grid = ({ L, R, W, y, label, style }: { L: number; R: number; W: number; y: number; label: string; style?: React.CSSProperties }) => <>
  <line className="grid" x1={L} x2={W - R} y1={y} y2={y} style={style} /><text x={L - 6} y={y + 4} textAnchor="end">{label}</text></>;
const NoData = ({ W, H, L }: { W: number; H: number; L: number }) => <text x={(W + L) / 2} y={H / 2} textAnchor="middle">ยังไม่มีข้อมูล</text>;
function BarChart({ labels, vals, tip, every = 1, fmt = baht, hi = null }: { labels: string[]; vals: number[]; tip: (i: number) => string; every?: number; fmt?: (v: number) => string; hi?: number | null }) {
  const W = 560, H = 220, L = 52, B = 24, T = 10, R = 8, max = niceMax(Math.max(...vals, 0)), bw = (W - L - R) / vals.length;
  return <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img">
    {[0, 1, 2, 3, 4].map(i => <Grid key={i} {...{ L, R, W }} y={H - B - (H - B - T) * i / 4} label={shortNum(max * i / 4)} />)}
    {vals.map((v, i) => { const h = max ? (H - B - T) * v / max : 0, x = L + i * bw; return <g key={i}>
      <g className="col" data-tip={`${tip(i)}|${fmt(v)}`}><rect className="hit" x={x} y={T} width={bw} height={H - B - T} fill="transparent" />
        {v ? <rect className="bar" x={x + bw * 0.15} y={H - B - h} width={bw * 0.7} height={h} rx="2" opacity={hi !== null && hi !== i ? '.35' : undefined} /> : null}</g>
      {i % every === 0 && <text x={x + bw / 2} y={H - 6} textAnchor="middle">{labels[i]}</text>}</g>; })}
    {!vals.some(Boolean) && <NoData {...{ W, H, L }} />}</svg>;
}
function PairChart({ a, b, hi }: { a: number[]; b: number[]; hi: number | null }) {
  const W = 560, H = 220, L = 52, B = 24, T = 10, R = 8, max = niceMax(Math.max(...a, ...b, 0)), bw = (W - L - R) / 12, ph = H - B - T;
  return <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img">
    {[0, 1, 2, 3, 4].map(i => <Grid key={i} {...{ L, R, W }} y={H - B - ph * i / 4} label={shortNum(max * i / 4)} />)}
    {TH_MON.map((lb, i) => { const x = L + i * bw, ha = max ? ph * a[i] / max : 0, hb = max ? ph * b[i] / max : 0, p = a[i] - b[i], dim = hi !== null && hi !== i ? '.35' : undefined; return <g key={i}>
      <g className="col" data-tip={`${TH_MONTHS[i]}|กำไร ${p < 0 ? '−' : ''}${baht(Math.abs(p))}|รายได้ ${baht(a[i])} · ค่าใช้จ่าย ${baht(b[i])}`}><rect className="hit" x={x} y={T} width={bw} height={ph} fill="transparent" />
        {a[i] ? <rect className="bar" x={x + bw * 0.12} y={H - B - ha} width={bw * 0.36} height={ha} rx="2" opacity={dim} /> : null}
        {b[i] ? <rect x={x + bw * 0.52} y={H - B - hb} width={bw * 0.36} height={hb} rx="2" fill="var(--danger)" opacity={dim} /> : null}</g>
      <text x={x + bw / 2} y={H - 6} textAnchor="middle">{lb}</text></g>; })}
    {!a.some(Boolean) && !b.some(Boolean) && <NoData {...{ W, H, L }} />}</svg>;
}
function LineChart({ series, hi }: { series: [string, number[], string][]; hi: number | null }) {
  const W = 760, H = 260, L = 56, B = 24, T = 12, R = 12, ph = H - B - T, bw = (W - L - R) / 12, all = series.flatMap(s => s[1]), top = Math.max(0, ...all), bot = Math.min(0, ...all);
  const step = niceMax((top - bot) / 5) || 1, lo = Math.floor(bot / step) * step, hiV = Math.ceil(top / step) * step || step;
  const yOf = (v: number) => T + ph * (hiV - v) / (hiV - lo), xOf = (i: number) => L + bw * (i + 0.5), sgn = (v: number) => (v < 0 ? '−' : '') + baht(Math.abs(v));
  const ticks: number[] = []; for (let v = lo; v <= hiV + step / 2; v += step) ticks.push(v);
  return <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img">
    {ticks.map(v => <Grid key={v} {...{ L, R, W }} y={yOf(v)} label={`${v < 0 ? '−' : ''}${shortNum(Math.abs(v))}`} style={v === 0 && lo < 0 ? { stroke: 'var(--muted)' } : undefined} />)}
    {TH_MON.map((lb, i) => <g key={i}><g className="col" data-tip={`${TH_MONTHS[i]}|${series.map(([nm, d]) => `${nm} ${sgn(d[i])}`).join('\n')}`}><rect className="hit" x={L + i * bw} y={T} width={bw} height={ph} fill="transparent" /></g>
      <text x={xOf(i)} y={H - 6} textAnchor="middle" style={i === hi ? { fill: 'var(--ink)', fontWeight: 700 } : undefined}>{lb}</text></g>)}
    {series.map(([nm, d, col]) => <g key={nm}><polyline points={d.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ')} fill="none" stroke={col} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" pointerEvents="none" />
      {d.map((v, i) => <circle key={i} cx={xOf(i)} cy={yOf(v)} r={i === hi ? 5 : 3} fill={col} stroke="var(--panel)" strokeWidth="1.5" pointerEvents="none" />)}</g>)}
    {!all.some(Boolean) && <NoData {...{ W, H, L }} />}</svg>;
}
function Donut({ parts, center }: { parts: [string, number, string][]; center: string }) {
  const tot = parts.reduce((a, p) => a + p[1], 0), r = 54, c = 2 * Math.PI * r; let off = 0;
  return <div className="donut"><svg viewBox="0 0 140 140" width="150">
    {tot ? parts.map(([l, v, col]) => { const len = v / tot * c, o = off; off += len; return <circle key={l} r={r} cx="70" cy="70" fill="none" stroke={col} strokeWidth="20" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-o} transform="rotate(-90 70 70)" data-tip={`${l}|${baht(v)}|${(v / tot * 100).toFixed(0)}%`} />; })
      : <circle r={r} cx="70" cy="70" fill="none" stroke="var(--line)" strokeWidth="20" />}
    <text x="70" y="74" textAnchor="middle" style={{ fontSize: 14, fontWeight: 700, fill: 'var(--ink)' }}>{center}</text></svg>
    <div>{parts.map(([l, v, col]) => <div key={l} style={{ margin: '6px 0' }}><span className="dot" style={{ background: col }} />{l} <b>{baht(v)}</b>{' '}<span style={{ color: 'var(--muted)' }}>{tot ? (v / tot * 100).toFixed(0) : 0}%</span></div>)}</div></div>;
}
const Signed = ({ v }: { v: number }) => <span style={{ color: v < 0 ? 'var(--danger)' : v > 0 ? 'var(--accent)' : 'inherit' }}>{v < 0 ? '−' : ''}{baht(Math.abs(v))}</span>;
const pct = (p: number, r: number) => r ? `${(p / r * 100).toFixed(0)}%` : '-';
const Legend = ({ items }: { items: [string, string][] }) => <>{items.map(([c, t]) => <span key={t}><span className="dot" style={{ background: c }} />{t}</span>)}</>;

async function downloadExcel() {
  const s = store;
  if (s.mode !== 'server') return s.toast('ดาวน์โหลด Excel ได้เมื่อเปิดผ่านเซิร์ฟเวอร์');
  const period = s.exportPeriod();
  const r = await fetch('/api/export?period=' + period, { cache: 'no-store' });
  if (r.status === 401) return s.toLogin();
  if (!r.ok) return s.toast('ดาวน์โหลดไม่สำเร็จ');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(await r.blob()); a.download = `banrimphoo-${period}.xlsx`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  s.toast('ดาวน์โหลดแล้ว');
}
export function SummaryTab() {
  const s = useStore(), y = +s.sumY, m = s.sumM === 'all' ? null : +s.sumM;
  const years = [...new Set([s.today.getFullYear(), ...s.dataYears, ...s.loadedYears])].sort((a, b) => b - a);
  const c = computeSummary(s.db, y, m), maxC = Math.max(1, ...c.catRows.map(x => x[1])), maxR = Math.max(1, ...c.perRoom.map(p => p.sum)), maxN = Math.max(1, ...c.top.map(g => g.nights));
  const medal = (i: number) => ['🥇', '🥈', '🥉'][i] || (i + 1);
  let tr = 0, tx = 0; c.revM.forEach((r, i) => { tr += r; tx += c.exM[i]; });
  const dayLbls = c.perDay.map((_, i) => String(i + 1));
  const kpi: [string, React.ReactNode, React.ReactNode][] = [
    ['รายได้รวม', baht(c.total), c.period],
    ['ค่าใช้จ่าย', <span key="v" style={{ color: 'var(--danger)' }}>{baht(c.exTotal)}</span>, `${c.exSel.length} รายการ`],
    ['กำไรสุทธิ', <span key="v" style={{ color: c.profit < 0 ? 'var(--danger)' : 'var(--accent)' }}>{c.profit < 0 ? '−' : ''}{baht(Math.abs(c.profit))}</span>, c.total ? `คิดเป็น ${(c.profit / c.total * 100).toFixed(0)}% ของรายได้` : 'รายได้ − ค่าใช้จ่าย'],
    ['รับเงินแล้ว', baht(c.got), <>{c.dep ? `รวมมัดจำ ${baht(c.dep)} · ` : ''}<span style={{ color: 'var(--danger)' }}>ค้างชำระ {baht(c.total - c.got)}</span></>],
    ['จำนวนคืนที่เข้าพัก', `${c.nights.toLocaleString('th-TH')}/${(c.openRooms * c.days).toLocaleString('th-TH')} คืน`, `${c.guests} ผู้เข้าพัก`],
    ['อัตราเข้าพัก', c.occ.toFixed(1) + '%', `${c.openRooms} ห้อง × ${c.days} วัน`],
  ];
  return <>
    <div className="card row"><h2>สรุปรายรับ-รายจ่าย</h2>
      <div className="seg" role="group" aria-label="ช่วงที่ดู">
        <button type="button" id="sumModeMonth" className={m !== null ? 'on' : undefined} aria-pressed={m !== null} onClick={() => store.setSumMonth(store.sumLastM)}>รายเดือน</button>
        <button type="button" id="sumModeYear" className={m === null ? 'on' : undefined} aria-pressed={m === null} onClick={() => store.setSumMonth('all')}>รายปี</button>
      </div>
      <div className="sp" />
      <label style={{ width: 'auto' }}>เดือน <select id="sumMonth" style={{ width: 'auto' }} disabled={m === null} value={s.sumLastM} onChange={e => store.setSumMonth(e.target.value)}>{TH_MONTHS.map((n, i) => <option key={i} value={i}>{n}</option>)}</select></label>
      <label style={{ width: 'auto' }}>ปี <select id="sumYear" style={{ width: 'auto' }} value={s.sumY} onChange={async e => { store.sumY = e.target.value; store.notify(); await store.ensureYear(+e.target.value); store.notify(); }}>{years.map(v => <option key={v} value={v}>{be(v)}</option>)}</select></label>
      <button className="btn iconbtn" id="btnExcel" title="ดาวน์โหลด Excel: รายการเช่า + สรุปตามห้อง ของช่วงที่เลือก" aria-label="ดาวน์โหลด Excel" onClick={downloadExcel}>
        <svg viewBox="0 0 48 48" aria-hidden="true"><rect x="22" y="7" width="23" height="34" rx="2.5" fill="#fff" stroke="#217346" strokeWidth="2.4" /><path d="M28 13h3M34 13h7M28 19h3M34 19h7M28 25h3M34 25h7" stroke="#217346" strokeWidth="2.4" /><path d="M3 7l24-5v44L3 41z" fill="#217346" /><path d="M9.5 16l11 16M20.5 16l-11 16" stroke="#fff" strokeWidth="3.6" /><circle cx="36" cy="36" r="11" fill="#217346" stroke="#fff" strokeWidth="2" /><path d="M36 29.5v12M30.8 36.5l5.2 5.2 5.2-5.2" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button></div>
    <div className="kpis" id="kpis">{kpi.map(([l, v, x]) => <div className="kpi" key={l}><div className="l">{l}</div><div className="v">{v}</div><div className="s">{x}</div></div>)}</div>
    <div className="charts">
      {/* รายปี: ตารางและกราฟรายเดือนของทั้งปี · รายเดือน: กราฟรายวันของเดือนนั้น */}
      {m === null ? <>
      <div className="card" style={{ gridColumn: '1/-1' }}><h3 id="mtTitle">รายละเอียดรายเดือน · ปี {be(y)}</h3>
        <div style={{ overflowX: 'auto' }}><table className="mtable"><thead><tr><th>เดือน</th><th className="num">ค่าเช่า</th><th className="num">ค่าใช้จ่าย</th><th className="num">กำไร</th><th className="num">% กำไร</th></tr></thead>
          <tbody id="mtBody">{TH_MONTHS.map((mn, i) => { const r = c.revM[i], x = c.exM[i], p = r - x; return <tr key={i} className={r || x ? undefined : 'zero'}><td><span className="mfull">{mn}</span><span className="mshort">{TH_MON[i]}</span></td><td className="num">{baht(r)}</td><td className="num" style={{ color: x ? 'var(--danger)' : 'inherit' }}>{baht(x)}</td><td className="num"><Signed v={p} /></td><td className="num">{pct(p, r)}</td></tr>; })}</tbody>
          <tfoot id="mtFoot"><tr><td>รวมทั้งปี</td><td className="num">{baht(tr)}</td><td className="num" style={{ color: 'var(--danger)' }}>{baht(tx)}</td><td className="num"><Signed v={tr - tx} /></td><td className="num">{pct(tr - tx, tr)}</td></tr></tfoot></table></div></div>
      <h3 className="grp" id="grpMonth">📅 กราฟรายเดือน · ปี {be(y)}</h3>
      <div className="card" style={{ gridColumn: '1/-1' }}><h3 id="chTrendTitle">รายได้ · ค่าใช้จ่าย · กำไร รายเดือน · ปี {be(y)}</h3>
        <div className="legend" style={{ justifyContent: 'center', marginBottom: 4 }}><Legend items={[['var(--accent)', 'รายได้'], ['var(--danger)', 'ค่าใช้จ่าย'], ['var(--c2)', 'กำไร']]} /></div>
        <div id="chTrend"><LineChart series={[['รายได้', c.revM, 'var(--accent)'], ['ค่าใช้จ่าย', c.exM, 'var(--danger)'], ['กำไร', c.revM.map((r, i) => r - c.exM[i]), 'var(--c2)']]} hi={m} /></div></div>
      <div className="card"><h3 id="chMonthlyTitle">รายรับ-รายจ่ายรายเดือน · ปี {be(y)}</h3><div id="chMonthly"><PairChart a={c.revM} b={c.exM} hi={m} /></div>
        <div className="legend" style={{ marginTop: 6 }}><Legend items={[['var(--accent)', 'รายได้'], ['var(--danger)', 'ค่าใช้จ่าย']]} /></div></div>
      <div className="card"><h3 id="chNightsMTitle">จำนวนคืนที่เข้าพักรายเดือน · ปี {be(y)}</h3><div id="chNightsM"><BarChart labels={TH_MON} vals={c.nightsM} tip={i => TH_MONTHS[i]} fmt={v => v + ' คืน'} hi={m} /></div></div>
      </> : <>
      <h3 className="grp" id="grpDay">📆 กราฟรายวัน · {c.period}</h3>
      <div className="card day"><h3 id="chDailyTitle">รายได้รายวัน · {c.period}</h3><div id="chDaily"><BarChart labels={dayLbls} vals={c.perDay.map(l => l.reduce((a, e) => a + (+e.amount || 0), 0))} tip={i => `${i + 1} ${TH_MON[m!]}`} every={5} /></div></div>
      <div className="card day"><h3 id="chDayRoomsTitle">จำนวนคืนที่เข้าพักรายวัน · {c.period}</h3><div id="chDayRooms"><BarChart labels={dayLbls} vals={c.perDay.map(l => l.length)} tip={i => `${i + 1} ${TH_MON[m!]}`} every={5} fmt={v => v + ' คืน'} /></div></div>
      </>}
      <h3 className="grp" id="grpCat">🗂 แยกตามห้อง · หมวด · ลูกค้า · {c.period}</h3>
      <div className="card"><h3>รายได้แยกตามห้อง</h3><div id="chRooms">{c.perRoom.length ? c.perRoom.map(p => <div className="hbar" key={p.r.id} data-tip={`${p.r.name}|${baht(p.sum)}|${p.n} คืน · อัตราเข้าพัก ${(p.n / c.days * 100).toFixed(0)}%`}>
        <div className="nm">{p.r.name}</div><div className="track"><div className="fill" style={{ width: `${p.sum / maxR * 100}%`, background: roomColor(s.db, p.r.id) }} /></div><div className="val">{baht(p.sum)}<div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.n} คืน</div></div></div>) : <div className="empty">ยังไม่มีห้อง</div>}</div></div>
      <div className="card"><h3 id="chExTitle">ค่าใช้จ่ายแยกตามหมวด · {c.period}</h3><div id="chEx">{c.catRows.length ? c.catRows.map(([n, v]) => <div className="hbar" key={n} data-tip={`${n}|${baht(v)}|${(v / c.exTotal * 100).toFixed(0)}% ของค่าใช้จ่าย`}>
        <div className="nm">{n}</div><div className="track"><div className="fill" style={{ width: `${v / maxC * 100}%`, background: exColor(n) }} /></div><div className="val">{baht(v)}<div style={{ fontSize: 11, color: 'var(--muted)' }}>{(v / c.exTotal * 100).toFixed(0)}%</div></div></div>) : <div className="empty">ยังไม่มีค่าใช้จ่ายในช่วงนี้ — บันทึกได้ที่เมนู 🧾 ค่าใช้จ่าย</div>}</div></div>
      <div className="card"><h3>สถานะการชำระเงิน</h3><div id="chPaid"><Donut parts={[['ชำระแล้ว', c.paid, 'var(--accent)'], ['มัดจำ', c.dep, 'var(--dep)'], ['ค้างชำระ', c.total - c.got, 'var(--danger)']]} center={baht(c.total)} /></div></div>
      <div className="card" style={{ gridColumn: '1/-1' }}><h3 id="chGuestsTitle">🏆 ลูกค้าที่เช่าเยอะสุด 10 อันดับ · {c.period}</h3><div id="chGuests">
        {c.top.length ? c.top.map((g, i) => <div className="hbar guest" key={g.name} data-tip={`${g.name}|${g.nights} คืน · ${baht(g.sum)}|มา ${g.visits} ครั้ง · ห้อง ${[...g.rooms].join(', ')} · ล่าสุด ${shortTh(g.last)}`}>
          <div className="rk">{medal(i)}</div><div className="nm"><b>{g.name}</b><div style={{ fontSize: 11, color: 'var(--muted)' }}>มา {g.visits} ครั้ง</div></div>
          <div className="track"><div className="fill" style={{ width: `${g.nights / maxN * 100}%`, background: 'var(--accent)' }} /></div>
          <div className="val"><b>{g.nights} คืน</b><div style={{ fontSize: 11, color: 'var(--muted)' }}>{baht(g.sum)}</div></div></div>) : <div className="empty">ยังไม่มีข้อมูลผู้เข้าพักในช่วงนี้</div>}
        {c.noName > 0 && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>ไม่นับ {c.noName} คืนที่ไม่ได้ใส่ชื่อผู้เข้าพัก</div>}</div></div>
    </div>
  </>;
}
