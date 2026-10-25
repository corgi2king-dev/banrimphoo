#!/usr/bin/env bash
# อัปโหลดบ้านริมภูจากเครื่องนี้ขึ้นเซิร์ฟเวอร์ (ผ่าน ssh/scp)
#
#   ./deploy.sh <user>@<ip>                               อัปเดตโค้ดอย่างเดียว (ข้อมูลบนเซิร์ฟเวอร์ไม่ถูกแตะ)
#   ./deploy.sh <user>@<ip> --setup <โดเมน> --with-data    ครั้งแรก: ติดตั้งเซิร์ฟเวอร์ + ย้ายข้อมูลจากเครื่องนี้ขึ้นไป
#
# --with-data  คัดลอก data.json + auth.json (บัญชีล็อกอิน) ขึ้นไป เฉพาะเมื่อบนเซิร์ฟเวอร์ยังไม่มีไฟล์นั้น — ไม่เขียนทับของเดิม
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
FILES=(serve.py index.html login.html scene.js)
[ -f photo.jpg ] && FILES+=(photo.jpg)
[ -n "$DOMAIN" ] && FILES+=(deploy/setup.sh)
if [ "$WITH_DATA" = 1 ]; then
  for f in data.json auth.json; do [ -f "$f" ] && FILES+=("$f"); done
fi

echo "== อัปโหลด: ${FILES[*]}"
ssh "$TARGET" "rm -rf $UP && mkdir -p $UP && chmod 700 $UP"
scp -q "${FILES[@]}" "$TARGET:$UP/"

ssh -t "$TARGET" "set -e
  cd $UP
  if [ -f setup.sh ]; then sudo bash setup.sh '$DOMAIN'; fi
  sudo install -m 644 serve.py index.html login.html scene.js /opt/banrimphoo/
  if [ -f photo.jpg ]; then sudo install -m 644 photo.jpg /opt/banrimphoo/; fi
  for f in data.json auth.json; do
    if [ -f \$f ]; then
      if sudo test -f /var/lib/banrimphoo/\$f; then echo \"ข้าม \$f (มีบนเซิร์ฟเวอร์แล้ว ไม่เขียนทับ)\";
      else sudo install -o banrimphoo -g banrimphoo -m 600 \$f /var/lib/banrimphoo/ && echo \"ย้าย \$f ขึ้นแล้ว\"; fi
    fi
  done
  rm -rf $UP
  sudo systemctl restart banrimphoo
  sleep 1
  sudo systemctl is-active --quiet banrimphoo && echo 'service ทำงานแล้ว ✓' || { sudo journalctl -u banrimphoo -n 30 --no-pager; exit 1; }"

echo "เสร็จ ✓"
