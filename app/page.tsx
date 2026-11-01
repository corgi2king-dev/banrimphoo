'use client';
import dynamic from 'next/dynamic';
import './app.css';

// แอปทำงานในเบราว์เซอร์ทั้งหมด (วันเวลาและข้อมูลอยู่ฝั่งเครื่อง) จึงไม่เรนเดอร์ล่วงหน้า
const App = dynamic(() => import('@/components/App'), { ssr: false });
export default function Page() { return <App />; }
