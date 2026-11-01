import { test, expect, open } from './helpers';

const fire = (page: any, type: string, x: number, y: number, sel = 'main') => page.evaluate(({ type, x, y, sel }: any) => {
  const ev: any = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'touches', { value: type === 'touchend' ? [] : [{ clientX: x, clientY: y }] });
  document.querySelector(sel)!.dispatchEvent(ev);
  return ev.defaultPrevented;
}, { type, x, y, sel });
const st = (page: any) => page.evaluate(() => { const p = document.querySelector('#ptr') as HTMLElement, a = p.querySelector('.arc') as HTMLElement; return { t: p.style.transform, off: +a.style.strokeDashoffset, ready: p.classList.contains('ready'), spin: p.classList.contains('spin') }; });

test('ดึงไม่ถึงระยะ: วงแหวนเติมบางส่วน ปล่อยแล้วกลับ', async ({ page }) => {
  await open(page);
  await fire(page, 'touchstart', 100, 100);
  expect(await fire(page, 'touchmove', 100, 210)).toBe(true);
  const s = await st(page);
  expect(s.ready).toBe(false); expect(s.off).toBeCloseTo(40.85, 1);
  await fire(page, 'touchend', 100, 210);
  expect((await st(page)).t).toBe('');
});
test('ดึงถึงระยะ ปล่อยแล้วโหลดหน้าใหม่ อยู่เมนูเดิม', async ({ page }) => {
  await open(page, 'calendar');
  await page.evaluate(() => { (window as any).__mark = 1; });
  await fire(page, 'touchstart', 100, 100);
  await fire(page, 'touchmove', 100, 330);
  const s = await st(page);
  expect(s.ready).toBe(true); expect(s.off).toBeCloseTo(0, 1);
  await Promise.all([page.waitForEvent('load'), fire(page, 'touchend', 100, 330)]);
  expect(await page.evaluate(() => (window as any).__mark)).toBeUndefined();
  await expect(page.locator('#tab-calendar')).toBeVisible();
});
test('ไม่ทำงาน: ลากแนวนอน เลื่อนหน้าอยู่ เปิดหน้าต่าง หรือเริ่มที่ช่องกรอก', async ({ page }) => {
  await open(page, 'calendar');
  await fire(page, 'touchstart', 100, 100); await fire(page, 'touchmove', 300, 110);
  expect((await st(page)).t).toBe(''); await fire(page, 'touchend', 300, 110);
  await page.evaluate(() => { document.body.style.minHeight = '3000px'; scrollTo(0, 200); });
  await page.waitForFunction(() => scrollY > 0);
  await fire(page, 'touchstart', 100, 100); await fire(page, 'touchmove', 100, 330);
  expect((await st(page)).t).toBe(''); await fire(page, 'touchend', 100, 330);
  await page.evaluate(() => { document.body.style.minHeight = ''; scrollTo(0, 0); });
  await page.waitForFunction(() => scrollY === 0);
  await page.locator('#cal [data-date="2026-11-18"]').click();
  await fire(page, 'touchstart', 100, 100); await fire(page, 'touchmove', 100, 330);
  expect((await st(page)).t).toBe(''); await fire(page, 'touchend', 100, 330);
  await page.keyboard.press('Escape');
  await fire(page, 'touchstart', 100, 100, '#sumYear'); await fire(page, 'touchmove', 100, 330, '#sumYear');
  expect((await st(page)).t).toBe(''); await fire(page, 'touchend', 100, 330, '#sumYear');
});
