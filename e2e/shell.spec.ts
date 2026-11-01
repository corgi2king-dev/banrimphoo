import { test, expect, open, goTab, sql, resetDb } from './helpers';
import { NOW } from './seed.mjs';

const TABS = ['today', 'calendar', 'expenses', 'rooms', 'summary', 'history'];
test('สลับได้ทุกเมนู ที่อยู่เว็บและปุ่มที่เลือกตรงกัน', async ({ page }) => {
  await open(page);
  for (const t of TABS) {
    await goTab(page, t);
    await expect(page).toHaveURL(new RegExp(`#${t}$`));
    await expect(page.locator(`nav button[data-tab="${t}"]`)).toHaveClass(/on/);
    await expect(page.locator('main > section:visible')).toHaveCount(1);
  }
});
test('รีเฟรชแล้วอยู่เมนูเดิม', async ({ page }) => {
  await open(page, 'calendar');
  await page.reload();
  await expect(page.locator('#tab-calendar')).toBeVisible();
  await expect(page.locator('#calTitle')).toHaveText('พฤศจิกายน 2569');
});
test('หัวเว็บแสดงคำทักทายและตัวเลข', async ({ page }) => {
  await open(page);
  await expect(page.locator('#heroHi')).toHaveText('สวัสดีตอนเช้า · อา. 15 พฤศจิกายน 2569');
  const s = page.locator('#heroStats span');
  await expect(s).toHaveCount(4);
  await expect(s.nth(0)).toContainText('คืนนี้เข้าพัก 3/4 ห้อง');
  await expect(s.nth(1)).toContainText('วันนี้ ฿2,100');
});
test('ธีมสลับได้ จำหลังรีเฟรช', async ({ page }) => {
  await open(page);
  const theme = () => page.evaluate(() => document.documentElement.dataset.theme);
  const first = await theme();
  await page.locator('#themeBtn').click();
  const second = await theme();
  expect(second).not.toBe(first);
  await page.reload();
  await page.locator('#tab-today').waitFor();
  expect(await theme()).toBe(second);
  await page.locator('#themeBtn').click();
  expect(await theme()).toBe(first);
});
test('เมนูบัญชี เปิดปิดด้วยปุ่ม กดนอก และ Esc', async ({ page }) => {
  await open(page);
  const menu = page.locator('#userMenu'), btn = page.locator('#userBtn');
  await expect(menu).toBeHidden();
  await btn.click();
  await expect(menu).toBeVisible();
  await expect(btn).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#userName')).toContainText('admin · ผู้ดูแลระบบ');
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await btn.click();
  await page.locator('#tdTitle').click();
  await expect(menu).toBeHidden();
});
test('ฉากการ์ตูนถูกวาดในโลโก้และหัวเว็บ', async ({ page }) => {
  await open(page);
  await expect(page.locator('.brand .logo svg')).toBeAttached();
  await expect(page.locator('.hero [data-scene] svg')).toBeAttached();
  await expect(page.locator('.hero [data-scene]')).toHaveClass(/scn/);
});
test('ซิงก์อัตโนมัติ: เครื่องอื่นเพิ่มรายการแล้วหน้าจออัปเดตเอง', async ({ page }) => {
  await page.clock.install({ time: new Date(NOW) });
  await open(page);
  await expect(page.locator('#tdInCount')).toHaveText('3 ห้อง');
  sql(`INSERT INTO entries (id,date,room_id,guest,amount,paid,deposit) VALUES ('new1','2026-11-15','r4','เครื่องอื่น',800,1,0);
       INSERT INTO history (at,user,kind,action,item_id,item_date,after) VALUES (${Date.parse(NOW) / 1000},'tother','entries','create','new1','2026-11-15','{}');`);
  await page.clock.runFor(61_000);
  await expect(page.locator('#tdInCount')).toHaveText('4 ห้อง');
  await expect(page.locator('#tdIn')).toContainText('เครื่องอื่น');
});
test('โหลดข้อมูลตามปี: ไปปีก่อนจึงดึงปีนั้น', async ({ page }) => {
  await open(page, 'calendar');
  const req = page.waitForRequest(r => r.url().includes('/api/data?year=2025'));
  for (let i = 0; i < 16; i++) await page.locator('#calPrev').click();
  await req;
  await expect(page.locator('#calTitle')).toHaveText('กรกฎาคม 2568');
  await expect(page.locator('[data-date="2025-07-20"]')).toContainText('ลูกค้าเก่า');
});
test('ไม่มีห้องเลย เปิดเว็บที่เมนูห้องพัก', async ({ page }) => {
  sql('PRAGMA foreign_keys=OFF;DELETE FROM entries;DELETE FROM rooms;');
  await open(page, 'today').catch(() => {});
  await expect(page.locator('#tab-rooms')).toBeVisible();
  await expect(page.locator('#roomRows')).toContainText('ยังไม่มีห้องพัก');
  resetDb();
});
test('เวอร์ชันอยู่ล่างสุดในเมนูบัญชี', async ({ page }) => {
  await open(page);
  await expect(page.locator('#appVersion')).toBeHidden();
  await page.locator('#userBtn').click();
  await expect(page.locator('#appVersion')).toBeVisible();
  await expect(page.locator('#appVersion')).toContainText('เวอร์ชัน');
  expect(await page.locator('#userMenu > :last-child').getAttribute('id')).toBe('appVersion');
  const box = (await page.locator('#userMenu').boundingBox())!, v = (await page.locator('#appVersion').boundingBox())!;
  expect(v.x + v.width).toBeLessThanOrEqual(box.x + box.width);
  await page.locator('#appVersion').click();
  await expect(page.locator('#userMenu')).toBeVisible();
});
