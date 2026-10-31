// ภาพประกอบ "บ้านริมภู" แบบการ์ตูน (SVG วาดเอง ไม่ต้องโหลดรูป) — ตัวบ้านวาดตามรูปจริง: ห้องแถวชั้นเดียว
// หลังคาเทา + แถบไม้สีส้ม, ระแนงขาว, ประตูไม้ส้ม, ราวเหล็กดำ, สนแคระหน้าห้อง, อาคารจั่วด้านขวา
// สีตามธีมสว่าง/มืดผ่าน CSS ด้านล่าง · มีภาพเคลื่อนไหว (ปิดเองถ้าเครื่องตั้ง reduce motion)
// ใช้: <div data-scene></div> = ภาพเต็ม · data-scene="banner" = แถบเตี้ย · data-scene="logo" = ซูมที่อาคารจั่ว
(() => {
  const css = `
  .scn{--sky1:#ffd9a8;--sky2:#bfe3f2;--sun:#fff3c4;--m1:#b9d3d6;--m2:#8fb8b0;--m3:#5f9a83;--hill:#5a9a63;--field:#3f8051;
       --tree:#2c6b45;--tree2:#4c9a5e;--wood:#7a4a2a;--win:#ffd36b;--cloud:#fff;--star:0;--glow:.35;--lamp:.25;
       --bFascia:#8e989e;--bFasciaHi:#c3cacd;--bOrange:#dc8434;--bOrangeDk:#b96523;--bRoof:#8a5238;--bTrim:#c9cfd2;
       --bLouver:#f4f5f5;--bLouverLn:#d3d7d9;--bWall:#e2e4e5;--bWall2:#eef0f0;--bPlinth:#a8afb3;--bPillar:#8f979d;
       --bFrame:#3a4045;--bCurtain:#a9cdb0;--bDoor:#cc6a2c;--bDoorLn:#a9521d;--bRail:#2b3034;--bStep:#c98b59;--bStepDk:#a86e43;
       --bConcrete:#d3d6d8;--bConcreteDk:#b7bcbf}
  [data-theme="dark"] .scn{--sky1:#26314f;--sky2:#0e1426;--sun:#f4f1de;--m1:#34425e;--m2:#2a3a4c;--m3:#22383a;--hill:#1f3a2b;--field:#172d21;
         --tree:#12291d;--tree2:#1d3f2b;--wood:#4a2e1b;--win:#ffc24d;--cloud:#8592b3;--star:1;--glow:.8;--lamp:.9;
         --bFascia:#4d555b;--bFasciaHi:#69737a;--bOrange:#9a5a25;--bOrangeDk:#7c461a;--bRoof:#55321f;--bTrim:#6d767c;
         --bLouver:#9da3a7;--bLouverLn:#828a8f;--bWall:#8c9296;--bWall2:#979da1;--bPlinth:#5f666b;--bPillar:#565e64;
         --bFrame:#22272b;--bCurtain:#ffcf6e;--bDoor:#8f4a1f;--bDoorLn:#723a17;--bRail:#16191c;--bStep:#87603f;--bStepDk:#6d4c31;
         --bConcrete:#6a7074;--bConcreteDk:#575d61}
  .scn svg{display:block;width:100%;height:100%}
  .scn .cloud{animation:brpDrift 70s linear infinite}
  .scn .cloud.c2{animation-duration:100s;animation-delay:-45s}
  .scn .cloud.c3{animation-duration:130s;animation-delay:-95s}
  .scn .cloud.c4{animation-duration:85s;animation-delay:-20s}
  .scn .puff{animation:brpPuff 7s ease-in-out infinite alternate}
  .scn .mfar{animation:brpPar 26s ease-in-out -9s infinite alternate}
  .scn .mmid{--px:12px;animation:brpPar 20s ease-in-out -6s infinite alternate}
  .scn .stars{opacity:var(--star)}
  .scn .stars .tw{animation:brpTwinkle 3s ease-in-out infinite}
  .scn .sunglow{animation:brpPulse 6s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
  .scn .mist{animation:brpMist 18s ease-in-out infinite alternate}
  .scn .sway{transform-box:fill-box;transform-origin:50% 100%;animation:brpSway 4s ease-in-out infinite}
  .scn .lamp{opacity:var(--lamp);animation:brpLamp 3.2s ease-in-out infinite}
  .scn .wl{animation:brpWin 9s steps(1) infinite}
  .scn .bird{animation:brpFly 38s linear infinite}
  .scn .bird .w{transform-box:fill-box;transform-origin:50% 100%;animation:brpFlap .5s ease-in-out infinite alternate}
  .scn .smoke{animation:brpSmoke 5s ease-out infinite;opacity:0}
  .scn .nod{animation:brpNod 5s ease-in-out infinite}
  .scn .bubble{animation:brpBubble 9s ease-in-out infinite}
  [data-theme="dark"] .scn .ppl,[data-theme="dark"] .scn .dog{filter:brightness(.85)}
  @keyframes brpDrift{from{transform:translateX(-300px)}to{transform:translateX(1700px)}}
  @keyframes brpTwinkle{50%{opacity:.15}}
  @keyframes brpPuff{from{transform:translateY(-3px)}to{transform:translateY(3px)}}
  @keyframes brpPar{from{transform:translateX(calc(var(--px,6px) * -1))}to{transform:translateX(var(--px,6px))}}
  @keyframes brpPulse{50%{transform:scale(1.08);opacity:calc(var(--glow) * 1.3)}}
  @keyframes brpMist{from{transform:translateX(-50px)}to{transform:translateX(50px)}}
  @keyframes brpSway{0%,100%{transform:rotate(-2.5deg)}50%{transform:rotate(2.5deg)}}
  @keyframes brpLamp{50%{opacity:calc(var(--lamp) * .55)}}
  @keyframes brpWin{0%{opacity:1}70%{opacity:.35}85%{opacity:1}}
  @keyframes brpFly{from{transform:translate(-120px,0)}50%{transform:translate(800px,-30px)}to{transform:translate(1700px,10px)}}
  @keyframes brpNod{0%,55%,100%{transform:none}68%,82%{transform:translateY(1.8px)}}
  @keyframes brpBubble{0%,8%{opacity:0;transform:translateY(4px)}14%,70%{opacity:1;transform:none}78%,100%{opacity:0;transform:translateY(-3px)}}
  @keyframes brpFlap{from{transform:scaleY(1)}to{transform:scaleY(-.5)}}
  .scn .dog{animation:brpDog 18s ease-in-out infinite}
  .scn .dog .dsd{animation:brpDsd 18s linear infinite}
  .scn .dog .sb{animation:brpSb .3s ease-in-out infinite}
  .scn .dog .sl{transform-box:fill-box;transform-origin:50% 0;animation:brpSl .32s ease-in-out infinite}
  .scn .dog .o{animation-delay:-.16s}
  .scn .dog .eL{transform-box:fill-box;transform-origin:80% 100%;animation:brpEL .32s ease-in-out infinite}
  .scn .dog .eR{transform-box:fill-box;transform-origin:20% 100%;animation:brpER .32s ease-in-out infinite}
  @keyframes brpDog{0%{transform:translateX(665px)}47%,49%{transform:translateX(-30px)}98%,100%{transform:translateX(665px)}}
  @keyframes brpDsd{0%,47.9%{transform:scaleX(1)}48%,98.9%{transform:scaleX(-1)}99%,100%{transform:scaleX(1)}}
  @keyframes brpSb{50%{transform:translateY(-2px)}}
  @keyframes brpSl{0%,100%{transform:rotate(30deg)}50%{transform:rotate(-30deg)}}
  @keyframes brpEL{50%{transform:rotate(-6deg)}}
  @keyframes brpER{50%{transform:rotate(6deg)}}
  .scn.paused *{animation-play-state:paused!important}
  @media (prefers-reduced-motion: reduce){.scn *{animation:none!important}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const R = (x, y, w, h, fill, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;

  // สนสามชั้น (ไกล ๆ บนเนิน)
  const pine = (x, y, s, d = 0) => {
    const w = 26 * s, h = 34 * s;
    let p = R(x - 2 * s, y - 4 * s, 4 * s, 10 * s, 'var(--wood)');
    for (let i = 0; i < 3; i++) {
      const top = y - h * (0.55 + i * 0.45), bw = w * (1 - i * 0.22);
      p += `<polygon points="${x},${top - h * 0.5} ${x - bw / 2},${top + h * 0.5} ${x + bw / 2},${top + h * 0.5}" fill="var(--tree)"/>`;
    }
    return `<g class="sway" style="animation-delay:${-d}s;animation-duration:${5 + d % 3}s">${p}</g>`;
  };
  // สนแคระหน้าห้อง (แบบในรูป)
  const shrub = (x, h, d) => `<g class="sway" style="animation-delay:${-d}s">
    <path d="M${x} ${-h} C${x + 5} ${-h * .7} ${x + 8} ${-h * .3} ${x + 7} 0 H${x - 7} C${x - 8} ${-h * .3} ${x - 5} ${-h * .7} ${x} ${-h}Z" fill="var(--tree)"/>
    <path d="M${x} ${-h + 3} C${x - 3} ${-h * .6} ${x - 5} ${-h * .3} ${x - 4} -2" stroke="var(--tree2)" stroke-width="2.5" fill="none" stroke-linecap="round"/></g>`;
  // ต้นไม้พุ่มใหญ่ด้านซ้าย (แบบในรูป)
  const bush = (x, s) => `<g class="sway" style="animation-duration:7s">
    ${R(x - 4 * s, -40 * s, 8 * s, 40 * s, 'var(--wood)')}
    <circle cx="${x}" cy="${-70 * s}" r="${36 * s}" fill="var(--tree)"/><circle cx="${x - 30 * s}" cy="${-50 * s}" r="${26 * s}" fill="var(--tree)"/>
    <circle cx="${x + 30 * s}" cy="${-52 * s}" r="${28 * s}" fill="var(--tree)"/><circle cx="${x - 10 * s}" cy="${-82 * s}" r="${18 * s}" fill="var(--tree2)"/>
    <circle cx="${x + 18 * s}" cy="${-64 * s}" r="${12 * s}" fill="var(--tree2)"/></g>`;
  const lamp = (x, y, d) => `<circle class="lamp" cx="${x}" cy="${y + 4}" r="14" fill="var(--win)" style="animation-delay:${-d}s"/>
    ${R(x - 3.5, y - 2, 7, 10, 'var(--bRail)', 'rx="1.5"')}<circle cx="${x}" cy="${y + 4}" r="2.2" fill="var(--win)"/>`;

  // ห้องพัก 1 ห้อง (กว้าง 80) — หน้าต่าง + ราว ซ้าย, ประตู + บันได ขวา
  const unit = (ux, i) => {
    let g = '';
    // หน้าต่าง 3 บาน ม่านเขียว (กลางคืน = ไฟในห้อง)
    g += R(ux + 5, -76, 42, 32, 'var(--bFrame)', 'rx="1"');
    g += `<g class="${i % 2 ? 'wl' : ''}" style="animation-delay:${-i * 2.3}s">${[0, 1, 2].map(k => R(ux + 8 + k * 13, -73, 11, 26, 'var(--bCurtain)')).join('')}</g>`;
    g += [0, 1, 2].map(k => `<path d="M${ux + 11 + k * 13} -73v26M${ux + 15 + k * 13} -73v26" stroke="#000" stroke-opacity=".08" stroke-width="1.5"/>`).join('');
    // ราวระเบียง
    g += R(ux + 2, -42, 48, 2.5, 'var(--bRail)');
    g += `<path d="${Array.from({ length: 12 }, (_, k) => `M${ux + 4 + k * 4} -40v26`).join('')}" stroke="var(--bRail)" stroke-width="1.3"/>`;
    // ประตูไม้
    g += R(ux + 55, -78, 19, 64, 'var(--bDoor)', 'rx="1"');
    g += `<path d="M${ux + 58} -76v60M${ux + 63} -76v60M${ux + 68} -76v60" stroke="var(--bDoorLn)" stroke-width="1"/>`;
    g += `<circle cx="${ux + 71}" cy="-46" r="1.4" fill="#e8d6a8"/>`;
    // บันได 3 ขั้น
    g += R(ux + 52, -14, 25, 5, 'var(--bStep)') + R(ux + 50, -9, 29, 5, 'var(--bStepDk)') + R(ux + 48, -4, 33, 4, 'var(--bStep)');
    // สนแคระ
    g += shrub(ux + 10, 30, i * 1.3) + shrub(ux + 25, 34, i * 1.3 + .7) + shrub(ux + 40, 28, i * 1.3 + 1.4);
    return g;
  };

  // เจ้าของห้องเช่า (การ์ตูน วาดตามรูปจริง) ยืนไหว้ต้อนรับ — พิกัด: เท้าที่ y=0
  const line = (d, c, w) => `<path d="${d}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  // แขนไหว้: ต้นแขนเป็นแขนเสื้อ ปลายแขนเป็นผิว มือประนมกลางอก
  const wai = (sx, sy, sleeve, skin, palm) => [1, -1].map(k =>
    line(`M${-sx * k} ${sy} L${-(sx + 1) * k} ${sy + 10}`, sleeve, 6.5) + line(`M${-(sx + 1) * k} ${sy + 10} L${-2.4 * k} ${sy + 4}`, skin, 4.4)).join('')
    + `<ellipse cx="0" cy="${sy + 1.5}" rx="3" ry="5.6" fill="${skin}"/>` + line(`M0 ${sy - 3.5}v9.5`, palm, .8);
  const SKIN_M = '#d6a078', SKIN_W = '#ecc29c';
  const man = () => `<g class="ppl"><g class="bob">
    <ellipse cx="0" cy="0" rx="15" ry="3" fill="#000" opacity=".15"/>
    ${R(-8, -27, 7, 25, '#2e3238')}${R(1, -27, 7, 25, '#2e3238')}${R(-9.5, -3, 9, 3.5, '#1c1e21', 'rx="1.5"')}${R(0.5, -3, 9, 3.5, '#1c1e21', 'rx="1.5"')}
    <path d="M-12 -46Q-13.5 -36 -12.5 -26H12.5Q13.5 -36 12 -46Q0 -49 -12 -46Z" fill="#7b7e72"/>${R(-12.5, -29, 25, 3, '#000', 'opacity=".08"')}
    <path d="M-7 -47.2L-1 -41.5L-2.5 -47.6ZM7 -47.2L1 -41.5L2.5 -47.6Z" fill="#55584f"/>${R(-1, -44, 2, 7, '#6a6d62')}
    <circle cx="0" cy="-40" r=".7" fill="#3f413a"/><circle cx="0" cy="-37.5" r=".7" fill="#3f413a"/>
    <path d="M-9 -36q4 2 8 0M2 -33q4 1.5 7 0" stroke="#fff" stroke-opacity=".12" stroke-width="2" fill="none"/>
    ${wai(11, -45, '#7b7e72', SKIN_M, '#b07f58')}
    ${R(-3, -53, 6, 7, SKIN_M)}
    <g class="nod">
      <ellipse cx="-9.8" cy="-62" rx="2.3" ry="3.4" fill="${SKIN_M}"/><ellipse cx="9.8" cy="-62" rx="2.3" ry="3.4" fill="${SKIN_M}"/>
      <path d="M-9.5 -64C-9.5 -72 -5 -75 0 -75C5 -75 9.5 -72 9.5 -64C9.5 -57 7 -51.5 0 -51C-7 -51.5 -9.5 -57 -9.5 -64Z" fill="${SKIN_M}"/>
      <path d="M-9.9 -64C-11.5 -74.5 -6 -81 1 -80.6C8 -80.2 11.6 -75 9.9 -64C9.2 -68.8 7.2 -71.6 4.2 -72.2C1 -73.2 -3 -72.4 -6 -71.4C-8.2 -70.3 -9.4 -67.4 -9.9 -64Z" fill="#1f1e20"/>
      ${line('M-6 -77.5q4.5 -2.6 10 -1.4M-3 -73.4q3 -2.2 7 -2.2', '#4a4a4f', 1)}
      ${line('M-9.6 -66q.2 -2 .9 -3.4M9.6 -66q-.2 -2 -.9 -3.4', '#77777b', .9)}
      ${line('M-7.2 -66.2q2.6 -1.3 5 -.3M2.2 -66.5q2.5 -1 5 .3', '#1f1f1f', 1.4)}
      <ellipse cx="-4.7" cy="-62.7" rx="1.6" ry="1.05" fill="#1a1a1a"/><ellipse cx="4.7" cy="-62.7" rx="1.6" ry="1.05" fill="#1a1a1a"/>
      ${line('M-6.8 -63.4q2.1 -1.2 4.2 0M2.6 -63.4q2.1 -1.2 4.2 0', '#5a3a26', .8)}
      ${line('M-.2 -63L-1.3 -58.4Q0 -57.5 1.5 -58.2', '#a06f49', .9)}
      ${line('M-2.9 -55.3q2.9 1 5.8 0', '#6e3d2f', 1.3)}
    </g></g></g>`;
  // ลายดอกเสื้อ: กลีบม่วง/ขาว + ใบเขียว (ตัดในรูปเสื้อด้วย clipPath)
  const flower = (x, y, r, c) => [0, 1, 2, 3, 4].map(i => {
    const a = i * 72 * Math.PI / 180; return `<circle cx="${(x + Math.cos(a) * r).toFixed(1)}" cy="${(y + Math.sin(a) * r).toFixed(1)}" r="${r * .75}" fill="${c}"/>`;
  }).join('') + `<circle cx="${x}" cy="${y}" r="${r * .5}" fill="#f4e7a8"/>`;
  const BLOUSE = 'M-12.5 -45Q-15 -34 -14 -24H14Q15 -34 12.5 -45Q0 -48 -12.5 -45Z';
  const woman = () => `<g class="ppl"><g class="bob" style="animation-delay:-1.3s">
    <defs><clipPath id="brpBlouse"><path d="${BLOUSE}"/></clipPath></defs>
    <ellipse cx="0" cy="0" rx="15" ry="3" fill="#000" opacity=".15"/>
    ${R(-7.5, -25, 6.5, 23, '#3a3340')}${R(1, -25, 6.5, 23, '#3a3340')}${R(-9, -3, 8.5, 3.5, '#1c1e21', 'rx="1.5"')}${R(0.5, -3, 8.5, 3.5, '#1c1e21', 'rx="1.5"')}
    <path d="${BLOUSE}" fill="#b9a5de"/>
    <g clip-path="url(#brpBlouse)">
      <ellipse cx="-9" cy="-30" rx="4" ry="1.6" fill="#6f9e6a" transform="rotate(-30 -9 -30)"/><ellipse cx="8" cy="-38" rx="4" ry="1.6" fill="#6f9e6a" transform="rotate(25 8 -38)"/>
      ${flower(-6, -37, 2.6, '#7a57c0')}${flower(7, -29, 3, '#5d4bab')}${flower(-10, -27, 2.2, '#fff')}${flower(2, -42, 2, '#fff')}${flower(11, -42, 2.2, '#8e6fd0')}${flower(-1, -27, 1.8, '#fff')}
    </g>
    <path d="M-4.2 -46.6L0 -40.8L4.2 -46.6Z" fill="${SKIN_W}"/>
    ${line('M9.5 -46L-11 -27', '#1d1d1f', 1.6)}
    ${wai(12.5, -44, '#b9a5de', SKIN_W, '#c79870')}
    ${R(-2.8, -51, 5.6, 6, SKIN_W)}
    <g class="nod" style="animation-delay:-.4s">
      <path d="M-12.3 -58C-14.5 -71 -7 -77 0 -77C8 -77 14.5 -71 12.3 -58C12.6 -53 11.2 -50.2 9 -49.6C6 -49.4 -6 -49.4 -9 -49.6C-11.6 -50.6 -12.6 -54 -12.3 -58Z" fill="#2d2527"/>
      <ellipse cx="0" cy="-59.5" rx="9.8" ry="10.6" fill="${SKIN_W}"/>
      <path d="M-10.6 -58.6C-11 -69 -4 -73.2 3 -72.6C8.2 -72 11.2 -68 10.9 -60.8C9.2 -65 6.6 -66.6 4.2 -66C1 -63.4 -4.6 -61.8 -10.6 -58.6Z" fill="#29232a"/>
      ${line('M-8 -64q4 -4 10 -5.6M4 -70.5q4 .8 6 4', '#4b4247', .9)}
      ${line('M-6.8 -63q2.3 -1 4.5 0M2.3 -63q2.3 -1 4.5 0', '#2a2426', 1.1)}
      <ellipse cx="-4.4" cy="-59.6" rx="1.45" ry="1.15" fill="#1a1a1a"/><ellipse cx="4.4" cy="-59.6" rx="1.45" ry="1.15" fill="#1a1a1a"/>
      <circle cx="-4" cy="-60" r=".4" fill="#fff"/><circle cx="4.8" cy="-60" r=".4" fill="#fff"/>
      ${line('M-6.4 -60.4q2 -1.3 4 0M2.4 -60.4q2 -1.3 4 0', '#3a2a24', .8)}
      <ellipse cx="-6.3" cy="-56.2" rx="2.4" ry="1.5" fill="#e07f6c" opacity=".2"/><ellipse cx="6.3" cy="-56.2" rx="2.4" ry="1.5" fill="#e07f6c" opacity=".2"/>
      ${line('M-.2 -59L-.9 -55.8Q0 -55.2 1.1 -55.7', '#b48660', .8)}
      ${line('M-3 -53.1q3 1.5 6 0', '#a55550', 1.3)}
    </g></g></g>`;
  const owners = welcome => `
    <g transform="translate(290 14) scale(1.3)">${man()}</g><g transform="translate(332 14) scale(1.3)">${woman()}</g>
    ${welcome ? `<g class="bubble"><path d="M281 -134h76a8 8 0 0 1 8 8v14a8 8 0 0 1-8 8h-34l-6 7-2-7h-34a8 8 0 0 1-8-8v-14a8 8 0 0 1 8-8Z" fill="#fff" stroke="#d5d9db"/>
      <text x="319" y="-115" text-anchor="middle" font-size="12" font-weight="700" fill="#2f6b4f" font-family="-apple-system,'Noto Sans Thai',sans-serif">ยินดีต้อนรับ</text></g>` : ''}`;

  // คอร์กี้วิ่งเล่นซ้าย-ขวาบนลานหน้าบ้าน (วาดตามรูปตัวอย่างของเจ้าของ): ตัวทรงก้อนขนมปัง หลังแบน ก้นกลม หางกุด ขาสั้น
  // หัวหันมองกล้อง · ขาไม่มีเส้นขอบช่วงบน มีเส้นเฉพาะรอบอุ้งเท้า · ปลายลานหยุดแป๊บแล้วหันกลับ
  // วาดหันขวาตามรูปตัวอย่าง (หน่วยของรูป 134×99, พื้น y≈78) แล้วกลับด้านให้หันซ้าย
  let dogN = 0;
  const corgi = () => {
    const id = 'brpDog' + (++dogN), OL = '#6d4a2c', F = '#ecb46e', W = '#fdf7ea', PK = '#f3c9b5';
    const headP = 'M95 68L125 68C150 70 166 88 168 108L174 114L168 118L172 132L165 135C160 152 140 165 112 165C84 165 62 152 56 135L50 130L55 122L49 112L56 108C58 88 72 70 95 68Z';
    const head = `
      <g class="eL"><path d="M58 104C46 82 40 56 46 40C50 34 58 34 64 38C78 48 90 60 97 70Z" fill="${F}"/><path d="M60 92C52 76 50 58 54 48C64 52 76 62 84 70Z" fill="${PK}" stroke="none"/></g>
      <g class="eR"><path d="M162 104C174 82 180 56 174 40C170 34 162 34 156 38C142 48 130 60 123 70Z" fill="${F}"/><path d="M160 92C168 76 170 58 166 48C156 52 144 62 136 70Z" fill="${PK}" stroke="none"/></g>
      <path d="${headP}" fill="${F}" stroke="none"/>
      <path clip-path="url(#${id}h)" d="M106 60L116 60C117 85 120 95 126 102C140 108 158 115 186 122L186 172L36 172L36 122C64 115 84 108 98 102C104 95 105 85 106 60Z" fill="${W}" stroke="none"/>
      <path d="M56 128L50 130L55 122L49 112L56 108C58 88 72 70 95 68L125 68C150 70 166 88 168 108L174 114L168 118L172 132L166 134" fill="none"/>
      <circle cx="92" cy="111" r="6.8" fill="#1d1410" stroke="none"/><circle cx="94" cy="108.6" r="2" fill="#fff" stroke="none"/>
      <circle cx="132" cy="111" r="6.8" fill="#1d1410" stroke="none"/><circle cx="134" cy="108.6" r="2" fill="#fff" stroke="none"/>
      <ellipse cx="112" cy="128" rx="10" ry="7.5" fill="#1d1410" stroke="none"/>
      <path d="M106 145C104 156 120 156 118 145Z" fill="#ef8a8f" stroke-width="2"/>
      <path d="M87 137C96 149 104 148 112 142C120 148 128 149 137 137" fill="none" stroke="#1d1410" stroke-width="2.4"/>
      <ellipse cx="112" cy="163" rx="17" ry="4.5" fill="#e3d6c3" stroke="none"/>`;
    const body = 'M58 36.6L32 36.6C17 36.6 9.5 46.5 9.5 58.5C9.5 67.5 14 73.5 24 75.6C40 77.8 58 77.6 70.5 75.5C82 70 85 48 79 34C75 26 64 26 58 36.6Z';
    const paw = (w, h) => `C${-w} ${h + w} ${w} ${h + w} ${w} ${h}`;
    const leg = (x, cls, top, ft = W, w = 4.6, h = 10) => `<g transform="translate(${x} 66)"><g class="${cls}">
      <path d="M${-w} -4L${-w} ${h}${paw(w, h)}L${w} -4Z" fill="${top}" stroke="none"/><path d="M${-w} ${h - 2}L${-w} ${h}${paw(w, h)}L${w} ${h - 2}Z" fill="${ft}" stroke="none"/>
      <path d="M${-w} ${h - 3}L${-w} ${h}${paw(w, h)}L${w} ${h - 3}" fill="none"/></g></g>`;
    return `<g class="dog"><defs><clipPath id="${id}h"><path d="${headP}"/></clipPath><clipPath id="${id}b"><path d="${body}"/></clipPath></defs>
      <g class="dsd"><g transform="scale(-.55 .55) translate(-58 -80)" stroke="${OL}" stroke-width=".95" stroke-linejoin="round" stroke-linecap="round">
      <ellipse cx="56" cy="77" rx="52" ry="3.6" fill="#000" opacity=".15" stroke="none"/>
      ${leg(76, 'sl o', '#efe1cc', '#efe1cc')}${leg(25, 'sl', '#d79a55', '#efe1cc')}
      <g class="sb">
        <path d="${body}" fill="${F}"/>
        <g clip-path="url(#${id}b)" stroke="none">
          <path d="M6 73L14 70L18 73L26 70L32 73L40 71L48 73L56 71L64 73L74 69L80 80L6 80Z" fill="${W}"/>
          <path d="M9 56C12 66 18 72 28 74L24 78L8 78Z" fill="${W}"/>
          <path d="M90 26L90 80L62 80L66 74L61 70L65 64L60 59L64 53L58 47L62 40L60 32L66 26Z" fill="${W}"/></g>
        <path d="${body}" fill="none"/>
        <path d="M27 40L24.5 37.6C17 35.4 10.6 38 8.4 43.2C7.4 46 7.9 48.6 9.7 50.2L14 46Z" fill="${F}" stroke="none"/>
        <path d="M8.4 45C7.9 47 8.4 48.8 9.7 50.2L10.8 47.4Z" fill="${W}" stroke="none"/>
        <path d="M24.5 37.6C17 35.4 10.6 38 8.4 43.2C7.4 46 7.9 48.6 9.7 50.2" fill="none"/>
        <path d="M14 43L10.4 45.6L11.6 46.4L8.6 49.4L10.6 49.6L8.8 53L13 51Z" fill="${F}" stroke="none"/>
        <path d="M10.4 45.6L11.6 46.4L8.6 49.4L10.6 49.6L8.8 53L10.8 53.2" fill="none"/>
        <g transform="translate(33 -4) scale(.36)" stroke-width="2.6">${head}</g>
      </g>
      ${leg(66, 'sl', W)}${leg(17, 'sl o', F)}</g></g></g>`;
  };

  // อาคารทั้งหลัง พิกัดภายใน: พื้น y=0, กว้าง ~ -40..680
  const building = (welcome, dog) => {
    const P = [0, 90, 180, 270, 360, 450, 540];
    let g = '';
    g += `<ellipse cx="320" cy="8" rx="420" ry="22" fill="#000" opacity=".10"/>`;
    // หลังคาบนสุด (เทา) + แถบไม้ส้ม
    g += `<polygon points="36,-174 534,-174 540,-160 30,-160" fill="var(--bFascia)"/>` + R(36, -174, 498, 3, 'var(--bFasciaHi)');
    g += R(48, -160, 474, 30, 'var(--bOrange)');
    g += `<path d="M48 -152H522M48 -144H522M48 -137H522" stroke="var(--bOrangeDk)" stroke-opacity=".45"/>`;
    // ปีกซ้าย หลังคาต่ำกว่า
    g += `<polygon points="-26,-152 152,-152 157,-140 -31,-140" fill="var(--bFascia)"/>` + R(-26, -152, 178, 3, 'var(--bFasciaHi)');
    g += R(-10, -140, 150, 12, 'var(--bOrange)');
    // หลังคาเมทัลชีทหน้าห้อง (น้ำตาล ลอนตั้ง)
    g += `<polygon points="-30,-130 562,-130 568,-117 -36,-117" fill="var(--bRoof)"/>`;
    g += `<path d="${Array.from({ length: 75 }, (_, k) => `M${-30 + k * 8} -130v13`).join('')}" stroke="#000" stroke-opacity=".18"/>`;
    g += R(-36, -117, 604, 5, 'var(--bTrim)');
    // ระแนงขาว + ผนัง + ฐาน
    g += R(0, -112, 550, 30, 'var(--bLouver)');
    g += `<path d="${[0, 1, 2, 3, 4, 5].map(k => `M0 ${-108 + k * 5}H550`).join('')}" stroke="var(--bLouverLn)" stroke-width="1.4"/>`;
    g += R(0, -82, 550, 68, 'var(--bWall)') + R(0, -14, 550, 14, 'var(--bPlinth)');
    // ห้องแรกซ้ายสุด: กระจกบานใหญ่ ม่านเขียว
    g += R(14, -76, 50, 56, 'var(--bFrame)') + `<g class="wl" style="animation-delay:-4s">${R(17, -73, 21, 50, 'var(--bCurtain)')}${R(41, -73, 20, 50, 'var(--bCurtain)')}</g>`;
    g += shrub(70, 30, .3) + shrub(82, 26, 1.1);
    for (let i = 1; i < 6; i++) g += unit(P[i] + 6, i);
    // เสา + โคมไฟ
    g += P.map((x, i) => R(x - 5, -117, 10, 117, 'var(--bPillar)') + R(x - 5, -117, 3, 117, '#fff', 'opacity=".12"') + lamp(x, -100, i * .6)).join('');
    // อาคารจั่วด้านขวา
    g += R(550, -110, 112, 110, 'var(--bWall2)') + R(550, -110, 7, 110, 'var(--bPillar)') + R(656, -110, 6, 110, 'var(--bPillar)');
    g += `<polygon points="556,-108 606,-140 656,-108" fill="var(--bOrange)"/>`;
    g += `<path d="M566 -114H646M578 -122H634M590 -130H622" stroke="var(--bOrangeDk)" stroke-opacity=".45"/>`;
    g += `<polygon points="538,-106 606,-152 674,-106 664,-104 606,-143 548,-104" fill="var(--bFascia)"/>`;
    g += `<polygon points="538,-106 606,-152 609,-150 544,-105" fill="var(--bFasciaHi)"/>`;
    g += R(566, -80, 7, 56, 'var(--bFrame)') + `<g class="wl" style="animation-delay:-6s">${R(567.5, -78, 4, 52, 'var(--bCurtain)')}</g>`;
    g += R(584, -80, 7, 56, 'var(--bFrame)') + R(585.5, -78, 4, 52, 'var(--bCurtain)');
    g += R(622, -64, 20, 64, 'var(--bDoor)', 'rx="1"') + `<path d="M626 -62v60M631 -62v60M636 -62v60" stroke="var(--bDoorLn)"/>`;
    g += R(603, -62, 7, 9, '#cfd4d6', 'stroke="#9aa1a5"') + lamp(612, -92, 2);
    // ลานคอนกรีตหน้าอาคาร
    g += R(-50, 0, 740, 16, 'var(--bConcrete)') + R(-50, 0, 740, 2, 'var(--bConcreteDk)');
    g += [60, 230, 400, 560].map(x => R(x, 6, 16, 5, 'var(--bConcreteDk)')).join('');
    g += bush(-70, 1);
    g += owners(welcome);
    if (dog) g += `<g transform="translate(0 15)">${corgi()}</g>`;  // โลโก้ไม่มีหมา (ซูมที่อาคารจั่ว)
    return g;
  };

  const stars = Array.from({ length: 46 }, (_, i) => {
    const x = (i * 157) % 1440, y = (i * 89) % 360, r = i % 3 ? 1.2 : 2;
    return `<circle class="${i % 3 ? '' : 'tw'}" style="animation-delay:${-(i % 7) * .4}s" cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${0.4 + (i % 5) / 8}"/>`;
  }).join('');
  const cloud = (x, y, s, cls, d = 0) => `<g class="cloud ${cls}" opacity=".8"><g class="puff" style="animation-delay:${d}s"><g transform="translate(${x} ${y}) scale(${s})" fill="var(--cloud)">
    <ellipse cx="0" cy="0" rx="70" ry="22"/><ellipse cx="-30" cy="-14" rx="34" ry="24"/><ellipse cx="22" cy="-20" rx="40" ry="30"/></g></g></g>`;
  const birds = y => [[0, 0, 0], [26, 12, -.2], [12, -16, -.35]].map(([dx, dy, d], i) =>
    `<g class="bird" style="animation-delay:${-i * 0.6 - 8}s"><g transform="translate(${dx} ${y + dy})">
      <path class="w" style="animation-delay:${d}s" d="M-9 0Q-4.5 -6 0 0Q4.5 -6 9 0" stroke="#2d3a40" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".7"/></g></g>`).join('');

  // ตำแหน่งตัวอาคารต่อโหมด: x0 = ขอบซ้าย, gy = ระดับพื้น, s = สเกล
  const layout = (mode, narrow) => ({
    full: { view: '0 0 1440 900', fit: 'xMidYMax slice', x0: narrow ? 400 : 190, gy: 772, s: 1, sunY: 250, birdY: 210 },
    banner: { view: '0 394 1440 330', fit: 'xMidYMax slice', x0: 900, gy: 706, s: 0.62, sunY: 470, birdY: 540 },
    logo: { view: '716 612 156 156', fit: 'xMidYMid slice', x0: 190, gy: 772, s: 1, sunY: 250, birdY: -99 },
  }[mode] || layout('full', narrow));

  const svg = (mode, narrow) => {
    const L = layout(mode, narrow), bx0 = L.x0 - 120 * L.s, bx1 = L.x0 + 720 * L.s;
    const pines = [[60, 762, 1.6], [130, 772, 1.1], [470, 745, 1.4], [560, 752, 1], [1010, 742, 1.3], [1085, 748, 1.8], [1160, 740, 1.2], [1350, 735, 1.5], [1410, 750, 1]]
      .filter(([x]) => x < bx0 || x > bx1);
    return `<svg viewBox="${L.view}" preserveAspectRatio="${L.fit}" aria-hidden="true">
    <defs>
      <linearGradient id="brpSky" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="var(--sky1)"/><stop offset="1" stop-color="var(--sky2)"/></linearGradient>
      <linearGradient id="brpMist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <radialGradient id="brpGlow"><stop offset="0" stop-color="var(--sun)" stop-opacity=".9"/><stop offset="1" stop-color="var(--sun)" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="1440" height="900" fill="url(#brpSky)"/>
    <g class="stars">${stars}</g>
    <circle class="sunglow" cx="1090" cy="${L.sunY}" r="160" fill="url(#brpGlow)" opacity="var(--glow)"/>
    <circle cx="1090" cy="${L.sunY}" r="62" fill="var(--sun)"/>
    ${cloud(200, L.sunY - 70, 1, '')}${cloud(800, L.sunY + 50, 0.7, 'c2', -3)}${cloud(500, L.sunY - 10, 0.5, 'c3', -5)}${cloud(1250, L.sunY - 95, 0.85, 'c4', -2)}
    ${birds(L.birdY)}
    <path class="mfar" d="M-40 590L0 560L120 470L230 520L380 400L520 500L640 430L780 520L900 380L1040 480L1180 410L1300 480L1440 430L1480 450V900H-40Z" fill="var(--m1)"/>
    <path class="mmid" d="M-40 650L0 620L160 520L300 600L460 500L600 590L760 480L920 600L1080 510L1240 590L1440 520L1480 540V900H-40Z" fill="var(--m2)"/>
    <rect class="mist" x="-80" y="560" width="1600" height="140" fill="url(#brpMist)"/>
    <path d="M0 700L200 610L380 680L560 600L760 690L980 610L1180 680L1440 620V900H0Z" fill="var(--m3)"/>
    <path d="M0 760Q360 690 720 740T1440 730V900H0Z" fill="var(--hill)"/>
    ${pines.map(([x, y, s], i) => pine(x, y, s, i * .9)).join('')}
    <path d="M0 832Q480 792 960 822T1440 812V900H0Z" fill="var(--field)"/>
    <rect x="${bx0}" y="${L.gy - 8 * L.s}" width="${bx1 - bx0}" height="${900 - L.gy}" rx="${40 * L.s}" fill="var(--hill)"/>
    <g transform="translate(${L.x0} ${L.gy}) scale(${L.s})">${building(mode !== 'banner' && mode !== 'logo', mode !== 'logo')}</g>
  </svg>`;
  };

  // data-motion="วินาที" = ขยับช่วงสั้น ๆ แล้วหยุด (ประหยัดเครื่อง โดยเฉพาะมือถือ) · "0" = ภาพนิ่ง · ไม่ใส่ = ขยับตลอด
  // ขยับใหม่อีกรอบทุกครั้งที่เปลี่ยนเมนู (window.sceneReplay) หรือกลับมาที่แท็บ/แอปนี้
  // ทุกภาพหยุดขยับเองเมื่อเลื่อนพ้นจอ หรือสลับไปแอป/แท็บอื่น
  const scenes = [...document.querySelectorAll('[data-scene]')];
  // หยุด/เล่นด้วย class (ใช้ได้ตั้งแต่ก่อน animation เริ่ม)
  const sync = el => el.classList.toggle('paused', !!el._stopped || el._visible === false || document.visibilityState !== 'visible');
  const arm = el => {
    const sec = el.dataset.motion;
    clearTimeout(el._timer);
    el._stopped = sec !== undefined && +sec <= 0;
    if (sec !== undefined && +sec > 0) el._timer = setTimeout(() => { el._stopped = true; sync(el); }, +sec * 1000);
    sync(el);
  };
  scenes.forEach(el => {
    el.classList.add('scn');
    el.innerHTML = svg(el.dataset.scene || 'full', el.clientWidth < el.clientHeight * 0.8);
    arm(el);
  });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { e.target._visible = e.isIntersecting; sync(e.target); }));
    scenes.forEach(el => io.observe(el));
  }
  document.addEventListener('visibilitychange', () => scenes.forEach(document.visibilityState === 'visible' ? arm : sync));
  window.sceneReplay = () => scenes.forEach(arm);
})();
