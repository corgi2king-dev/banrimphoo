#!/usr/bin/env bash
# อัปโหลดบ้านริมภูจากเครื่องนี้ขึ้นเซิร์ฟเวอร์ (ผ่าน ssh/scp)
#
#   ./deploy.sh <user>@<ip>                               อัปเดตโค้ดอย่างเดียว (ข้อมูลบนเซิร์ฟเวอร์ไม่ถูกแตะ)
#   ./deploy.sh <user>@<ip> --setup <โดเมน> --with-data    ครั้งแรก: ติดตั้งเซิร์ฟเวอร์ + ย้ายข้อมูลจากเครื่องนี้ขึ้นไป
#
# --with-data  คัดลอกข้อมูล (rooms.json + entries/ + expenses/) และ auth.json (บัญชีล็อกอิน) ขึ้นไป
#              เฉพาะเมื่อบนเซิร์ฟเวอร์ยังไม่มีข้อมูล — ไม่เขียนทับของเดิม
# ต้องมี ssh เข้าเซิร์ฟเวอร์ได้ และ user นั้นใช้ sudo ได้ (ระบบอาจถามรหัส sudo)
set -euo pipefail
cd "$(dirname "$0")/.."

TARGET="${1:-}"; shift || true
[ -n "$TARGET" ] || { sed -n '2,8p' "$0"; exit 1; }
DOMAIN=""; WITH_DATA=0
while [ $# -gt 0 ]; do
  case "$1" in
    --setup) DOMAIN="${2:?ต้องใส่โดเมนหลัง --setup}"; shift 2 ;;
    --with-data) WITH_DATA=1; shift ;;
    *) echo "ไม่รู้จัก: $1"; exit 1 ;;
  esac
done

UP=/tmp/banrimphoo-upload
CODE=(serve.py xlsx_export.py)
WEB=(public/index.html public/login.html public/scene.js)
FILES=("${CODE[@]}" "${WEB[@]}")
[ -f public/photo.jpg ] && FILES+=(public/photo.jpg)
[ -n "$DOMAIN" ] && FILES+=(deploy/setup.sh)
if [ "$WITH_DATA" = 1 ]; then
  for f in rooms.json auth.json entries expenses; do [ -e "$f" ] && FILES+=("$f"); done
fi

echo "== อัปโหลด: ${FILES[*]}"
ssh "$TARGET" "rm -rf $UP && mkdir -p $UP && chmod 700 $UP"
scp -q -r "${FILES[@]}" "$TARGET:$UP/"

ssh -t "$TARGET" "set -e
  cd $UP
  if [ -f setup.sh ]; then sudo bash setup.sh '$DOMAIN'; fi
  sudo install -m 644 ${CODE[*]} /opt/banrimphoo/
  sudo install -d -m 755 /opt/banrimphoo/public
  sudo install -m 644 index.html login.html scene.js /opt/banrimphoo/public/
  if [ -f photo.jpg ]; then sudo install -m 644 photo.jpg /opt/banrimphoo/public/; fi
  D=/var/lib/banrimphoo
  if [ -f rooms.json ]; then
    if sudo test -f \$D/rooms.json; then echo 'ข้ามข้อมูลห้อง/การจอง (มีบนเซิร์ฟเวอร์แล้ว ไม่เขียนทับ)';
    else
      sudo install -o banrimphoo -g banrimphoo -m 600 rooms.json \$D/
      sudo install -d -o banrimphoo -g banrimphoo -m 700 \$D/entries
      if [ -d entries ]; then sudo install -o banrimphoo -g banrimphoo -m 600 entries/*.json \$D/entries/; fi
      sudo install -d -o banrimphoo -g banrimphoo -m 700 \$D/expenses
      if [ -d expenses ] && ls expenses/*.json >/dev/null 2>&1; then sudo install -o banrimphoo -g banrimphoo -m 600 expenses/*.json \$D/expenses/; fi
      echo 'ย้ายข้อมูลห้อง/การจอง/ค่าใช้จ่ายขึ้นแล้ว'
    fi
  fi
  if [ -f auth.json ]; then
    if sudo test -f \$D/auth.json; then echo 'ข้าม auth.json (มีบนเซิร์ฟเวอร์แล้ว ไม่เขียนทับ)';
    else sudo install -o banrimphoo -g banrimphoo -m 600 auth.json \$D/ && echo 'ย้ายบัญชีล็อกอินขึ้นแล้ว'; fi
  fi
  rm -rf $UP
  sudo systemctl restart banrimphoo
  sleep 1
  sudo systemctl is-active --quiet banrimphoo && echo 'service ทำงานแล้ว ✓' || { sudo journalctl -u banrimphoo -n 30 --no-pager; exit 1; }"

echo "เสร็จ ✓"
