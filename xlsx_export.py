"""สร้างไฟล์ Excel (.xlsx) รายงานค่าเช่า — ใช้แค่ไลบรารีมาตรฐานของ Python (zipfile + XML)

build(rooms, entries, title, expenses=()) → bytes ของไฟล์ .xlsx มี 3 ชีต:
  1. รายการเช่า   วันที่ · ห้อง · ประเภท · ผู้เข้าพัก · ค่าเช่า · สถานะ · ช่องทาง · หมายเหตุ (+ แถวรวม)
  2. สรุปตามห้อง  ห้อง · ประเภท · จำนวนคืน · รายได้ · รับเงินแล้ว (รวมมัดจำ) · ค้างชำระ (+ แถวรวม)
  3. ค่าใช้จ่าย   วันที่ · หมวด · จำนวนเงิน · จ่ายด้วย · รายละเอียด (+ แถวรวม) และสรุป รายได้ − ค่าใช้จ่าย = กำไรสุทธิ
สถานะ: ชำระแล้ว / มัดจำ (deposit > 0 แต่ยังไม่ครบ) / ค้างชำระ
"""
import datetime as dt
import io
import zipfile
from xml.sax.saxutils import escape

# style index (ตรงกับ cellXfs ใน STYLES)
TEXT, HEAD, NUM, DATE, TOTAL_TXT, TOTAL_NUM, TITLE, DUE = range(8)

STYLES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
</cellXfs></styleSheet>"""


def _col(i):
    s = ""
    i += 1
    while i:
        i, r = divmod(i - 1, 26)
        s = chr(65 + r) + s
    return s


def _cell(ref, v, style):
    if v is None or v == "":
        return f'<c r="{ref}" s="{style}"/>'
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return f'<c r="{ref}" s="{style}"><v>{v}</v></c>'
    return f'<c r="{ref}" s="{style}" t="inlineStr"><is><t xml:space="preserve">{escape(str(v))}</t></is></c>'


def _sheet(rows, widths, freeze_row):
    """rows: list ของ list[(ค่า, style)]"""
    cols = "".join(f'<col min="{i + 1}" max="{i + 1}" width="{w}" customWidth="1"/>' for i, w in enumerate(widths))
    body = "".join(
        f'<row r="{r + 1}">' + "".join(_cell(f"{_col(c)}{r + 1}", v, s) for c, (v, s) in enumerate(row)) + "</row>"
        for r, row in enumerate(rows))
    pane = (f'<pane ySplit="{freeze_row}" topLeftCell="A{freeze_row + 1}" activePane="bottomLeft" state="frozen"/>'
            if freeze_row else "")
    return ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            f'<sheetViews><sheetView workbookViewId="0">{pane}</sheetView></sheetViews>'
            f'<cols>{cols}</cols><sheetData>{body}</sheetData></worksheet>')


def _serial(date_str):
    d = dt.date.fromisoformat(date_str)
    return (d - dt.date(1899, 12, 30)).days


def build(rooms, entries, title, expenses=()):
    room = {r.get("id"): r for r in rooms}
    order = {r.get("id"): i for i, r in enumerate(rooms)}
    es = sorted(entries, key=lambda e: (e.get("date", ""), order.get(e.get("roomId"), 999)))
    amt = lambda e: float(e.get("amount") or 0)  # noqa: E731
    got = lambda e: amt(e) if e.get("paid") else min(float(e.get("deposit") or 0), amt(e))  # noqa: E731

    def status(e):
        if e.get("paid"):
            return "ชำระแล้ว"
        return f"มัดจำ {got(e):,.0f} · ค้าง {amt(e) - got(e):,.0f}" if got(e) else "ค้างชำระ"

    # ชีต 1: รายการ
    head = ["วันที่", "ห้อง", "ประเภท", "ผู้เข้าพัก", "ค่าเช่า (บาท)", "สถานะ", "ช่องทาง", "หมายเหตุ"]
    rows1 = [[(title, TITLE)], [], [(h, HEAD) for h in head]]
    for e in es:
        r = room.get(e.get("roomId"), {})
        rows1.append([(_serial(e["date"]), DATE), (r.get("name", "?"), DUE), (r.get("type", ""), TEXT),
                      (e.get("guest", ""), TEXT), (amt(e), NUM), (status(e), TEXT),
                      (e.get("channel", ""), TEXT), (e.get("note", ""), TEXT)])
    total = sum(amt(e) for e in es)
    rows1.append([(f"รวม {len(es)} รายการ", TOTAL_TXT), ("", TOTAL_TXT), ("", TOTAL_TXT), ("", TOTAL_TXT),
                  (total, TOTAL_NUM), ("", TOTAL_TXT), ("", TOTAL_TXT), ("", TOTAL_TXT)])

    # ชีต 2: สรุปตามห้อง
    head2 = ["ห้อง", "ประเภท", "จำนวนคืน", "รายได้ (บาท)", "รับเงินแล้ว (บาท)", "ค้างชำระ (บาท)"]
    rows2 = [[(title, TITLE)], [], [(h, HEAD) for h in head2]]
    sums = [0, 0, 0, 0]
    for r in rooms:
        mine = [e for e in es if e.get("roomId") == r.get("id")]
        paid = sum(got(e) for e in mine)
        tot = sum(amt(e) for e in mine)
        vals = [len(mine), tot, paid, tot - paid]
        sums = [a + b for a, b in zip(sums, vals)]
        rows2.append([(r.get("name", ""), DUE), (r.get("type", ""), TEXT)] + [(v, NUM) for v in vals])
    rows2.append([("รวม", TOTAL_TXT), ("", TOTAL_TXT)] + [(v, TOTAL_NUM) for v in sums])

    # ชีต 3: ค่าใช้จ่าย + กำไร
    xs = sorted(expenses, key=lambda e: e.get("date", ""))
    head3 = ["วันที่", "หมวด", "จำนวนเงิน (บาท)", "จ่ายด้วย", "รายละเอียด"]
    rows3 = [[(title, TITLE)], [], [(h, HEAD) for h in head3]]
    for e in xs:
        rows3.append([(_serial(e["date"]), DATE), (e.get("cat", ""), TEXT), (amt(e), NUM),
                      (e.get("channel", ""), TEXT), (e.get("note", ""), TEXT)])
    ex_total = sum(amt(e) for e in xs)
    rows3.append([(f"รวม {len(xs)} รายการ", TOTAL_TXT), ("", TOTAL_TXT), (ex_total, TOTAL_NUM), ("", TOTAL_TXT), ("", TOTAL_TXT)])
    rows3 += [[], [("สรุป", HEAD), ("", HEAD), ("บาท", HEAD)],
              [("รายได้ (ค่าเช่า)", TEXT), ("", TEXT), (total, NUM)],
              [("ค่าใช้จ่าย", TEXT), ("", TEXT), (ex_total, NUM)],
              [("กำไรสุทธิ", TOTAL_TXT), ("", TOTAL_TXT), (total - ex_total, TOTAL_NUM)]]

    sheets = [("รายการเช่า", _sheet(rows1, [16, 10, 16, 22, 14, 22, 12, 30], 3)),
              ("สรุปตามห้อง", _sheet(rows2, [12, 16, 12, 15, 18, 16], 3)),
              ("ค่าใช้จ่าย", _sheet(rows3, [16, 18, 16, 12, 34], 3))]

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml",
                   '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                   '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                   '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                   '<Default Extension="xml" ContentType="application/xml"/>'
                   '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
                   '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
                   + "".join(f'<Override PartName="/xl/worksheets/sheet{i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
                             for i in range(len(sheets))) + "</Types>")
        z.writestr("_rels/.rels",
                   '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                   '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                   '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
                   '</Relationships>')
        z.writestr("xl/workbook.xml",
                   '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                   '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
                   'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
                   + "".join(f'<sheet name="{escape(n)}" sheetId="{i + 1}" r:id="rId{i + 1}"/>' for i, (n, _) in enumerate(sheets))
                   + "</sheets></workbook>")
        z.writestr("xl/_rels/workbook.xml.rels",
                   '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                   '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                   + "".join(f'<Relationship Id="rId{i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i + 1}.xml"/>'
                             for i in range(len(sheets)))
                   + f'<Relationship Id="rId{len(sheets) + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
                   + "</Relationships>")
        z.writestr("xl/styles.xml", STYLES)
        for i, (_, xml) in enumerate(sheets):
            z.writestr(f"xl/worksheets/sheet{i + 1}.xml", xml)
    return buf.getvalue()
