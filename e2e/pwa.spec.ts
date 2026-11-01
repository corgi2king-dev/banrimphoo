import { test, expect, open, goTab } from './helpers';

test('manifest และไอคอนโหลดได้โดยไม่ต้องเข้าระบบ', async ({ page, request }) => {
  await page.goto('/login');
  const m = await (await request.get('/manifest.webmanifest')).json();
  expect(m.name).toContain('บ้านริมภู'); expect(m.display).toBe('standalone');
  for (const u of ['/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/favicon.svg', '/scene.js'])
    expect((await request.get(u)).status(), u).toBe(200);
  await expect(page.locator('link[rel=manifest]')).toHaveAttribute('href', '/manifest.webmanifest');
  await expect(page.locator('link[rel=apple-touch-icon]')).toHaveAttribute('href', '/apple-touch-icon.png');
});
test('แท็กติดตั้งแอปครบทุกหน้า', async ({ page }) => {
  for (const p of ['/login']) {
    await page.goto(p);
    await expect(page.locator('meta[name=theme-color]')).toHaveAttribute('content', '#2f6b4f');
    await expect(page.locator('meta[name=apple-mobile-web-app-capable]')).toHaveAttribute('content', 'yes');
  }
  await open(page);
  await expect(page.locator('link[rel=manifest]')).toBeAttached();
  await expect(page).toHaveTitle('บ้านริมภู · จัดการที่พัก');
});
test('ปุ่มเปิดตัวเลขบนไอคอนซ่อนเมื่อไม่ได้เปิดแบบแอป', async ({ page }) => {
  await open(page);
  await page.locator('#userBtn').click();
  await expect(page.locator('#btnAppBadge')).toBeHidden();
});
test('ตัวเลขบนไอคอนอัปเดตตามจำนวนรายการใหม่ และล้างเมื่อเปิดประวัติ', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__badge = [];
    (navigator as any).setAppBadge = (n: number) => { (window as any).__badge.push(n); return Promise.resolve(); };
    (navigator as any).clearAppBadge = () => { (window as any).__badge.push(0); return Promise.resolve(); };
    localStorage.setItem('brp-hist-seen:tadmin', '20');
  });
  await open(page);
  await expect(page.locator('#hiBadge')).toHaveText('3');
  expect(await page.evaluate(() => (window as any).__badge)).toContain(3);
  await goTab(page, 'history');
  await expect.poll(() => page.evaluate(() => (window as any).__badge.at(-1))).toBe(0);
});
test('ไม่มีการเลื่อนหน้าออกด้านข้างทุกเมนู', async ({ page }) => {
  await open(page);
  for (const t of ['today', 'calendar', 'expenses', 'rooms', 'summary', 'history']) {
    await goTab(page, t);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(over, t).toBeLessThanOrEqual(0);
  }
});
