import { test, expect, open, saved, askYes, askNo, sql, goTab } from './helpers';

const row = (page: any, n: string) => page.locator('#roomRows tr').filter({ has: page.locator('b', { hasText: new RegExp(`^${n}$`) }) });
const f = (page: any) => page.locator('#roomForm');
test('ตารางห้อง: ค่าและสถานะ', async ({ page }) => {
  await open(page, 'rooms');
  await expect(page.locator('#roomRows tr')).toHaveCount(5);
  await expect(row(page, '1')).toContainText('฿500');
  await expect(row(page, 'ปิดซ่อม').locator('.tag.off')).toHaveText('ปิดปรับปรุง');
  await expect(row(page, '1').locator('.tag.ok')).toHaveText('เปิดให้เช่า');
});
test('เพิ่มห้อง ประเภทเดิม', async ({ page }) => {
  await open(page, 'rooms');
  await page.locator('#btnAddRoom').click();
  await expect(page.locator('#roomFormTitle')).toHaveText('เพิ่มห้อง');
  await f(page).locator('[name=name]').fill('11');
  await f(page).locator('[name=type]').selectOption('ห้องแอร์');
  await f(page).locator('[name=price]').fill('850');
  await f(page).locator('[name=capacity]').fill('2');
  await f(page).locator('[name=note]').fill('ใหม่');
  await f(page).locator('button.pri').click();
  await saved(page);
  await expect(page.locator('#roomMask')).not.toHaveClass(/on/);
  await expect(row(page, '11')).toContainText('฿850');
  expect(sql(`SELECT type,price,capacity,status,note,pos FROM rooms WHERE name='11'`)).toBe('ห้องแอร์|850.0|2|open|ใหม่|5');
});
test('เพิ่มประเภทใหม่เอง และรูปเลือกตามคำ', async ({ page }) => {
  await open(page, 'rooms');
  await page.locator('#btnAddRoom').click();
  await expect(f(page).locator('[name=typeNew]')).toBeHidden();
  await f(page).locator('[name=name]').fill('วิลล่า');
  await f(page).locator('[name=type]').selectOption('__new__');
  await expect(f(page).locator('[name=typeNew]')).toBeVisible();
  await f(page).locator('[name=typeNew]').fill('บ้านครอบครัวริมน้ำ');
  await f(page).locator('button.pri').click();
  await saved(page);
  await page.locator('#btnAddRoom').click();
  await expect(f(page).locator('[name=type] option', { hasText: 'บ้านครอบครัวริมน้ำ' })).toBeAttached();
  await page.locator('#roomMask button.btn[data-close]').click();
  expect(sql(`SELECT type FROM rooms WHERE name='วิลล่า'`)).toBe('บ้านครอบครัวริมน้ำ');
});
test('ชื่อห้องบังคับกรอก', async ({ page }) => {
  await open(page, 'rooms');
  await page.locator('#btnAddRoom').click();
  await f(page).locator('button.pri').click();
  await expect(page.locator('#roomMask')).toHaveClass(/on/);
  expect(sql('SELECT count(*) FROM rooms')).toBe('5');
});
test('แก้ไขห้อง: ปิดปรับปรุงแล้วไม่นับเป็นห้องว่าง', async ({ page }) => {
  await open(page, 'rooms');
  await row(page, '10').locator('[data-edit]').click();
  await expect(page.locator('#roomFormTitle')).toHaveText('แก้ไขห้อง');
  await expect(f(page).locator('[name=name]')).toHaveValue('10');
  await expect(f(page).locator('[name=price]')).toHaveValue('800');
  await expect(f(page).locator('[name=type]')).toHaveValue('ห้องแอร์');
  await f(page).locator('[name=status]').selectOption('closed');
  await f(page).locator('button.pri').click();
  await saved(page);
  await goTab(page, 'today');
  await expect(page.locator('#tdKpis .kpi').nth(1)).toContainText('เต็มทุกห้อง');
  await expect(page.locator('#heroStats span').first()).toContainText('3/3');
});
test('ลบห้อง: เตือนจำนวนรายการ ยกเลิกได้ ลบแล้วรายการหาย', async ({ page }) => {
  await open(page, 'rooms');
  await row(page, '10').locator('[data-del]').click();
  await expect(page.locator('#askMsg')).toContainText('ลบห้อง "10" และรายการเช่าของห้องนี้ 3 รายการ?');
  await askNo(page);
  expect(sql('SELECT count(*) FROM rooms')).toBe('5');
  await row(page, '10').locator('[data-del]').click();
  await askYes(page);
  await saved(page);
  expect(sql(`SELECT count(*) FROM rooms WHERE id='r4'`)).toBe('0');
  expect(sql(`SELECT count(*) FROM entries WHERE room_id='r4'`)).toBe('0');
});
test('ลบห้องที่ไม่มีรายการ ข้อความสั้น', async ({ page }) => {
  sql(`DELETE FROM entries WHERE room_id='r5'`);
  await open(page, 'rooms');
  await row(page, 'ปิดซ่อม').locator('[data-del]').click();
  await expect(page.locator('#askMsg')).toHaveText('ลบห้อง "ปิดซ่อม"?');
  await askNo(page);
});
