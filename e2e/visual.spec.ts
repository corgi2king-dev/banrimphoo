import { test, expect, open, goTab } from './helpers';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

// เทียบภาพกับเว็บเดิม: รันกับ legacy ด้วย --update-snapshots เพื่อสร้างภาพต้นแบบ แล้วรันกับ next เพื่อเทียบ
const VIEWPORTS: [string, number, number][] = [['w375', 375, 812], ['w768', 768, 1024], ['w1440', 1440, 900], ['w2000', 2000, 942]];
const TABS = ['today', 'calendar', 'expenses', 'rooms', 'summary', 'history'];
for (const scheme of ['light', 'dark'] as const) for (const [name, width, height] of VIEWPORTS) for (const tab of TABS) {
  test(`${scheme} ${name} ${tab}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await page.setViewportSize({ width, height });
    await open(page, tab);
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important} .hero [data-scene],.brand .logo{visibility:hidden}' });
    await page.waitForLoadState('networkidle');
    await page.mouse.move(0, 0);
    await expect(page).toHaveScreenshot(`${scheme}-${name}-${tab}.png`, { fullPage: true, maxDiffPixelRatio: 0.002, threshold: 0.15, mask: [page.locator('.confetti')] });
  });
}
for (const [id, setup] of Object.entries({
  dayModal: async (p: any) => { await goTab(p, 'calendar'); await p.locator('#cal [data-date="2026-11-15"]').click(); },
  exModal: async (p: any) => { await goTab(p, 'expenses'); await p.locator('#exCal [data-exdate="2026-11-15"]').click(); },
  roomModal: async (p: any) => { await goTab(p, 'rooms'); await p.locator('#btnAddRoom').click(); },
  pwModal: async (p: any) => { await p.locator('#userBtn').click(); await p.locator('#btnPw').click(); },
})) test(`modal ${id}`, async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await open(page);
  await setup(page);
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important} .hero [data-scene],.brand .logo{visibility:hidden}' });
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await expect(page).toHaveScreenshot(`modal-${id}.png`, { maxDiffPixelRatio: 0.002, threshold: 0.15 });
});
test('login', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.goto('/login');
  await page.locator('#btn').waitFor();
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
  await expect(page).toHaveScreenshot('login.png', { maxDiffPixelRatio: 0.01, threshold: 0.2 });
});
test('บันทึกผลตรวจการเข้าถึง (axe)', async ({ page }) => {
  const out: Record<string, any> = {};
  await open(page);
  for (const t of TABS) {
    await goTab(page, t);
    const r = await new AxeBuilder({ page }).analyze();
    out[t] = r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length }));
  }
  mkdirSync('test-reports', { recursive: true });
  writeFileSync(`test-reports/axe-${process.env.E2E_BASE!.endsWith('8790') ? 'legacy' : 'next'}.json`, JSON.stringify(out, null, 1));
});
