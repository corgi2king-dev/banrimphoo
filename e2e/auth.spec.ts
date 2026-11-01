import { test, expect, login, open, sql, askYes } from './helpers';
import { PASSWORD } from './seed.mjs';

test('ยังไม่เข้าระบบ เปิดหน้าหลักแล้วไปหน้า login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator('h1')).toHaveText('บ้านริมภู');
});
test('รหัสผิดขึ้นข้อความ และยังอยู่หน้า login', async ({ page }) => {
  await login(page, 'admin', 'wrong-password');
  await expect(page.locator('#err')).toHaveText('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator('#btn')).toBeEnabled();
});
test('ผิดซ้ำ 5 ครั้ง ถูกหน่วงเวลา', async ({ page }) => {
  sql(`INSERT INTO fails (ip,n,last) VALUES ('u:tadmin',10,strftime('%s','now'));`);
  await login(page, 'admin');
  await expect(page.locator('#err')).toContainText('ลองผิดหลายครั้ง');
});
test('เข้าสำเร็จไปหน้าหลัก และแสดงชื่อกับสิทธิ์', async ({ page }) => {
  await open(page);
  await expect(page.locator('#userInfo')).toContainText('tadmin');
  await expect(page.locator('#userInfo .rolebadge')).toHaveText('admin');
  await expect(page.locator('#userBtn')).toHaveText('T');
});
test('เข้าแล้ว เปิดหน้า login จะกลับหน้าหลัก', async ({ page }) => {
  await open(page);
  await page.goto('/login');
  await page.waitForURL(u => u.pathname === '/');
});
test('ออกจากระบบ ยกเลิกได้ และออกจริงกลับหน้า login', async ({ page }) => {
  await open(page);
  await page.locator('#userBtn').click();
  await page.locator('#btnLogout').click();
  await expect(page.locator('#askMsg')).toHaveText('ออกจากระบบ?');
  await page.locator('#askNo').click();
  await expect(page.locator('#askMask')).not.toHaveClass(/on/);
  await page.locator('#userBtn').click();
  await page.locator('#btnLogout').click();
  await askYes(page);
  await expect(page).toHaveURL(/\/login/);
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
});
test('เปลี่ยนรหัส: ช่องไม่ตรง รหัสเดิมผิด และสำเร็จ', async ({ page }) => {
  await login(page, 'pw');
  await page.waitForURL(u => u.pathname === '/');
  await page.locator('#userBtn').click();
  await page.locator('#btnPw').click();
  const f = page.locator('#pwForm');
  await f.locator('[name=old]').fill(PASSWORD);
  await f.locator('[name=new]').fill('new-password-1');
  await f.locator('[name=new2]').fill('different-pass');
  await f.locator('button.pri').click();
  await expect(page.locator('#pwErr')).toHaveText('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน');
  await f.locator('[name=old]').fill('not-the-password');
  await f.locator('[name=new2]').fill('new-password-1');
  await f.locator('button.pri').click();
  await expect(page.locator('#pwErr')).toHaveText('รหัสผ่านเดิมไม่ถูกต้อง');
  await f.locator('[name=old]').fill(PASSWORD);
  await f.locator('button.pri').click();
  await expect(page.locator('#toast')).toHaveText('เปลี่ยนรหัสผ่านแล้ว');
  await expect(page.locator('#pwMask')).not.toHaveClass(/on/);
  const before = sql(`SELECT hash FROM users WHERE username='tadmin'`);
  sql(`UPDATE users SET salt=(SELECT salt FROM users WHERE username='tadmin'), hash='${before}', iter=(SELECT iter FROM users WHERE username='tadmin') WHERE username='tpw'`);
});
test('session หมดอายุ: กดอะไรก็กลับไปหน้า login', async ({ page }) => {
  await open(page);
  sql('DELETE FROM sessions;');
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
});
