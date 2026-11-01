import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

// E2E_TARGET=legacy เทสเว็บเดิม (โฟลเดอร์ E2E_LEGACY_DIR) · next = เว็บใหม่ · ชุดเทสเดียวกันทั้งคู่
const target = process.env.E2E_TARGET === 'legacy' ? 'legacy' : 'next';
const port = target === 'legacy' ? 8790 : 8791;
const state = resolve(`.test-state/${target}`);
const repo = target === 'legacy' ? resolve(process.env.E2E_LEGACY_DIR || '../banrimphoo') : resolve('.');
process.env.E2E_STATE = state;
process.env.E2E_BASE = `https://127.0.0.1:${port}`;

const sizes = { w375: { width: 375, height: 812 }, w768: { width: 768, height: 1024 }, w1440: { width: 1440, height: 900 }, w2000: { width: 2000, height: 942 } };
const browsers = { chromium: devices['Desktop Chrome'], webkit: devices['Desktop Safari'] };
const projects = Object.entries(browsers).flatMap(([b, dev]) => Object.entries(sizes).flatMap(([s, viewport]) =>
  (['light', 'dark'] as const).map(colorScheme => ({
    name: `${b}-${s}-${colorScheme}`,
    testIgnore: /(api|visual|perf)\.spec/,
    use: { ...dev, viewport, colorScheme, deviceScaleFactor: 1 },
  }))));

export default defineConfig({
  testDir: './e2e', outputDir: `test-results/${target}`, workers: 1, fullyParallel: false, retries: 0, timeout: 30_000,
  expect: { timeout: 5_000 },
  snapshotPathTemplate: '.test-state/snapshots/{arg}{ext}',
  reporter: [['list'], ['json', { outputFile: `test-reports/${target}.json` }]],
  use: { baseURL: process.env.E2E_BASE, ignoreHTTPSErrors: true, locale: 'th-TH', timezoneId: 'Asia/Bangkok', trace: 'retain-on-failure' },
  projects: [
    ...projects,
    { name: 'api', testMatch: /api\.spec/, use: { ...devices['Desktop Chrome'] } },
    { name: 'visual', testMatch: /(visual|perf)\.spec/, use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `node ${resolve('e2e/prepare.mjs')} ${state} ${repo} && npx wrangler dev --port ${port} --ip 127.0.0.1 --local-protocol https --test-scheduled --persist-to ${state}`,
    cwd: repo, url: `${process.env.E2E_BASE}/login`, ignoreHTTPSErrors: true, reuseExistingServer: false, timeout: 120_000,
    env: { CI: '1', WRANGLER_SEND_METRICS: 'false' },
  },
});
