(function () {

    // Desativa em mobile/touch
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;

  var cv  = document.getElementById('robot-canvas');
  var ctx = cv.getContext('2d');

  var W, H;
  function resize() {
  
    W = cv.width  = window.innerWidth;
    H = cv.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  /* ── State ── */
  var mx = -999, my = -999;
  var rx, ry;
  var vx = 0, vy = 0;
  var angle = 0, targetAngle = 0;
  var moved = false;
  var frame = 0;
  var walkPhase = 0;
  var speed = 0;

  var trail = [];

  window.addEventListener('mousemove', function (e) {
    mx = e.clientX;
    my = e.clientY;
    if (!moved) {
      moved = true;
      rx = mx; ry = my;
    }
  });

  /* ── Helpers ── */
  function lerpAngle(a, b, t) {
    var d = b - a;
    while (d >  Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  }

  function legIK(bx, by, tx, ty, l1, l2) {
    var dx   = tx - bx, dy = ty - by;
    var dist = Math.min(Math.sqrt(dx*dx + dy*dy), l1 + l2 - 0.1);
    var cosA2 = (l1*l1 + l2*l2 - dist*dist) / (2*l1*l2);
    var a2    = Math.acos(Math.max(-1, Math.min(1, cosA2)));
    var cosA1 = (l1*l1 + dist*dist - l2*l2) / (2*l1*dist);
    var a1    = Math.atan2(dy, dx) - Math.acos(Math.max(-1, Math.min(1, cosA1)));
    var midX  = bx + Math.cos(a1) * l1;
    var midY  = by + Math.sin(a1) * l1;
    var endX  = midX + Math.cos(a1 + Math.PI - a2) * l2;
    var endY  = midY + Math.sin(a1 + Math.PI - a2) * l2;
    return { mid: {x:midX,y:midY}, end: {x:endX,y:endY} };
  }

  /* ── Trail ── */
  function updateTrail() {
    if (!moved) return;
    if (frame % 2 === 0) {
      trail.push({x: rx, y: ry});
      if (trail.length > 60) trail.shift();
    }
  }

  function drawTrail() {
    if (trail.length < 2) return;
    for (var i = 1; i < trail.length; i++) {
      var a = (i / trail.length) * 0.22;
      ctx.beginPath();
      ctx.moveTo(trail[i-1].x, trail[i-1].y);
      ctx.lineTo(trail[i].x, trail[i].y);
      ctx.strokeStyle = 'rgba(74,143,212,' + a + ')';
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }
    for (var j = 6; j < trail.length; j += 9) {
      var b = (j / trail.length) * 0.5;
      ctx.beginPath();
      ctx.arc(trail[j].x, trail[j].y, 1.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(74,143,212,' + b + ')';
      ctx.fill();
    }
  }

  /* ── Reticle ── */
  function drawReticle() {
    if (!moved) return;
    var r1 = 16, r2 = 24;
    var t  = frame * 0.028;
    ctx.save();
    ctx.translate(mx, my);

    ctx.rotate(t);
    ctx.strokeStyle = 'rgba(122,179,232,0.5)';
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(0,0,r1,0,Math.PI*2); ctx.stroke();

    ctx.rotate(-t*2);
    ctx.setLineDash([3,5]);
    ctx.strokeStyle = 'rgba(74,143,212,0.3)';
    ctx.beginPath(); ctx.arc(0,0,r2,0,Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);

    [0, Math.PI/2, Math.PI, Math.PI*3/2].forEach(function(a) {
      ctx.beginPath();
      ctx.moveTo(Math.cos(a)*(r1+2), Math.sin(a)*(r1+2));
      ctx.lineTo(Math.cos(a)*(r1+8), Math.sin(a)*(r1+8));
      ctx.strokeStyle = 'rgba(122,179,232,0.55)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    ctx.restore();
  }

  /* ── Robot ── */
  function drawRobot(cx, cy, ang, wp, spd) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);

    var C  = '#7ab3e8';
    var CB = '#4a8fd4';
    var CY = '#e8d97a';
    var CD = '#0b1120';
    var alive = spd > 0.5;

    var legDefs = [
      { bx: -8,  by: -10, tx: -34, ty: -30, phase: 0 },
      { bx: -10, by:  -4, tx: -36, ty: -12, phase: Math.PI*0.50 },
      { bx: -10, by:   4, tx: -36, ty:  12, phase: Math.PI      },
      { bx:  -8, by:  10, tx: -34, ty:  30, phase: Math.PI*1.50 },
      { bx:   8, by: -10, tx:  34, ty: -30, phase: Math.PI*0.25 },
      { bx:  10, by:  -4, tx:  36, ty: -12, phase: Math.PI*0.75 },
      { bx:  10, by:   4, tx:  36, ty:  12, phase: Math.PI*1.25 },
      { bx:   8, by:  10, tx:  34, ty:  30, phase: Math.PI*1.75 },
    ];

    legDefs.forEach(function(leg) {
      var bounce = Math.sin(wp + leg.phase) * (alive ? 5 : 0);
      var tx = leg.tx + Math.cos(leg.phase) * bounce;
      var ty = leg.ty + Math.sin(leg.phase) * bounce;
      var isStep = Math.sin(wp + leg.phase) > 0.6;
      try {
        var ik = legIK(leg.bx, leg.by, tx, ty, 17, 19);

        ctx.beginPath();
        ctx.moveTo(leg.bx, leg.by); ctx.lineTo(ik.mid.x, ik.mid.y);
        ctx.strokeStyle = isStep ? CB : C;
        ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.stroke();

        ctx.beginPath(); ctx.arc(ik.mid.x, ik.mid.y, 2.5, 0, Math.PI*2);
        ctx.fillStyle = isStep ? CY : CB; ctx.fill();

        ctx.beginPath();
        ctx.moveTo(ik.mid.x, ik.mid.y); ctx.lineTo(ik.end.x, ik.end.y);
        ctx.strokeStyle = isStep ? C : CB;
        ctx.lineWidth = 1.6; ctx.stroke();

        ctx.beginPath(); ctx.arc(ik.end.x, ik.end.y, 2, 0, Math.PI*2);
        ctx.fillStyle = isStep ? CY : C; ctx.fill();

        if (isStep) {
          ctx.beginPath(); ctx.arc(ik.end.x, ik.end.y, 5.5, 0, Math.PI*2);
          ctx.fillStyle = 'rgba(122,179,232,0.12)'; ctx.fill();
        }
      } catch(_) {}
    });

    /* Abdomen */
    ctx.save(); ctx.translate(0, 13);
    ctx.beginPath();
    for (var i = 0; i < 6; i++) {
      var a = (Math.PI/3)*i - Math.PI/6;
      var r = i%2===0 ? 14 : 12;
      if (i===0) ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r);
      else       ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
    }
    ctx.closePath();
    ctx.fillStyle = '#0b1120'; ctx.fill();
    ctx.strokeStyle = CB; ctx.lineWidth = 1; ctx.stroke();

    ctx.strokeStyle = 'rgba(74,143,212,0.3)'; ctx.lineWidth = 0.6;
    [[-7,0,7,0],[-5,-5,5,-5],[0,-7,0,7]].forEach(function(l){
      ctx.beginPath(); ctx.moveTo(l[0],l[1]); ctx.lineTo(l[2],l[3]); ctx.stroke();
    });
    [[-7,0],[-5,-5],[5,-5],[0,7]].forEach(function(p){
      ctx.beginPath(); ctx.arc(p[0],p[1],1.2,0,Math.PI*2);
      ctx.fillStyle = C; ctx.fill();
    });

    var blink = Math.sin(frame * 0.09) > 0;
    ctx.beginPath(); ctx.arc(0, 5, 2.5, 0, Math.PI*2);
    ctx.fillStyle = alive ? (blink ? CY : '#665800') : CD; ctx.fill();
    ctx.restore();

    /* Waist */
    ctx.beginPath();
    ctx.moveTo(-6,4); ctx.lineTo(6,4);
    ctx.moveTo(-6,-4); ctx.lineTo(6,-4);
    ctx.strokeStyle = CB; ctx.lineWidth = 1; ctx.stroke();

    /* Cephalothorax */
    ctx.save(); ctx.translate(0,-9);
    ctx.beginPath();
    ctx.moveTo(-10,6); ctx.lineTo(10,6); ctx.lineTo(8,-6); ctx.lineTo(-8,-6);
    ctx.closePath();
    ctx.fillStyle = '#0b1120'; ctx.fill();
    ctx.strokeStyle = CB; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = 'rgba(74,143,212,0.2)'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(-8,-2); ctx.lineTo(8,-2); ctx.stroke();
    ctx.restore();

    /* Head */
    ctx.save(); ctx.translate(0,-23);

    ctx.beginPath(); ctx.roundRect(-10,-8,20,16,3);
    ctx.fillStyle = '#0b1120'; ctx.fill();
    ctx.strokeStyle = CB; ctx.lineWidth = 1; ctx.stroke();

    ctx.beginPath(); ctx.roundRect(-7,-4,14,8,2);
    ctx.fillStyle = alive ? 'rgba(74,143,212,0.82)' : 'rgba(20,40,70,0.8)';
    ctx.fill(); ctx.strokeStyle = C; ctx.lineWidth = 0.5; ctx.stroke();

    var vs = ((frame * 0.5) % 8) - 4;
    ctx.beginPath(); ctx.rect(-7,-4+vs,14,1.2);
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill();

    if (moved) {
      var wdx = mx - cx, wdy = my - cy;
      var lx  = Math.cos(-ang)*wdx - Math.sin(-ang)*wdy;
      var ly  = Math.sin(-ang)*wdx + Math.cos(-ang)*wdy;
      var pa  = Math.atan2(ly-(-23), lx);
      var px  = Math.max(-4, Math.min(4,   Math.cos(pa)*3.5));
      var py  = Math.max(-2.5, Math.min(2.5, Math.sin(pa)*3.5));
      ctx.beginPath(); ctx.arc(px,py,2.4,0,Math.PI*2);
      ctx.fillStyle = 'white'; ctx.fill();
      ctx.beginPath(); ctx.arc(px,py,1.1,0,Math.PI*2);
      ctx.fillStyle = '#7ab3e8'; ctx.fill();
    }

    [[-10,0],[10,0]].forEach(function(p){
      ctx.beginPath(); ctx.arc(p[0],p[1],1.5,0,Math.PI*2);
      ctx.fillStyle = alive ? CY : CD; ctx.fill();
    });

    ctx.strokeStyle = CB; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-3,-8); ctx.lineTo(-5,-17); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(3,-8);  ctx.lineTo(5,-17);  ctx.stroke();

    ctx.beginPath(); ctx.arc(-5,-17,2,0,Math.PI*2);
    ctx.fillStyle = Math.sin(frame*0.14)>0 ? CY : CD; ctx.fill();
    ctx.beginPath(); ctx.arc(5,-17,2,0,Math.PI*2);
    ctx.fillStyle = Math.sin(frame*0.14+Math.PI)>0 ? CY : CD; ctx.fill();

    ctx.restore();

    /* Glow */
    if (alive) {
      var grd = ctx.createRadialGradient(0,0,6,0,0,40);
      grd.addColorStop(0,'rgba(74,143,212,0.07)');
      grd.addColorStop(1,'rgba(74,143,212,0)');
      ctx.beginPath(); ctx.arc(0,0,40,0,Math.PI*2);
      ctx.fillStyle = grd; ctx.fill();
    }

    ctx.restore();
  }

  /* ── Grid + Scanline overlay (transparent bg) ── */
  function drawOverlay() {
    /* Subtle grid */
    ctx.strokeStyle = 'rgba(74,143,212,0.04)';
    ctx.lineWidth = 0.5;
    var gs = 44;
    for (var x = 0; x < W; x += gs) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (var y = 0; y < H; y += gs) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    /* Scanline — white/blue glowing line descending */
    var sl = (frame * 1.4) % (H + 80) - 40;

    /* Core bright line */
    var lineGrad = ctx.createLinearGradient(0, sl - 1, 0, sl + 1);
    lineGrad.addColorStop(0,   'rgba(255,255,255,0)');
    lineGrad.addColorStop(0.5, 'rgba(200,225,255,0.18)');
    lineGrad.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.fillStyle = lineGrad;
    ctx.fillRect(0, sl - 1, W, 2);

    /* Soft glow halo around the line */
    var haloGrad = ctx.createLinearGradient(0, sl - 32, 0, sl + 32);
    haloGrad.addColorStop(0,   'rgba(74,143,212,0)');
    haloGrad.addColorStop(0.5, 'rgba(74,143,212,0.045)');
    haloGrad.addColorStop(1,   'rgba(74,143,212,0)');
    ctx.fillStyle = haloGrad;
    ctx.fillRect(0, sl - 32, W, 64);
  }

  /* ── Loop ── */
  function tick() {
    frame++;

    if (moved) {
      var dx = mx - rx, dy = my - ry;
      vx += dx * 0.06; vy += dy * 0.06;
      vx *= 0.72;      vy *= 0.72;
      rx += vx;        ry += vy;

      speed = Math.sqrt(vx*vx + vy*vy);
      walkPhase += speed * 0.14;

      var dist = Math.sqrt(dx*dx + dy*dy);
      if (dist > 3) targetAngle = Math.atan2(dy, dx) + Math.PI/2;
      angle = lerpAngle(angle, targetAngle, 0.1);
    }

    /* Clear — transparent canvas, page content shows through */
    ctx.clearRect(0, 0, W, H);

    drawOverlay();
    updateTrail();
    drawTrail();
    drawReticle();
    if (moved) drawRobot(rx, ry, angle, walkPhase, speed);

    requestAnimationFrame(tick);
  }

  tick();

})();
