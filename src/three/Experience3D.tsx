import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ScrollControls, useScroll } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import ChipScene from './ChipScene';
import { SCENE_NODES } from './nodesConfig';
import Hero from '../components/Hero';
import Presentation from '../components/Presentation';
import type { EnergyCardHandle } from '../components/EnergyCard';

const SEG_COUNT = SCENE_NODES.length - 1;
const SEG_LEN = 1 / SEG_COUNT;
// a apresentação (hero → junção → feixe → 3 textos) ocupa DOIS segmentos
// inteiros (existe um nó vazio extra em nodesConfig.ts só pra isso) — sem
// esse espaço a mais, a sequência toda ficava espremida no mesmo scroll de
// UMA transição de tela, parecendo bagunçada/rápida demais pra acompanhar
const PRES_TOTAL = SEG_LEN * 2;

// sequência inteira, em fração de PRES_TOTAL: hero some/junta → feixe 1 →
// texto 1 entra → feixe 2 (pra direita) → texto 2 entra → feixe 3
// (diagonal, pra baixo-esquerda) → texto 3 entra → segura → esmaece
const HERO_FADE_END = PRES_TOTAL * 0.15;
const JOIN_END = HERO_FADE_END * 0.6;
const BEAM1_START = JOIN_END;
const BEAM1_END = PRES_TOTAL * 0.22;
const CARD1_ENTER_END = PRES_TOTAL * 0.3;
const BEAM2_START = CARD1_ENTER_END;
const BEAM2_END = PRES_TOTAL * 0.4;
const CARD2_ENTER_END = PRES_TOTAL * 0.48;
const BEAM3_START = CARD2_ENTER_END;
const BEAM3_END = PRES_TOTAL * 0.6;
const CARD3_ENTER_END = PRES_TOTAL * 0.68;
// depois que o terceiro texto termina de aparecer, segura na tela (dá tempo
// de ler os três) até começar a esmaecer tudo pra entrar na cena "sobre"
const PRES_WIN_END = PRES_TOTAL * 0.95;
const PRES_FADE_OUT_END = PRES_TOTAL * 1.0;
// feixe 4: sai do terceiro texto assim que ele termina de aparecer e viaja
// por todo o resto da apresentação (segurando + esmaecendo), chegando ao
// fim bem em PRES_TOTAL — que é exatamente onde a câmera 3D começa a se
// mover pra "sobre" (primeira tela), já que a apresentação ocupa dois
// segmentos inteiros do scroll. É essa coincidência que faz o feixe
// "conectar" com o início das telas em vez de só sumir no vazio.
const BEAM4_START = CARD3_ENTER_END;
const BEAM4_END = PRES_FADE_OUT_END;
const BACKDROP_START = 0;

// posição de cada slide no "mundo" 2D (mesmos valores do translate em
// .presentation-block--slideN no CSS) — o painel faz um pan entre eles
// acompanhando o feixe, em vw/vh
const PAN1 = { x: 0, y: 0 };
const PAN2 = { x: 100, y: 30 };
const PAN3 = { x: 6, y: 62 };

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Sobe de 0 a 1 até `inEnd`, segura em 1 até `outStart`, desce a 0 até `outEnd`. */
function ramp(x: number, inEnd: number, outStart: number, outEnd: number) {
  if (x <= 0 || x >= outEnd) return 0;
  if (x < inEnd) return x / inEnd;
  if (x < outStart) return 1;
  return 1 - (x - outStart) / (outEnd - outStart);
}

/** Pulso triangular: sobe de `start` a `peak`, desce de `peak` a `end`. */
function pulse(x: number, start: number, peak: number, end: number) {
  if (x < start || x > end) return 0;
  if (x < peak) return (x - start) / (peak - start);
  return 1 - (x - peak) / (end - peak);
}

/** Ponto (x,y) em px, na tela, de uma borda específica do elemento. */
type Edge = 'top-center' | 'bottom-center' | 'left-center' | 'right-center' | 'top-left';
function pointAt(el: HTMLElement | null, edge: Edge, fallback: { x: number; y: number }) {
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
  line: React.RefObject<HTMLDivElement>;
  core: React.RefObject<HTMLDivElement>;
  flash: React.RefObject<HTMLDivElement>;
}

/**
 * Física do feixe — a MESMA usada entre as telas 3D (DataTrail em
 * ChipScene.tsx): brilho com ruído elétrico e pulso de tamanho reagindo à
 * velocidade do scroll, não só à posição. Genérica o bastante pra qualquer
 * ângulo (vertical, horizontal, diagonal) — a linha nasce no ponto de
 * partida e cresce em direção ao ponto de chegada, girada pro ângulo certo.
 */
function applyBeam(
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
  path: React.RefObject<SVGPathElement>;
  core: React.RefObject<HTMLDivElement>;
  flash: React.RefObject<HTMLDivElement>;
  gradient: React.RefObject<SVGLinearGradientElement>;
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
function applyCurvedBeam(
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
  const sizePulse = (1 + Math.sin(t * 16 + seed * 0.25) * 0.22 * activeVelocity) * (1 + beamP * beamP * 0.35);

  const beamVisible = ramp(rawT, 0.15, 1, 1.15);
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

/** Progresso simples de entrada (0→1), fica em 1 depois — sem saída, porque
 * agora cada texto ocupa seu próprio lugar na tela (não se revezam mais no
 * mesmo lugar) e continuam visíveis enquanto os próximos vão aparecendo. */
function enterProgress(offset: number, start: number, end: number) {
  const range = end - start;
  return range > 0 ? clamp01((offset - start) / range) : offset >= end ? 1 : 0;
}

function applyTextEnergize(el: HTMLDivElement | null, flashP: number) {
  if (!el) return;
  el.style.filter = flashP > 0.01
    ? `brightness(${1 + flashP * 0.5}) drop-shadow(0 0 ${flashP * 16}px rgba(143,195,240,${flashP * 0.8}))`
    : '';
}

/**
 * Guarda uma referência ao elemento de scroll real que o drei cria — usada
 * pra sumir o hero e animar a apresentação conforme o scroll avança (via
 * listener nativo, fora do loop de render do Three.js — não trava nada por
 * baixo).
 */
function ScrollElCapture({ onReady }: { onReady: (el: HTMLElement) => void }) {
  const scroll = useScroll();
  onReady(scroll.el);
  return null;
}

/**
 * Copia `scroll.offset` (o valor JÁ AMORTECIDO pelo `damping` do
 * ScrollControls — o mesmo que a câmera, os nós e as trilhas 3D usam) pra
 * fora do Canvas, a cada frame. Antes, o hero/apresentação/feixes 2D liam
 * `el.scrollTop / max` diretamente — o valor BRUTO, instantâneo, sem
 * amortecimento — enquanto TUDO na cena 3D reage ao offset amortecido, que
 * sempre fica um pouco atrás do bruto. Era exatamente essa defasagem entre
 * "o 2D já chegou" (bruto, instantâneo) e "o 3D ainda não saiu" (amortecido,
 * um passo atrás) que causava o delay — não dá pra sincronizar duas partes
 * que literalmente leem relógios diferentes. Usando o mesmo valor amortecido
 * dos dois lados, os dois se movem sempre juntos, por construção.
 */
function ScrollOffsetCapture({ offsetRef }: { offsetRef: React.MutableRefObject<number> }) {
  const scroll = useScroll();
  useFrame(() => {
    offsetRef.current = Number.isFinite(scroll.offset) ? scroll.offset : 0;
  });
  return null;
}

/**
 * Expõe a câmera 3D pra fora do Canvas — usada pra projetar a origem do
 * mundo (0,0,0) na tela: é exatamente o ponto de onde a primeira trilha 3D
 * (DataTrail índice 3, chip→"sobre", em ChipScene.tsx) parte. Mirando o
 * feixe 4 (2D) nesse mesmo ponto projetado, ele termina bem onde a trilha
 * 3D começa — uma linha contínua entre os dois mundos, em vez de dois
 * efeitos desconectados.
 */
function CameraCapture({ onReady }: { onReady: (camera: THREE.Camera) => void }) {
  const { camera } = useThree();
  onReady(camera);
  return null;
}

export default function Experience3D() {
  const scrollElRef = useRef<HTMLElement | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const logoCardRef = useRef<EnergyCardHandle>(null);
  const beamStartRef = useRef({ x: 0, y: 0 });
  const presRef = useRef<HTMLDivElement>(null);
  const presWorldRef = useRef<HTMLDivElement>(null);
  const resumoRef = useRef<HTMLDivElement>(null);
  const quemSomosRef = useRef<HTMLDivElement>(null);
  const transicaoRef = useRef<HTMLDivElement>(null);
  const resumoCardRef = useRef<EnergyCardHandle>(null);
  const quemSomosCardRef = useRef<EnergyCardHandle>(null);
  const transicaoCardRef = useRef<EnergyCardHandle>(null);

  const beam1Line = useRef<HTMLDivElement>(null);
  const beam1Core = useRef<HTMLDivElement>(null);
  const beam1Flash = useRef<HTMLDivElement>(null);
  const beam2Line = useRef<HTMLDivElement>(null);
  const beam2Core = useRef<HTMLDivElement>(null);
  const beam2Flash = useRef<HTMLDivElement>(null);
  const beam3Line = useRef<HTMLDivElement>(null);
  const beam3Core = useRef<HTMLDivElement>(null);
  const beam3Flash = useRef<HTMLDivElement>(null);
  const beam4Path = useRef<SVGPathElement>(null);
  const beam4Core = useRef<HTMLDivElement>(null);
  const beam4Flash = useRef<HTMLDivElement>(null);
  const beam4Gradient = useRef<SVGLinearGradientElement>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const originVecRef = useRef(new THREE.Vector3());
  // offset amortecido (scroll.offset do drei), atualizado a cada frame pelo
  // ScrollOffsetCapture — a MESMA fonte que a cena 3D usa, pra tudo (hero,
  // apresentação, feixes) se mover exatamente junto com ela
  const offsetRef = useRef(0);

  const handleScrollReady = (el: HTMLElement) => {
    if (scrollElRef.current) return; // já configurado
    scrollElRef.current = el;

    // mede o ponto de onde o feixe 1 sai (borda de baixo do retângulo da
    // logo) já na montagem — se o primeiro scroll do usuário for rápido o
    // bastante pra já chegar com offset > JOIN_END (pulando o instante em
    // que heroP===0 dentro do listener), a medição abaixo nunca rodaria, e o
    // feixe ficaria preso no valor padrão inicial
    const measureLogo = () => {
      const frame = logoCardRef.current?.getElement();
      if (!frame) return;
      const r = frame.getBoundingClientRect();
      beamStartRef.current = { x: r.left + r.width / 2, y: r.bottom };
    };
    requestAnimationFrame(measureLogo);

    el.addEventListener('scroll', () => {
      const offset = offsetRef.current;

      // a borda da logo começa apagada e os dois lados vão descendo e se
      // juntando embaixo — a tela só começa a deslizar pra cima depois que
      // eles se juntam (energia entregue), não junto com o scroll inteiro
      const joinP = clamp01(offset / JOIN_END);
      logoCardRef.current?.setProgress(joinP);
      // logo + subtítulo escurecem conforme a energia vai saindo do retângulo
      logoCardRef.current?.setContentBrightness?.(joinP);

      const heroSlideRange = HERO_FADE_END - JOIN_END;
      const heroP = heroSlideRange > 0 ? clamp01((offset - JOIN_END) / heroSlideRange) : 0;
      // o retângulo inteiro (borda, traço, runners) esmaece junto com o
      // slide da tela — sem isso só o conteúdo sumia, a borda ficava acesa
      logoCardRef.current?.setFade?.(heroP);

      // continua medindo enquanto a tela AINDA está parada (heroP === 0) —
      // assim que o slide começa, o valor trava no último bom medido; medir
      // durante a transição dá valor errado, porque o CSS transition do
      // translateY não é instantâneo (fica sempre um passo atrasado do
      // heroP calculado aqui)
      if (heroP === 0) measureLogo();
      if (heroRef.current) {
        heroRef.current.style.transform = `translateY(${-heroP * 100}vh)`;
        heroRef.current.style.opacity = heroP < 1 ? '1' : '0';
      }

      // apresentação: aparece desde o início do scroll, some antes da
      // câmera começar a se mover pra "sobre"
      if (presRef.current) {
        let containerOpacity: number;
        if (offset < BACKDROP_START) containerOpacity = 0;
        else if (offset < PRES_WIN_END) containerOpacity = 1;
        else containerOpacity = clamp01(1 - (offset - PRES_WIN_END) / (PRES_FADE_OUT_END - PRES_WIN_END));
        presRef.current.style.opacity = String(containerOpacity);
        presRef.current.style.visibility = containerOpacity > 0.01 ? 'visible' : 'hidden';
      }

      // cada texto tem sua própria janela de entrada, sequencial (não se
      // sobrepõem mais); depois que a energia sai dele rumo ao próximo (o
      // feixe seguinte começa a viajar), ele esmaece aos poucos — só o
      // terceiro fica sem saída própria, some junto com a apresentação inteira
      const p1 = enterProgress(offset, BEAM1_END, CARD1_ENTER_END);
      const p2 = enterProgress(offset, BEAM2_END, CARD2_ENTER_END);
      const p3 = enterProgress(offset, BEAM3_END, CARD3_ENTER_END);
      const exit1 = enterProgress(offset, BEAM2_START, BEAM2_END);
      const exit2 = enterProgress(offset, BEAM3_START, BEAM3_END);
      // agora o terceiro texto também tem sua própria saída, junto com o
      // feixe 4 (em vez de só sumir de repente no esmaecimento final do
      // container) — dá tempo dele desaparecer aos poucos enquanto a
      // energia ainda está curvando e viajando até as telas
      const exit3 = enterProgress(offset, BEAM4_START, BEAM4_END);
      if (resumoRef.current) resumoRef.current.style.opacity = String(p1 * (1 - exit1));
      if (quemSomosRef.current) quemSomosRef.current.style.opacity = String(p2 * (1 - exit2));
      if (transicaoRef.current) transicaoRef.current.style.opacity = String(p3 * (1 - exit3));

      // o painel 2D faz um "pan" entre os três slides acompanhando o feixe —
      // pra direita enquanto o feixe 2 viaja, depois de volta pra
      // esquerda/baixo enquanto o feixe 3 viaja — dando a sensação real de
      // movimento em vez de tudo ficar visível junto numa tela parada
      if (presWorldRef.current) {
        let panX: number;
        let panY: number;
        if (offset < BEAM2_START) {
          panX = PAN1.x; panY = PAN1.y;
        } else if (offset < BEAM2_END) {
          const t = exit1;
          panX = lerp(PAN1.x, PAN2.x, t); panY = lerp(PAN1.y, PAN2.y, t);
        } else if (offset < BEAM3_START) {
          panX = PAN2.x; panY = PAN2.y;
        } else if (offset < BEAM3_END) {
          const t = exit2;
          panX = lerp(PAN2.x, PAN3.x, t); panY = lerp(PAN2.y, PAN3.y, t);
        } else {
          panX = PAN3.x; panY = PAN3.y;
        }
        presWorldRef.current.style.transform = `translate(${-panX}vw, ${-panY}vh)`;
      }

      // mesmo efeito de energia contornando a borda de cada retângulo,
      // acompanhando a mesma entrada do texto dele
      resumoCardRef.current?.setProgress(p1);
      quemSomosCardRef.current?.setProgress(p2);
      transicaoCardRef.current?.setProgress(p3);
    }, { passive: true });
  };

  // loop contínuo (requestAnimationFrame, igual ao useFrame do lado 3D) que
  // move os três feixes — sai da logo, some no primeiro texto, sai dele pra
  // direita até o segundo, sai dele em diagonal até o terceiro
  useEffect(() => {
    const prevOffset = { current: 0 };
    const velocity = { current: 0 };
    const startTime = performance.now();
    let rafId = 0;

    const tick = () => {
      const el = scrollElRef.current;
      if (el) {
        const offset = offsetRef.current;
        const t = (performance.now() - startTime) / 1000;

        const rawDelta = offset - prevOffset.current;
        prevOffset.current = offset;
        const targetVelocity = clamp01(Math.abs(rawDelta) * 400);
        velocity.current = lerp(velocity.current, targetVelocity, targetVelocity > velocity.current ? 0.9 : 0.1);

        const heroSlideRange = HERO_FADE_END - JOIN_END;
        const heroP = heroSlideRange > 0 ? clamp01((offset - JOIN_END) / heroSlideRange) : 0;
        const beamStart1 = { x: beamStartRef.current.x, y: beamStartRef.current.y - heroP * window.innerHeight };

        const card1El = resumoCardRef.current?.getElement() ?? null;
        const card2El = quemSomosCardRef.current?.getElement() ?? null;
        const card3El = transicaoCardRef.current?.getElement() ?? null;

        const card1Top = pointAt(card1El, 'top-center', beamStart1);
        const card1Right = pointAt(card1El, 'right-center', card1Top);
        const card2Left = pointAt(card2El, 'left-center', card1Right);
        const card2Bottom = pointAt(card2El, 'bottom-center', card2Left);
        const card3TopLeft = pointAt(card3El, 'top-left', card2Bottom);
        const card3Bottom = pointAt(card3El, 'bottom-center', card3TopLeft);
        // mira na projeção 2D da origem do mundo 3D (0,0,0) — é exatamente
        // de lá que a primeira trilha 3D (chip→"sobre") parte assim que o
        // scroll cruza PRES_TOTAL, então o feixe 2D termina bem onde a
        // trilha 3D começa, "indo pro fundo" (a câmera olha direto pra essa
        // origem, e o próximo nó fica mais fundo/atrás dela) em vez de só
        // sumir num ponto fixo na tela
        let telasEntry = { x: card3Bottom.x, y: window.innerHeight - 4 };
        if (cameraRef.current) {
          const proj = originVecRef.current.set(0, 0, 0).project(cameraRef.current);
          telasEntry = {
            x: (proj.x * 0.5 + 0.5) * window.innerWidth,
            y: (1 - (proj.y * 0.5 + 0.5)) * window.innerHeight,
          };
        }
        // ponto de controle da curva do feixe 4 — fica embaixo dos dois
        // pontos E deslocado pro lado (não só na média entre os dois), pra
        // curva realmente dobrar visivelmente; card3Bottom e telasEntry
        // costumam ficar quase na mesma coluna (os dois pertinho do centro
        // da tela), então só descer o ponto médio (sem deslocar o x) dava
        // uma curva "achatada" — reta pra cima e pra baixo, sem dobra
        // visível nenhuma. O deslocamento lateral fixo garante a barriga da
        // curva pro lado, além de descer, então ela sempre fica visível.
        const beam4Control = {
          x: (card3Bottom.x + telasEntry.x) / 2 + 130,
          y: Math.max(card3Bottom.y, telasEntry.y) + 70,
        };

        const flash1 = applyBeam(
          { line: beam1Line, core: beam1Core, flash: beam1Flash },
          beamStart1, card1Top, offset, BEAM1_START, BEAM1_END, velocity.current, t, 9.1,
        );
        const flash2 = applyBeam(
          { line: beam2Line, core: beam2Core, flash: beam2Flash },
          card1Right, card2Left, offset, BEAM2_START, BEAM2_END, velocity.current, t, 21.7,
        );
        const flash3 = applyBeam(
          { line: beam3Line, core: beam3Core, flash: beam3Flash },
          card2Bottom, card3TopLeft, offset, BEAM3_START, BEAM3_END, velocity.current, t, 35.3,
        );
        applyCurvedBeam(
          { path: beam4Path, core: beam4Core, flash: beam4Flash, gradient: beam4Gradient },
          card3Bottom, beam4Control, telasEntry, offset, BEAM4_START, BEAM4_END, velocity.current, t, 48.6,
        );

        // brilho passageiro no texto — como se a energia estivesse acendendo ele
        applyTextEnergize(resumoRef.current, flash1);
        applyTextEnergize(quemSomosRef.current, flash2);
        applyTextEnergize(transicaoRef.current, flash3);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="experience-3d">
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ fov: 55, position: [0, 0.4, 7], near: 0.1, far: 80 }}
      >
        <color attach="background" args={['#050810']} />
        <fog attach="fog" args={['#050810', 10, 34]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[0, 2, 4]} intensity={1.4} color="#8fc3f0" />
        <pointLight position={[-4, -2, -14]} intensity={0.8} color="#4a8fd4" />
        <Suspense fallback={null}>
          <ScrollControls pages={SCENE_NODES.length} damping={0.25}>
            <ScrollElCapture onReady={handleScrollReady} />
            <ScrollOffsetCapture offsetRef={offsetRef} />
            <CameraCapture onReady={(cam) => { cameraRef.current = cam; }} />
            <ChipScene />
            <EffectComposer multisampling={0}>
              <Bloom
                intensity={1.4}
                luminanceThreshold={0.15}
                luminanceSmoothing={0.3}
                mipmapBlur
                radius={0.7}
              />
            </EffectComposer>
          </ScrollControls>
        </Suspense>
      </Canvas>

      {/* hero e apresentação — elementos HTML comuns, fora do Canvas: tela
          cheia de verdade, sem bloquear o scroll do que está por baixo */}
      <div ref={heroRef} className="hero-overlay-wrap">
        <Hero logoCardRef={logoCardRef} />
      </div>
      <div ref={presRef} className="presentation" style={{ opacity: 0, visibility: 'hidden' }}>
        <Presentation
          worldRef={presWorldRef}
          refs={{
            resumo: { block: resumoRef, card: resumoCardRef },
            quemSomos: { block: quemSomosRef, card: quemSomosCardRef },
            transicao: { block: transicaoRef, card: transicaoCardRef },
          }}
        />
      </div>

      {/* quatro trechos de feixe — logo→texto1 (vertical), texto1→texto2
          (horizontal, pra direita), texto2→texto3 (diagonal, pra baixo-
          esquerda), texto3→telas (uma pequena curva por baixo antes de subir
          e se conectar com a trilha 3D, dando tempo do terceiro texto
          esmaecer) */}
      <div ref={beam1Line} className="pres-beam-line" />
      <div ref={beam1Flash} className="pres-beam-flash" />
      <div ref={beam1Core} className="pres-beam-core" />
      <div ref={beam2Line} className="pres-beam-line" />
      <div ref={beam2Flash} className="pres-beam-flash" />
      <div ref={beam2Core} className="pres-beam-core" />
      <div ref={beam3Line} className="pres-beam-line" />
      <div ref={beam3Flash} className="pres-beam-flash" />
      <div ref={beam3Core} className="pres-beam-core" />
      <svg className="pres-beam-svg">
        <defs>
          {/* acompanha a posição da cauda a cada frame (via ref) — transparente
              na ponta antiga, opaco perto do ponto, igual ao gradiente das
              linhas retas (.pres-beam-line) e à cauda da trilha 3D */}
          <linearGradient ref={beam4Gradient} id="beam4TailGradient" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(143,195,240,0)" />
            <stop offset="65%" stopColor="rgba(143,195,240,0.8)" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>
        <path ref={beam4Path} className="pres-beam-curve" />
      </svg>
      {/* sem flash aqui — o "estouro" radial no encontro com a cena 3D
          parecia um efeito de colisão; sem elemento montado, refs.flash.current
          fica sempre null e applyCurvedBeam já ignora isso de graça */}
      <div ref={beam4Core} className="pres-beam-core--tela" />
    </div>
  );
}
