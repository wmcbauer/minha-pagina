import { useEffect, useRef } from 'react';
import { useTheme } from '../lib/theme';

/**
 * Fundo vivo da abertura e da apresentação: uma placa de circuito discreta
 * (trilhas finas + pontos de grade) por onde correm pulsos de energia — a
 * mesma linguagem dos feixes que ligam os textos, só que ambiente, ao fundo.
 * Duas manchas de luz bem suaves derivam devagar e o conjunto acompanha o
 * mouse com um leve deslocamento (paralaxe), pra a tela nunca ficar parada.
 *
 * Canvas 2D, não three.js: é uma camada barata. As trilhas e a grade são
 * desenhadas UMA vez num canvas fora da tela (só refeito ao redimensionar ou
 * trocar o tema); a cada frame só entram as manchas e os pulsos. Para de
 * desenhar quando o contêiner está escondido (a câmera já foi pras telas 3D)
 * ou a aba está em segundo plano. Com "reduzir movimento", fica o quadro
 * estático, sem pulsos.
 */

interface Ponto { x: number; y: number }
interface Trilha { pts: Ponto[]; acum: number[]; total: number }
interface Pulso { trilha: Trilha; pos: number; vel: number; espera: number }

const CELULA = 44;
const CAUDA = 140;

function lerCor(nome: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(nome).trim() || '143, 195, 240';
}

/** trilha em "L" e "Z" de placa de circuito: segmentos retos que alternam
 * horizontal e vertical, às vezes com um trecho a 45°, presos à grade */
function criarTrilha(larg: number, alt: number): Trilha {
  const cols = Math.ceil(larg / CELULA);
  const lins = Math.ceil(alt / CELULA);
  let x = Math.floor(Math.random() * cols) * CELULA;
  let y = Math.floor(Math.random() * lins) * CELULA;
  const pts: Ponto[] = [{ x, y }];
  let horizontal = Math.random() < 0.5;
  const trechos = 3 + Math.floor(Math.random() * 4);
  for (let i = 0; i < trechos; i += 1) {
    const passos = (2 + Math.floor(Math.random() * 5)) * CELULA;
    const sinal = Math.random() < 0.5 ? -1 : 1;
    if (Math.random() < 0.22) {
      const sinal2 = Math.random() < 0.5 ? -1 : 1;
      const p = passos * 0.6;
      x += sinal * p;
      y += sinal2 * p;
    } else if (horizontal) {
      x += sinal * passos;
    } else {
      y += sinal * passos;
    }
    horizontal = !horizontal;
    pts.push({ x, y });
  }
  const acum = [0];
  for (let i = 1; i < pts.length; i += 1) {
    acum.push(acum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }
  return { pts, acum, total: acum[acum.length - 1] };
}

function pontoEm(t: Trilha, dist: number): Ponto {
  const d = Math.max(0, Math.min(t.total, dist));
  let i = 1;
  while (i < t.acum.length - 1 && t.acum[i] < d) i += 1;
  const a = t.pts[i - 1];
  const b = t.pts[i];
  const seg = t.acum[i] - t.acum[i - 1] || 1;
  const f = (d - t.acum[i - 1]) / seg;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

export default function FundoVivo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tema = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const claro = tema === 'light';
    const corAcento = lerCor('--accent-rgb');
    const corFunda = lerCor('--accent-deep-rgb');
    const corFundo = lerCor('--bg-rgb');
    // no claro o desenho é escuro sobre fundo claro: somar luz ('lighter')
    // estouraria pra branco, então ali os pulsos vão em cima, normal
    const modoLuz: GlobalCompositeOperation = claro ? 'source-over' : 'lighter';
    const forcaTrilha = claro ? 0.11 : 0.075;

    const estatico = document.createElement('canvas');
    let larg = 0;
    let alt = 0;
    let dpr = 1;
    let trilhas: Trilha[] = [];
    let pulsos: Pulso[] = [];
    const MARGEM = 24; // sobra pra paralaxe não mostrar a borda

    const novoPulso = (atraso: number): Pulso => ({
      trilha: trilhas[Math.floor(Math.random() * trilhas.length)],
      pos: 0,
      vel: 160 + Math.random() * 200,
      espera: atraso,
    });

    // No celular o desenho vai em densidade 1 e a 30 quadros por segundo: é
    // fundo ambiente, discreto e de movimento lento (os pulsos andam por
    // tempo, não por quadro, então a velocidade é a mesma), e pintar a tela
    // cheia 60 vezes por segundo disputava a CPU com o resto da abertura.
    const leve = window.matchMedia('(max-width: 1024px), (pointer: coarse)').matches;
    const INTERVALO_MIN_MS = leve ? 1000 / 30 - 2 : 0;

    const montar = () => {
      dpr = leve ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
      larg = window.innerWidth;
      alt = window.innerHeight;
      canvas.width = Math.round(larg * dpr);
      canvas.height = Math.round(alt * dpr);
      estatico.width = Math.round((larg + MARGEM * 2) * dpr);
      estatico.height = Math.round((alt + MARGEM * 2) * dpr);

      const qtd = Math.max(10, Math.round((larg * alt) / 52000));
      trilhas = Array.from({ length: qtd }, () => criarTrilha(larg + MARGEM * 2, alt + MARGEM * 2));

      const e = estatico.getContext('2d');
      if (!e) return;
      e.setTransform(dpr, 0, 0, dpr, 0, 0);
      e.clearRect(0, 0, larg + MARGEM * 2, alt + MARGEM * 2);
      // grade de pontos
      e.fillStyle = `rgba(${corAcento}, ${claro ? 0.14 : 0.1})`;
      for (let gx = 0; gx <= larg + MARGEM * 2; gx += CELULA) {
        for (let gy = 0; gy <= alt + MARGEM * 2; gy += CELULA) {
          e.fillRect(gx - 0.75, gy - 0.75, 1.5, 1.5);
        }
      }
      // trilhas + "solda" nas pontas
      e.lineWidth = 1;
      e.lineJoin = 'round';
      e.strokeStyle = `rgba(${corAcento}, ${forcaTrilha})`;
      trilhas.forEach((t) => {
        e.beginPath();
        t.pts.forEach((p, i) => (i ? e.lineTo(p.x, p.y) : e.moveTo(p.x, p.y)));
        e.stroke();
        const fim = t.pts[t.pts.length - 1];
        [t.pts[0], fim].forEach((p) => {
          e.beginPath();
          e.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
          e.stroke();
        });
      });

      pulsos = Array.from({ length: Math.max(5, Math.round(qtd * 0.45)) }, () => novoPulso(Math.random() * 3));
    };

    const alvoMouse = { x: 0, y: 0 };
    const mouse = { x: 0, y: 0 };
    const aoMover = (ev: PointerEvent) => {
      alvoMouse.x = (ev.clientX / window.innerWidth - 0.5) * 2;
      alvoMouse.y = (ev.clientY / window.innerHeight - 0.5) * 2;
    };

    const desenhar = (tempo: number, dt: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgb(${corFundo})`;
      ctx.fillRect(0, 0, larg, alt);

      mouse.x += (alvoMouse.x - mouse.x) * 0.05;
      mouse.y += (alvoMouse.y - mouse.y) * 0.05;
      const ox = -MARGEM - mouse.x * 14;
      const oy = -MARGEM - mouse.y * 10;

      // duas manchas de luz derivando devagar
      const s = tempo / 1000;
      const manchas = [
        { x: larg * (0.3 + 0.12 * Math.sin(s * 0.11)), y: alt * (0.35 + 0.1 * Math.cos(s * 0.09)), r: Math.max(larg, alt) * 0.55, a: claro ? 0.07 : 0.1 },
        { x: larg * (0.72 + 0.1 * Math.cos(s * 0.07)), y: alt * (0.68 + 0.12 * Math.sin(s * 0.08)), r: Math.max(larg, alt) * 0.45, a: claro ? 0.05 : 0.07 },
      ];
      manchas.forEach((m) => {
        const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r);
        g.addColorStop(0, `rgba(${corFunda}, ${m.a})`);
        g.addColorStop(1, `rgba(${corFunda}, 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, larg, alt);
      });

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(estatico, ox * dpr, oy * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (reduzido) return;

      ctx.globalCompositeOperation = modoLuz;
      ctx.lineCap = 'round';
      pulsos.forEach((p, idx) => {
        if (p.espera > 0) {
          p.espera -= dt;
          return;
        }
        p.pos += p.vel * dt;
        const t = p.trilha;
        // cauda em degraus de opacidade: barato e lê como gradiente
        const PASSOS = 8;
        ctx.lineWidth = 1.6;
        for (let k = 0; k < PASSOS; k += 1) {
          const d0 = p.pos - CAUDA * (1 - k / PASSOS);
          const d1 = p.pos - CAUDA * (1 - (k + 1) / PASSOS);
          if (d1 <= 0 || d0 >= t.total) continue;
          const a = pontoEm(t, d0);
          const b = pontoEm(t, d1);
          ctx.strokeStyle = `rgba(${corAcento}, ${((k + 1) / PASSOS) * 0.7})`;
          ctx.beginPath();
          ctx.moveTo(a.x + ox, a.y + oy);
          ctx.lineTo(b.x + ox, b.y + oy);
          ctx.stroke();
        }
        if (p.pos < t.total) {
          const c = pontoEm(t, p.pos);
          const g = ctx.createRadialGradient(c.x + ox, c.y + oy, 0, c.x + ox, c.y + oy, 9);
          g.addColorStop(0, `rgba(${corAcento}, 0.95)`);
          g.addColorStop(1, `rgba(${corAcento}, 0)`);
          ctx.fillStyle = g;
          ctx.fillRect(c.x + ox - 9, c.y + oy - 9, 18, 18);
        } else if (p.pos - t.total < 260) {
          // chegou: a solda da ponta acende e apaga
          const fim = t.pts[t.pts.length - 1];
          const f = 1 - (p.pos - t.total) / 260;
          const g = ctx.createRadialGradient(fim.x + ox, fim.y + oy, 0, fim.x + ox, fim.y + oy, 16);
          g.addColorStop(0, `rgba(${corAcento}, ${0.7 * f})`);
          g.addColorStop(1, `rgba(${corAcento}, 0)`);
          ctx.fillStyle = g;
          ctx.fillRect(fim.x + ox - 16, fim.y + oy - 16, 32, 32);
        }
        if (p.pos - CAUDA > t.total + 260) pulsos[idx] = novoPulso(0.4 + Math.random() * 2.5);
      });
      ctx.globalCompositeOperation = 'source-over';
    };

    montar();
    let raf = 0;
    let ultimo = performance.now();
    const loop = (agora: number) => {
      raf = requestAnimationFrame(loop);
      if (agora - ultimo < INTERVALO_MIN_MS) return;
      const dt = Math.min(0.05, (agora - ultimo) / 1000);
      ultimo = agora;
      // o contêiner (.presentation) fica `visibility: hidden` quando a cena
      // já passou pras telas 3D — aí não há o que desenhar
      const pai = canvas.parentElement;
      if (document.hidden || (pai && pai.style.visibility === 'hidden')) return;
      desenhar(agora, dt);
    };

    let idRedim = 0;
    const aoRedimensionar = () => {
      window.clearTimeout(idRedim);
      idRedim = window.setTimeout(() => {
        montar();
        if (reduzido) desenhar(performance.now(), 0);
      }, 150);
    };

    window.addEventListener('resize', aoRedimensionar);
    if (reduzido) {
      desenhar(performance.now(), 0);
    } else {
      window.addEventListener('pointermove', aoMover, { passive: true });
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(idRedim);
      window.removeEventListener('resize', aoRedimensionar);
      window.removeEventListener('pointermove', aoMover);
    };
  }, [tema]);

  return <canvas ref={canvasRef} className="fundo-vivo" aria-hidden="true" />;
}
