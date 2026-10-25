#!/usr/bin/env bash
# ติดตั้งบ้านริมภูบนเซิร์ฟเวอร์ Ubuntu/Debian ใหม่ (รันครั้งเดียว ด้วยสิทธิ์ root)
#
#   sudo bash setup.sh <โดเมน>        เช่น  sudo bash setup.sh banrimphoo.com
#
# ทำให้:  ติดตั้ง Caddy (ทำ https อัตโนมัติ) · สร้าง user ระบบ "banrimphoo"
#        โค้ด → /opt/banrimphoo   ข้อมูล → /var/lib/banrimphoo (data.json, auth.json, backups/)
#        service systemd "banrimphoo" (เปิดเองตอนบูต, ล่มแล้วรีสตาร์ทเอง) · firewall เปิดแค่ 22/80/443
# ก่อนรัน: ชี้ DNS ของโดเมน (A record) มาที่ IP ของเซิร์ฟเวอร์นี้ ไม่งั้น Caddy ขอใบรับรอง https ไม่ได้
# รันซ้ำได้ (ไม่ลบข้อมูล)
set -euo pipefail

DOMAIN="${1:-}"
[ -n "$DOMAIN" ] || { echo "ใช้: sudo bash setup.sh <โดเมน>"; exit 1; }
[ "$(id -u)" = 0 ] || { echo "ต้องรันด้วย sudo"; exit 1; }
APP=/opt/banrimphoo
DATA=/var/lib/banrimphoo

echo "== ติดตั้งแพ็กเกจ"
apt-get update -y
apt-get install -y python3 curl gnupg debian-keyring debian-archive-keyring apt-transport-https ufw
if ! command -v caddy >/dev/null; then
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y && apt-get install -y caddy
fi

echo "== user + โฟลเดอร์"
id banrimphoo >/dev/null 2>&1 || useradd --system --home "$DATA" --shell /usr/sbin/nologin banrimphoo
install -d -o root -g root -m 755 "$APP"
install -d -o banrimphoo -g banrimphoo -m 700 "$DATA"

echo "== service"
cat > /etc/systemd/system/banrimphoo.service <<EOF
[Unit]
Description=Banrimphoo rental manager
After=network.target

[Service]
User=banrimphoo
Group=banrimphoo
WorkingDirectory=$APP
Environment=BANRIMPHOO_DIR=$DATA
Environment=BRP_HOST=127.0.0.1
Environment=BRP_PORT=8787
Environment=BRP_SECURE=1
Environment=BRP_TRUST_PROXY=1
ExecStart=/usr/bin/python3 $APP/serve.py
Restart=always
RestartSec=3
# จำกัดสิทธิ์: เขียนได้แค่โฟลเดอร์ข้อมูล
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=$DATA

[Install]
WantedBy=multi-user.target
EOF

echo "== Caddy (https)"
cat > /etc/caddy/Caddyfile <<EOF
$DOMAIN {
	encode gzip
	header {
		Strict-Transport-Security "max-age=31536000"
		X-Content-Type-Options nosniff
		X-Frame-Options DENY
		Referrer-Policy same-origin
		-Server
	}
	reverse_proxy 127.0.0.1:8787
}
EOF

echo "== firewall"
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null

systemctl daemon-reload
systemctl enable banrimphoo caddy >/dev/null
systemctl reload-or-restart caddy
if [ -f "$APP/serve.py" ]; then systemctl restart banrimphoo; fi

echo
echo "เสร็จแล้ว — ขั้นต่อไป: จากเครื่อง Mac รัน  ./deploy.sh <user>@<ip-เซิร์ฟเวอร์> --with-data"
echo "แล้วเปิด https://$DOMAIN"
