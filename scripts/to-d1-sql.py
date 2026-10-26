#!/usr/bin/env python3
"""แปลงข้อมูลแบบไฟล์ (rooms.json, entries/, expenses/) → คำสั่ง SQL สำหรับนำเข้า D1 แบบแยกคอลัมน์ (พิมพ์ออก stdout)
ใช้: python3 scripts/to-d1-sql.py [โฟลเดอร์ข้อมูล] > import.sql   (ค่าเริ่มต้น = โฟลเดอร์โปรเจค)
คอลัมน์ต้องตรงกับ worker/schema.sql และ worker/columns.js · ไม่รวมบัญชีล็อกอิน — สร้างใหม่ด้วย npm run user
การจองที่อ้างถึงห้องที่ไม่มีแล้วจะถูกข้าม (แจ้งใน stderr)"""
import glob
import json
import os
import sys

# [ชื่อในหน้าเว็บ, คอลัมน์, ชนิด] — เหมือน worker/columns.js
COLS = {
    "rooms": [("name", "name", "text"), ("type", "type", "text"), ("price", "price", "num"), ("capacity", "capacity", "int"),
              ("status", "status", "text"), ("note", "note", "text")],
    "entries": [("date", "date", "text"), ("roomId", "room_id", "text"), ("guest", "guest", "text"), ("phone", "phone", "text"), ("amount", "amount", "num"),
                ("paid", "paid", "bool"), ("deposit", "deposit", "num"), ("channel", "channel", "text"), ("note", "note", "text"),
                ("group", "grp", "text")],
    "expenses": [("date", "date", "text"), ("cat", "cat", "text"), ("amount", "amount", "num"), ("channel", "channel", "text"),
                 ("note", "note", "text")],
}
DEFAULTS = {"status": "open", "name": "", "cat": "อื่น ๆ"}


def sql(v):
    if v is None:
        return "NULL"
    if isinstance(v, (int, float)):
        return repr(v)
    return "'" + str(v).replace("'", "''") + "'"


def to_db(v, t, key):
    if t == "bool":
        return 1 if v else 0
    if t == "num":
        return float(v or 0)
    if t == "int":
        return round(float(v or 0))
    return DEFAULTS.get(key) if v is None else str(v)


def insert(kind, obj, pos=None):
    known = {"id", *(c[0] for c in COLS[kind])}
    rest = {k: v for k, v in obj.items() if k not in known}
    cols = ["id", *(c[1] for c in COLS[kind]), "extra"]
    vals = [obj["id"], *(to_db(obj.get(k), t, k) for k, _, t in COLS[kind]), json.dumps(rest, ensure_ascii=False) if rest else None]
    if pos is not None:
        cols.append("pos")
        vals.append(pos)
    upd = ", ".join(f"{c} = excluded.{c}" for c in cols if c != "id")
    # ไม่ใช้ INSERT OR REPLACE: จะลบแถวห้องเดิม → การจองโดนลบตาม ON DELETE CASCADE
    return f"INSERT INTO {kind} ({', '.join(cols)}) VALUES ({', '.join(sql(v) for v in vals)}) ON CONFLICT(id) DO UPDATE SET {upd};"


root = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
rooms = json.load(open(os.path.join(root, "rooms.json"), encoding="utf-8"))
room_ids = {r["id"] for r in rooms}
for i, r in enumerate(rooms):
    print(insert("rooms", r, i))
print(f"-- rooms: {len(rooms)}", file=sys.stderr)
for kind in ("entries", "expenses"):
    n = skipped = 0
    for f in sorted(glob.glob(os.path.join(root, kind, "*.json"))):
        for e in json.load(open(f, encoding="utf-8")):
            if kind == "entries" and e.get("roomId") not in room_ids:
                skipped += 1
                print(f"-- ข้าม: การจอง {e.get('date')} อ้างถึงห้องที่ไม่มีแล้ว", file=sys.stderr)
                continue
            print(insert(kind, e))
            n += 1
    print(f"-- {kind}: {n}" + (f" (ข้าม {skipped})" if skipped else ""), file=sys.stderr)
