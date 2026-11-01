import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

// โหมดสว่าง/มืด: ตั้งต้นตามเครื่อง · เลือกเองที่ปุ่ม ☀/🌙 แล้วจำในเครื่อง — ตั้งก่อนวาดหน้า กันกระพริบ
const THEME = `(() => {
  const k = 'brp-theme', os = matchMedia('(prefers-color-scheme: dark)');
  let t = null; try { t = localStorage.getItem(k); } catch {}
  const set = () => { document.documentElement.dataset.theme = t || (os.matches ? 'dark' : 'light'); };
  set(); os.addEventListener('change', () => { if (!t) set(); });
  window.setTheme = v => { t = v; try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch {} set(); };
  window.osTheme = () => os.matches ? 'dark' : 'light';
})();`;
export const metadata: Metadata = {
  title: 'บ้านริมภู · จัดการที่พัก', manifest: '/manifest.webmanifest',
  icons: { icon: { url: '/favicon.svg', type: 'image/svg+xml' }, apple: '/apple-touch-icon.png' },
  appleWebApp: { capable: true, title: 'บ้านริมภู', statusBarStyle: 'default' },
  other: { 'apple-mobile-web-app-capable': 'yes' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#2f6b4f' };
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="th" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: THEME }} /></head><body>{children}</body></html>;
}
