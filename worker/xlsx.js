// สร้างไฟล์ Excel (.xlsx) บน Worker — แปลงมาจาก xlsx_export.py (หน้าตา/ชีตเหมือนกัน)
// ชีต: รายการเช่า · สรุปตามห้อง · ค่าใช้จ่าย (+ สรุปกำไร) · zip แบบไม่บีบอัด (stored) เขียนเอง ไม่ต้องใช้ไลบรารี

const [TEXT, HEAD, NUM, DATE, TOTAL_TXT, TOTAL_NUM, TITLE, LEFT] = [0, 1, 2, 3, 4, 5, 6, 7];
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0"/><numFmt numFmtId="165" formatCode="[$-1070000]d/m/yyyy"/></numFmts>
<fonts count="4"><font><sz val="11"/><name val="Tahoma"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Tahoma"/></font>
<font><b/><sz val="11"/><name val="Tahoma"/></font><font><b/><sz val="14"/><color rgb="FF2F6B4F"/><name val="Tahoma"/></font></fonts>
<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF2F6B4F"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFE3EFE8"/></patternFill></fill></fills>
<borders count="2"><border/><border><top style="thin"><color rgb="FF2F6B4F"/></top></border></borders>
<cellStyleXfs count="1"><xf/></cellStyleXfs>
<cellXfs count="8">
<xf/>
<xf fontId="1" fillId="2" applyFont="1" applyFill="1"/>
<xf numFmtId="164" applyNumberFormat="1"/>
<xf numFmtId="165" applyNumberFormat="1"><alignment horizontal="left"/></xf>
<xf fontId="2" fillId="3" borderId="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="164" fontId="2" fillId="3" borderId="1" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf fontId="3" applyFont="1"/>
<xf fontId="0" applyFont="1"><alignment horizontal="left"/></xf>
</cellXfs></styleSheet>`;

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const col = i => { let s = ''; i++; while (i) { const r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); } return s; };
function cell(ref, v, style) {
  if (v === null || v === undefined || v === '') return `<c r="${ref}" s="${style}"/>`;
  if (typeof v === 'number') return `<c r="${ref}" s="${style}"><v>${v}</v></c>`;
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
}
function sheet(rows, widths, freeze) {
  const cols = widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');
  const body = rows.map((row, r) => `<row r="${r + 1}">${row.map(([v, s], c) => cell(`${col(c)}${r + 1}`, v, s)).join('')}</row>`).join('');
  const pane = freeze ? `<pane ySplit="${freeze}" topLeftCell="A${freeze + 1}" activePane="bottomLeft" state="frozen"/>` : '';
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + `<sheetViews><sheetView workbookViewId="0">${pane}</sheetView></sheetViews><cols>${cols}</cols><sheetData>${body}</sheetData></worksheet>`;
}
const serial = d => Math.round((Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) - Date.UTC(1899, 11, 30)) / 864e5);
const fmt = n => Math.round(n).toLocaleString('en-US');

export function buildXlsx(rooms, entries, title, expenses = []) {
  const room = Object.fromEntries(rooms.map(r => [r.id, r]));
  const order = Object.fromEntries(rooms.map((r, i) => [r.id, i]));
  const es = [...entries].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (order[a.roomId] ?? 999) - (order[b.roomId] ?? 999));
  const amt = e => +e.amount || 0;
  const got = e => e.paid ? amt(e) : Math.min(+e.deposit || 0, amt(e));
  const status = e => e.paid ? 'ชำระแล้ว' : got(e) ? `มัดจำ ${fmt(got(e))} · ค้าง ${fmt(amt(e) - got(e))}` : 'ค้างชำระ';
  const blank = n => Array.from({ length: n }, () => ['', TOTAL_TXT]);

  const rows1 = [[[title, TITLE]], [], ['วันที่', 'ห้อง', 'ประเภท', 'ผู้เข้าพัก', 'เบอร์โทร', 'ค่าเช่า (บาท)', 'สถานะ', 'ช่องทาง', 'หมายเหตุ'].map(h => [h, HEAD])];
  es.forEach(e => {
    const r = room[e.roomId] || {};
    rows1.push([[serial(e.date), DATE], [r.name ?? '?', LEFT], [r.type || '', TEXT], [e.guest || '', TEXT], [e.phone || '', TEXT],
      [amt(e), NUM], [status(e), TEXT], [e.channel || '', TEXT], [e.note || '', TEXT]]);
  });
  const total = es.reduce((a, e) => a + amt(e), 0);
  rows1.push([[`รวม ${es.length} รายการ`, TOTAL_TXT], ...blank(4), [total, TOTAL_NUM], ...blank(3)]);

  const rows2 = [[[title, TITLE]], [], ['ห้อง', 'ประเภท', 'จำนวนคืน', 'รายได้ (บาท)', 'รับเงินแล้ว (บาท)', 'ค้างชำระ (บาท)'].map(h => [h, HEAD])];
  let sums = [0, 0, 0, 0];
  rooms.forEach(r => {
    const mine = es.filter(e => e.roomId === r.id);
    const tot = mine.reduce((a, e) => a + amt(e), 0), paid = mine.reduce((a, e) => a + got(e), 0);
    const vals = [mine.length, tot, paid, tot - paid];
    sums = sums.map((s, i) => s + vals[i]);
    rows2.push([[r.name || '', LEFT], [r.type || '', TEXT], ...vals.map(v => [v, NUM])]);
  });
  rows2.push([['รวม', TOTAL_TXT], ['', TOTAL_TXT], ...sums.map(v => [v, TOTAL_NUM])]);

  const xs = [...expenses].sort((a, b) => a.date < b.date ? -1 : 1);
  const rows3 = [[[title, TITLE]], [], ['วันที่', 'หมวด', 'จำนวนเงิน (บาท)', 'จ่ายด้วย', 'รายละเอียด'].map(h => [h, HEAD])];
  xs.forEach(e => rows3.push([[serial(e.date), DATE], [e.cat || '', TEXT], [amt(e), NUM], [e.channel || '', TEXT], [e.note || '', TEXT]]));
  const exTotal = xs.reduce((a, e) => a + amt(e), 0);
  rows3.push([[`รวม ${xs.length} รายการ`, TOTAL_TXT], ['', TOTAL_TXT], [exTotal, TOTAL_NUM], ...blank(2)],
    [], [['สรุป', HEAD], ['', HEAD], ['บาท', HEAD]],
    [['รายได้ (ค่าเช่า)', TEXT], ['', TEXT], [total, NUM]],
    [['ค่าใช้จ่าย', TEXT], ['', TEXT], [exTotal, NUM]],
    [['กำไรสุทธิ', TOTAL_TXT], ['', TOTAL_TXT], [total - exTotal, TOTAL_NUM]]);

  const sheets = [['รายการเช่า', sheet(rows1, [16, 10, 16, 22, 15, 14, 22, 12, 30], 3)],
    ['สรุปตามห้อง', sheet(rows2, [12, 16, 12, 15, 18, 16], 3)],
    ['ค่าใช้จ่าย', sheet(rows3, [16, 18, 16, 12, 34], 3)]];
  const X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const files = [
    ['[Content_Types].xml', `${X}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      + sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') + '</Types>'],
    ['_rels/.rels', `${X}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', `${X}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>`
      + sheets.map(([n], i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') + '</sheets></workbook>'],
    ['xl/_rels/workbook.xml.rels', `${X}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
      + sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')
      + `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', STYLES],
    ...sheets.map(([, xml], i) => [`xl/worksheets/sheet${i + 1}.xml`, xml]),
  ];
  return zip(files);
}

// ---- zip (stored) ----
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function zip(files) {
  const enc = new TextEncoder(), parts = [], central = [];
  let offset = 0;
  for (const [name, text] of files) {
    const n = enc.encode(name), d = enc.encode(text), crc = crc32(d);
    const h = new DataView(new ArrayBuffer(30));
    [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, 0, 2], [10, 0, 2], [12, 0x21, 2], [14, crc, 4], [18, d.length, 4], [22, d.length, 4], [26, n.length, 2], [28, 0, 2]]
      .forEach(([o, v, s]) => s === 4 ? h.setUint32(o, v, true) : h.setUint16(o, v, true));
    const c = new DataView(new ArrayBuffer(46));
    [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, 0, 2], [12, 0, 2], [14, 0x21, 2], [16, crc, 4], [20, d.length, 4], [24, d.length, 4],
      [28, n.length, 2], [30, 0, 2], [32, 0, 2], [34, 0, 2], [36, 0, 2], [38, 0, 4], [42, offset, 4]]
      .forEach(([o, v, s]) => s === 4 ? c.setUint32(o, v, true) : c.setUint16(o, v, true));
    parts.push(new Uint8Array(h.buffer), n, d);
    central.push(new Uint8Array(c.buffer), n);
    offset += 30 + n.length + d.length;
  }
  const cdSize = central.reduce((a, p) => a + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  [[0, 0x06054b50, 4], [4, 0, 2], [6, 0, 2], [8, files.length, 2], [10, files.length, 2], [12, cdSize, 4], [16, offset, 4], [20, 0, 2]]
    .forEach(([o, v, s]) => s === 4 ? end.setUint32(o, v, true) : end.setUint16(o, v, true));
  const all = [...parts, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((a, p) => a + p.length, 0));
  let pos = 0;
  for (const p of all) { out.set(p, pos); pos += p.length; }
  return out;
}
