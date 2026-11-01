import type { NextConfig } from 'next';

// static export: ได้ไฟล์ใน out/ ให้ Worker ส่ง · API, login และฐานข้อมูลยังอยู่ที่ worker/ เหมือนเดิม
const config: NextConfig = { env: { NEXT_PUBLIC_BUILD_TIME: new Date().toISOString() }, output: 'export', reactStrictMode: false, devIndicators: false, images: { unoptimized: true } };
export default config;
