import { test as base, expect, type Page, type BrowserContext } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { NOW, PASSWORD, USERS, dataSql } from './seed.mjs';

export { expect };
export const dbFile = () => {
  const dir = join(process.env.E2E_STATE!, 'v3/d1/miniflare-D1DatabaseObject');
  return join(dir, readdirSync(dir).find(f => f.endsWith('.sqlite') && f !== 'metadata.sqlite')!);
};
export const sql = (s: string) => execFileSync('sqlite3', [dbFile()], { input: s, encoding: 'utf8' }).trim();
export const resetDb = () => sql(dataSql());
export type Role = keyof typeof USERS;

export async function login(page: Page, role: Role = 'admin', password = PASSWORD) {
  await page.goto('/login');
  await page.locator('[name=username]').fill(USERS[role][0]);
  await page.locator('[name=password]').fill(password);
  await page.locator('#btn').click();
}
export async function open(page: Page, tab = 'today', role: Role = 'admin') {
  await login(page, role);
  await page.waitForURL(u => u.pathname === '/');
  await page.locator('#tab-today:visible, #tab-rooms:visible').first().waitFor();
  if (tab !== 'today') await goTab(page, tab);
}
export async function goTab(page: Page, tab: string) {
  await page.locator(`nav button[data-tab="${tab}"]`).click();
  await expect(page.locator(`#tab-${tab}`)).toBeVisible();
}
export const saved = (page: Page) => expect(page.locator('#toast')).toHaveText('บันทึกแล้ว');
export const askYes = (page: Page) => page.locator('#askYes').click();
export const askNo = (page: Page) => page.locator('#askNo').click();

// ทุกเทส: ฐานข้อมูลตั้งต้น · วันนี้คงที่ · เก็บ error จากหน้าเว็บ ถ้ามี = ไม่ผ่าน
export const test = base.extend<{ errors: string[] }>({
  errors: [async ({ page }, use) => {
    resetDb();
    await page.clock.setFixedTime(new Date(NOW));
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error' && !/status of (401|400|403|404|429)|Failed to load resource/.test(m.text())) errors.push(m.text()); });
    await use(errors);
    expect(errors, 'ไม่ควรมี error ในหน้าเว็บ').toEqual([]);
  }, { auto: true }],
});
export const isNarrow = (page: Page) => page.viewportSize()!.width <= 560;
export type { Page, BrowserContext };
