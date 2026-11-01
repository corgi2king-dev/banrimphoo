'use client';
import { useEffect } from 'react';
import { store } from '@/lib/store';
import { AskDialog, useStore } from './common';
import { Header, Hero, PullToRefresh, Tooltip } from './Shell';
import { SYMBOLS } from './symbols';
import { TodayTab } from './TodayTab';
import { CalendarTab } from './CalendarTab';
import { ExpensesTab } from './ExpensesTab';
import { RoomsTab } from './RoomsTab';
import { SummaryTab } from './SummaryTab';
import { HistoryTab } from './HistoryTab';
import type { Tab } from '@/lib/types';

const TABS: [Tab, () => React.JSX.Element][] = [['today', TodayTab], ['rooms', RoomsTab], ['calendar', CalendarTab], ['expenses', ExpensesTab], ['history', HistoryTab], ['summary', SummaryTab]];

export default function App() {
  const s = useStore();
  useEffect(() => {
    // ฉากการ์ตูนใช้ไฟล์เดิม: อ่าน [data-scene] ตอนโหลด จึงเพิ่มหลังโครงหน้าขึ้นแล้ว
    const sc = document.createElement('script'); sc.src = '/scene.js?v=17'; document.body.append(sc);
    store.start();
  }, []);
  useEffect(() => { document.body.classList.toggle('readonly', s.readonly); }, [s.readonly]);
  return <>
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: SYMBOLS }} />
    <Header />
    <main>
      <Hero />
      {TABS.map(([t, C]) => <section id={`tab-${t}`} key={t} hidden={!s.ready || s.tab !== t}>{s.ready && s.tab === t && <C />}</section>)}
      <div className="foot" id="foot">{s.foot}</div>
    </main>
    <AskDialog />
    <PullToRefresh />
    <div className={`toast${s.toastOn ? ' on' : ''}`} id="toast">{s.toastMsg}</div>
    <Tooltip />
  </>;
}
