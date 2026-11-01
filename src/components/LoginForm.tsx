'use client';
import { useEffect, useRef, useState } from 'react';

export default function LoginForm() {
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false), [photo, setPhoto] = useState(false);
  const user = useRef<HTMLInputElement>(null), pass = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const sc = document.createElement('script'); sc.src = '/scene.js?v=17'; document.body.append(sc);
    const im = new Image(); im.onload = () => setPhoto(true); im.src = '/photo.jpg';  // มีรูปจริง → ใช้แทนภาพวาด
    fetch('/api/me', { cache: 'no-store' }).then(r => r.json()).then(me => { if (me.user) location.replace('/'); else user.current?.focus(); }).catch(() => setErr('ติดต่อเซิร์ฟเวอร์ไม่ได้'));
  }, []);
  return <>
    {photo ? <div className="bg photo" style={{ backgroundImage: 'url(/photo.jpg)' }} /> : <div className="bg" id="bg" data-scene="" />}
    <div className="hero"><h2>บ้านริมภู</h2><p>ที่พักริมภูเขา · ท่ามกลางสายหมอกและธรรมชาติ</p></div>
    <form className="box" id="f" onSubmit={async e => {
      e.preventDefault(); setErr(''); setBusy(true);
      try {
        const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user.current!.value.trim(), password: pass.current!.value }) });
        const j = await r.json();
        if (r.ok) return location.replace('/');
        setErr(j.error || 'เข้าสู่ระบบไม่สำเร็จ'); pass.current!.select();
      } catch { setErr('ติดต่อเซิร์ฟเวอร์ไม่ได้'); }
      setBusy(false);
    }}>
      <div className="logo" data-scene="logo" />
      <h1>บ้านริมภู</h1>
      <div className="sub" id="sub">เข้าสู่ระบบจัดการที่พัก</div>
      <label>ชื่อผู้ใช้<input name="username" ref={user} autoComplete="username" required maxLength={40} /></label>
      <label>รหัสผ่าน<input name="password" ref={pass} type="password" autoComplete="current-password" required /></label>
      <button id="btn" disabled={busy}>เข้าสู่ระบบ</button>
      <div className="err" id="err" style={{ display: err ? 'block' : 'none' }}>{err}</div>
    </form>
  </>;
}
