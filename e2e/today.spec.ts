import { test, expect, open, goTab, saved, askNo, sql, isNarrow } from './helpers';

const row = (page: any, name: string) => page.locator('#tdIn .titem').filter({ hasText: name });
test('หัวเรื่อง วันที่ และเปลี่ยนวัน', async ({ page }) => {
  await open(page);
  await expect(page.locator('#tdTitle')).toHaveText('วันนี้ · อา. 15 พฤศจิกายน 2569');
  await page.locator('#tdNext').click();
  await expect(page.locator('#tdTitle')).toHaveText('จ. 16 พฤศจิกายน 2569');
  await expect(page.locator('#tdInTitle')).toHaveText('🛏 เข้าพักคืน 16 พ.ย.');
  await page.locator('#tdPrev').click(); await page.locator('#tdPrev').click();
  await expect(page.locator('#tdTitle')).toHaveText('ส. 14 พฤศจิกายน 2569');
  await page.locator('#tdToday').click();
  await expect(page.locator('#tdInTitle')).toHaveText('🛏 เข้าพักคืนนี้');
});
test('กล่องตัวเลข 4 กล่อง', async ({ page }) => {
  await open(page);
  const k = page.locator('#tdKpis .kpi');
  await expect(k).toHaveCount(4);
  await expect(k.nth(0)).toContainText('เข้าพักวันนี้'); await expect(k.nth(0)).toContainText('3 ห้อง'); await expect(k.nth(0)).toContainText('ห้อง 1, 2, 3');
  await expect(k.nth(1)).toContainText('ห้องว่างวันนี้'); await expect(k.nth(1)).toContainText('1 ห้อง'); await expect(k.nth(1)).toContainText('ห้อง 10');
  await expect(k.nth(2)).toContainText('฿2,100');
  await expect(k.nth(3)).toContainText('฿1,300'); await expect(k.nth(3)).toContainText('2 ห้อง');
});
test('เรียงตามเลขห้องแบบตัวเลข', async ({ page }) => {
  await open(page);
  await page.locator('#tdNext').click(); for (let i = 0; i < 4; i++) await page.locator('#tdNext').click();
  const names = await page.locator('#tdIn .who > b').allInnerTexts();
  expect(names.map(n => n.split(' ·')[0])).toEqual(['ห้อง 1', 'ห้อง 2', 'ห้อง 3', 'ห้อง 10']);
});
test('บรรทัดรองตามสถานะ: ชำระแล้ว มัดจำ ค้าง', async ({ page }) => {
  await open(page);
  const norm = async (n: string) => (await row(page, n).locator('.who > span').textContent())!.replace(/\s+/g, ' ').trim();
  expect(await norm('สมชาย')).toBe('฿500 · 📞 0811111111 · โอน');
  expect(await norm('สมหญิง')).toBe('📞 0822222222 · ค้าง ฿400 (มัดจำแล้ว ฿300) · เงินสด');
  expect(await norm('ไม่ระบุชื่อ')).toBe('ค้าง ฿900');
  const color = (l: any) => l.evaluate((e: Element) => getComputedStyle(e).color);
  const accent = await page.evaluate(() => { const d = document.createElement('i'); d.style.color = 'var(--accent)'; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; });
  expect(await color(row(page, 'สมชาย').locator('.who > span > b'))).toBe(accent);
});
test('ป้ายเช็คอิน พักต่อ และออกวันถัดไป', async ({ page }) => {
  await open(page);
  const w = isNarrow(page) ? '.narrow' : '.wide';
  const a = row(page, 'สมชาย').locator(`.sbdg${w}`), b = row(page, 'สมหญิง').locator(`.sbdg${w}`);
  await expect(a.locator('.sbd.co')).toHaveText('2/3');
  await expect(a.locator('.sbd.out')).toHaveCount(0);
  await expect(b.locator('.sbd.in')).toHaveAttribute('title', 'เช็คอินวันนี้');
  await expect(b.locator('.sbd.out')).toHaveAttribute('title', 'ออกพรุ่งนี้');
  await expect(a).toBeVisible();
});
test('ป้ายสถานะมัดจำเหลือคำว่า มัดจำ', async ({ page }) => {
  await open(page);
  const s = row(page, 'สมหญิง').locator('select.pay');
  await expect(s).toHaveClass(/dep/);
  await expect(s.locator('option:checked')).toHaveText('มัดจำ');
});
test('เปลี่ยนเป็นชำระแล้ว ถามช่องทาง และบันทึกจริง', async ({ page }) => {
  await open(page);
  await row(page, 'ไม่ระบุชื่อ').locator('select.pay').selectOption('ok');
  await expect(page.locator('#askMsg')).toContainText('ชำระแล้ว ฿900');
  await page.locator('#askSelect').selectOption('โอน');
  await page.locator('#askYes').click();
  await saved(page);
  expect(sql(`SELECT paid,channel FROM entries WHERE id='e5'`)).toBe('1|โอน');
});
test('ยกเลิกการเปลี่ยนสถานะ ป้ายกลับค่าเดิม', async ({ page }) => {
  await open(page);
  const s = row(page, 'ไม่ระบุชื่อ').locator('select.pay');
  await s.selectOption('ok');
  await askNo(page);
  await expect(s).toHaveValue('due');
  expect(sql(`SELECT paid FROM entries WHERE id='e5'`)).toBe('0');
});
test('เปลี่ยนเป็นมัดจำ ตรวจยอดและบันทึก', async ({ page }) => {
  await open(page);
  const s = row(page, 'ไม่ระบุชื่อ').locator('select.pay');
  await s.selectOption('dep');
  await page.locator('#askInput').fill('2000');
  await page.locator('#askYes').click();
  await expect(page.locator('#toast')).toHaveText('เงินมัดจำต้องมากกว่า 0 และน้อยกว่าค่าเช่ารวม');
  await s.selectOption('dep');
  await page.locator('#askInput').fill('200');
  await page.locator('#askYes').click();
  await saved(page);
  expect(sql(`SELECT paid,deposit FROM entries WHERE id='e5'`)).toBe('0|200.0');
  await expect(row(page, 'ไม่ระบุชื่อ').locator('.who > span')).toContainText('ค้าง ฿700 (มัดจำแล้ว ฿200)');
});
test('เปลี่ยนเป็นค้างชำระ ล้างมัดจำ', async ({ page }) => {
  await open(page);
  await row(page, 'สมหญิง').locator('select.pay').selectOption('due');
  await saved(page);
  expect(sql(`SELECT paid,deposit FROM entries WHERE id='e4'`)).toBe('0|0.0');
});
test('ห้องเต็มชำระครบ: ฉลองโดยหัวการ์ดไม่สูงขึ้น', async ({ page }) => {
  await open(page);
  const head = page.locator('.card.focus .fhead');
  const h0 = (await head.boundingBox())!.height;
  await expect(page.locator('#tdConfetti > *')).toHaveCount(0);
  for (let i = 0; i < 5; i++) await page.locator('#tdNext').click();
  await expect(page.locator('#tdInTitle')).toHaveText('🎉 เต็มทุกห้อง ชำระครบแล้ว');
  await expect(page.locator('#tdInCount')).toHaveText('4/4 ห้อง');
  await expect(page.locator('#tdConfetti > span')).toHaveCount(26);
  await expect(page.locator('#tdConfetti > em')).toHaveCount(5);
  expect((await head.boundingBox())!.height).toBe(h0);
  await page.locator('#tdNext').click();
  await expect(page.locator('#tdInTitle')).toHaveText('🛏 เข้าพักคืน 21 พ.ย.');
  await expect(page.locator('#tdConfetti > *')).toHaveCount(0);
});
test('ค้างชำระทั้งหมด: แยกเดือน ยอดรวม ลิงก์โทร', async ({ page }) => {
  await open(page);
  const due = page.locator('#tdDue');
  await expect(page.locator('#tdDueSum')).toContainText('฿4,000');  // 400+900+800+700+700+500
  await expect(page.locator('#tdDueSum')).toContainText('6 คืน');
  await expect(due.locator('.tmon')).toHaveCount(2);
  await expect(due.locator('.tmon').first()).toContainText('สิงหาคม 2568');
  const old = due.locator('.titem').filter({ hasText: 'เก่าค้าง' }).locator('.who > span');
  await expect(old).toContainText('ศ. 1 ส.ค. 2568');
  await expect(old).toContainText('ค้าง ฿500 (มัดจำแล้ว ฿200)');
  await expect(row(page, 'สมหญิง').locator('a')).toHaveAttribute('href', 'tel:0822222222');
});
test('ไม่มีค้างชำระและไม่มีผู้เข้าพัก แสดงข้อความว่าง', async ({ page }) => {
  sql('UPDATE entries SET paid=1;');
  await open(page);
  await expect(page.locator('#tdDue')).toContainText('ไม่มีค้างชำระ 🎉');
  await page.locator('#tdPrev').click(); for (let i = 0; i < 2; i++) await page.locator('#tdPrev').click();
  await expect(page.locator('#tdIn')).toContainText('ไม่มีผู้เข้าพักคืนนั้น');
  await expect(page.locator('#tdInCount')).toBeHidden();
});
test('รูปประเภทห้องตรงตามชื่อประเภท', async ({ page }) => {
  await open(page);
  await expect(row(page, 'สมชาย').locator('.rtype')).toHaveClass(/rt-single/);
  await expect(row(page, 'สมหญิง').locator('.rtype')).toHaveClass(/rt-double/);
  await expect(row(page, 'ไม่ระบุชื่อ').locator('.rtype')).toHaveClass(/rt-family/);
});
test('กลับมาเมนูวันนี้ยังอยู่วันเดิม', async ({ page }) => {
  await open(page);
  await page.locator('#tdNext').click();
  await goTab(page, 'rooms'); await goTab(page, 'today');
  await expect(page.locator('#tdTitle')).toHaveText('จ. 16 พฤศจิกายน 2569');
});
