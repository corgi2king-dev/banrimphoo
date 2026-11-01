import { test, open } from './helpers';
import { mkdirSync, writeFileSync } from 'node:fs';

// เวลาตั้งแต่เริ่มเปิดหน้าจนเมนูวันนี้ขึ้น · จำลองมือถือช้า (CPU ช้าลง 4 เท่า) ไม่มี cache และเน็ต 4G
test('วัดเวลาเปิดหน้า', async ({ page, context }) => {
  test.setTimeout(120_000);
  await open(page);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 60, downloadThroughput: 1.5e6, uploadThroughput: 7.5e5 });
  const ms: number[] = [];
  for (let i = 0; i < 7; i++) {
    const t = Date.now();
    await page.reload({ waitUntil: 'commit' });
    await page.locator('#tdIn .titem').first().waitFor();
    ms.push(Date.now() - t);
  }
  ms.sort((a, b) => a - b);
  mkdirSync('test-reports', { recursive: true });
  writeFileSync(`test-reports/perf-${process.env.E2E_BASE!.endsWith('8790') ? 'legacy' : 'next'}.json`, JSON.stringify({ median: ms[3], ms }));
});
