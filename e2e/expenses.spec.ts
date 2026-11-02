import { test, expect, open, saved, askYes, askNo, sql } from './helpers';

const cell = (page: any, d: string) => page.locator(`#exCal [data-exdate="${d}"]`);
const f = (page: any) => page.locator('#exForm');
test('ปฏิทินค่าใช้จ่าย ยอดรวม เปลี่ยนเดือน คำอธิบายหมวด', async ({ page }) => {
  await open(page, 'expenses');
  await expect(page.locator('#exTitle')).toHaveText('พฤศจิกายน 2569');
  await expect(page.locator('#exMonthSum')).toHaveText('รวมเดือนนี้ ฿2,100');
  await expect(cell(page, '2026-11-15').locator('.sum')).toHaveText('฿1,500');
  await expect(cell(page, '2026-11-15').locator('.chip')).toHaveCount(2);
  await expect(page.locator('#exLegend')).toContainText('ค่าไฟ ฿1,200');
  await expect(page.locator('#exLegend')).toContainText('ค่าแปลก ฿100');
  await page.locator('#exNext').click(); await expect(page.locator('#exTitle')).toHaveText('ธันวาคม 2569');
  await page.locator('#exToday').click(); await expect(page.locator('#exTitle')).toHaveText('พฤศจิกายน 2569');
  await page.locator('#exPrev').click(); await expect(page.locator('#exTitle')).toHaveText('ตุลาคม 2569');
});
test('เพิ่มค่าใช้จ่าย', async ({ page }) => {
  await open(page, 'expenses');
  await cell(page, '2026-11-10').click();
  await expect(page.locator('#exDayTitle')).toHaveText('🧾 อ. 10 พฤศจิกายน 2569');
  await expect(page.locator('#exList')).toContainText('ยังไม่มีค่าใช้จ่ายในวันนี้');
  await f(page).locator('[name=cat]').selectOption('ค่าซ่อมแซม');
  await f(page).locator('[name=amount]').fill('450');
  await f(page).locator('[name=channel]').selectOption('โอน');
  await f(page).locator('[name=note]').fill('ซ่อมก๊อก');
  await f(page).locator('button.pri').click();
  await saved(page);
  await expect(page.locator('#exList')).toContainText('ซ่อมก๊อก · โอน');
  await expect(cell(page, '2026-11-10').locator('.sum')).toHaveText('฿450');
  expect(sql(`SELECT cat,amount,channel,note FROM expenses WHERE date='2026-11-10'`)).toBe('ค่าซ่อมแซม|450.0|โอน|ซ่อมก๊อก');
});
test('เพิ่มหมวดค่างวดรีสอร์ทได้ และขึ้นในคำอธิบายหมวด', async ({ page }) => {
  await open(page, 'expenses');
  await expect(page.locator('#exLegend')).toContainText('ค่างวดรีสอร์ท');
  await cell(page, '2026-11-01').click();
  await f(page).locator('[name=cat]').selectOption('ค่างวดรีสอร์ท');
  await f(page).locator('[name=amount]').fill('25000');
  await f(page).locator('button.pri').click();
  await saved(page);
  expect(sql(`SELECT cat,amount FROM expenses WHERE date='2026-11-01'`)).toBe('ค่างวดรีสอร์ท|25000.0');
  await expect(page.locator('#exLegend')).toContainText('ค่างวดรีสอร์ท ฿25,000');
});
test('จำนวนเงินเป็นช่องบังคับ', async ({ page }) => {
  await open(page, 'expenses');
  await cell(page, '2026-11-10').click();
  await f(page).locator('button.pri').click();
  expect(sql(`SELECT count(*) FROM expenses WHERE date='2026-11-10'`)).toBe('0');
  await expect(page.locator('#exMask')).toHaveClass(/on/);
});
test('แก้ไข: หมวดที่ตั้งเองยังเลือกได้ ยกเลิกแล้วกลับฟอร์มเพิ่ม', async ({ page }) => {
  await open(page, 'expenses');
  await cell(page, '2026-11-05').click();
  await page.locator('[data-exedit]').click();
  await expect(page.locator('#exFormTitle')).toHaveText('แก้ไข: ค่าแปลก');
  await expect(f(page).locator('[name=cat]')).toHaveValue('ค่าแปลก');
  await expect(f(page).locator('[name=amount]')).toHaveValue('100');
  await page.locator('#exCancel').click();
  await expect(page.locator('#exFormTitle')).toHaveText('เพิ่มค่าใช้จ่าย');
  await expect(page.locator('#exCancel')).toBeHidden();
  await page.locator('[data-exedit]').click();
  await f(page).locator('[name=amount]').fill('150');
  await f(page).locator('button.pri').click();
  await saved(page);
  expect(sql(`SELECT amount FROM expenses WHERE id='x4'`)).toBe('150.0');
});
test('ลบ: ยกเลิกได้ ลบจริง และยอดรวมในหน้าต่าง', async ({ page }) => {
  await open(page, 'expenses');
  await cell(page, '2026-11-15').click();
  await expect(page.locator('#exList tr').last()).toContainText('฿1,500');
  await page.locator('#exList tr').filter({ hasText: 'ค่าไฟ' }).locator('[data-exdel]').click();
  await expect(page.locator('#askMsg')).toHaveText('ลบค่าใช้จ่ายนี้?');
  await askNo(page);
  await page.locator('#exList tr').filter({ hasText: 'ค่าไฟ' }).locator('[data-exdel]').click();
  await askYes(page);
  await saved(page);
  expect(sql(`SELECT count(*) FROM expenses WHERE id='x2'`)).toBe('0');
  await expect(page.locator('#exList')).not.toContainText('ค่าไฟ');
});
