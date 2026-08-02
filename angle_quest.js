// ══════════════════════════════════════════════════════════════════
// ANGLE QUEST — JavaScript (Complete Version)
// ══════════════════════════════════════════════════════════════════

// ── DRAWING CONSTANTS ──────────────────────────────────────────────
const CW = 660, CH = 460;
const PCX = 185, PCY = 168;
const PR  = 155;
const PIR = 132;
const SNAP_D   = 42;
const TOL      = 12;
const MARK_R   = 32;
const LINE_MIN = 90;

const PRESETS = {
  acute:  [30, 45, 60, 75, 85],
  obtuse: [100, 115, 120, 135, 150],
  reflex: [200, 210, 240, 270, 300, 330]
};

const TYPE_LBL = {
  acute:  'Acute Angle 🔺',
  obtuse: 'Obtuse Angle 📐',
  reflex: 'Reflex Angle 🔄'
};

const STEPS_N = ['Draw base line','Pick center point','Place protractor','Mark the angle','Draw final line'];
const STEPS_R = ['Draw base line','Pick center point','Flip & place protractor','Mark supplement','Draw final line'];

// ── DRAWING STATE ──────────────────────────────────────────────────
let S = {
  step:0, tool:null, angle:0, type:'',
  lineStart:null, baseLine:null, center:null, marked:null, finalLine:null,
  mx:0, my:0, pLeft:90, pTop:55,
  pDrag:false, pDX:0, pDY:0, pSnapped:false
};

// ── DOM REFERENCES ─────────────────────────────────────────────────
const canvas = document.getElementById('mc');
const ctx    = canvas.getContext('2d');
const cwrap  = document.getElementById('cwrap');
const pdiv   = document.getElementById('pdiv');
const sring  = document.getElementById('sring');

// ══ SCREEN NAVIGATION ══════════════════════════════════════════════
function show(n) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('scr-' + n).classList.add('active');
}

// ══ PICK SCREEN ════════════════════════════════════════════════════
let pType = null, pAngle = null;

function pickType(t, el) {
  pType = t; pAngle = null;
  document.querySelectorAll('.mod-card').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel');
  document.getElementById('btn-go').classList.remove('on');
  const opts = document.getElementById('angle-opts');
  opts.innerHTML = '';
  PRESETS[t].forEach(d => {
    const b = document.createElement('button');
    b.className = 'a-btn'; b.textContent = d + '°';
    b.onclick = () => {
      document.querySelectorAll('.a-btn').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel'); pAngle = d;
      document.getElementById('cust-in').value = '';
      document.getElementById('cust-tag').textContent = '';
      document.getElementById('btn-go').classList.add('on');
    };
    opts.appendChild(b);
  });
}

function onCust(inp) {
  const v = parseInt(inp.value);
  document.querySelectorAll('.a-btn').forEach(x => x.classList.remove('sel'));
  if (v >= 1 && v <= 359) {
    pAngle = v;
    pType  = v < 90 ? 'acute' : v < 180 ? 'obtuse' : 'reflex';
    const n = { acute:'Acute ✓', obtuse:'Obtuse ✓', reflex:'Reflex ✓' };
    document.getElementById('cust-tag').textContent = n[pType];
    document.getElementById('btn-go').classList.add('on');
  } else {
    pAngle = null;
    document.getElementById('cust-tag').textContent = '';
    document.getElementById('btn-go').classList.remove('on');
  }
}

function startDraw() {
  if (!pAngle) return;
  S.angle = pAngle; S.type = pType;
  resetAll(); show('draw'); initDraw();
}

// ══ PROTRACTOR SVG ══════════════════════════════════════════════════
function buildProto() {
  const cx = PCX, cy = PCY, ro = PR, ri = PIR;
  const rLbl10 = ro - 28, rLbl5 = ro - 16, rLbl1 = ro - 9;
  let s = '';
  s += `<path d="M${cx-ro} ${cy} A${ro} ${ro} 0 0 1 ${cx+ro} ${cy} Z" fill="rgba(210,245,255,0.48)"/>`;
  s += `<path d="M${cx-60} ${cy} A60 60 0 0 1 ${cx+60} ${cy} Z" fill="rgba(255,255,255,0.25)"/>`;
  s += `<path d="M${cx-ro} ${cy} A${ro} ${ro} 0 0 1 ${cx+ro} ${cy}" fill="none" stroke="#1a55cc" stroke-width="3"/>`;
  s += `<path d="M${cx-ri} ${cy} A${ri} ${ri} 0 0 1 ${cx+ri} ${cy}" fill="none" stroke="rgba(26,85,204,0.5)" stroke-width="1.5"/>`;
  s += `<line x1="${cx-ro-8}" y1="${cy}" x2="${cx+ro+8}" y2="${cy}" stroke="#1a55cc" stroke-width="3.5"/>`;
  s += `<rect x="${cx-ro-8}" y="${cy}" width="${(ro+8)*2}" height="10" fill="rgba(210,245,255,0.4)" stroke="#1a55cc" stroke-width="1" rx="2"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="7" fill="rgba(255,255,255,0.8)" stroke="#1a55cc" stroke-width="2"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="2.5" fill="#1a55cc"/>`;
  s += `<line x1="${cx-14}" y1="${cy}" x2="${cx+14}" y2="${cy}" stroke="rgba(180,40,40,0.7)" stroke-width="1.2"/>`;
  s += `<line x1="${cx}" y1="${cy-14}" x2="${cx}" y2="${cy+14}" stroke="rgba(180,40,40,0.7)" stroke-width="1.2"/>`;
  for (let d = 0; d <= 180; d++) {
    const rad = d * Math.PI / 180;
    const xo = cx + ro * Math.cos(rad), yo = cy - ro * Math.sin(rad);
    let tkLen, sw, sc;
    if (d % 10 === 0)      { tkLen=16; sw=2.2; sc='rgba(15,45,160,0.95)'; }
    else if (d % 5 === 0)  { tkLen=9;  sw=1.5; sc='rgba(15,45,160,0.8)'; }
    else                   { tkLen=4.5;sw=0.8; sc='rgba(15,45,160,0.55)'; }
    const xi = cx+(ro-tkLen)*Math.cos(rad), yi = cy-(ro-tkLen)*Math.sin(rad);
    s += `<line x1="${xo.toFixed(2)}" y1="${yo.toFixed(2)}" x2="${xi.toFixed(2)}" y2="${yi.toFixed(2)}" stroke="${sc}" stroke-width="${sw}"/>`;
    if (d%10===0 && d>0 && d<180) {
      const xn=cx+rLbl10*Math.cos(rad), yn=cy-rLbl10*Math.sin(rad), fs=d>=100?8:9.5;
      s += `<text x="${xn.toFixed(2)}" y="${yn.toFixed(2)}" font-size="${fs}" fill="#0a2da0" font-weight="bold" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif">${d}</text>`;
    } else if (d%5===0 && d>0 && d<180) {
      const xn=cx+rLbl5*Math.cos(rad), yn=cy-rLbl5*Math.sin(rad);
      s += `<text x="${xn.toFixed(2)}" y="${yn.toFixed(2)}" font-size="6" fill="rgba(10,45,160,0.72)" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif">${d}</text>`;
    } else if (d>0 && d<180) {
      const xn=cx+rLbl1*Math.cos(rad), yn=cy-rLbl1*Math.sin(rad);
      s += `<text x="${xn.toFixed(2)}" y="${yn.toFixed(2)}" font-size="4.5" fill="rgba(10,45,160,0.38)" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif">${d}</text>`;
    }
  }
  s += `<text x="${cx+ro+14}" y="${cy+5}" font-size="10" fill="#aa1111" font-weight="bold" text-anchor="start" font-family="Arial,sans-serif">0°</text>`;
  s += `<text x="${cx-ro-14}" y="${cy+5}" font-size="10" fill="#aa1111" font-weight="bold" text-anchor="end" font-family="Arial,sans-serif">180°</text>`;
  const x90=cx+rLbl10*Math.cos(Math.PI/2), y90=cy-rLbl10*Math.sin(Math.PI/2);
  s += `<text x="${x90.toFixed(2)}" y="${y90.toFixed(2)}" font-size="10" fill="#0a2da0" font-weight="bold" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif">90</text>`;
  document.getElementById('psvg').innerHTML = s;
}

// ══ INIT DRAW ══════════════════════════════════════════════════════
function initDraw() {
  document.getElementById('p-deg').textContent  = S.angle + '°';
  document.getElementById('p-type').textContent = TYPE_LBL[S.type];
  const cb = document.getElementById('calcbox');
  if (S.type === 'reflex') {
    cb.style.display = 'block';
    document.getElementById('cb-t').textContent = S.angle;
    document.getElementById('cb-s').textContent = S.angle - 180;
  } else { cb.style.display = 'none'; }
  buildProto();
  pdiv.style.display='none'; pdiv.style.transform='none'; pdiv.style.filter='';
  sring.style.display='none';
  setTools(['ruler']); updatePanel(); updateProg(); drawScene();
}

// ══ CANVAS DRAWING ══════════════════════════════════════════════════
function drawPaper() {
  ctx.fillStyle='#FFFDE7'; ctx.fillRect(0,0,CW,CH);
  ctx.strokeStyle='rgba(0,180,216,0.2)'; ctx.lineWidth=.9;
  for (let y=28; y<CH; y+=28) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(CW,y); ctx.stroke(); }
  ctx.strokeStyle='rgba(255,78,184,0.35)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(68,0); ctx.lineTo(68,CH); ctx.stroke();
  [72,CH/2,CH-72].forEach(y => {
    ctx.beginPath(); ctx.arc(22,y,11,0,Math.PI*2);
    ctx.fillStyle='rgba(0,0,0,0.08)'; ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,0.15)'; ctx.lineWidth=1; ctx.stroke();
  });
}

function drawScene() {
  ctx.clearRect(0,0,CW,CH); drawPaper();
  if (S.baseLine) {
    const {x1,y1,x2}=S.baseLine;
    ctx.strokeStyle='#1A1A2E'; ctx.lineWidth=2.2; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y1); ctx.stroke();
    [x1,x2].forEach(x=>{ctx.beginPath();ctx.moveTo(x,y1-8);ctx.lineTo(x,y1+8);ctx.stroke();});
  }
  if (S.step===0&&S.lineStart&&S.mx) {
    ctx.strokeStyle='rgba(0,180,216,0.5)'; ctx.lineWidth=1.5; ctx.setLineDash([7,5]);
    ctx.beginPath(); ctx.moveTo(S.lineStart.x,S.lineStart.y); ctx.lineTo(S.mx,S.lineStart.y); ctx.stroke();
    ctx.setLineDash([]);
  }
  if (S.center) {
    if (!S.pSnapped&&S.step===2) {
      ctx.beginPath(); ctx.arc(S.center.x,S.center.y,SNAP_D,0,Math.PI*2);
      ctx.strokeStyle='rgba(255,213,10,.4)'; ctx.lineWidth=2; ctx.setLineDash([5,5]); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.beginPath(); ctx.arc(S.center.x,S.center.y,6,0,Math.PI*2);
    ctx.fillStyle='#FF4EB8'; ctx.fill(); ctx.strokeStyle='white'; ctx.lineWidth=2.5; ctx.stroke();
    ctx.strokeStyle='#FF4EB8'; ctx.lineWidth=1.5;
    [[S.center.x-14,S.center.y,S.center.x+14,S.center.y],[S.center.x,S.center.y-14,S.center.x,S.center.y+14]].forEach(([x1,y1,x2,y2])=>{
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    });
  }
  if (S.marked&&S.center) {
    ctx.strokeStyle='rgba(255,213,10,.7)'; ctx.lineWidth=1.8; ctx.setLineDash([7,5]);
    ctx.beginPath(); ctx.moveTo(S.center.x,S.center.y); ctx.lineTo(S.marked.x,S.marked.y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(S.marked.x,S.marked.y,10,0,Math.PI*2);
    ctx.fillStyle='#FFD60A'; ctx.fill(); ctx.strokeStyle='white'; ctx.lineWidth=2.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(S.marked.x,S.marked.y,3,0,Math.PI*2); ctx.fillStyle='#1A1A2E'; ctx.fill();
  }
  if (S.finalLine) {
    const {x1,y1,x2,y2}=S.finalLine;
    ctx.strokeStyle='#80ED99'; ctx.lineWidth=3; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    drawArc();
  }
}

function drawArc() {
  if (!S.center) return;
  const cx=S.center.x, cy=S.center.y, r=48;
  ctx.beginPath(); ctx.strokeStyle='#FF4EB8'; ctx.lineWidth=2.5;
  ctx.arc(cx,cy,r,0,-S.angle*Math.PI/180,true); ctx.stroke();
  const mid=S.angle/2;
  const lx=cx+(r+24)*Math.cos(mid*Math.PI/180), ly=cy-(r+24)*Math.sin(mid*Math.PI/180);
  ctx.fillStyle='#FF4EB8'; ctx.font='bold 14px Arial'; ctx.textAlign='center';
  ctx.fillText(S.angle+'°',lx,ly);
}

// ══ TOOLS ══════════════════════════════════════════════════════════
function setTools(arr) {
  ['ruler','proto'].forEach(t => {
    const b = document.getElementById('tb-'+t);
    if (b) arr.includes(t) ? b.classList.remove('off') : b.classList.add('off');
  });
}

function useTool(t) {
  if (document.getElementById('tb-'+t).classList.contains('off')) return;
  S.tool = t;
  document.querySelectorAll('.tb').forEach(b => b.classList.remove('active'));
  document.getElementById('tb-'+t).classList.add('active');
  cwrap.classList.toggle('rcur', t==='ruler');
  if (t==='proto' && S.step===2) showProto();
}

// ══ PROTRACTOR DRAG ════════════════════════════════════════════════
function showProto() {
  pdiv.style.display='block';
  pdiv.classList.add('grab'); pdiv.classList.remove('lock');
  S.pLeft=90; S.pTop=50; S.pSnapped=false;
  pdiv.style.left=S.pLeft+'px'; pdiv.style.top=S.pTop+'px';
  pdiv.style.transform = S.type==='reflex' ? 'scaleY(-1)' : 'none';
}

pdiv.addEventListener('mousedown', e => {
  if (S.step!==2||S.pSnapped) return;
  S.pDrag=true;
  const r=pdiv.getBoundingClientRect();
  S.pDX=e.clientX-r.left; S.pDY=e.clientY-r.top;
  e.preventDefault();
});

document.addEventListener('mousemove', e => {
  if (!S.pDrag) return;
  const wr=cwrap.getBoundingClientRect();
  S.pLeft=e.clientX-wr.left-S.pDX; S.pTop=e.clientY-wr.top-S.pDY;
  pdiv.style.left=S.pLeft+'px'; pdiv.style.top=S.pTop+'px';
  checkSnap();
});

document.addEventListener('mouseup', () => { S.pDrag=false; });

function checkSnap() {
  if (!S.center||S.pSnapped) return;
  const pc={x:S.pLeft+PCX, y:S.pTop+PCY};
  const d=Math.hypot(pc.x-S.center.x, pc.y-S.center.y);
  if (d<SNAP_D*2.5) {
    sring.style.display='block'; sring.style.left=S.center.x+'px'; sring.style.top=S.center.y+'px';
  } else { sring.style.display='none'; }
  if (d<SNAP_D) {
    S.pLeft=S.center.x-PCX; S.pTop=S.center.y-PCY;
    pdiv.style.left=S.pLeft+'px'; pdiv.style.top=S.pTop+'px';
    S.pSnapped=true; S.pDrag=false; sring.style.display='none';
    pdiv.classList.remove('grab'); pdiv.classList.add('lock');
    pdiv.style.filter='drop-shadow(0 0 16px rgba(128,237,153,0.9))';
    setTimeout(()=>{ pdiv.style.filter='drop-shadow(0 4px 12px rgba(0,0,0,.5))'; },900);
    S.step=3; setTools([]);
    const m=S.type==='reflex'?(S.angle-180):S.angle;
    fb('✅ Protractor snapped! Now click the paper at the '+m+'° mark on the arc.','ok');
    updatePanel(); updateProg(); drawScene();
  }
}

// ══ CANVAS CLICK ════════════════════════════════════════════════════
canvas.addEventListener('mousemove', e => {
  const p=cpos(e); S.mx=p.x; S.my=p.y;
  if (S.step===0&&S.lineStart) drawScene();
});

canvas.addEventListener('click', e => { const p=cpos(e); onClick(p.x,p.y); });

function cpos(e) {
  const r=canvas.getBoundingClientRect();
  return { x:(e.clientX-r.left)*(CW/r.width), y:(e.clientY-r.top)*(CH/r.height) };
}

function onClick(x, y) {
  clearFB();
  if (S.step===0) {
    if (S.tool!=='ruler') { fb('📏 Select the Ruler tool first!','hint'); return; }
    if (!S.lineStart) {
      S.lineStart={x,y}; fb('📏 Good! Now click a second point to finish the line.','hint');
    } else {
      const x1=Math.min(S.lineStart.x,x), x2=Math.max(S.lineStart.x,x), ly=S.lineStart.y;
      if (x2-x1<LINE_MIN) { fb('⚠️ Make the line longer!','err'); return; }
      S.baseLine={x1,y1:ly,x2,y2:ly}; S.lineStart=null; S.step=1;
      cwrap.classList.remove('rcur'); S.tool=null;
      document.querySelectorAll('.tb').forEach(b=>b.classList.remove('active'));
      drawScene(); fb('📍 Great line! Now click ON the line to set your center point.','ok');
      updatePanel(); updateProg();
    }
  } else if (S.step===1) {
    const bl=S.baseLine;
    if (bl&&y>=bl.y1-18&&y<=bl.y1+18&&x>=bl.x1+8&&x<=bl.x2-8) {
      S.center={x,y:bl.y1}; S.step=2;
      setTools(['ruler','proto']); drawScene();
      fb('📐 Center set! Select the Protractor and drag it to the pink dot.','ok');
      updatePanel(); updateProg();
    } else { fb('⚠️ Click directly on the base line.','err'); }
  } else if (S.step===3) {
    if (!S.center||!S.pSnapped) return;
    const dx=x-S.center.x, dy=S.center.y-y, dist=Math.hypot(dx,dy);
    if (dist<PIR-15||dist>PR+22) { fb('⚠️ Click on the arc of the protractor!','err'); return; }
    const ca=Math.atan2(dy,dx)*180/Math.PI;
    if (S.type==='reflex') {
      if (ca>5) { fb('⚠️ Click BELOW the baseline on the flipped arc!','err'); return; }
      const suppFound=ca+180, targetSupp=S.angle-180, diff=Math.abs(suppFound-targetSupp);
      if (diff<=TOL) { markOK(); }
      else fb(`❌ You marked ~${Math.round(suppFound)}°. Need ${targetSupp}°. Off by ${Math.round(diff)}°. Try again!`,'err');
    } else {
      if (ca<-5) { fb('⚠️ Click ABOVE the baseline on the arc!','err'); return; }
      const diff=Math.abs(ca-S.angle);
      if (diff<=TOL) { markOK(); }
      else fb(`❌ You clicked ~${Math.round(ca)}°. Need ${S.angle}°. Off by ${Math.round(diff)}°. Try again!`,'err');
    }
  } else if (S.step===4) {
    if (S.tool!=='ruler') { fb('📏 Select the Ruler tool first!','hint'); return; }
    if (S.marked&&Math.hypot(x-S.marked.x,y-S.marked.y)<=MARK_R) {
      S.finalLine={x1:S.center.x,y1:S.center.y,x2:S.marked.x,y2:S.marked.y};
      S.step=5; pdiv.style.display='none'; cwrap.classList.remove('rcur');
      drawScene(); fb('🎉 Perfect! You drew a '+S.angle+'° '+S.type+' angle!','ok');
      updatePanel(); updateProg();
      setTimeout(()=>{
        document.getElementById('cc-d').textContent=S.angle+'°';
        document.getElementById('cc-n').textContent=TYPE_LBL[S.type];
        show('complete');
        try{window.parent.postMessage('package_completed','*');}catch(e){}
      },2200);
    } else { fb('⚠️ Click on the yellow dot to draw the final line!','hint'); }
  }
}

function markOK() {
  const mx=S.center.x+PR*Math.cos(S.angle*Math.PI/180);
  const my=S.center.y-PR*Math.sin(S.angle*Math.PI/180);
  S.marked={x:mx,y:my}; S.step=4;
  pdiv.style.display='none'; sring.style.display='none';
  setTools(['ruler']); drawScene();
  const ml=S.type==='reflex'?(S.angle-180):S.angle;
  fb('✅ '+ml+'° marked! Select 📏 Ruler, then click the yellow dot.','ok');
  updatePanel(); updateProg();
}

// ══ RESET ════════════════════════════════════════════════════════════
function resetAll() {
  S={...S,step:0,tool:null,lineStart:null,baseLine:null,center:null,
    marked:null,finalLine:null,mx:0,my:0,pLeft:90,pTop:50,pDrag:false,pSnapped:false};
  pdiv.style.display='none'; pdiv.style.transform='none'; pdiv.style.filter='';
  sring.style.display='none'; cwrap.classList.remove('rcur');
  document.querySelectorAll('.tb').forEach(b=>b.classList.remove('active'));
  setTools(['ruler']); clearFB(); drawScene(); updatePanel(); updateProg();
}

// ══ PANEL ════════════════════════════════════════════════════════════
const PI_INFO = [
  {n:'Step 1 of 5',t:'📏 Draw the Base Line',d:'Select Ruler (📏), then click two points on the paper to draw a straight horizontal line.'},
  {n:'Step 2 of 5',t:'📍 Pick Center Point',d:'Click anywhere directly on the base line to set the center point for your angle.'},
  {n:'Step 3 of 5',t:'📐 Place the Protractor',d:()=>S.type==='reflex'?'Select Protractor — it FLIPS for reflex! Drag it to the pink dot until it snaps.':'Select Protractor and drag it to the pink dot. It will snap into place!'},
  {n:'Step 4 of 5',t:'🎯 Mark the Angle',d:()=>S.type==='reflex'?`Click at the ${S.angle-180}° mark on the flipped arc (below the line). That is ${S.angle}° minus 180° = ${S.angle-180}°.`:`Click on the protractor arc at the ${S.angle}° mark.`},
  {n:'Step 5 of 5',t:'📏 Draw the Angle Line',d:'Select Ruler (📏), then click the yellow dot to draw the final line.'},
  {n:'✅ Complete!',t:'🎉 Angle Drawn!',d:'You used a ruler and protractor just like in real life!'}
];

function updatePanel() {
  const i=PI_INFO[S.step]; if (!i) return;
  document.getElementById('sb-n').textContent=i.n;
  document.getElementById('sb-t').textContent=i.t;
  document.getElementById('sb-d').textContent=typeof i.d==='function'?i.d():i.d;
}

function updateProg() {
  const steps=S.type==='reflex'?STEPS_R:STEPS_N;
  const colors=['#FF4EB8','#FFD60A','#00B4D8','#80ED99','#9D4EDD'];
  document.getElementById('psteps').innerHTML=steps.map((s,i)=>{
    const c=i<S.step?'done':i===S.step?'cur':'';
    const col=colors[i]||'#fff';
    const num=i<S.step?'✓':(i+1);
    return`<div class="ps ${c}"><div class="pn" style="${c==='cur'?'background:'+col:''}">${num}</div><div class="pt">${s}</div></div>`;
  }).join('');
}

function fb(msg,type){const b=document.getElementById('fb');b.className='fb '+type;b.textContent=msg;}
function clearFB(){const b=document.getElementById('fb');b.className='fb';b.textContent='';}

// ══ NICKNAME ════════════════════════════════════════════════════════
let studentName = '';

function submitNickname() {
  const input=document.getElementById('nick-input');
  const name=input.value.trim();
  const error=document.getElementById('nick-error');
  if (name==='') {
    error.classList.add('show');
    input.style.borderColor='#FF4EB8';
    input.focus(); return;
  }
  studentName=name;
  const greeting=document.getElementById('alfred-greeting');
  if (greeting) greeting.textContent='Hey '+name+'! 👋';
  show('welcome');
}

function clearNickError() {
  document.getElementById('nick-error').classList.remove('show');
  document.getElementById('nick-input').style.borderColor='';
}

// ══ MODULE SYSTEM ════════════════════════════════════════════════════
let currentModule = 0;

function showModule(n) {
  currentModule = n;
  pType  = n===1?'acute':n===2?'obtuse':'reflex';
  pAngle = null;

  // Reset angle selection
  const drawBtn  = document.getElementById('mod'+n+'-draw');
  const customIn = document.getElementById('mod'+n+'-custom');
  document.querySelectorAll('#mod'+n+'-presets .modp-btn').forEach(b=>b.classList.remove('sel'));
  if (drawBtn)  drawBtn.classList.remove('on');
  if (customIn) customIn.value='';

  // Update Alfred's greeting with student name
  document.querySelectorAll('.alfred-mod-name').forEach(el=>{
    el.textContent = studentName || 'Explorer';
  });

  show('module'+n);

  // Alfred ALWAYS shows when module is opened
  const overlay = document.getElementById('mod'+n+'-overlay');
  const picker  = document.getElementById('mod'+n+'-picker');
  const popup   = document.getElementById('mod'+n+'-popup');
  if (overlay && picker && popup) {
    overlay.style.display='flex';
    picker.classList.add('picker-blur');
    setTimeout(()=>popup.classList.add('active'), 80);
  }
}

function dismissAlfred(n) {
  const overlay=document.getElementById('mod'+n+'-overlay');
  const picker =document.getElementById('mod'+n+'-picker');
  const popup  =document.getElementById('mod'+n+'-popup');
  if (!popup) return;
  popup.classList.remove('active');
  setTimeout(()=>{
    if (overlay) overlay.style.display='none';
    if (picker)  picker.classList.remove('picker-blur');
  }, 650);
}

function selectModAngle(angle, el, moduleNum) {
  pAngle=angle;
  pType=moduleNum===1?'acute':moduleNum===2?'obtuse':'reflex';
  document.querySelectorAll('#mod'+moduleNum+'-presets .modp-btn').forEach(b=>b.classList.remove('sel'));
  el.classList.add('sel');
  const customIn=document.getElementById('mod'+moduleNum+'-custom');
  if (customIn) customIn.value='';
  const drawBtn=document.getElementById('mod'+moduleNum+'-draw');
  if (drawBtn) drawBtn.classList.add('on');
}

function onModCustom(inp, moduleNum) {
  const v=parseInt(inp.value);
  document.querySelectorAll('#mod'+moduleNum+'-presets .modp-btn').forEach(b=>b.classList.remove('sel'));
  const ranges={1:[1,89],2:[91,179],3:[181,359]};
  const types={1:'acute',2:'obtuse',3:'reflex'};
  const [min,max]=ranges[moduleNum];
  const drawBtn=document.getElementById('mod'+moduleNum+'-draw');
  if (v>=min&&v<=max) {
    pAngle=v; pType=types[moduleNum];
    if (drawBtn) drawBtn.classList.add('on');
  } else {
    pAngle=null;
    if (drawBtn) drawBtn.classList.remove('on');
  }
}

function drawAnother() {
  pAngle=null;
  document.querySelectorAll('#mod'+currentModule+'-presets .modp-btn').forEach(b=>b.classList.remove('sel'));
  const drawBtn=document.getElementById('mod'+currentModule+'-draw');
  const customIn=document.getElementById('mod'+currentModule+'-custom');
  if (drawBtn)  drawBtn.classList.remove('on');
  if (customIn) customIn.value='';
  show('module'+currentModule);
}

// ══ MINI GAME ENGINE ════════════════════════════════════════════════

// ── QUESTION BANK ──────────────────────────────────────────────────
const QUESTIONS = {
  1: [
    {type:'spot', q:'What type of angle is 45°?',                                   opts:['🔺 Acute','📐 Obtuse','🔄 Reflex','📏 Right'], ans:0, exp:'45° is less than 90° so it is an Acute angle!'},
    {type:'tf',   q:'True or False: A 60° angle is an Acute angle.',                opts:['✅ True','❌ False'],                          ans:0, exp:'Yes! 60° is between 0° and 90° making it Acute.'},
    {type:'build',q:'Which of these is an Acute angle?',                            opts:['75°','120°','200°','90°'],                    ans:0, exp:'75° is less than 90° so it is Acute!'},
    {type:'life', q:'Which real life object shows an Acute angle?',                 opts:['🍕 Pizza tip','📖 Open book','🪃 Boomerang inner','⏰ Clock at 6'], ans:0, exp:'The sharp tip of a pizza slice is a perfect Acute angle!'},
    {type:'spot', q:'What type of angle is 30°?',                                   opts:['🔺 Acute','📐 Obtuse','🔄 Reflex','📏 Right'], ans:0, exp:'30° is less than 90° so it is Acute!'},
    {type:'tf',   q:'True or False: An Acute angle is always less than 90°.',       opts:['✅ True','❌ False'],                          ans:0, exp:'Correct! Acute angles are always between 0° and 90°.'},
    {type:'build',q:'Which of these is NOT an Acute angle?',                        opts:['45°','85°','60°','100°'],                     ans:3, exp:'100° is greater than 90° so it is Obtuse, not Acute!'},
    {type:'life', q:'Clock hands at 2 o\'clock form which type of angle?',          opts:['🔺 Acute','📐 Obtuse','🔄 Reflex','📏 Right'], ans:0, exp:'Clock hands at 2 o\'clock make a sharp Acute angle!'},
    {type:'spot', q:'What type of angle is 89°?',                                   opts:['🔺 Acute','📐 Obtuse','🔄 Reflex','📏 Right'], ans:0, exp:'89° is just under 90° making it Acute!'},
    {type:'tf',   q:'True or False: A 30° angle is smaller than a 70° angle.',     opts:['✅ True','❌ False'],                          ans:0, exp:'Yes! 30° is smaller and sharper than 70°.'}
  ],
  2: [
    {type:'spot', q:'What type of angle is 120°?',                                  opts:['🔺 Acute','📐 Obtuse','🔄 Reflex','📏 Right'], ans:1, exp:'120° is between 90° and 180° so it is Obtuse!'},
    {type:'tf',   q:'True or False: A 90° angle is an Obtuse angle.',              opts:['✅ True','❌ False'],                          ans:1, exp:'No! 90° is a Right angle. Obtuse must be greater than 90°.'},
    {type:'build',q:'Which of these is an Obtuse angle?',                          opts:['45°','150°','270°','30°'],                    ans:1, exp:'150° is between 90° and 180° making it Obtuse!'},
    {type:'life', q:'Which object best shows an Obtuse angle?',                    opts:['✏️ Pencil tip','📖 Open book lying flat','🍕 Pizza tip','🕯️ Candle'], ans:1, exp:'An open book lying flat forms a wide Obtuse angle!'},
    {type:'spot', q:'What type of angle is 135°?',                                  opts:['🔺 Acute','📐 Obtuse','🔄 Reflex','📏 Right'], ans:1, exp:'135° is between 90° and 180° making it Obtuse!'},
    {type:'tf',   q:'True or False: An Obtuse angle is between 90° and 180°.',     opts:['✅ True','❌ False'],                          ans:0, exp:'Correct! Obtuse is always greater than 90° but less than 180°.'},
    {type:'build',q:'Which of these is NOT an Obtuse angle?',                      opts:['100°','160°','45°','130°'],                   ans:2, exp:'45° is less than 90° making it Acute, not Obtuse!'},
    {type:'life', q:'A reclining chair back forms which type of angle?',           opts:['🔺 Acute','📐 Obtuse','🔄 Reflex','📏 Right'], ans:1, exp:'A reclining chair creates a wide Obtuse angle!'},
    {type:'spot', q:'What type of angle is 179°?',                                  opts:['🔺 Acute','📐 Obtuse','🔄 Reflex','📏 Right'], ans:1, exp:'179° is just under 180° making it Obtuse!'},
    {type:'tf',   q:'True or False: 150° is larger than a right angle (90°).',     opts:['✅ True','❌ False'],                          ans:0, exp:'Yes! 150° is much larger than a 90° right angle.'}
  ],
  3: [
    {type:'spot', q:'What type of angle is 270°?',                                  opts:['🔺 Acute','📐 Obtuse','🔄 Reflex','📏 Right'], ans:2, exp:'270° is greater than 180° making it Reflex!'},
    {type:'tf',   q:'True or False: A Reflex angle is always greater than 180°.',  opts:['✅ True','❌ False'],                          ans:0, exp:'Correct! Reflex angles are always between 180° and 360°.'},
    {type:'build',q:'Which of these is a Reflex angle?',                           opts:['45°','120°','200°','89°'],                    ans:2, exp:'200° is greater than 180° making it Reflex!'},
    {type:'life', q:'Which object shows a Reflex angle?',                          opts:['🍕 Pizza tip','📖 Open book','🪃 Boomerang inner curve','✏️ Pencil tip'], ans:2, exp:'The inner curve of a boomerang is a perfect Reflex angle!'},
    {type:'spot', q:'What type of angle is 300°?',                                  opts:['🔺 Acute','📐 Obtuse','🔄 Reflex','📏 Right'], ans:2, exp:'300° is between 180° and 360° making it Reflex!'},
    {type:'tf',   q:'True or False: A 180° straight line is a Reflex angle.',      opts:['✅ True','❌ False'],                          ans:1, exp:'No! 180° is a straight line. Reflex must be greater than 180°.'},
    {type:'build',q:'Which of these is NOT a Reflex angle?',                       opts:['210°','350°','150°','240°'],                  ans:2, exp:'150° is between 90° and 180° making it Obtuse, not Reflex!'},
    {type:'life', q:'A clock hand sweeping the long way round shows which angle?', opts:['🔺 Acute','📐 Obtuse','🔄 Reflex','📏 Right'], ans:2, exp:'The long sweep of a clock hand is a Reflex angle!'},
    {type:'spot', q:'What type of angle is 359°?',                                  opts:['🔺 Acute','📐 Obtuse','🔄 Reflex','📏 Right'], ans:2, exp:'359° is just under a full rotation making it Reflex!'},
    {type:'tf',   q:'True or False: A full rotation of 360° is a Reflex angle.',   opts:['✅ True','❌ False'],                          ans:1, exp:'No! 360° is a complete circle. Reflex must be less than 360°.'}
  ]
};

const LEVEL_TIME = {1:15, 2:12, 3:10};

// ── GAME STATE ──────────────────────────────────────────────────────
let G = {
  level:0, qi:0, lives:3, correct:0,
  dangerStep:0, alfredStep:0, rocksLeft:7,
  timerInt:null, timeLeft:0, waiting:false,
  rewards:{1:false,2:false,3:false}
};

// ── SCENE POSITIONS ─────────────────────────────────────────────────
const L1_ALFRED  = [{top:'12%',left:'72%'},{top:'20%',left:'65%'},{top:'28%',left:'58%'},{top:'36%',left:'51%'},{top:'44%',left:'44%'},{top:'52%',left:'37%'},{top:'60%',left:'30%'},{top:'68%',left:'23%'},{top:'74%',left:'16%'},{top:'80%',left:'10%'},{top:'82%',left:'8%'}];
const L1_BOULDER = [{top:'4%',left:'80%'},{top:'28%',left:'70%'},{top:'52%',left:'58%'},{top:'78%',left:'46%'}];
const L2_ALFRED_LEFT = ['5%','14%','23%','32%','41%','50%','59%','67%','74%','80%','85%'];
const L3_SNAKE_LEFT  = ['4%','14%','24%','34%'];

// ── HELPERS ─────────────────────────────────────────────────────────
function gEl(id) { return document.getElementById(id); }

function setLives(n) {
  G.lives=n;
  const hearts=['💔','❤️','❤️❤️','❤️❤️❤️'];
  const el=gEl('g'+G.level+'-lives');
  if (el) el.textContent=hearts[Math.max(0,n)];
}

function showSection(level, section) {
  // Hide all sections for this level
  ['entrance','arena','win','over'].forEach(s=>{
    const el=gEl('g'+level+'-'+s);
    if (el) el.style.display='none';
  });
  // Show the requested section
  const target=gEl('g'+level+'-'+section);
  if (target) target.style.display='flex';
}

// ── START GAME (from Play Game button) ──────────────────────────────
function startGame(level) {
  G.level=level;
  // Show rewards earned so far
  const bar=gEl('g'+level+'-rewards-bar');
  if (bar) {
    bar.innerHTML='';
    if (level>=2&&G.rewards[1]){const c=document.createElement('span');c.className='ge-reward-chip';c.textContent='🎀 Bow Tie';bar.appendChild(c);}
    if (level>=3&&G.rewards[2]){const c=document.createElement('span');c.className='ge-reward-chip';c.textContent='🎩 Tiny Hat';bar.appendChild(c);}
  }
  show('game'+level);
  showSection(level,'entrance');
}

// ── BEGIN GAME (from Start button on entrance) ───────────────────────
function beginGame(level) {
  G.level=level; G.qi=0; G.lives=3; G.correct=0;
  G.dangerStep=0; G.alfredStep=0; G.rocksLeft=7; G.waiting=false;
  resetScene(level);
  setLives(3);
  const fb=gEl('g'+level+'-feedback');
  if (fb) fb.style.display='none';
  showSection(level,'arena');
  loadQuestion(level);
}

// ── RESET SCENE ─────────────────────────────────────────────────────
function resetScene(level) {
  if (level===1) {
    const alfred=gEl('g1-alfred'), boulder=gEl('g1-boulder');
    if (alfred)  { alfred.style.top=L1_ALFRED[0].top;   alfred.style.left=L1_ALFRED[0].left; }
    if (boulder) { boulder.style.top=L1_BOULDER[0].top; boulder.style.left=L1_BOULDER[0].left; }
  } else if (level===2) {
    const alfred=gEl('g2-alfred');
    if (alfred) alfred.style.left=L2_ALFRED_LEFT[0];
    ['g2-f0','g2-f1','g2-f2'].forEach((id,i)=>{ const el=gEl(id); if(el) el.style.opacity=i===0?'1':'0'; });
  } else if (level===3) {
    const snake=gEl('g3-snake');
    if (snake) snake.style.left=L3_SNAKE_LEFT[0];
    for (let i=0;i<7;i++) {
      const rock=gEl('g3-r'+i);
      if (rock) { rock.style.display='inline'; rock.classList.remove('blast'); }
    }
    G.rocksLeft=7;
  }
}

// ── LOAD QUESTION ────────────────────────────────────────────────────
function loadQuestion(level) {
  if (G.waiting) return;
  const qs=QUESTIONS[level];
  if (G.qi>=qs.length) { levelWin(level); return; }
  const q=qs[G.qi];

  // Update HUD
  const qcount=gEl('g'+level+'-qcount');
  if (qcount) qcount.textContent='Q '+(G.qi+1)+' / '+qs.length;
  const scoreEl=gEl('g'+level+'-score');
  if (scoreEl) scoreEl.textContent=level===3?('🪨 '+G.rocksLeft+' rocks left'):('✅ '+G.correct);

  // Question type label
  const typeLabels={spot:'🔍 SPOT IT!',tf:'❓ TRUE OR FALSE?',build:'🏗️ BUILD IT!',life:'🌍 REAL LIFE!'};
  const typeColors={spot:'#00B4D8',tf:'#FFD60A',build:'#FF4EB8',life:'#80ED99'};
  const qtEl=gEl('g'+level+'-qtype');
  if (qtEl) { qtEl.textContent=typeLabels[q.type]; qtEl.style.color=typeColors[q.type]; }

  // Question text — uses q.q (the property name in the question bank)
  const qtextEl=gEl('g'+level+'-qtext');
  if (qtextEl) qtextEl.textContent=q.q;

  // Answer buttons
  const optsEl=gEl('g'+level+'-opts');
  if (!optsEl) return;
  optsEl.innerHTML='';
  optsEl.className='game-opts'+(q.type==='tf'?' two-col':'');
  q.opts.forEach((opt,i)=>{
    const btn=document.createElement('button');
    btn.className='go-btn'; btn.textContent=opt;
    btn.onclick=()=>checkAnswer(level,i);
    optsEl.appendChild(btn);
  });

  // Hide feedback
  const fbEl=gEl('g'+level+'-feedback');
  if (fbEl) fbEl.style.display='none';

  // Start timer
  startTimer(level);
}

// ── TIMER ─────────────────────────────────────────────────────────────
function startTimer(level) {
  clearInterval(G.timerInt);
  G.timeLeft=LEVEL_TIME[level];
  const timerEl=gEl('g'+level+'-timer');
  G.timerInt=setInterval(()=>{
    if (G.waiting) return;
    G.timeLeft--;
    if (timerEl) {
      timerEl.textContent=G.timeLeft;
      timerEl.className='hud-timer '+(G.timeLeft<=3?'danger':G.timeLeft<=7?'warn':'');
    }
    if (G.timeLeft<=0) { clearInterval(G.timerInt); timeOut(level); }
  },1000);
}

function stopTimer() { clearInterval(G.timerInt); }

// ── CHECK ANSWER ──────────────────────────────────────────────────────
function checkAnswer(level, chosen) {
  if (G.waiting) return;
  G.waiting=true; stopTimer();
  const q=QUESTIONS[level][G.qi];
  const btns=gEl('g'+level+'-opts').querySelectorAll('.go-btn');
  btns.forEach(b=>b.disabled=true);

  if (chosen===q.ans) {
    btns[chosen].classList.add('correct');
    G.correct++; G.alfredStep=Math.min(G.alfredStep+1,10);
    updateSceneCorrect(level);
    showGameFeedback(level,true,q.exp);
  } else {
    btns[chosen].classList.add('wrong');
    btns[q.ans].classList.add('reveal');
    G.lives--; G.dangerStep=Math.min(G.dangerStep+1,3);
    setLives(G.lives);
    updateSceneWrong(level);
    showGameFeedback(level,false,'The correct answer was: '+q.opts[q.ans]+'. '+q.exp);
    if (G.lives<=0) { setTimeout(()=>levelOver(level),1800); return; }
  }
}

// ── TIME OUT ──────────────────────────────────────────────────────────
function timeOut(level) {
  if (G.waiting) return;
  G.waiting=true;
  const q=QUESTIONS[level][G.qi];
  const btns=gEl('g'+level+'-opts').querySelectorAll('.go-btn');
  btns.forEach(b=>b.disabled=true);
  btns[q.ans].classList.add('reveal');
  G.lives--; G.dangerStep=Math.min(G.dangerStep+1,3);
  setLives(G.lives);
  updateSceneWrong(level);
  showGameFeedback(level,false,'Time is up! The correct answer was: '+q.opts[q.ans]+'. '+q.exp);
  if (G.lives<=0) { setTimeout(()=>levelOver(level),1800); }
}

// ── UPDATE SCENE CORRECT ──────────────────────────────────────────────
function updateSceneCorrect(level) {
  if (level===1) {
    const alfred=gEl('g1-alfred'), pos=L1_ALFRED[G.alfredStep];
    if (alfred&&pos) { alfred.style.top=pos.top; alfred.style.left=pos.left; }
  } else if (level===2) {
    const alfred=gEl('g2-alfred');
    if (alfred) alfred.style.left=L2_ALFRED_LEFT[Math.min(G.alfredStep,10)];
  } else if (level===3) {
    const rockIdx=7-G.rocksLeft;
    const rock=gEl('g3-r'+rockIdx);
    if (rock&&G.rocksLeft>0) {
      rock.classList.add('blast');
      setTimeout(()=>{ if(rock) rock.style.display='none'; },500);
      G.rocksLeft--;
    }
    setTimeout(()=>{ const sc=gEl('g3-score'); if(sc) sc.textContent='🪨 '+G.rocksLeft+' rocks left'; },150);
  }
}

// ── UPDATE SCENE WRONG ────────────────────────────────────────────────
function updateSceneWrong(level) {
  const wobble=(el)=>{ if(!el)return; el.style.transform='rotate(15deg) scale(1.15)'; setTimeout(()=>{ el.style.transform=''; },500); };
  if (level===1) {
    const boulder=gEl('g1-boulder'), pos=L1_BOULDER[Math.min(G.dangerStep,3)];
    if (boulder&&pos) { boulder.style.top=pos.top; boulder.style.left=pos.left; }
    wobble(gEl('g1-alfred'));
  } else if (level===2) {
    const stage=Math.min(G.dangerStep-1,2);
    if (stage>=0) {
      const segs=[[true,false,false],[true,true,false],[true,true,true]][stage];
      segs.forEach((show,i)=>{ const el=gEl('g2-f'+i); if(el) el.style.opacity=show?'1':'0'; });
    }
    wobble(gEl('g2-alfred'));
  } else if (level===3) {
    const snake=gEl('g3-snake');
    if (snake) snake.style.left=L3_SNAKE_LEFT[Math.min(G.dangerStep,3)];
    wobble(gEl('g3-alfred'));
  }
}

// ── SHOW GAME FEEDBACK ────────────────────────────────────────────────
function showGameFeedback(level, correct, msg) {
  const fb=gEl('g'+level+'-feedback');
  const icon=gEl('g'+level+'-fb-icon');
  const msgEl=gEl('g'+level+'-fb-msg');
  if (!fb) return;
  if (icon)  icon.textContent=correct?'✅':'❌';
  if (msgEl) msgEl.textContent=msg;
  fb.style.display='flex';
  fb.style.borderColor=correct?'#80ED99':'#FF4EB8';
}

// ── NEXT QUESTION ─────────────────────────────────────────────────────
function nextQ(level) {
  G.waiting=false; G.qi++;
  if (G.qi>=QUESTIONS[level].length) { levelWin(level); }
  else { loadQuestion(level); }
}

// ── LEVEL WIN ─────────────────────────────────────────────────────────
function levelWin(level) {
  stopTimer();
  G.rewards[level]=true;
  showSection(level,'win');
}

// ── LEVEL OVER ────────────────────────────────────────────────────────
function levelOver(level) {
  stopTimer();
  showSection(level,'over');
}

// ══ INIT ════════════════════════════════════════════════════════════════
buildProto();
drawScene();
