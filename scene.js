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
  @media (prefers-color-scheme: dark){
    .scn{--sky1:#26314f;--sky2:#0e1426;--sun:#f4f1de;--m1:#34425e;--m2:#2a3a4c;--m3:#22383a;--hill:#1f3a2b;--field:#172d21;
         --tree:#12291d;--tree2:#1d3f2b;--wood:#4a2e1b;--win:#ffc24d;--cloud:#8592b3;--star:1;--glow:.8;--lamp:.9;
         --bFascia:#4d555b;--bFasciaHi:#69737a;--bOrange:#9a5a25;--bOrangeDk:#7c461a;--bRoof:#55321f;--bTrim:#6d767c;
         --bLouver:#9da3a7;--bLouverLn:#828a8f;--bWall:#8c9296;--bWall2:#979da1;--bPlinth:#5f666b;--bPillar:#565e64;
         --bFrame:#22272b;--bCurtain:#ffcf6e;--bDoor:#8f4a1f;--bDoorLn:#723a17;--bRail:#16191c;--bStep:#87603f;--bStepDk:#6d4c31;
         --bConcrete:#6a7074;--bConcreteDk:#575d61}
  }
  .scn svg{display:block;width:100%;height:100%}
  .scn .cloud{animation:brpDrift 70s linear infinite}
  .scn .cloud.c2{animation-duration:100s;animation-delay:-45s}
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
  .scn .bob{animation:brpBob 2.6s ease-in-out infinite}
  .scn .wave{transform-box:fill-box;transform-origin:50% 100%;animation:brpWave 1.6s ease-in-out infinite}
  .scn .wave.w2{animation-delay:-.8s}
  .scn .bubble{animation:brpBubble 9s ease-in-out infinite}
  @media (prefers-color-scheme: dark){.scn .ppl{filter:brightness(.85)}}
  @keyframes brpDrift{from{transform:translateX(-300px)}to{transform:translateX(1700px)}}
  @keyframes brpTwinkle{50%{opacity:.15}}
  @keyframes brpPulse{50%{transform:scale(1.08);opacity:calc(var(--glow) * 1.3)}}
  @keyframes brpMist{from{transform:translateX(-50px)}to{transform:translateX(50px)}}
  @keyframes brpSway{0%,100%{transform:rotate(-2.5deg)}50%{transform:rotate(2.5deg)}}
  @keyframes brpLamp{50%{opacity:calc(var(--lamp) * .55)}}
  @keyframes brpWin{0%{opacity:1}70%{opacity:.35}85%{opacity:1}}
  @keyframes brpFly{from{transform:translate(-120px,0)}50%{transform:translate(800px,-30px)}to{transform:translate(1700px,10px)}}
  @keyframes brpBob{50%{transform:translateY(-1.5px)}}
  @keyframes brpWave{0%,100%{transform:rotate(-12deg)}50%{transform:rotate(22deg)}}
  @keyframes brpBubble{0%,8%{opacity:0;transform:translateY(4px)}14%,70%{opacity:1;transform:none}78%,100%{opacity:0;transform:translateY(-3px)}}
  @keyframes brpFlap{from{transform:scaleY(1)}to{transform:scaleY(-.5)}}
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

  // เจ้าของห้องเช่า (การ์ตูน) ยืนโบกมือ — พิกัด: เท้าที่ y=0
  const SKIN_M = '#e2b48c', SKIN_W = '#efc6a0', HAIR = '#2f2b2c';
  const face = (cy, skin, lip) => `
    <circle cx="-5" cy="${cy + 1}" r="1.2" fill="#222"/><circle cx="5" cy="${cy + 1}" r="1.2" fill="#222"/>
    <circle cx="-7" cy="${cy + 5}" r="2.2" fill="#e8846f" opacity=".28"/><circle cx="7" cy="${cy + 5}" r="2.2" fill="#e8846f" opacity=".28"/>
    <path d="M0 ${cy + 2}q1.6 2.6 0 3.4" stroke="#b9875f" stroke-width="1" fill="none"/>
    <path d="M-3 ${cy + 7}q3 2 6 0" stroke="${lip}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
  const man = () => `<g class="ppl"><g class="bob">
    <ellipse cx="0" cy="0" rx="15" ry="3" fill="#000" opacity=".15"/>
    ${R(-8, -24, 7, 22, '#30343a')}${R(1, -24, 7, 22, '#30343a')}${R(-9.5, -3, 9, 3.5, '#1c1e21', 'rx="1.5"')}${R(0.5, -3, 9, 3.5, '#1c1e21', 'rx="1.5"')}
    ${R(-16, -40, 6, 18, '#7c7f71', 'rx="3"')}<circle cx="-13" cy="-21" r="3" fill="${SKIN_M}"/>
    ${R(-11, -43, 22, 21, '#7c7f71', 'rx="5"')}${R(-11, -30, 22, 4, '#000', 'opacity=".06"')}
    <path d="M-5.5 -43L0 -37.5L5.5 -43Z" fill="#9a9d8f"/><path d="M0 -37.5v7" stroke="#62655a" stroke-width="1"/>
    <circle cx="0" cy="-35" r=".8" fill="#4a4c44"/><circle cx="0" cy="-32" r=".8" fill="#4a4c44"/>
    <g class="wave">${R(10, -57, 6, 18, '#7c7f71', 'rx="3"')}<circle cx="13" cy="-58" r="3.2" fill="${SKIN_M}"/></g>
    ${R(-3, -47, 6, 5, SKIN_M)}
    <circle cx="-11.5" cy="-55" r="2.6" fill="${SKIN_M}"/><circle cx="11.5" cy="-55" r="2.6" fill="${SKIN_M}"/>
    <ellipse cx="0" cy="-56" rx="11" ry="12.5" fill="${SKIN_M}"/>
    <path d="M-11.3 -57C-12.5 -68 -4 -71.5 1 -71C8 -71 12.5 -66 11.3 -57C10 -62.5 6 -64.5 2 -63.5C-3 -65.5 -8 -63.5 -11.3 -57Z" fill="#3a3a3c"/>
    <path d="M-6 -66q4 -2.5 9 -1.5M4 -67q3 .5 5 2.5" stroke="#77777a" stroke-width="1" fill="none"/>
    <path d="M-7.5 -59.5h4.5M3 -59.5h4.5" stroke="#2a2a2a" stroke-width="1.4" stroke-linecap="round"/>
    ${face(-57, SKIN_M, '#8a4b3a')}</g></g>`;
  const flowers = [[-6, -36], [3, -38], [-2, -30], [6, -27], [-8, -25], [1, -24], [8, -33]]
    .map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="1.7" fill="${i % 2 ? '#fff' : '#7a58b8'}" opacity=".85"/>`).join('');
  const woman = () => `<g class="ppl"><g class="bob" style="animation-delay:-1.3s">
    <ellipse cx="0" cy="0" rx="14" ry="3" fill="#000" opacity=".15"/>
    ${R(-7, -22, 6, 20, '#3b3442')}${R(1, -22, 6, 20, '#3b3442')}${R(-8.5, -3, 8, 3.5, '#1c1e21', 'rx="1.5"')}${R(0.5, -3, 8, 3.5, '#1c1e21', 'rx="1.5"')}
    <g class="wave w2">${R(-16, -56, 6, 17, '#b7a3dc', 'rx="3"')}<circle cx="-13" cy="-57" r="3" fill="${SKIN_W}"/></g>
    ${R(10, -40, 6, 17, '#b7a3dc', 'rx="3"')}<circle cx="13" cy="-22" r="2.8" fill="${SKIN_W}"/>
    <path d="M-10 -41Q-12.5 -31 -12.5 -21H12.5Q12.5 -31 10 -41Q0 -44 -10 -41Z" fill="#b7a3dc"/>${flowers}
    <path d="M7 -42L-7 -23" stroke="#222" stroke-width="1.5"/>
    ${R(-2.5, -45, 5, 5, SKIN_W)}
    <path d="M-12 -52C-14 -66 -6 -71.5 0 -71.5C7 -71.5 14 -66 12 -52C12 -46 9.5 -43.5 8 -43.5L-8 -43.5C-10 -44.5 -12 -47 -12 -52Z" fill="${HAIR}"/>
    <ellipse cx="0" cy="-55" rx="10" ry="11" fill="${SKIN_W}"/>
    <path d="M-10.2 -55.5C-10.5 -66 -2 -68.5 3 -67.5C8 -66.5 11 -61.5 10.2 -55C7 -60 2 -62 -3 -61C-6.5 -60 -8.5 -58 -10.2 -55.5Z" fill="${HAIR}"/>
    <path d="M-7 -58.5q2 -1 4 0M3 -58.5q2 -1 4 0" stroke="#2a2a2a" stroke-width="1.1" fill="none" stroke-linecap="round"/>
    ${face(-56.5, SKIN_W, '#b5605a')}</g></g>`;
  const owners = welcome => `
    <g transform="translate(296 14)">${man()}</g><g transform="translate(330 14)">${woman()}</g>
    ${welcome ? `<g class="bubble"><path d="M276 -112h76a8 8 0 0 1 8 8v14a8 8 0 0 1-8 8h-34l-6 7-2-7h-34a8 8 0 0 1-8-8v-14a8 8 0 0 1 8-8Z" fill="#fff" stroke="#d5d9db"/>
      <text x="314" y="-93" text-anchor="middle" font-size="12" font-weight="700" fill="#2f6b4f" font-family="-apple-system,'Noto Sans Thai',sans-serif">ยินดีต้อนรับ</text></g>` : ''}`;

  // อาคารทั้งหลัง พิกัดภายใน: พื้น y=0, กว้าง ~ -40..680
  const building = welcome => {
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
    return g;
  };

  const stars = Array.from({ length: 46 }, (_, i) => {
    const x = (i * 157) % 1440, y = (i * 89) % 360, r = i % 3 ? 1.2 : 2;
    return `<circle class="${i % 3 ? '' : 'tw'}" style="animation-delay:${-(i % 7) * .4}s" cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${0.4 + (i % 5) / 8}"/>`;
  }).join('');
  const cloud = (x, y, s, cls) => `<g class="cloud ${cls}" opacity=".8"><g transform="translate(${x} ${y}) scale(${s})" fill="var(--cloud)">
    <ellipse cx="0" cy="0" rx="70" ry="22"/><ellipse cx="-30" cy="-14" rx="34" ry="24"/><ellipse cx="22" cy="-20" rx="40" ry="30"/></g></g>`;
  const birds = y => [[0, 0, 0], [26, 12, -.2], [12, -16, -.35]].map(([dx, dy, d], i) =>
    `<g class="bird" style="animation-delay:${-i * 0.6 - 8}s"><g transform="translate(${dx} ${y + dy})">
      <path class="w" style="animation-delay:${d}s" d="M-9 0Q-4.5 -6 0 0Q4.5 -6 9 0" stroke="#2d3a40" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".7"/></g></g>`).join('');

  // ตำแหน่งตัวอาคารต่อโหมด: x0 = ขอบซ้าย, gy = ระดับพื้น, s = สเกล
  const layout = (mode, narrow) => ({
    full: { view: '0 0 1440 900', fit: 'xMidYMax slice', x0: narrow ? 400 : 190, gy: 772, s: 1, sunY: 250, birdY: 210 },
    banner: { view: '0 380 1440 330', fit: 'xMidYMax slice', x0: 900, gy: 706, s: 0.62, sunY: 470, birdY: 540 },
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
    ${cloud(200, L.sunY - 70, 1, '')}${cloud(800, L.sunY + 50, 0.7, 'c2')}
    ${birds(L.birdY)}
    <path d="M0 560L120 470L230 520L380 400L520 500L640 430L780 520L900 380L1040 480L1180 410L1300 480L1440 430V900H0Z" fill="var(--m1)"/>
    <path d="M0 620L160 520L300 600L460 500L600 590L760 480L920 600L1080 510L1240 590L1440 520V900H0Z" fill="var(--m2)"/>
    <rect class="mist" x="-80" y="560" width="1600" height="140" fill="url(#brpMist)"/>
    <path d="M0 700L200 610L380 680L560 600L760 690L980 610L1180 680L1440 620V900H0Z" fill="var(--m3)"/>
    <path d="M0 760Q360 690 720 740T1440 730V900H0Z" fill="var(--hill)"/>
    ${pines.map(([x, y, s], i) => pine(x, y, s, i * .9)).join('')}
    <path d="M0 832Q480 792 960 822T1440 812V900H0Z" fill="var(--field)"/>
    <rect x="${bx0}" y="${L.gy - 8 * L.s}" width="${bx1 - bx0}" height="${900 - L.gy}" rx="${40 * L.s}" fill="var(--hill)"/>
    <g transform="translate(${L.x0} ${L.gy}) scale(${L.s})">${building(mode !== 'banner' && mode !== 'logo')}</g>
  </svg>`;
  };

  document.querySelectorAll('[data-scene]').forEach(el => {
    el.classList.add('scn');
    el.innerHTML = svg(el.dataset.scene || 'full', el.clientWidth < el.clientHeight * 0.8);
  });
})();
