// สร้างฐานข้อมูลเทสใหม่ในเครื่อง (ไม่แตะ D1 จริง): node e2e/prepare.mjs <state-dir> <repo-dir>
import { execFileSync } from 'node:child_process';
import { rmSync, readdirSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { dataSql, usersSql } from './seed.mjs';
const [state, repo] = process.argv.slice(2).map(p => resolve(p));
rmSync(state, { recursive: true, force: true }); mkdirSync(state, { recursive: true });
const wr = args => execFileSync('npx', ['wrangler', 'd1', ...args, '--local', '--persist-to', state], { cwd: repo, stdio: 'ignore', env: { ...process.env, CI: '1', WRANGLER_SEND_METRICS: 'false' } });
wr(['execute', 'banrimphoo', '--file', join(repo, 'worker/schema.sql')]);
for (const m of readdirSync(join(repo, 'migrations')).sort()) wr(['execute', 'banrimphoo', '--file', join(repo, 'migrations', m)]);
const dir = join(state, 'v3/d1/miniflare-D1DatabaseObject');
const db = join(dir, readdirSync(dir).find(f => f.endsWith('.sqlite') && f !== 'metadata.sqlite'));
execFileSync('sqlite3', [db], { input: usersSql() + dataSql() });
console.log('prepared', db);
