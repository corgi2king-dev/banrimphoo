-- ลบตารางข้อมูล (ห้อง/การจอง/ค่าใช้จ่าย) เพื่อสร้างใหม่ตาม schema.sql — ใช้กับฐานข้อมูลทดสอบในเครื่องเท่านั้น (npm run db:local)
-- ไม่แตะบัญชีผู้ใช้ (users / sessions / fails)
DROP TABLE IF EXISTS entries;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS d1_migrations;  -- ให้ migrations รันใหม่หลังสร้างตารางใหม่
