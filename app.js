/* =====================================================
   NeonX – app.js
   Self-contained dashboard (no external dependencies)
   ===================================================== */

/* ── Sidebar toggle ── */
const sidebar     = document.getElementById('sidebar');
const mainContent = document.getElementById('mainContent');
const toggleBtn   = document.getElementById('sidebarToggle');

toggleBtn.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
  mainContent.classList.toggle('expanded');
});

/* ── Nav item click ── */
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
  });
});

/* ── Period pill buttons ── */
let currentPeriod = 'btn24h';
document.querySelectorAll('.pill-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.closest('.card-actions')
       .querySelectorAll('.pill-btn')
       .forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentPeriod = btn.id;
    drawPerfChart();
  });
});

/* =====================================================
   COLOUR TOKENS
   ===================================================== */
const C = {
  cyan:   '#00f5ff',
  purple: '#bf00ff',
  pink:   '#ff00cc',
  green:  '#00ff88',
  orange: '#ff8800',
  text:   '#8090b0',
  grid:   'rgba(255,255,255,0.05)',
};

/* =====================================================
   UTILITY – canvas helpers
   ===================================================== */
function hexAlpha(hex, a) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x+w, y,   x+w, y+r,   r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y+h, x, y+h-r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x+r, y, r);
  ctx.closePath();
}

/* =====================================================
   PERFORMANCE LINE CHART  (custom canvas renderer)
   ===================================================== */
const perfCanvas = document.getElementById('perfChart');

function generateLabels(period) {
  if (period === 'btn24h') return Array.from({length:24},(_,i)=>`${String(i).padStart(2,'0')}:00`);
  if (period === 'btn7d')  return ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  return Array.from({length:30},(_,i)=>`D${i+1}`);
}

function randData(len, base, spread) {
  return Array.from({length:len}, () => +(base + (Math.random()-0.42)*spread).toFixed(2));
}

function buildSeries(period) {
  const len = period==='btn24h' ? 24 : period==='btn7d' ? 7 : 30;
  return [
    { label:'Accuracy %',  data: randData(len, 97.5, 2.8),  color: C.cyan,   unit:'%',    scale: v => Math.min(100, Math.max(0, v)) },
    { label:'Loss Index',  data: randData(len, 38,   18),   color: C.pink,   unit:'',     scale: v => Math.min(100, Math.max(0, v)) },
    { label:'Throughput',  data: randData(len, 68,   22),   color: C.purple, unit:'%',    scale: v => Math.min(100, Math.max(0, v)) },
  ];
}

let perfSeries = buildSeries('btn24h');
let perfLabels = generateLabels('btn24h');

/* Animated draw */
let perfAnim = null;
function drawPerfChart() {
  perfSeries = buildSeries(currentPeriod);
  perfLabels = generateLabels(currentPeriod);

  if (perfAnim) cancelAnimationFrame(perfAnim);
  let progress = 0;
  function frame() {
    progress = Math.min(progress + 0.04, 1);
    renderPerfChart(progress);
    if (progress < 1) perfAnim = requestAnimationFrame(frame);
  }
  perfAnim = requestAnimationFrame(frame);
}

function renderPerfChart(progress = 1) {
  const canvas = perfCanvas;
  const dpr    = window.devicePixelRatio || 1;
  const W      = canvas.offsetWidth || 600;
  const H      = 240;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const pad  = { t: 20, r: 20, b: 44, l: 44 };
  const cW   = W - pad.l - pad.r;
  const cH   = H - pad.t - pad.b;

  /* Fixed Y range 0-100 */
  const yMin = 0, yMax = 100, yRange = 100;

  const xOf = i => pad.l + (i / Math.max(1, perfLabels.length - 1)) * cW;
  const yOf = v => pad.t + cH - ((v - yMin) / yRange) * cH;

  /* Grid */
  ctx.strokeStyle = C.grid;
  ctx.lineWidth   = 1;
  const yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    const y = pad.t + (cH / yTicks) * i;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cW, y); ctx.stroke();
    const val = Math.round(yMax - (yRange / yTicks) * i);
    ctx.fillStyle = C.text;
    ctx.font = `10px system-ui`;
    ctx.textAlign = 'right';
    ctx.fillText(val + '%', pad.l - 6, y + 4);
  }

  /* X labels */
  const step = Math.max(1, Math.floor(perfLabels.length / 8));
  ctx.fillStyle = C.text;
  ctx.font = '10px system-ui';
  ctx.textAlign = 'center';
  perfLabels.forEach((lbl, i) => {
    if (i % step === 0 || i === perfLabels.length - 1) {
      ctx.fillText(lbl, xOf(i), pad.t + cH + 16);
    }
  });

  /* Series */
  perfSeries.forEach(series => {
    const pts    = series.data.map(series.scale);
    const endIdx = Math.max(1, Math.round(progress * (pts.length - 1)));

    /* Fill */
    ctx.beginPath();
    ctx.moveTo(xOf(0), yOf(pts[0]));
    for (let i = 1; i <= endIdx; i++) {
      const xc = (xOf(i-1) + xOf(i)) / 2;
      ctx.bezierCurveTo(xc, yOf(pts[i-1]), xc, yOf(pts[i]), xOf(i), yOf(pts[i]));
    }
    ctx.lineTo(xOf(endIdx), pad.t + cH);
    ctx.lineTo(xOf(0), pad.t + cH);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + cH);
    grad.addColorStop(0, hexAlpha(series.color, 0.20));
    grad.addColorStop(1, hexAlpha(series.color, 0.00));
    ctx.fillStyle = grad;
    ctx.fill();

    /* Line */
    ctx.beginPath();
    ctx.moveTo(xOf(0), yOf(pts[0]));
    for (let i = 1; i <= endIdx; i++) {
      const xc = (xOf(i-1) + xOf(i)) / 2;
      ctx.bezierCurveTo(xc, yOf(pts[i-1]), xc, yOf(pts[i]), xOf(i), yOf(pts[i]));
    }
    ctx.strokeStyle = series.color;
    ctx.lineWidth   = 2;
    ctx.shadowBlur  = 8;
    ctx.shadowColor = series.color;
    ctx.stroke();
    ctx.shadowBlur  = 0;

    /* Dots at breakpoints (every ~3rd point to avoid clutter) */
    if (progress === 1) {
      const dotStep = Math.max(1, Math.floor(pts.length / 10));
      pts.forEach((v, i) => {
        if (i % dotStep !== 0 && i !== pts.length - 1) return;
        ctx.beginPath();
        ctx.arc(xOf(i), yOf(v), 3.5, 0, Math.PI*2);
        ctx.fillStyle   = series.color;
        ctx.shadowBlur  = 6;
        ctx.shadowColor = series.color;
        ctx.fill();
        ctx.shadowBlur  = 0;
      });
    }
  });

  /* Legend – centred inside the chart area */
  const colW   = 160;
  const totalW = perfSeries.length * colW;
  let lx = pad.l + (cW - totalW) / 2;
  const ly = pad.t + cH + 28;
  ctx.font = '11px system-ui';
  ctx.textAlign = 'left';
  perfSeries.forEach(s => {
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx + 20, ly);
    ctx.strokeStyle = s.color;
    ctx.lineWidth   = 2.5;
    ctx.shadowBlur  = 4;
    ctx.shadowColor = s.color;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(lx + 10, ly, 3.5, 0, Math.PI*2);
    ctx.fillStyle = s.color;
    ctx.fill();

    ctx.fillStyle = '#c8d0e8';
    ctx.fillText(s.label, lx + 26, ly + 4);
    lx += colW;
  });
}

/* Initial draw + resize */
window.addEventListener('resize', drawPerfChart);
/* Defer until CSS layout is complete so offsetWidth is correct */
requestAnimationFrame(() => requestAnimationFrame(drawPerfChart));

/* =====================================================
   MODEL DISTRIBUTION DOUGHNUT  (custom canvas)
   ===================================================== */
const distCanvas = document.getElementById('distChart');

const DIST = {
  labels: ['Transformer','CNN','GAN','Diffusion','RL Agent'],
  values: [38, 22, 15, 18, 7],
  colors: [C.cyan, C.purple, C.pink, C.green, C.orange],
};

function drawDistChart(progress = 1) {
  const canvas = distCanvas;
  const dpr    = window.devicePixelRatio || 1;
  const size   = Math.min(canvas.offsetWidth, 210);
  canvas.width  = size * dpr;
  canvas.height = size * dpr;
  canvas.style.height = size + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const cx = size / 2, cy = size / 2;
  const outerR = size * 0.42;
  const innerR = size * 0.27;

  const total = DIST.values.reduce((a, b) => a + b, 0);
  let start = -Math.PI / 2;

  DIST.values.forEach((v, i) => {
    const sweep = (v / total) * Math.PI * 2 * progress;
    const mid   = start + sweep / 2;
    const hover = 4;

    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(mid)*hover, cy + Math.sin(mid)*hover);
    ctx.arc(cx + Math.cos(mid)*hover, cy + Math.sin(mid)*hover, outerR, start, start+sweep);
    ctx.arc(cx + Math.cos(mid)*hover, cy + Math.sin(mid)*hover, innerR, start+sweep, start, true);
    ctx.closePath();

    ctx.fillStyle   = hexAlpha(DIST.colors[i], 0.25);
    ctx.strokeStyle = DIST.colors[i];
    ctx.lineWidth   = 2;
    ctx.shadowBlur  = 10;
    ctx.shadowColor = DIST.colors[i];
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    start += sweep;
  });

  /* Centre text */
  if (progress === 1) {
    ctx.fillStyle = '#e8eaff';
    ctx.font      = `bold ${Math.round(size*0.12)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total + '%', cx, cy - size*0.04);
    ctx.fillStyle = C.text;
    ctx.font      = `${Math.round(size*0.07)}px system-ui`;
    ctx.fillText('models', cx, cy + size*0.07);
  }
}

/* Build legend */
const legendEl = document.getElementById('distLegend');
DIST.labels.forEach((lbl, i) => {
  const item = document.createElement('div');
  item.className = 'legend-item';
  item.innerHTML = `
    <span class="legend-dot" style="background:${DIST.colors[i]};box-shadow:0 0 6px ${DIST.colors[i]}"></span>
    <span>${lbl}</span>
    <span style="margin-left:4px;font-weight:600;color:${DIST.colors[i]}">${DIST.values[i]}%</span>
  `;
  legendEl.appendChild(item);
});

/* Animated draw */
let distProgress = 0;
function animateDist() {
  distProgress = Math.min(distProgress + 0.035, 1);
  drawDistChart(distProgress);
  if (distProgress < 1) requestAnimationFrame(animateDist);
}
requestAnimationFrame(() => requestAnimationFrame(animateDist));
window.addEventListener('resize', () => drawDistChart(1));

/* =====================================================
   ACTIVITY FEED
   ===================================================== */
const ACTIVITIES = [
  { type:'success', symbol:'✓', msg:'GPT-5 fine-tuning completed — epoch 12/12',   time:'just now' },
  { type:'info',    symbol:'⚡', msg:'Inference request: 4,200 tokens processed',   time:'2s ago'   },
  { type:'warn',    symbol:'⚠', msg:'GPU #3 temperature at 84°C — throttling',     time:'15s ago'  },
  { type:'success', symbol:'✓', msg:'Dataset "ImageNet-X" ingested (1.4 TB)',       time:'1m ago'   },
  { type:'info',    symbol:'↺', msg:'Model checkpoint saved: v3.7.2',               time:'3m ago'   },
  { type:'success', symbol:'✓', msg:'A/B test concluded — NeonX-L wins +3.1%',     time:'7m ago'   },
  { type:'err',     symbol:'✗', msg:'Training job #47 OOM — retrying with fp16',   time:'12m ago'  },
  { type:'info',    symbol:'↑', msg:'New model pushed to registry: stable-v4',     time:'18m ago'  },
];

const NEW_ACTIVITIES = [
  { type:'success', symbol:'✓', msg:'Reward model training step 8,000 ✓',            time:'just now' },
  { type:'info',    symbol:'⚡', msg:'Streaming inference: 850 req/s peak',           time:'just now' },
  { type:'warn',    symbol:'⚠', msg:'VRAM usage > 90% on node-07',                   time:'just now' },
  { type:'success', symbol:'✓', msg:'Synthetic data batch #9 generated (200k rows)', time:'just now' },
  { type:'info',    symbol:'↺', msg:'Hyperparameter sweep iteration 230/500',         time:'just now' },
];

const listEl = document.getElementById('activityList');

function prependActivity(a) {
  const li = document.createElement('li');
  li.className = 'activity-item';
  li.innerHTML = `
    <div class="activity-icon ${a.type}">${a.symbol}</div>
    <div class="activity-body">
      <div class="activity-msg">${a.msg}</div>
      <div class="activity-time">${a.time}</div>
    </div>
  `;
  listEl.prepend(li);
  if (listEl.children.length > 10) listEl.lastElementChild.remove();
}

ACTIVITIES.slice().reverse().forEach(prependActivity);

let actIdx = 0;
setInterval(() => {
  prependActivity(NEW_ACTIVITIES[actIdx % NEW_ACTIVITIES.length]);
  actIdx++;
}, 4200);

/* =====================================================
   SYSTEM MONITOR – live ticker
   ===================================================== */
function setSys(barId, pctId, value, suffix = '%') {
  document.getElementById(barId).style.width = value + '%';
  document.getElementById(pctId).textContent = value + suffix;
}

function drift(v, min, max, delta = 5) {
  return Math.min(max, Math.max(min, Math.round(v + (Math.random()-0.5)*delta*2)));
}

let sys = { gpu:82, cpu:57, ram:43, temp:68, net:35 };

setInterval(() => {
  sys.gpu  = drift(sys.gpu,  40, 95);
  sys.cpu  = drift(sys.cpu,  20, 90);
  sys.ram  = drift(sys.ram,  25, 80);
  sys.temp = drift(sys.temp, 55, 88);
  sys.net  = drift(sys.net,  10, 80);
  setSys('gpuBar',  'gpuPct',  sys.gpu);
  setSys('cpuBar',  'cpuPct',  sys.cpu);
  setSys('ramBar',  'ramPct',  sys.ram);
  setSys('tempBar', 'tempPct', sys.temp, '°C');
  setSys('netBar',  'netPct',  sys.net);
}, 2000);

/* TFLOPS ticker */
let tflops = 1452;
setInterval(() => {
  tflops += Math.round((Math.random()-0.4)*30);
  document.getElementById('tflopsVal').textContent = tflops.toLocaleString();
}, 1500);

/* =====================================================
   KPI LIVE TICKERS
   ===================================================== */
let accuracy = 98.4;
setInterval(() => {
  accuracy = Math.min(99.9, Math.max(95, accuracy + (Math.random()-0.48)*0.3));
  document.getElementById('kpiAccuracy').textContent = accuracy.toFixed(1) + '%';
}, 3000);

let speed = 3.7;
setInterval(() => {
  speed = Math.min(6, Math.max(1.5, speed + (Math.random()-0.48)*0.2));
  document.getElementById('kpiSpeed').textContent = speed.toFixed(1) + ' it/s';
}, 2500);

let dataVol = 2.8;
setInterval(() => {
  dataVol += Math.random() * 0.02;
  document.getElementById('kpiData').textContent = dataVol.toFixed(1) + ' TB';
}, 1800);

/* =====================================================
   TOP MODELS LIST
   ===================================================== */
const MODELS = [
  { name:'NeonX-Ultra',   type:'Transformer LLM', acc:'99.1%', tasks:'4.2k/day', color: C.cyan,   sym:'🤖' },
  { name:'VisionPro-8B',  type:'Vision Encoder',  acc:'97.8%', tasks:'2.1k/day', color: C.purple, sym:'👁' },
  { name:'DiffuseX-v3',   type:'Diffusion Model', acc:'96.5%', tasks:'890/day',  color: C.pink,   sym:'🎨' },
  { name:'RewardRL-4',    type:'RL Agent',         acc:'95.2%', tasks:'1.3k/day', color: C.green,  sym:'🏆' },
  { name:'AudioSynth-2B', type:'Audio Generator',  acc:'94.7%', tasks:'620/day',  color: C.orange, sym:'🎵' },
];

const modelListEl = document.getElementById('modelList');
MODELS.forEach(m => {
  const el = document.createElement('div');
  el.className = 'model-item';
  el.innerHTML = `
    <div class="model-avatar" style="background:${hexAlpha(m.color,0.14)};color:${m.color};
      text-shadow:0 0 8px ${m.color};font-size:1.2rem">${m.sym}</div>
    <div class="model-details">
      <div class="model-name">${m.name}</div>
      <div class="model-type">${m.type}</div>
    </div>
    <div class="model-stat">
      <div class="model-acc" style="color:${m.color};text-shadow:0 0 8px ${m.color}">${m.acc}</div>
      <div class="model-tasks">${m.tasks}</div>
    </div>
  `;
  modelListEl.appendChild(el);
});

/* =====================================================
   PARTICLE BACKGROUND
   ===================================================== */
const bgCanvas = document.getElementById('bgCanvas');
const bgCtx    = bgCanvas.getContext('2d');
const NEON_COLS = [C.cyan, C.purple, C.pink, C.green];
let W, H, particles;

function initParticles() {
  W = bgCanvas.width  = window.innerWidth;
  H = bgCanvas.height = window.innerHeight;
  particles = Array.from({length:55}, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.4 + 0.4,
    vx: (Math.random()-0.5) * 0.22,
    vy: (Math.random()-0.5) * 0.22,
    col: NEON_COLS[Math.floor(Math.random()*NEON_COLS.length)],
    alpha: Math.random() * 0.45 + 0.15,
  }));
}

function drawParticles() {
  bgCtx.clearRect(0, 0, W, H);

  /* Connecting lines */
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const d  = Math.sqrt(dx*dx + dy*dy);
      if (d < 120) {
        bgCtx.beginPath();
        bgCtx.moveTo(particles[i].x, particles[i].y);
        bgCtx.lineTo(particles[j].x, particles[j].y);
        bgCtx.strokeStyle = particles[i].col;
        bgCtx.globalAlpha = (1 - d/120) * 0.12;
        bgCtx.lineWidth   = 0.7;
        bgCtx.stroke();
      }
    }
  }

  /* Dots */
  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
    if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
    bgCtx.beginPath();
    bgCtx.arc(p.x, p.y, p.r, 0, Math.PI*2);
    bgCtx.fillStyle   = p.col;
    bgCtx.globalAlpha = p.alpha;
    bgCtx.shadowBlur  = 7;
    bgCtx.shadowColor = p.col;
    bgCtx.fill();
    bgCtx.shadowBlur  = 0;
    bgCtx.globalAlpha = 1;
  });

  requestAnimationFrame(drawParticles);
}

initParticles();
drawParticles();
window.addEventListener('resize', initParticles);
