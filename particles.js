(function () {

  // Desativa em mobile/touch
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;

  var cv = document.createElement('canvas');
  cv.id  = 'particles-canvas';

  // Canvas fica FIXO atrás de tudo via z-index negativo
  // O body precisa ter position:relative para o z-index negativo funcionar
  cv.style.position       = 'fixed';
  cv.style.top            = '0';
  cv.style.left           = '0';
  cv.style.width          = '100%';
  cv.style.height         = '100%';
  cv.style.pointerEvents  = 'none';
  cv.style.zIndex         = '0';

  // Insere como PRIMEIRO filho do body — atrás de tudo na ordem do DOM
  document.body.insertBefore(cv, document.body.firstChild);

  var ctx = cv.getContext('2d');
  var W, H;

  function resize() {
    W = cv.width  = window.innerWidth;
    H = cv.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', function () { resize(); spawn(); });

  var mx = W / 2, my = H / 2;
  window.addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; });

  var N = 120;
  var pts = [];

  function spawn() {
    pts = [];
    for (var i = 0; i < N; i++) {
      pts.push({
        x:  Math.random() * W,
        y:  Math.random() * H,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        r:  Math.random() * 1.6 + 0.5,
        c:  Math.random() < 0.07 ? [62,207,106] :
            Math.random() < 0.5  ? [74,143,212] : [122,179,232]
      });
    }
  }
  spawn();

  var CONN = 115, PULL = 130, FORCE = 0.010;

  function tick() {
    // Pinta fundo sólido — mesma cor do --bg do projeto
    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, W, H);

    // Grid sutil
    ctx.strokeStyle = 'rgba(74,143,212,0.04)';
    ctx.lineWidth = 0.5;
    for (var x = 0; x < W; x += 44) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (var y = 0; y < H; y += 44) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

    for (var i = 0; i < N; i++) {
      var p = pts[i];

      var dxm = mx - p.x, dym = my - p.y;
      var dm  = Math.sqrt(dxm*dxm + dym*dym);
      if (dm < PULL && dm > 1) { p.vx += (dxm/dm)*FORCE; p.vy += (dym/dm)*FORCE; }

      p.vx *= 0.98; p.vy *= 0.98;
      p.x  += p.vx; p.y  += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;

      for (var j = i+1; j < N; j++) {
        var q = pts[j];
        var dx = p.x-q.x, dy = p.y-q.y;
        var d  = Math.sqrt(dx*dx + dy*dy);
        if (d < CONN) {
          ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y);
          ctx.strokeStyle = 'rgba('+p.c+','+ (1-d/CONN)*0.3 +')';
          ctx.lineWidth = 0.65; ctx.stroke();
        }
      }

      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = 'rgba('+p.c+',0.8)'; ctx.fill();
    }

    requestAnimationFrame(tick);
  }

  tick();

})();
