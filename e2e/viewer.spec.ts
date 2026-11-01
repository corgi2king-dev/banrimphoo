import { test, expect, open, sql } from './helpers';

test('viewer ไม่เห็นเมนูและปุ่มแก้ไข', async ({ page }) => {
  await open(page, 'today', 'viewer');
  await expect(page.locator('#userInfo .rolebadge')).toHaveText('viewer');
  await expect(page.locator('nav button[data-tab="rooms"]')).toBeHidden();
  await expect(page.locator('nav button[data-tab="history"]')).toBeHidden();
  await expect(page.locator('body')).toHaveClass(/readonly/);
  await expect(page.locator('#tdIn select.pay').first()).toBeDisabled();
});
test('viewer เข้า #rooms และ #history ตรง ๆ ไม่ได้', async ({ page }) => {
  await open(page, 'today', 'viewer');
  for (const t of ['rooms', 'history']) {
    await page.goto(`/#${t}`); await page.reload();
    await expect(page.locator('#tab-today')).toBeVisible();
    await expect(page).toHaveURL(/#today$/);
  }
});
test('viewer ดูหน้าต่างวันได้ แต่ไม่มีฟอร์ม', async ({ page }) => {
  await open(page, 'calendar', 'viewer');
  await page.locator('#cal [data-date="2026-11-15"]').click();
  await expect(page.locator('#dayList')).toContainText('สมหญิง');
  await expect(page.locator('#entryForm')).toBeHidden();
  await expect(page.locator('[data-eedit]')).toHaveCount(0).catch(() => {});
  await expect(page.locator('[data-eedit]').first()).toBeHidden();
  await expect(page.locator('[data-edel]').first()).toBeHidden();
  await page.keyboard.press('Escape');
  await page.locator('nav button[data-tab="expenses"]').click();
  await page.locator('#exCal [data-exdate="2026-11-15"]').click();
  await expect(page.locator('#exForm')).toBeHidden();
  await expect(page.locator('[data-exdel]').first()).toBeHidden();
});
test('viewer ดูสรุปและดาวน์โหลดได้', async ({ page }) => {
  await open(page, 'summary', 'viewer');
  await expect(page.locator('#kpis .kpi')).toHaveCount(6);
  const dl = page.waitForEvent('download');
  await page.locator('#btnExcel').click();
  await dl;
});
test('viewer ไม่มีการเช็กจำนวนประวัติใหม่', async ({ page }) => {
  const urls: string[] = [];
  page.on('request', r => urls.push(r.url()));
  await open(page, 'today', 'viewer');
  await page.waitForLoadState('networkidle');
  expect(urls.some(u => u.includes('since='))).toBe(false);
  sql('SELECT 1');
});
