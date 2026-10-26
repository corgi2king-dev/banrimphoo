// สร้าง/เปลี่ยนรหัส/เปลี่ยนสิทธิ์ผู้ใช้ใน D1 — พิมพ์รหัสผ่านในเทอร์มินัลนี้ (ไม่แสดงบนจอ, ไม่บันทึกลงไฟล์)
// สิทธิ์: admin = ทำได้ทุกอย่าง · viewer = ดูอย่างเดียว
// ใช้: npm run user   (บน Cloudflare)   ·   npm run user:local   (ฐานข้อมูลทดสอบในเครื่อง)
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import readline from 'node:readline';

const where = process.argv.includes('--local') ? '--local' : '--remote';
function ask(q, hidden) {
  return new Promise(res => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) rl._writeToOutput = s => { if (s.startsWith(q)) process.stdout.write(q); };
    rl.question(q, a => { rl.close(); if (hidden) process.stdout.write('\n'); res(a); });
  });
}
const user = (await ask('ชื่อผู้ใช้: ')).trim();
const pw = await ask('รหัสผ่าน (อย่างน้อย 8 ตัว): ', true);
const pw2 = await ask('ยืนยันรหัสผ่าน: ', true);
const roleIn = (await ask('สิทธิ์ [1] admin ทำได้ทุกอย่าง  [2] viewer ดูอย่างเดียว (Enter = 1): ')).trim();
const role = roleIn === '2' || roleIn.toLowerCase() === 'viewer' ? 'viewer' : 'admin';
if (!user || user.length > 40) { console.error('ชื่อผู้ใช้ต้องมี 1–40 ตัวอักษร'); process.exit(1); }
if (pw.length < 8) { console.error('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร'); process.exit(1); }
if (pw !== pw2) { console.error('รหัสผ่านทั้งสองช่องไม่ตรงกัน'); process.exit(1); }

const iter = 100000, salt = randomBytes(16).toString('hex');
const hash = pbkdf2Sync(pw, Buffer.from(salt, 'hex'), iter, 32, 'sha256').toString('hex');
const q = s => `'${s.replace(/'/g, "''")}'`;
const dir = mkdtempSync(join(tmpdir(), 'brp-')), file = join(dir, 'user.sql');
writeFileSync(file, `INSERT INTO users (username, salt, hash, iter, role) VALUES (${q(user)}, ${q(salt)}, ${q(hash)}, ${iter}, ${q(role)})
  ON CONFLICT(username) DO UPDATE SET salt = excluded.salt, hash = excluded.hash, iter = excluded.iter, role = excluded.role;
DELETE FROM sessions WHERE user = ${q(user)};`, { mode: 0o600 });
try {
  execFileSync('npx', ['wrangler', 'd1', 'execute', 'banrimphoo', where, '--file', file], { stdio: 'inherit' });
  console.log(`\n✓ บันทึกผู้ใช้ "${user}" สิทธิ์ ${role === 'viewer' ? 'viewer (ดูอย่างเดียว)' : 'admin'} แล้ว (${where === '--local' ? 'ในเครื่อง' : 'บน Cloudflare'})`);
} finally { rmSync(dir, { recursive: true, force: true }); }
