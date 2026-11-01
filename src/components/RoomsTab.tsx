'use client';
import { useEffect, useRef, useState } from 'react';
import { baht, uid } from '@/lib/format';
import { NEW_TYPE, ROOM_TYPES, roomColor } from '@/lib/rooms';
import type { Room } from '@/lib/types';
import { CloseX, Modal, useStore } from './common';

export function RoomsTab() {
  const s = useStore(), [edit, setEdit] = useState<{ id: string | null } | null>(null);
  const del = async (r: Room) => {
    const used = s.db.entries.filter(e => e.roomId === r.id).length;
    if (!await s.ask(used ? `ลบห้อง "${r.name}" และรายการเช่าของห้องนี้ ${used} รายการ?` : `ลบห้อง "${r.name}"?`, 'ลบ', 'ยกเลิก', true)) return;
    s.db.rooms = s.db.rooms.filter(x => x.id !== r.id);
    s.db.entries = s.db.entries.filter(e => e.roomId !== r.id);
    s.save();
  };
  return <div className="card">
    <div className="row" style={{ marginBottom: 12 }}><h2>ห้องพัก</h2><div className="sp" /><button className="btn pri" id="btnAddRoom" onClick={() => setEdit({ id: null })}>+ เพิ่มห้อง</button></div>
    <div style={{ overflowX: 'auto' }}><table>
      <thead><tr><th>ห้อง</th><th className="hide-sm">ประเภท</th><th className="num">ราคา/คืน</th><th className="num hide-sm">รองรับ (คน)</th><th>สถานะ</th><th className="hide-sm">หมายเหตุ</th><th /></tr></thead>
      <tbody id="roomRows">{s.db.rooms.length ? s.db.rooms.map(r => { const used = s.db.entries.filter(e => e.roomId === r.id).length; return <tr key={r.id}>
        <td><span className="dot" style={{ background: roomColor(s.db, r.id) }} /><b>{r.name}</b></td>
        <td className="hide-sm">{r.type}</td><td className="num">{r.price ? baht(r.price) : '-'}</td><td className="num hide-sm">{r.capacity || '-'}</td>
        <td>{r.status === 'closed' ? <span className="tag off">ปิดปรับปรุง</span> : <span className="tag ok">เปิดให้เช่า</span>}</td>
        <td className="hide-sm" style={{ color: 'var(--muted)' }}>{r.note}</td>
        <td className="num" style={{ whiteSpace: 'nowrap' }}><button className="btn sm" data-edit={r.id} onClick={() => setEdit({ id: r.id })}>แก้ไข</button>{' '}
          <button className="btn sm dang" data-del={r.id} title={used ? `มี ${used} รายการเช่า` : undefined} onClick={() => del(r)}>ลบ</button></td></tr>; })
        : <tr><td colSpan={7} className="empty">ยังไม่มีห้องพัก — กด &quot;+ เพิ่มห้อง&quot; เพื่อเริ่ม</td></tr>}</tbody>
    </table></div>
    <RoomModal edit={edit} onClose={() => setEdit(null)} />
  </div>;
}
function RoomModal({ edit, onClose }: { edit: { id: string | null } | null; onClose: () => void }) {
  const s = useStore(), blank = { name: '', type: '', typeNew: '', price: '' as string | number, capacity: '' as string | number, status: 'open', note: '' };
  const [f, setF] = useState(blank), nameRef = useRef<HTMLInputElement>(null), typeNewRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!edit) return;
    const r = edit.id ? s.roomById(edit.id)! : null;
    setF(r ? { name: r.name, type: r.type || '', typeNew: '', price: r.price ?? '', capacity: r.capacity ?? '', status: r.status || 'open', note: r.note || '' } : blank);
    nameRef.current?.focus();
  }, [edit]);
  const types = [...new Set([...ROOM_TYPES, ...s.db.rooms.map(r => r.type).filter(Boolean) as string[], ...(f.type && f.type !== NEW_TYPE ? [f.type] : [])])];
  return <Modal id="roomMask" open={!!edit} onClose={onClose}>
    <div className="row"><h2 id="roomFormTitle">{edit?.id ? 'แก้ไขห้อง' : 'เพิ่มห้อง'}</h2><div className="sp" /><CloseX onClick={onClose} /></div>
    <form id="roomForm" style={{ marginTop: 12 }} onSubmit={e => {
      e.preventDefault();
      const r = { name: f.name.trim(), type: f.type === NEW_TYPE ? f.typeNew.trim() : f.type, price: Number(f.price) || 0, capacity: Number(f.capacity) || 0, status: f.status, note: f.note.trim() };
      if (edit?.id) Object.assign(s.roomById(edit.id)!, r); else s.db.rooms.push({ id: uid(), ...r });
      onClose(); s.save();
    }}>
      <div className="grid2">
        <label>ชื่อห้อง / เลขห้อง *<input name="name" ref={nameRef} required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></label>
        <label>ประเภท<select name="type" value={f.type} onChange={e => { setF({ ...f, type: e.target.value }); if (e.target.value === NEW_TYPE) setTimeout(() => typeNewRef.current?.focus()); }}>
          <option value="">— เลือกประเภท —</option>{types.map(t => <option key={t} value={t}>{t}</option>)}<option value={NEW_TYPE}>+ เพิ่มประเภทใหม่…</option></select>
          <input name="typeNew" ref={typeNewRef} placeholder="พิมพ์ชื่อประเภทใหม่" maxLength={40} hidden={f.type !== NEW_TYPE} required={f.type === NEW_TYPE} style={{ marginTop: 6 }} value={f.typeNew} onChange={e => setF({ ...f, typeNew: e.target.value })} /></label>
        <label>ราคา/คืน (บาท)<input name="price" type="number" min="0" step="1" value={f.price} onChange={e => setF({ ...f, price: e.target.value })} /></label>
        <label>รองรับ (คน)<input name="capacity" type="number" min="1" step="1" value={f.capacity} onChange={e => setF({ ...f, capacity: e.target.value })} /></label>
        <label>สถานะ<select name="status" value={f.status} onChange={e => setF({ ...f, status: e.target.value })}><option value="open">เปิดให้เช่า</option><option value="closed">ปิดปรับปรุง</option></select></label>
      </div>
      <label style={{ marginTop: 10 }}>หมายเหตุ<textarea name="note" rows={2} value={f.note} onChange={e => setF({ ...f, note: e.target.value })} /></label>
      <div className="row" style={{ marginTop: 14 }}><div className="sp" /><button type="button" className="btn" data-close onClick={onClose}>ยกเลิก</button><button className="btn pri">บันทึก</button></div>
    </form>
  </Modal>;
}
