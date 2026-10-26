#!/usr/bin/env python3
"""บ้านริมภู — เว็บจัดการเช่าที่พัก

รัน:  python3 work/banrimphoo/serve.py [port]   (ค่าเริ่มต้น 8787) → http://127.0.0.1:8787
ข้อมูล: rooms.json = รายการห้อง · entries/YYYY-MM.json = การจอง · expenses/YYYY-MM.json = ค่าใช้จ่าย (ไฟล์ละเดือน)
       (data.json แบบเก่าจะถูกแยกให้อัตโนมัติตอนเปิด แล้วเปลี่ยนชื่อเป็น data.json.migrated)
Excel: GET /api/export?period=YYYY-MM หรือ YYYY → ไฟล์ .xlsx รายการเช่า + สรุปตามห้อง + ค่าใช้จ่าย/กำไร (xlsx_export.py)
ผู้ใช้: auth.json  {"users": {"<ชื่อ>": {"salt", "hash", "iter"}}} — เก็บเฉพาะ hash (PBKDF2-SHA256)
       ยังไม่มีผู้ใช้ → เปิดเว็บครั้งแรกจะให้ตั้งชื่อผู้ใช้/รหัสผ่านเอง
ตั้ง BANRIMPHOO_DIR เพื่อย้ายที่เก็บข้อมูล / auth.json (ค่าเริ่มต้น = โฟลเดอร์นี้)

ขึ้นเซิร์ฟเวอร์จริง (ดู deploy/setup.sh) ใช้ env:
  BRP_HOST=127.0.0.1  BRP_PORT=8787   ฟังที่ไหน (อยู่หลัง Caddy → 127.0.0.1)
  BRP_SECURE=1        คุกกี้ส่งผ่าน https เท่านั้น
  BRP_TRUST_PROXY=1   อ่าน IP จริงจาก X-Forwarded-For (ใช้เมื่ออยู่หลัง reverse proxy เท่านั้น)
สำรองข้อมูล: ก่อนบันทึกครั้งแรกของแต่ละวัน คัดลอก rooms.json + entries/ + expenses/ ไว้ที่ backups/YYYY-MM-DD/ (เก็บ 30 วันล่าสุด)
"""
import hashlib
import hmac
import json
import os
import re
import secrets
import shutil
import sys
import threading
import time
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

import xlsx_export

ROOT = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(ROOT, "public")  # หน้าเว็บ (ใช้ร่วมกับ Cloudflare Worker)
STORE = os.environ.get("BANRIMPHOO_DIR", ROOT)
DATA = os.path.join(STORE, "data.json")  # รูปแบบเก่า (ไฟล์เดียว) — ใช้แค่ตอนย้ายข้อมูล
ROOMS = os.path.join(STORE, "rooms.json")
ENTRIES = os.path.join(STORE, "entries")
EXPENSES = os.path.join(STORE, "expenses")
HISTORY = os.path.join(STORE, "history")  # ประวัติการทำรายการ: history/YYYY-MM.jsonl (1 บรรทัด = 1 รายการ, เดือนตามเวลาที่ทำ)
MONTH_FILE = re.compile(r"^\d{4}-\d{2}\.json$")
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
AUTH = os.path.join(STORE, "auth.json")
SESS = os.path.join(STORE, "sessions.json")
BACKUPS = os.path.join(STORE, "backups")
KEEP_BACKUPS = 30
SECURE = os.environ.get("BRP_SECURE") == "1"
TRUST_PROXY = os.environ.get("BRP_TRUST_PROXY") == "1"
EMPTY = {"rooms": [], "entries": []}
TH_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
             "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"]
STATIC = {"/": "index.html", "/index.html": "index.html", "/login": "login.html", "/login.html": "login.html",
          "/scene.js": "scene.js", "/photo.jpg": "photo.jpg"}
TYPES = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".jpg": "image/jpeg"}
# photo.jpg = รูปจริงของที่พัก (ไม่บังคับ) ถ้ามีจะใช้เป็นพื้นหลังหน้าล็อกอินแทนภาพวาด
PUBLIC = {"/login", "/login.html", "/scene.js", "/photo.jpg", "/api/me", "/api/login", "/api/setup"}
COOKIE = "brp_session"
VIEW_ONLY = "บัญชีนี้ดูได้อย่างเดียว — เพิ่ม/แก้ไข/ลบไม่ได้"
SESSION_TTL = 7 * 24 * 3600
ITER = 200_000

sessions = {}  # token → {"user", "exp"} — เก็บลง sessions.json ด้วย รีสตาร์ทแล้วไม่หลุด
fails = {}  # "ip:…" / "u:ชื่อผู้ใช้" → [count, last_ts]
LOCK_MAX, FAIL_RESET = 15 * 60, 24 * 3600


def lock_wait(key, n):
    """ต่อ IP ผิด ≥5 → รอ 2,4,8,… วินาที (สูงสุด 15 นาที) · ต่อชื่อผู้ใช้ ผิด ≥10 → ล็อก 15 นาที (เหมือน worker/index.js)"""
    if key.startswith("u:"):
        return LOCK_MAX if n >= 10 else 0
    return min(LOCK_MAX, 2 ** (n - 4)) if n >= 5 else 0
lock = threading.Lock()


def read_json(path, default):
    if not os.path.exists(path):
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def write_json(path, obj):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
    os.replace(tmp, path)
    if path in (AUTH, SESS):
        os.chmod(path, 0o600)


def save_sessions():  # เรียกใน lock
    now = time.time()
    for t in [t for t, v in sessions.items() if v["exp"] <= now]:
        sessions.pop(t)
    write_json(SESS, sessions)


def month_files(folder=ENTRIES):
    return sorted(f for f in os.listdir(folder) if MONTH_FILE.match(f)) if os.path.isdir(folder) else []


def load_months(folder):
    items = []
    for f in month_files(folder):
        items += read_json(os.path.join(folder, f), [])
    return items


def save_months(folder, items):
    """เขียนแยกไฟล์ละเดือน folder/YYYY-MM.json — เขียนเฉพาะเดือนที่เปลี่ยน, เดือนที่ว่างแล้วลบไฟล์"""
    os.makedirs(folder, exist_ok=True)
    by_month = {}
    for e in items:
        by_month.setdefault(e["date"][:7], []).append(e)
    for f in month_files(folder):
        if f[:7] not in by_month:
            os.remove(os.path.join(folder, f))
    for m, es in by_month.items():
        path = os.path.join(folder, f"{m}.json")
        es.sort(key=lambda e: e["date"])
        if read_json(path, None) != es:
            write_json(path, es)


def load_db():
    return {"rooms": read_json(ROOMS, []), "entries": load_months(ENTRIES), "expenses": load_months(EXPENSES)}


def save_db(db):
    """rooms → rooms.json · entries → entries/ · expenses → expenses/"""
    if read_json(ROOMS, None) != db["rooms"]:
        write_json(ROOMS, db["rooms"])
    save_months(ENTRIES, db["entries"])
    save_months(EXPENSES, db.get("expenses", []))


def log_history(user, db, up, de):
    """บันทึก create / update / delete ของการจองและค่าใช้จ่าย พร้อมข้อมูลก่อน-หลัง (เหมือน worker/index.js)"""
    t, rows = int(time.time()), []
    for k in ("entries", "expenses"):
        old = {x["id"]: x for x in db[k]}
        for x in up.get(k, []):
            b = old.get(x["id"])
            if b is None:
                rows.append((k, "create", x["id"], x.get("date"), None, x))
            elif b != x:
                rows.append((k, "update", x["id"], x.get("date"), b, x))
        for i in de.get(k, []):
            if i in old:
                rows.append((k, "delete", i, old[i].get("date"), old[i], None))
    if not rows:
        return
    os.makedirs(HISTORY, exist_ok=True)
    with open(os.path.join(HISTORY, time.strftime("%Y-%m.jsonl", time.localtime(t))), "a", encoding="utf-8") as f:
        for k, action, item_id, date, before, after in rows:
            f.write(json.dumps({"at": t, "user": user, "kind": k, "action": action, "item_id": item_id, "item_date": date,
                                "before": before, "after": after}, ensure_ascii=False) + "\n")


def read_history(period):
    path = os.path.join(HISTORY, f"{period}.jsonl")
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()][::-1]  # ใหม่สุดก่อน


def migrate():
    """data.json (ไฟล์เดียวแบบเก่า) → rooms.json + entries/ — ทำครั้งเดียว เก็บไฟล์เดิมไว้เป็น data.json.migrated"""
    if os.path.exists(DATA) and not os.path.exists(ROOMS):
        save_db(read_json(DATA, EMPTY))
        os.replace(DATA, DATA + ".migrated")
        print(f"ย้ายข้อมูลจาก data.json → rooms.json + entries/ ({len(month_files())} เดือน)", flush=True)


def backup_data():
    """คัดลอกข้อมูลทั้งหมดไว้วันละครั้ง ก่อนถูกเขียนทับ → backups/YYYY-MM-DD/"""
    if not os.path.exists(ROOMS):
        return
    dst = os.path.join(BACKUPS, time.strftime("%Y-%m-%d"))
    if os.path.exists(dst):
        return
    os.makedirs(dst)
    shutil.copy2(ROOMS, dst)
    for folder in (ENTRIES, EXPENSES, HISTORY):
        if os.path.isdir(folder):
            shutil.copytree(folder, os.path.join(dst, os.path.basename(folder)))
    days = sorted(d for d in os.listdir(BACKUPS) if re.match(r"^\d{4}-\d{2}-\d{2}$", d))
    for old in days[:-KEEP_BACKUPS]:
        shutil.rmtree(os.path.join(BACKUPS, old))


def cookie(tok, age):
    return f"{COOKIE}={tok}; Path=/; HttpOnly; SameSite=Strict; Max-Age={age}" + ("; Secure" if SECURE else "")


def users():
    return read_json(AUTH, {"users": {}})["users"]


def hash_pw(pw, salt=None, it=ITER):
    salt = salt or secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac("sha256", pw.encode("utf-8"), bytes.fromhex(salt), it).hex()
    return {"salt": salt, "hash": h, "iter": it}


def check_pw(user, pw):
    u = users().get(user)
    if not u:
        hash_pw(pw)  # ใช้เวลาเท่ากัน ไม่บอกว่าชื่อผู้ใช้มีอยู่ไหม
        return False
    return hmac.compare_digest(hash_pw(pw, u["salt"], u["iter"])["hash"], u["hash"])


def valid_new(user, pw):
    if not user or len(user) > 40:
        return "ชื่อผู้ใช้ต้องมี 1–40 ตัวอักษร"
    if len(pw) < 8:
        return "รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร"
    return None


class Handler(SimpleHTTPRequestHandler):
    def _json(self, code, obj, cookie=None):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        if cookie is not None:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        n = int(self.headers.get("Content-Length", 0))
        if n > 5_000_000:
            raise ValueError("ข้อมูลใหญ่เกินไป")
        return json.loads(self.rfile.read(n).decode("utf-8") or "{}")

    def _path(self):
        return self.path.split("?", 1)[0]

    def _session(self):
        c = SimpleCookie(self.headers.get("Cookie", ""))
        tok = c[COOKIE].value if COOKIE in c else None
        with lock:
            s = sessions.get(tok)
            if s and s["exp"] > time.time():
                u = users().get(s["user"])
                if u:  # ผู้ใช้ที่ถูกลบแล้ว session ใช้ไม่ได้ · สิทธิ์ที่ไม่รู้จัก = viewer
                    return tok, {**s, "role": "admin" if u.get("role", "admin") == "admin" else "viewer"}
            if tok in sessions:
                sessions.pop(tok)
                save_sessions()
        return None, None

    def _ip(self):
        if TRUST_PROXY:
            xff = self.headers.get("X-Forwarded-For", "")
            if xff:
                return xff.split(",")[-1].strip()  # ค่าสุดท้าย = ที่ proxy ของเราใส่เอง
        return self.client_address[0]

    def _new_session(self, user):
        tok = secrets.token_urlsafe(32)
        with lock:
            sessions[tok] = {"user": user, "exp": time.time() + SESSION_TTL}
            save_sessions()
        return cookie(tok, SESSION_TTL)

    def _static(self, name):
        path = os.path.join(PUBLIC_DIR, name)
        if not os.path.exists(path):
            return self._json(404, {"error": "not found"})
        with open(path, "rb") as f:
            body = f.read()
        self.send_response(200)
        self.send_header("Content-Type", TYPES[os.path.splitext(name)[1]])
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _apply_changes(self, ch, user):
        """{"upsert": {kind: [...]}, "delete": {kind: [id...]}, "roomOrder": [id...]} — แก้ทีละรายการ ไม่ทับของคนอื่น"""
        kinds = ("rooms", "entries", "expenses")
        up, de = ch.get("upsert") or {}, ch.get("delete") or {}
        for k in kinds:
            if not isinstance(up.get(k, []), list) or not isinstance(de.get(k, []), list):
                return self._json(400, {"error": f"{k} ต้องเป็น list"})
            if not all(isinstance(x, dict) and x.get("id") for x in up.get(k, [])):
                return self._json(400, {"error": f"{k} ทุกรายการต้องมี id"})
            if k != "rooms" and not all(DATE.match(str(x.get("date", ""))) for x in up.get(k, [])):
                return self._json(400, {"error": f"{k} ต้องมี date แบบ YYYY-MM-DD"})
        with lock:
            db = load_db()
            log_history(user, db, up, de)
            for k in kinds:
                gone = set(de.get(k, []))
                byid = {x["id"]: x for x in db[k] if x["id"] not in gone}
                for x in up.get(k, []):
                    byid[x["id"]] = x
                db[k] = list(byid.values())
            order = {rid: i for i, rid in enumerate(ch.get("roomOrder") or [])}
            db["rooms"].sort(key=lambda r: order.get(r["id"], len(order)))
            backup_data()
            save_db(db)
        return self._json(200, {"ok": True})

    def _export(self):
        period = parse_qs(urlparse(self.path).query).get("period", [""])[0]
        if not re.match(r"^\d{4}(-\d{2})?$", period):
            return self._json(400, {"error": "period ต้องเป็น YYYY หรือ YYYY-MM"})
        db = load_db()
        es = [e for e in db["entries"] if e["date"].startswith(period)]
        y = int(period[:4])
        title = (f"บ้านริมภู · รายงานค่าเช่า {TH_MONTHS[int(period[5:]) - 1]} {y + 543}" if len(period) == 7
                 else f"บ้านริมภู · รายงานค่าเช่า ปี {y + 543}")
        xs = [e for e in db["expenses"] if e["date"].startswith(period)]
        body = xlsx_export.build(db["rooms"], es, title, xs)
        self.send_response(200)
        self.send_header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        self.send_header("Content-Disposition", f'attachment; filename="banrimphoo-{period}.xlsx"')
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _redirect(self, to):
        self.send_response(302)
        self.send_header("Location", to)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        p = self._path()
        _, s = self._session()
        if p == "/api/me":
            return self._json(200, {"user": s and s["user"], "role": s and s["role"], "setup": not users()})
        if p not in PUBLIC and not s:
            return self._json(401, {"error": "login"}) if p.startswith("/api/") else self._redirect("/login")
        if p in ("/login", "/login.html") and s:
            return self._redirect("/")
        if p == "/api/data":
            return self._json(200, {**load_db(), "user": s["user"], "role": s["role"]})
        if p == "/api/export":
            return self._export()
        if p == "/api/history" and s["role"] != "admin":
            return self._json(403, {"error": VIEW_ONLY})
        if p == "/api/history":
            period = parse_qs(urlparse(self.path).query).get("period", [""])[0]
            if not re.match(r"^\d{4}-\d{2}$", period):
                return self._json(400, {"error": "period ต้องเป็น YYYY-MM"})
            return self._json(200, read_history(period))
        if p in STATIC:
            return self._static(STATIC[p])
        return self._json(404, {"error": "not found"})

    def do_POST(self):
        p = self._path()
        tok, s = self._session()
        try:
            body = self._body()
        except Exception as e:  # noqa: BLE001
            return self._json(400, {"error": str(e)})

        if p == "/api/setup":
            with lock:
                if users():
                    return self._json(403, {"error": "ตั้งผู้ใช้ไปแล้ว"})
                user, pw = str(body.get("username", "")).strip(), str(body.get("password", ""))
                err = valid_new(user, pw)
                if err:
                    return self._json(400, {"error": err})
                write_json(AUTH, {"users": {user: hash_pw(pw)}})
            return self._json(200, {"ok": True}, self._new_session(user))

        if p == "/api/login":
            user, pw = str(body.get("username", "")).strip()[:40], str(body.get("password", ""))[:200]
            keys = [f"ip:{self._ip()}", f"u:{user.lower()}"]
            t = time.time()
            with lock:
                left = max([lock_wait(k, n) - (t - last) for k, (n, last) in ((k, fails.get(k, [0, 0])) for k in keys)
                            if t - last <= FAIL_RESET] or [0])
            if left > 0:
                w = f"{-(-int(left) // 60)} นาที" if left >= 90 else f"{int(left) + 1} วินาที"
                return self._json(429, {"error": f"ลองผิดหลายครั้ง รอ {w} แล้วลองใหม่"})
            if not check_pw(user, pw):
                with lock:
                    for k in keys:
                        n, last = fails.get(k, [0, 0])
                        fails[k] = [1 if t - last > FAIL_RESET else n + 1, t]
                return self._json(401, {"error": "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"})
            with lock:
                for k in keys:
                    fails.pop(k, None)
            return self._json(200, {"ok": True}, self._new_session(user))

        if not s:
            return self._json(401, {"error": "login"})

        if p == "/api/logout":
            with lock:
                sessions.pop(tok, None)
                save_sessions()
            return self._json(200, {"ok": True}, cookie("", 0))

        if p == "/api/password":
            old, new = str(body.get("old", "")), str(body.get("new", ""))
            if not check_pw(s["user"], old):
                return self._json(400, {"error": "รหัสผ่านเดิมไม่ถูกต้อง"})
            err = valid_new(s["user"], new)
            if err:
                return self._json(400, {"error": err})
            with lock:
                a = read_json(AUTH, {"users": {}})
                a["users"][s["user"]] = {**a["users"].get(s["user"], {}), **hash_pw(new)}  # เก็บสิทธิ์ (role) เดิมไว้
                write_json(AUTH, a)
                for t in [t for t, v in sessions.items() if v["user"] == s["user"] and t != tok]:
                    sessions.pop(t)  # เครื่องอื่นต้องล็อกอินใหม่
                save_sessions()
            return self._json(200, {"ok": True})

        if p in ("/api/changes", "/api/data") and s["role"] != "admin":  # viewer: ห้ามเพิ่ม/แก้/ลบ
            return self._json(403, {"error": VIEW_ONLY})

        if p == "/api/changes":
            return self._apply_changes(body, s["user"])

        if p == "/api/data":
            if not isinstance(body.get("rooms"), list) or not isinstance(body.get("entries"), list):
                return self._json(400, {"error": "rooms / entries ต้องเป็น list"})
            if "expenses" not in body:  # หน้าเว็บเวอร์ชันเก่า (ยังไม่มีเมนูค่าใช้จ่าย) → ไม่แตะค่าใช้จ่ายเดิม
                body["expenses"] = load_months(EXPENSES)
            if not isinstance(body["expenses"], list):
                return self._json(400, {"error": "expenses ต้องเป็น list"})
            if not all(isinstance(e, dict) and DATE.match(str(e.get("date", ""))) for e in body["entries"] + body["expenses"]):
                return self._json(400, {"error": "entries / expenses ต้องมี date แบบ YYYY-MM-DD"})
            with lock:
                backup_data()
                save_db(body)
            return self._json(200, {"ok": True})

        return self._json(404, {"error": "not found"})

    def log_message(self, fmt, *args):
        if self.command == "POST" and "/api/data" not in self.path:
            super().log_message(fmt, *args)


def add_user_cli():
    """python3 serve.py --user → สร้าง/เปลี่ยนรหัส/เปลี่ยนสิทธิ์ผู้ใช้ (admin / viewer)"""
    import getpass
    user = input("ชื่อผู้ใช้: ").strip()
    pw = getpass.getpass("รหัสผ่าน (อย่างน้อย 8 ตัว): ")
    if getpass.getpass("ยืนยันรหัสผ่าน: ") != pw:
        sys.exit("รหัสผ่านทั้งสองช่องไม่ตรงกัน")
    err = valid_new(user, pw)
    if err:
        sys.exit(err)
    role = "viewer" if input("สิทธิ์ [1] admin ทำได้ทุกอย่าง  [2] viewer ดูอย่างเดียว (Enter = 1): ").strip() in ("2", "viewer") else "admin"
    a = read_json(AUTH, {"users": {}})
    a["users"][user] = {**hash_pw(pw), "role": role}
    write_json(AUTH, a)
    print(f"✓ บันทึกผู้ใช้ \"{user}\" สิทธิ์ {role} แล้ว (ถ้าเซิร์ฟเวอร์รันอยู่ ให้รีสตาร์ท)")


if __name__ == "__main__":
    if "--user" in sys.argv:
        add_user_cli()
        sys.exit(0)
    host = os.environ.get("BRP_HOST", "127.0.0.1")
    port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("BRP_PORT", 8787))
    os.makedirs(STORE, exist_ok=True)
    sessions.update(read_json(SESS, {}))
    migrate()
    print(f"บ้านริมภู → http://{host}:{port}  (data: {STORE}, secure={SECURE}, proxy={TRUST_PROXY})", flush=True)
    ThreadingHTTPServer((host, port), Handler).serve_forever()
