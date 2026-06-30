const section  = document.getElementById('drag-section');
const ball     = document.getElementById('ball');
const canvas   = document.getElementById('cable-canvas');
const ctx      = canvas.getContext('2d');
const hint     = document.getElementById('drag-hint');
const flash    = document.getElementById('connected-flash');
const content  = document.getElementById('content');
const endZone  = document.getElementById('end-zone');

let dragging  = false;
let completed = false;
let ballX, ballY;
let W, H;

/* ── Rede de fundo (decorativa) ── */
const NUM_NODES = 60;
let nodes = [];
let connections = [];

/* ── Caminho principal (a bolinha só anda nele) ── */
const PATH_POINTS = 9;
let pathNodes = [];     // posições base do caminho
let pathProgress = 0;   // 0 a 1 — posição da bolinha ao longo do caminho

function resize() {
  W = canvas.width  = section.offsetWidth;
  H = canvas.height = section.offsetHeight;
  initNetwork();
  initPath();
  placeBall();
}

/* Rede decorativa de fundo */
function initNetwork() {
  nodes = [];
  for (let i = 0; i < NUM_NODES; i++) {
    const z = Math.random();
    const depthBias = Math.pow(z, 1.6);
    nodes.push({
      baseX: Math.random() * W,
      baseY: H * (0.1 + depthBias * 0.8) + (Math.random() - 0.5) * 60,
      z,
      r: 1.3 + z * 3,
      phase: Math.random() * Math.PI * 2,
      speed: 0.15 + Math.random() * 0.25,
      driftX: (Math.random() - 0.5) * 14,
      driftY: (Math.random() - 0.5) * 14,
    });
  }

  connections = [];
  nodes.forEach((n, i) => {
    const dists = nodes
      .map((m, j) => ({ j, d: i === j ? Infinity : Math.hypot(n.baseX - m.baseX, n.baseY - m.baseY) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 2 + Math.floor(Math.random() * 2));
    dists.forEach(({ j, d }) => {
      if (d < 240) connections.push([i, j]);
    });
  });
}

/* Caminho orgânico do topo até o fim — leve serpenteio aleatório */
function initPath() {
  pathNodes = [];
  for (let i = 0; i < PATH_POINTS; i++) {
    const t = i / (PATH_POINTS - 1);
    const wiggle = (Math.random() - 0.5) * W * 0.32;
    pathNodes.push({
      baseX: W / 2 + wiggle * (i === 0 || i === PATH_POINTS - 1 ? 0.2 : 1),
      baseY: t * H,
      phase: Math.random() * Math.PI * 2,
      driftX: (Math.random() - 0.5) * 10,
      driftY: (Math.random() - 0.5) * 6,
    });
  }
  pathNodes[0].baseX = W / 2;
  pathNodes[0].baseY = 70;
}

function placeBall() {
  pathProgress = 0;
  const pos = getPathPosition(0);
  ballX = pos.x;
  ballY = pos.y;
  ball.style.left = ballX + 'px';
  ball.style.top  = ballY + 'px';
}

let t = 0;

/* Posições atuais animadas dos nós do caminho */
function getAnimatedPathNodes() {
  return pathNodes.map(n => ({
    x: n.baseX + Math.sin(t * 0.6 + n.phase) * n.driftX,
    y: n.baseY + Math.cos(t * 0.6 + n.phase) * n.driftY,
  }));
}

/* Dado um progresso 0..1, retorna a posição interpolada ao longo do caminho */
function getPathPosition(progress) {
  const pts = getAnimatedPathNodes();
  const seg = progress * (pts.length - 1);
  const i = Math.min(pts.length - 2, Math.floor(seg));
  const localT = seg - i;
  const a = pts[i], b = pts[i + 1];
  return {
    x: a.x + (b.x - a.x) * localT,
    y: a.y + (b.y - a.y) * localT,
  };
}

/* Projeta um ponto (x,y) no caminho e retorna o progresso 0..1 mais próximo */
function projectToPath(x, y) {
  const pts = getAnimatedPathNodes();
  let best = { dist: Infinity, progress: 0 };
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy || 1;
    let lt = ((x - a.x) * dx + (y - a.y) * dy) / lenSq;
    lt = Math.max(0, Math.min(1, lt));
    const px = a.x + dx * lt, py = a.y + dy * lt;
    const dist = Math.hypot(x - px, y - py);
    if (dist < best.dist) {
      best = { dist, progress: (i + lt) / (pts.length - 1) };
    }
  }
  return best.progress;
}

function drawNetwork(bx, by) {
  t += 0.012;
  ctx.clearRect(0, 0, W, H);

  /* Rede de fundo decorativa */
  const positions = nodes.map(n => {
    const x = n.baseX + Math.sin(t * n.speed + n.phase) * n.driftX;
    const y = n.baseY + Math.cos(t * n.speed + n.phase) * n.driftY;
    return { x, y, z: n.z, r: n.r };
  });

  connections.forEach(([i, j]) => {
    const a = positions[i], b = positions[j];
    const avgZ = (a.z + b.z) / 2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = `rgba(122,179,232,${0.04 + avgZ * 0.14})`;
    ctx.lineWidth = 0.5 + avgZ * 0.8;
    ctx.stroke();
  });

  positions.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(232,237,245,${0.15 + p.z * 0.4})`;
    ctx.fill();
  });

  /* Caminho principal — destacado */
  const pathPts = getAnimatedPathNodes();
  for (let i = 0; i < pathPts.length - 1; i++) {
    const a = pathPts[i], b = pathPts[i + 1];
    const segProgress = i / (pathPts.length - 1);
    const traveled = segProgress <= pathProgress;

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = traveled
      ? 'rgba(122,179,232,0.85)'
      : 'rgba(122,179,232,0.28)';
    ctx.lineWidth = traveled ? 2.4 : 1.4;
    ctx.shadowColor = 'rgba(122,179,232,0.6)';
    ctx.shadowBlur  = traveled ? 8 : 0;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  pathPts.forEach((p, i) => {
    const segProgress = i / (pathPts.length - 1);
    const traveled = segProgress <= pathProgress;
    ctx.beginPath();
    ctx.arc(p.x, p.y, traveled ? 4 : 3, 0, Math.PI * 2);
    ctx.fillStyle = traveled ? 'rgba(232,237,245,0.95)' : 'rgba(122,179,232,0.5)';
    ctx.fill();
    if (traveled) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(122,179,232,0.18)';
      ctx.fill();
    }
  });
}

function moveBall(x, y) {
  const rect = section.getBoundingClientRect();
  const localX = x - rect.left;
  const localY = y - rect.top;

  // prende o progresso ao ponto mais próximo do caminho
  pathProgress = projectToPath(localX, localY);
  const pos = getPathPosition(pathProgress);
  ballX = pos.x;
  ballY = pos.y;
  ball.style.left = ballX + 'px';
  ball.style.top  = ballY + 'px';

  if (pathProgress >= 0.985 && !completed) triggerConnected();
}

function triggerConnected() {
  completed = true;
  dragging  = false;

  flash.classList.add('active');
  setTimeout(() => flash.classList.remove('active'), 300);

  setTimeout(() => {
    // a bolinha conclui sua função e some suavemente
    ball.style.transition = 'opacity 0.6s ease';
    ball.style.opacity    = '0';
    ball.style.pointerEvents = 'none';

    // a seção da rede permanece visível e animando — só o conteúdo é revelado abaixo
    content.classList.add('fade-in');
  }, 500);
}

function loop() {
  drawNetwork(ballX, ballY);
  requestAnimationFrame(loop);
}

// Mouse
ball.addEventListener('mousedown', e => {
  if (!completed) { dragging = true; hint.style.opacity = '0'; e.preventDefault(); }
});
window.addEventListener('mousemove', e => { if (dragging) moveBall(e.clientX, e.clientY); });
window.addEventListener('mouseup',   () => { dragging = false; });

// Touch
ball.addEventListener('touchstart', e => {
  if (!completed) { dragging = true; hint.style.opacity = '0'; e.preventDefault(); }
}, { passive: false });
window.addEventListener('touchmove', e => {
  if (dragging) { const tt = e.touches[0]; moveBall(tt.clientX, tt.clientY); e.preventDefault(); }
}, { passive: false });
window.addEventListener('touchend', () => { dragging = false; });

// Nav scroll
window.addEventListener('scroll', () => {
  document.getElementById('nav').classList.toggle('scrolled', window.scrollY > 50);
});

window.addEventListener('resize', resize);
resize();
loop();
