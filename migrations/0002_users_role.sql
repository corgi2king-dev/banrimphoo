-- สิทธิ์ผู้ใช้: admin = ทำได้ทุกอย่าง · viewer = ดูอย่างเดียว (เมนู วันนี้ / บันทึกค่าเช่า / ค่าใช้จ่าย / สรุป)
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'viewer'));
