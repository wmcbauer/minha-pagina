/**
 * Feixes de energia 2D (DOM): física do feixe reto e do curvo, projeção de
 * pontos 3D na tela e o brilho passageiro nos textos. O estilo é aplicado
 * direto nos elementos, a cada frame, fora do ciclo de render do React.
 */
import type { RefObject } from 'react';
import type * as THREE from 'three';
import { clamp01, lerp, pulse, ramp } from '../lib/math';

/** Ponto (x,y) em px, na tela, de uma borda específica do elemento. */
type Edge = 'top-center' | 'bottom-center' | 'left-center' | 'right-center' | 'top-left';
export function pointAt(el: HTMLElement | null, edge: Edge, fallback: { x: number; y: number }) {
  if (!el) return fallback;
  const r = el.getBoundingClientRect();
  switch (edge) {
    case 'top-center':
      return { x: r.left + r.width / 2, y: r.top };
    case 'bottom-center':
      return { x: r.left + r.width / 2, y: r.bottom };
    case 'left-center':
      return { x: r.left, y: r.top + r.height / 2 };
    case 'right-center':
      return { x: r.right, y: r.top + r.height / 2 };
    case 'top-left':
      return { x: r.left, y: r.top };
  }
}

interface BeamRefs {
  line: RefObject<HTMLDivElement>;
  core: RefObject<HTMLDivElement>;
  flash: RefObject<HTMLDivElement>;
}

/**
 * Física do feixe — a MESMA usada entre as telas 3D (DataTrail em
 * ChipScene.tsx): brilho com ruído elétrico e pulso de tamanho reagindo à
 * velocidade do scroll, não só à posição. Genérica o bastante pra qualquer
 * ângulo (vertical, horizontal, diagonal) — a linha nasce no ponto de
 * partida e cresce em direção ao ponto de chegada, girada pro ângulo certo.
 */
export function applyBeam(
  refs: BeamRefs,
  start: { x: number; y: number },
  end: { x: number; y: number },
  offset: number,
  windowStart: number,
  windowEnd: number,
  velocity: number,
  t: number,
  seed: number,
) {
  const range = windowEnd - windowStart;
  const rawT = range > 0 ? (offset - windowStart) / range : 0;
  const outsideSeg = Math.max(0, -rawT, rawT - 1);
  const segFactor = clamp01(1 - outsideSeg * 8);
  const activeVelocity = velocity * segFactor;

  const noise = Math.sin(t * 47 + seed) * Math.sin(t * 23 + seed * 0.4);
  const brightBoost = 1 + activeVelocity * 1.4 + Math.max(0, noise) * activeVelocity * 1.2;
  const sizePulse = 1 + Math.sin(t * 16 + seed * 0.25) * 0.22 * activeVelocity;

  const beamP = clamp01(rawT);
  const beamVisible = ramp(rawT, 0.15, 1, 1.15);
  const flashP = pulse(rawT, 0.82, 1, 1.7);
  // o feixe vai ficando mais fraco conforme viaja, até quase sumir — a
  // energia se dissipando ao longo do percurso, não só no destino
  const distanceFade = 1 - beamP * 0.9;

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dist = Math.hypot(dx, dy) || 1;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  // a linha cresce JUNTO com o ponto (não aparece inteira de cara), parando
  // um pouco antes da posição real dele — mesma lógica usada na borda dos
  // retângulos, pra nunca "correr na frente"
  const grown = Math.max(0, beamP * dist - 6);

  if (refs.line.current) {
    refs.line.current.style.left = `${start.x}px`;
    refs.line.current.style.top = `${start.y}px`;
    refs.line.current.style.width = `${grown}px`;
    refs.line.current.style.transform = `rotate(${angle}deg)`;
    // a cauda só brilha forte enquanto o scroll está se movendo de verdade
    refs.line.current.style.opacity = String(beamVisible * (0.25 + activeVelocity * 0.75) * distanceFade);
    refs.line.current.style.filter = `brightness(${brightBoost})`;
  }
  if (refs.core.current) {
    const cx = start.x + dx * beamP;
    const cy = start.y + dy * beamP;
    refs.core.current.style.left = `${cx}px`;
    refs.core.current.style.top = `${cy}px`;
    refs.core.current.style.opacity = String(beamVisible * distanceFade);
    refs.core.current.style.filter = `brightness(${brightBoost})`;
    refs.core.current.style.transform = `translate(-50%, -50%) scale(${sizePulse})`;
  }
  if (refs.flash.current) {
    refs.flash.current.style.left = `${end.x}px`;
    refs.flash.current.style.top = `${end.y}px`;
    refs.flash.current.style.opacity = String(flashP * 0.6);
    refs.flash.current.style.transform = `translate(-50%, -50%) scale(${0.6 + flashP * 0.7})`;
  }
  return flashP;
}

interface CurvedBeamRefs {
  path: RefObject<SVGPathElement>;
  core: RefObject<HTMLDivElement>;
  flash: RefObject<HTMLDivElement>;
  gradient: RefObject<SVGLinearGradientElement>;
}

/** Ponto (x,y) numa curva de Bézier quadrática, em `s` (0→1). */
function bezierPoint(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  s: number,
) {
  const mt = 1 - s;
  return {
    x: mt * mt * p0.x + 2 * mt * s * p1.x + s * s * p2.x,
    y: mt * mt * p0.y + 2 * mt * s * p1.y + s * s * p2.y,
  };
}

const lerpPt = (a: { x: number; y: number }, b: { x: number; y: number }, s: number) => ({
  x: a.x + (b.x - a.x) * s,
  y: a.y + (b.y - a.y) * s,
});

/**
 * Trecho EXATO da curva entre `t0` e `t1` (duas subdivisões De Casteljau em
 * sequência: corta em `t1`, depois corta essa parte em `t0/t1` e fica só com
 * a segunda metade) — usado pra desenhar só uma cauda curta atrás do ponto,
 * igual à trilha 3D (ChipScene.tsx), em vez de uma linha crescendo desde a
 * origem: dá a mesma sensação de continuidade entre as duas partes.
 */
function bezierRange(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  t0: number,
  t1: number,
) {
  const l1 = lerpPt(p0, p1, t1);
  const l1b = lerpPt(p1, p2, t1);
  const l2 = lerpPt(l1, l1b, t1); // ponto na curva original em t1 (a ponta)
  if (t1 <= 0) return { start: p0, control: p0, end: p0 };
  const u0 = t0 / t1;
  const r1 = lerpPt(l1, l2, u0);
  const q0mid = lerpPt(p0, l1, u0);
  const start = lerpPt(q0mid, r1, u0); // ponto na curva original em t0
  return { start, control: r1, end: l2 };
}

/**
 * Mesma física do applyBeam (brilho elétrico, pulso, dissipação), mas
 * desenhando uma curva (Bézier quadrática) via SVG em vez de uma linha reta
 * — usada só no feixe 4, que faz uma pequena curva antes de se conectar com
 * a trilha 3D, dando mais percurso (e mais tempo de scroll) pro terceiro
 * texto acabar de esmaecer antes da chegada.
 */
export function applyCurvedBeam(
  refs: CurvedBeamRefs,
  p0: { x: number; y: number },
  control: { x: number; y: number },
  p2: { x: number; y: number },
  offset: number,
  windowStart: number,
  windowEnd: number,
  velocity: number,
  t: number,
  seed: number,
) {
  const range = windowEnd - windowStart;
  const rawT = range > 0 ? (offset - windowStart) / range : 0;
  const outsideSeg = Math.max(0, -rawT, rawT - 1);
  const segFactor = clamp01(1 - outsideSeg * 8);
  const activeVelocity = velocity * segFactor;

  const noise = Math.sin(t * 47 + seed) * Math.sin(t * 23 + seed * 0.4);
  const beamP = clamp01(rawT);
  // ao contrário do feixe reto (que dissipa indo embora — energia se
  // perdendo no caminho), esse aqui faz o oposto: fica mais intenso
  // conforme se aproxima da conexão com a cena 3D, como se estivesse
  // carregando energia pra entregar — igual a tela de destino também
  // acende mais forte quanto mais perto o scroll chega dela
  // (ScreenNode.emissiveIntensity em ChipScene.tsx)
  const approachGlow = 1 + beamP * beamP * 1.6;
  const brightBoost = (1 + activeVelocity * 1.4 + Math.max(0, noise) * activeVelocity * 1.2) * approachGlow;
  // o tamanho faz o oposto do brilho: começa do mesmo tamanho dos outros
  // feixes (escala 1, .pres-beam-core) e vai ENCOLHENDO conforme chega
  // perto da conexão, até ficar do tamanho do ponto da cena 3D — TELA_SCALE
  // é a proporção entre os dois (6px do ponto 3D ÷ 10px do .pres-beam-core)
  const TELA_SCALE = 0.35;
  const approachShrink = lerp(1, TELA_SCALE, beamP * beamP);
  const sizePulse = (1 + Math.sin(t * 16 + seed * 0.25) * 0.22 * activeVelocity) * approachShrink;

  // desaparece bem na hora de tocar o início do ponto da cena 3D (rawT=1),
  // não 15% do trajeto depois disso — a troca de "quem está aceso" (esse
  // ponto 2D e o ponto 3D que reage no mesmo instante, ver ChipScene.tsx)
  // acontece exatamente ali, sem um sobrando visível depois do outro chegar
  const beamVisible = ramp(rawT, 0.15, 1, 1.02);
  const flashP = pulse(rawT, 0.82, 1, 1.7);

  // mesmo truque do trim em applyBeam (pra cauda nunca "correr na frente" do
  // ponto) — agora em `s`, sobre a MESMA curva, então o traço parcial
  // sempre termina exatamente atrás da posição real do ponto
  const grown = Math.max(0, beamP - 0.02);
  // cauda CURTA que acompanha o ponto (mesma proporção da trilha 3D,
  // TAIL_T_SPAN=0.42 em ChipScene.tsx) — em vez de uma linha crescendo desde
  // a origem inteira, só um trecho atrás da ponta, sumindo pra trás dela
  const TAIL_SPAN = 0.4;
  const tailStart = Math.max(0, grown - TAIL_SPAN);

  if (refs.path.current) {
    if (grown > 0) {
      const seg = bezierRange(p0, control, p2, tailStart, grown);
      refs.path.current.setAttribute('d', `M ${seg.start.x} ${seg.start.y} Q ${seg.control.x} ${seg.control.y} ${seg.end.x} ${seg.end.y}`);
      if (refs.gradient.current) {
        refs.gradient.current.setAttribute('x1', String(seg.start.x));
        refs.gradient.current.setAttribute('y1', String(seg.start.y));
        refs.gradient.current.setAttribute('x2', String(seg.end.x));
        refs.gradient.current.setAttribute('y2', String(seg.end.y));
      }
    } else {
      refs.path.current.setAttribute('d', `M ${p0.x} ${p0.y} L ${p0.x} ${p0.y}`);
    }
    refs.path.current.style.opacity = String(beamVisible * (0.25 + activeVelocity * 0.75));
    refs.path.current.style.filter = `brightness(${brightBoost})`;
  }
  if (refs.core.current) {
    const c = bezierPoint(p0, control, p2, beamP);
    refs.core.current.style.left = `${c.x}px`;
    refs.core.current.style.top = `${c.y}px`;
    refs.core.current.style.opacity = String(beamVisible);
    refs.core.current.style.filter = `brightness(${brightBoost})`;
    refs.core.current.style.transform = `translate(-50%, -50%) scale(${sizePulse})`;
  }
  if (refs.flash.current) {
    refs.flash.current.style.left = `${p2.x}px`;
    refs.flash.current.style.top = `${p2.y}px`;
    refs.flash.current.style.opacity = String(flashP * 0.6);
    refs.flash.current.style.transform = `translate(-50%, -50%) scale(${0.6 + flashP * 0.7})`;
  }
  return flashP;
}

/** Projeta um ponto 3D pra coordenada de tela (px), reaproveitando um vetor
 * de rascunho pra não alocar um novo a cada frame. */
export function projectPoint(scratch: THREE.Vector3, source: THREE.Vector3, camera: THREE.Camera) {
  const p = scratch.copy(source).project(camera);
  return {
    x: (p.x * 0.5 + 0.5) * window.innerWidth,
    y: (1 - (p.y * 0.5 + 0.5)) * window.innerHeight,
  };
}

export function applyTextEnergize(el: HTMLDivElement | null, flashP: number) {
  if (!el) return;
  el.style.filter = flashP > 0.01
    ? `brightness(${1 + flashP * 0.5}) drop-shadow(0 0 ${flashP * 16}px rgba(143,195,240,${flashP * 0.8}))`
    : '';
}
