#!/usr/bin/env python3
"""บ้านริมภู — เว็บจัดการเช่าที่พัก

รัน:  python3 work/banrimphoo/serve.py [port]   (ค่าเริ่มต้น 8787) → http://127.0.0.1:8787
ข้อมูล: data.json  {"rooms": [...], "entries": [...]}
ผู้ใช้: auth.json  {"users": {"<ชื่อ>": {"salt", "hash", "iter"}}} — เก็บเฉพาะ hash (PBKDF2-SHA256)
       ยังไม่มีผู้ใช้ → เปิดเว็บครั้งแรกจะให้ตั้งชื่อผู้ใช้/รหัสผ่านเอง
ตั้ง BANRIMPHOO_DIR เพื่อย้ายที่เก็บ data.json / auth.json (ค่าเริ่มต้น = โฟลเดอร์นี้)

ขึ้นเซิร์ฟเวอร์จริง (ดู deploy/setup.sh) ใช้ env:
  BRP_HOST=127.0.0.1  BRP_PORT=8787   ฟังที่ไหน (อยู่หลัง Caddy → 127.0.0.1)
  BRP_SECURE=1        คุกกี้ส่งผ่าน https เท่านั้น
  BRP_TRUST_PROXY=1   อ่าน IP จริงจาก X-Forwarded-For (ใช้เมื่ออยู่หลัง reverse proxy เท่านั้น)
สำรองข้อมูล: ก่อนบันทึกครั้งแรกของแต่ละวัน คัดลอก data.json ไว้ที่ backups/ (เก็บ 30 วันล่าสุด)
"""
import hashlib
import hmac
import json
import os
import secrets
import shutil
import sys
import threading
import time
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
STORE = os.environ.get("BANRIMPHOO_DIR", ROOT)
DATA = os.path.join(STORE, "data.json")
AUTH = os.path.join(STORE, "auth.json")
SESS = os.path.join(STORE, "sessions.json")
BACKUPS = os.path.join(STORE, "backups")
KEEP_BACKUPS = 30
SECURE = os.environ.get("BRP_SECURE") == "1"
TRUST_PROXY = os.environ.get("BRP_TRUST_PROXY") == "1"
EMPTY = {"rooms": [], "entries": []}
STATIC = {"/": "index.html", "/index.html": "index.html", "/login": "login.html", "/login.html": "login.html",
          "/scene.js": "scene.js", "/photo.jpg": "photo.jpg"}
TYPES = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".jpg": "image/jpeg"}
# photo.jpg = รูปจริงของที่พัก (ไม่บังคับ) ถ้ามีจะใช้เป็นพื้นหลังหน้าล็อกอินแทนภาพวาด
PUBLIC = {"/login", "/login.html", "/scene.js", "/photo.jpg", "/api/me", "/api/login", "/api/setup"}
COOKIE = "brp_session"
SESSION_TTL = 7 * 24 * 3600
ITER = 200_000

sessions = {}  # token → {"user", "exp"} — เก็บลง sessions.json ด้วย รีสตาร์ทแล้วไม่หลุด
fails = {}  # ip → [count, last_ts]
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


def backup_data():
    """คัดลอก data.json ไว้วันละครั้ง ก่อนถูกเขียนทับ"""
    if not os.path.exists(DATA):
        return
    os.makedirs(BACKUPS, exist_ok=True)
    dst = os.path.join(BACKUPS, time.strftime("data-%Y-%m-%d.json"))
    if not os.path.exists(dst):
        shutil.copy2(DATA, dst)
        for old in sorted(f for f in os.listdir(BACKUPS) if f.startswith("data-"))[:-KEEP_BACKUPS]:
            os.remove(os.path.join(BACKUPS, old))


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
                return tok, s
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
        path = os.path.join(ROOT, name)
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

    def _redirect(self, to):
        self.send_response(302)
        self.send_header("Location", to)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        p = self._path()
        _, s = self._session()
        if p == "/api/me":
            return self._json(200, {"user": s and s["user"], "setup": not users()})
        if p not in PUBLIC and not s:
            return self._json(401, {"error": "login"}) if p.startswith("/api/") else self._redirect("/login")
        if p in ("/login", "/login.html") and s:
            return self._redirect("/")
        if p == "/api/data":
            return self._json(200, read_json(DATA, EMPTY))
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
            ip = self._ip()
            with lock:
                n, last = fails.get(ip, [0, 0])
                wait = min(60, 2 ** (n - 4)) if n >= 5 else 0
                if time.time() - last < wait:
                    return self._json(429, {"error": f"ลองผิดหลายครั้ง รอ {int(wait - (time.time() - last)) + 1} วินาที"})
            user, pw = str(body.get("username", "")).strip(), str(body.get("password", ""))
            if not check_pw(user, pw):
                with lock:
                    fails[ip] = [n + 1, time.time()]
                return self._json(401, {"error": "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"})
            with lock:
                fails.pop(ip, None)
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
                a["users"][s["user"]] = hash_pw(new)
                write_json(AUTH, a)
                for t in [t for t, v in sessions.items() if v["user"] == s["user"] and t != tok]:
                    sessions.pop(t)  # เครื่องอื่นต้องล็อกอินใหม่
                save_sessions()
            return self._json(200, {"ok": True})

        if p == "/api/data":
            if not isinstance(body.get("rooms"), list) or not isinstance(body.get("entries"), list):
                return self._json(400, {"error": "rooms / entries ต้องเป็น list"})
            with lock:
                backup_data()
                write_json(DATA, body)
            return self._json(200, {"ok": True})

        return self._json(404, {"error": "not found"})

    def log_message(self, fmt, *args):
        if self.command == "POST" and "/api/data" not in self.path:
            super().log_message(fmt, *args)


if __name__ == "__main__":
    host = os.environ.get("BRP_HOST", "127.0.0.1")
    port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("BRP_PORT", 8787))
    os.makedirs(STORE, exist_ok=True)
    sessions.update(read_json(SESS, {}))
    print(f"บ้านริมภู → http://{host}:{port}  (data: {STORE}, secure={SECURE}, proxy={TRUST_PROXY})", flush=True)
    ThreadingHTTPServer((host, port), Handler).serve_forever()
