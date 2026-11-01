import { TH_MON, be } from './format';

// เวอร์ชันที่ deploy: เลขรอบของ GitHub Actions + วันที่ build (เวลาไทย) · ใส่ตอน next build
const BUILT = { version: process.env.NEXT_PUBLIC_APP_VERSION, time: process.env.NEXT_PUBLIC_BUILD_TIME };
export function versionText({ version, time }: { version?: string; time?: string } = BUILT) {
  if (!version) return 'เวอร์ชันทดสอบในเครื่อง';
  const d = new Date(Date.parse(time!) + 7 * 3600 * 1000);
  return `เวอร์ชัน ${version} · ${d.getUTCDate()} ${TH_MON[d.getUTCMonth()]} ${be(d.getUTCFullYear())}`;
}
