import type { NextConfig } from 'next';

// static export: ได้ไฟล์ใน out/ ให้ Worker ส่ง · API, login และฐานข้อมูลยังอยู่ที่ worker/ เหมือนเดิม
const config: NextConfig = { output: 'export', reactStrictMode: false, devIndicators: false, images: { unoptimized: true } };
export default config;
