-- บ้านริมภู · ตารางใน Cloudflare D1 (แยกคอลัมน์ · extra = JSON สำหรับช่องข้อมูลที่อาจเพิ่มในอนาคต)
-- นี่คือโครงตั้งต้น — การเปลี่ยนตารางหลังจากนี้อยู่ใน migrations/ (wrangler d1 migrations apply)

CREATE TABLE IF NOT EXISTS rooms (
  id       TEXT PRIMARY KEY,
  pos      INTEGER NOT NULL DEFAULT 0,          -- ลำดับที่แสดง (สีห้องตามลำดับนี้)
  name     TEXT NOT NULL,
  type     TEXT,
  price    REAL NOT NULL DEFAULT 0 CHECK (price >= 0),   -- ราคา/คืน (บาท)
  capacity INTEGER NOT NULL DEFAULT 0 CHECK (capacity >= 0),
  status   TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  note     TEXT,
  extra    TEXT
);

CREATE TABLE IF NOT EXISTS entries (                -- การจอง (1 แถว = 1 คืน)
  id       TEXT PRIMARY KEY,
  date     TEXT NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
  room_id  TEXT NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
  guest    TEXT,
  amount   REAL NOT NULL DEFAULT 0 CHECK (amount >= 0),
  paid     INTEGER NOT NULL DEFAULT 0 CHECK (paid IN (0, 1)),
  deposit  REAL NOT NULL DEFAULT 0 CHECK (deposit >= 0),    -- มัดจำ (เมื่อ paid = 0)
  channel  TEXT,
  note     TEXT,
  grp      TEXT,                                  -- การจองหลายคืนแบบเก่า (group)
  extra    TEXT
);
CREATE INDEX IF NOT EXISTS entries_date ON entries (date);
CREATE INDEX IF NOT EXISTS entries_room ON entries (room_id);

CREATE TABLE IF NOT EXISTS expenses (
  id       TEXT PRIMARY KEY,
  date     TEXT NOT NULL CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
  cat      TEXT NOT NULL,                         -- หมวด: ค่าน้ำ, ค่าไฟ, ค่าแม่บ้าน, ...
  amount   REAL NOT NULL DEFAULT 0 CHECK (amount >= 0),
  channel  TEXT,
  note     TEXT,
  extra    TEXT
);
CREATE INDEX IF NOT EXISTS expenses_date ON expenses (date);

-- ผู้ใช้ (เก็บเฉพาะ hash PBKDF2-SHA256) · session เก็บ SHA-256 ของ token · fails = นับรหัสผิดต่อ IP
CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, salt TEXT NOT NULL, hash TEXT NOT NULL, iter INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user TEXT NOT NULL, exp INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS fails (ip TEXT PRIMARY KEY, n INTEGER NOT NULL, last INTEGER NOT NULL);

-- ประวัติการทำรายการ (การจอง / ค่าใช้จ่าย): ใคร ทำอะไร เมื่อไหร่ · before / after = ข้อมูลก่อน-หลัง (JSON แบบหน้าเว็บ)
CREATE TABLE IF NOT EXISTS history (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  at       INTEGER NOT NULL,                      -- เวลา (unix วินาที)
  user     TEXT,
  kind     TEXT NOT NULL CHECK (kind IN ('entries', 'expenses')),
  action   TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  item_id  TEXT NOT NULL,
  item_date TEXT,                                 -- วันที่ของรายการ (คืนที่จอง / วันที่จ่าย)
  before   TEXT,
  after    TEXT
);
CREATE INDEX IF NOT EXISTS history_at ON history (at);
