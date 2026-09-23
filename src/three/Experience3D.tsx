import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ScrollControls, useScroll } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import ChipScene from './ChipScene';
import { SCENE_NODES } from './nodesConfig';
import Hero from '../components/Hero';
import Presentation from '../components/Presentation';
import TelaPanel, { type TelaPanelHandle } from '../components/TelaPanel';
import SceneNav, { type SceneNavHandle, type SceneNavStop } from '../components/SceneNav';
import { useLanguage } from '../hooks/useLanguage';
import { useCompactLayout } from '../hooks/useCompactLayout';
import type { EnergyCardHandle } from '../components/EnergyCard';

const SEG_COUNT = SCENE_NODES.length - 1;
const SEG_LEN = 1 / SEG_COUNT;
// a abertura (hero → junção → feixe → 3 textos) ocupa TRÊS segmentos
// inteiros — os nós vazios em nodesConfig.ts existem só pra reservar esse
// scroll. Tem que bater com a quantidade deles: são eles que definem o
// ritmo da entrada, e é aqui que se afrouxa ou aperta a primeira parte.
// Toda a coreografia abaixo é fração de PRES_TOTAL, então mudar só este
// número estica ou encolhe a sequência inteira sem desalinhar nada.
const PRES_TOTAL = SEG_LEN * 3;

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

// mesmo cálculo do "from"/"mid" da primeira trilha 3D (índice 3, chip→
// "sobre", em ChipScene.tsx) — usado só pra saber a DIREÇÃO em que essa
// trilha sai da origem, e apontar o feixe 2D nessa mesma direção na
// chegada, pra virar uma linha só (sem cotovelo) em vez de dois feixes
// que só se tocam num ponto.
// buscado por id, não por índice: os nós vazios da abertura mudam de
// quantidade quando se ajusta o ritmo do scroll, e um índice fixo aqui
// passaria a apontar pra um nó sem posição
const SOBRE_NODE_3D = SCENE_NODES.find((n) => n.id === 'sobre')!.position!;
const TRAIL3_FROM_3D = new THREE.Vector3(0, 0, 0);
const TRAIL3_MID_3D = new THREE.Vector3(
  (TRAIL3_FROM_3D.x + SOBRE_NODE_3D.x) / 2,
  (TRAIL3_FROM_3D.y + SOBRE_NODE_3D.y) / 2 + 1.2,
  (TRAIL3_FROM_3D.z + SOBRE_NODE_3D.z) / 2,
);
// ponto um pouco à frente no começo da curva 3D (t pequeno) — a direção de
// TRAIL3_FROM_3D até aqui é a direção inicial de saída da trilha
const TRAIL3_AHEAD_3D = TRAIL3_FROM_3D.clone().lerp(TRAIL3_MID_3D, 0.2);

// telas que têm texto ao lado — o lado de cada uma vem do próprio node
// (node.panelSide, em nodesConfig.ts — mesma fonte que ChipScene.tsx usa pra
// girar a tela na direção certa), e a posição na tela vem da projeção 2D da
// posição 3D do nó, recalculada a cada frame
const TELA_PANELS = SCENE_NODES.map((node, index) => ({ node, index }))
  .filter(({ node }) => node.position && node.panelKey)
  .map(({ node, index }) => ({
    node,
    index,
    side: node.panelSide ?? 'right',
  }));
const ULTIMO_PAINEL = TELA_PANELS[TELA_PANELS.length - 1].index;
// largura do painel (igual à do CSS) e folga do centro do nó até o painel —
// a folga tem que ser maior que a METADE da tela projetada (SCREEN_W em
// ChipScene.tsx), senão o texto monta em cima do retângulo
const PANEL_WIDTH = 400;
// o painel DENTRO da tela é mais largo que os laterais: aquela tela chega
// grande, e uma coluna estreita no meio dela deixava o texto quebrando
// demais. Tem que bater com a `width` de .tela-panel--center no CSS.
const PANEL_WIDTH_CENTER = 520;
/** largura real do painel centralizado — espelha `min(520px, 88vw)` do CSS,
 * porque a centralização depende de os dois concordarem */
const larguraCentro = () => Math.min(PANEL_WIDTH_CENTER, window.innerWidth * 0.88);
const PANEL_GAP = 400;
// calha reservada na borda direita pra trilha de navegação (.scene-nav) —
// sem ela, em viewport estreita o clamp encostava o painel na borda e o
// texto passava por baixo dos nós da trilha
const GUTTER_NAV = 64;

/** paradas da trilha de navegação, em offset de scroll: o hero, os três
 * textos da apresentação e cada tela com painel. Os rótulos vêm das
 * traduções (ver montagem no componente). */
const NAV_OFFSETS = [
  0,
  CARD1_ENTER_END,
  CARD2_ENTER_END,
  CARD3_ENTER_END,
  ...TELA_PANELS.map(({ index }) => index / SEG_COUNT),
];

/** qual parada está ativa: a mais próxima do offset atual */
function navAtivo(offset: number) {
  let melhor = 0;
  let menorDist = Infinity;
  NAV_OFFSETS.forEach((o, i) => {
    const d = Math.abs(o - offset);
    if (d < menorDist) {
      menorDist = d;
      melhor = i;
    }
  });
  return melhor;
}

/** quanto da trilha já foi percorrido (0–1). Interpola pela POSIÇÃO NA LISTA,
 * não pelo offset cru: os nós são igualmente espaçados na tela, mas as
 * paradas não são no scroll, então o brilho ficaria fora dos nós. */
function navPercorrido(offset: number) {
  const n = NAV_OFFSETS.length;
  if (offset <= NAV_OFFSETS[0]) return 0;
  if (offset >= NAV_OFFSETS[n - 1]) return 1;
  for (let i = 0; i < n - 1; i += 1) {
    if (offset < NAV_OFFSETS[i + 1]) {
      const frac = (offset - NAV_OFFSETS[i]) / (NAV_OFFSETS[i + 1] - NAV_OFFSETS[i]);
      return (i + frac) / (n - 1);
    }
  }
  return 1;
}

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
function projectPoint(scratch: THREE.Vector3, source: THREE.Vector3, camera: THREE.Camera) {
  const p = scratch.copy(source).project(camera);
  return {
    x: (p.x * 0.5 + 0.5) * window.innerWidth,
    y: (1 - (p.y * 0.5 + 0.5)) * window.innerHeight,
  };
}

/**
 * Janela de visibilidade do painel de texto de cada tela: entra durante a
 * última metade do trajeto até ela, fica INTEIRO visível por um bom tempo
 * (o suficiente pra ler) e só então esmaece — antes do painel da próxima
 * tela começar a entrar, pra nunca ter dois textos disputando a atenção.
 */
function telaPanelProgress(offset: number, index: number) {
  const targetOffset = index / SEG_COUNT;
  const appearStart = targetOffset - SEG_LEN * 0.5;
  if (offset <= appearStart) return 0;
  if (offset < targetOffset) return (offset - appearStart) / (targetOffset - appearStart);
  // o último é o fecho do site: fica na tela até o fim. Antes isso acontecia
  // por acidente (a página acabava antes de ele esmaecer); agora que existe
  // scroll depois dele, precisa ser explícito — senão o visitante termina
  // olhando pra uma tela sem o contato.
  if (index === ULTIMO_PAINEL) return 1;
  // saída curta: assim que a energia passa, a câmera já está indo embora, e
  // o painel acompanha a projeção do nó — segurar ele aceso aqui fazia o
  // texto ser ARRASTADO pelo quadro, atravessando a tela. Some rápido (mas
  // gradual, igual à entrada) e sai de cena antes desse arrasto aparecer.
  const holdEnd = targetOffset + SEG_LEN * 0.1;
  const fadeEnd = targetOffset + SEG_LEN * 0.32;
  if (offset >= fadeEnd) return 0;
  if (offset < holdEnd) return 1;
  return 1 - (offset - holdEnd) / (fadeEnd - holdEnd);
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
  const { t } = useLanguage();
  const compacto = useCompactLayout();
  // o loop de animação roda num efeito com deps [], então não veria a
  // mudança de estado — este ref é o espelho que ele lê
  const compactoRef = useRef(compacto);
  compactoRef.current = compacto;
  const scrollElRef = useRef<HTMLElement | null>(null);
  const sceneNavRef = useRef<SceneNavHandle>(null);
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
  const telaPanelRefs = useRef<(TelaPanelHandle | null)[]>([]);
  // offset amortecido (scroll.offset do drei), atualizado a cada frame pelo
  // ScrollOffsetCapture — a MESMA fonte que a cena 3D usa, pra tudo (hero,
  // apresentação, feixes) se mover exatamente junto com ela
  const offsetRef = useRef(0);

  // mede o ponto de onde o feixe 1 sai (borda de baixo do retângulo da
  // logo) — precisa ficar fora do listener de 'scroll' (ver handleScrollReady)
  // porque agora TODO o estado de scroll é atualizado dentro do loop
  // contínuo (tick, abaixo), não mais só quando um evento 'scroll' dispara
  const measureLogo = () => {
    const frame = logoCardRef.current?.getElement();
    if (!frame) return;
    const r = frame.getBoundingClientRect();
    beamStartRef.current = { x: r.left + r.width / 2, y: r.bottom };
  };

  const handleScrollReady = (el: HTMLElement) => {
    // sempre realinha com o elemento MAIS RECENTE que o drei relata — ele é
    // chamado a cada render de ScrollElCapture (que vive dentro do Canvas),
    // e travar na primeira chamada (como era antes) podia prender a
    // referência num nó que o drei depois troca/reconstrói: a trilha de
    // navegação (SceneNav) chamava .scrollTo() nesse nó órfão, com
    // scrollHeight 0, e o clique não tinha efeito nenhum — sem erro, sem
    // aviso, só não acontecia nada.
    const primeiraVez = !scrollElRef.current;
    scrollElRef.current = el;
    if (primeiraVez) requestAnimationFrame(measureLogo);
  };

  // rótulos da trilha: reaproveitam o que já existe traduzido — só o hero e
  // dois textos da apresentação precisaram de rótulo próprio
  const navStops: SceneNavStop[] = [
    { offset: NAV_OFFSETS[0], label: t.nav.inicio },
    { offset: NAV_OFFSETS[1], label: t.nav.solucoes },
    { offset: NAV_OFFSETS[2], label: t.nav.equipe },
    { offset: NAV_OFFSETS[3], label: t.nav.portfolio },
    ...TELA_PANELS.map(({ node, index }) => ({
      offset: index / SEG_COUNT,
      label: t.telas[node.panelKey!].eyebrow,
    })),
  ];

  const jumpTo = (offset: number) => {
    const el = scrollElRef.current;
    if (!el) return;
    // `behavior: 'smooth'` não é barrado por prefers-reduced-motion em todo
    // navegador (ao contrário do scroll-behavior do CSS), então decide aqui
    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({
      top: offset * (el.scrollHeight - el.clientHeight),
      behavior: reduzido ? 'auto' : 'smooth',
    });
  };

  // anda uma parada por vez. Usa a PRÓXIMA parada além do ponto atual (não a
  // mais próxima): perto de um nó, "avançar" pela mais próxima pularia ele.
  const stepBy = (direcao: -1 | 1) => {
    const atual = offsetRef.current;
    const MARGEM = 0.004;
    const alvo = direcao === 1
      ? NAV_OFFSETS.find((o) => o > atual + MARGEM)
      : [...NAV_OFFSETS].reverse().find((o) => o < atual - MARGEM);
    if (alvo !== undefined) jumpTo(alvo);
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
            const tPan = exit1;
            panX = lerp(PAN1.x, PAN2.x, tPan); panY = lerp(PAN1.y, PAN2.y, tPan);
          } else if (offset < BEAM3_START) {
            panX = PAN2.x; panY = PAN2.y;
          } else if (offset < BEAM3_END) {
            const tPan = exit2;
            panX = lerp(PAN2.x, PAN3.x, tPan); panY = lerp(PAN2.y, PAN3.y, tPan);
          } else {
            panX = PAN3.x; panY = PAN3.y;
          }
          presWorldRef.current.style.transform = `translate(${-panX}vw, ${-panY}vh)`;
        }

        // mesmo efeito de energia contornando a borda de cada retângulo,
        // acompanhando a mesma entrada do texto dele — agora dentro do loop
        // contínuo, então fica sempre em dia com o offset amortecido, mesmo
        // enquanto ele ainda está "chegando" sem nenhum evento de scroll novo
        // disparando (senão a borda ficava presa num estado intermediário
        // enquanto o resto da cena continuava se movendo)
        resumoCardRef.current?.setProgress(p1);
        quemSomosCardRef.current?.setProgress(p2);
        transicaoCardRef.current?.setProgress(p3);

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
        // direção (em px de tela) pra onde a trilha 3D sai da origem —
        // usada pra apontar a chegada do feixe 2D nessa mesma direção, em
        // vez de um ângulo qualquer que criava um "cotovelo" bem no ponto
        // de encontro (pareciam DOIS feixes, não um só continuando)
        let telasDir = { x: 0, y: -1 };
        if (cameraRef.current) {
          const proj = originVecRef.current.set(0, 0, 0).project(cameraRef.current);
          telasEntry = {
            x: (proj.x * 0.5 + 0.5) * window.innerWidth,
            y: (1 - (proj.y * 0.5 + 0.5)) * window.innerHeight,
          };
          const aheadProj = originVecRef.current.copy(TRAIL3_AHEAD_3D).project(cameraRef.current);
          const aheadScreen = {
            x: (aheadProj.x * 0.5 + 0.5) * window.innerWidth,
            y: (1 - (aheadProj.y * 0.5 + 0.5)) * window.innerHeight,
          };
          const dx = aheadScreen.x - telasEntry.x;
          const dy = aheadScreen.y - telasEntry.y;
          const dlen = Math.hypot(dx, dy) || 1;
          telasDir = { x: dx / dlen, y: dy / dlen };
        }
        // ponto de controle da curva do feixe 4 — fica na direção OPOSTA a
        // pra onde a trilha 3D sai (telasDir), então a tangente da curva
        // bem na chegada em telasEntry já aponta pro mesmo lado que a
        // trilha 3D continua — as duas viram uma linha só, sem dobra, em
        // vez de dois traços que só se tocam num ponto
        const CONTROL_DIST = 220;
        const beam4Control = {
          x: telasEntry.x - telasDir.x * CONTROL_DIST,
          y: telasEntry.y - telasDir.y * CONTROL_DIST,
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

        sceneNavRef.current?.setProgress(navAtivo(offset), navPercorrido(offset));

        // brilho passageiro no texto — como se a energia estivesse acendendo ele
        applyTextEnergize(resumoRef.current, flash1);
        applyTextEnergize(quemSomosRef.current, flash2);
        applyTextEnergize(transicaoRef.current, flash3);

        // painéis de texto ao lado de cada tela — posição vem da projeção 2D
        // do nó (a câmera se move, então isso muda todo frame), e o progresso
        // de entrada/saída vem da janela própria daquela tela
        const camera = cameraRef.current;
        if (camera) {
          TELA_PANELS.forEach(({ node, index, side }) => {
            const handle = telaPanelRefs.current[index];
            const el = handle?.getElement();
            if (!handle || !el || !node.position) return;

            const p = telaPanelProgress(offset, index);
            if (p <= 0) {
              handle.setProgress(0, 0);
              return;
            }

            const screen = projectPoint(originVecRef.current, node.position, camera);
            // 'center' = texto DENTRO da tela: centralizado no próprio nó,
            // sem a folga que afasta os painéis laterais do retângulo
            // em viewport compacta não cabe layout lateral: todo texto vai
            // pra DENTRO da tela, do mesmo jeito que a cena de contato
            const lado = compactoRef.current ? 'center' : side;
            const largura = lado === 'center' ? larguraCentro() : PANEL_WIDTH;
            const rawLeft = lado === 'center'
              ? screen.x - largura / 2
              : lado === 'right'
                ? screen.x + PANEL_GAP
                : screen.x - PANEL_GAP - PANEL_WIDTH;
            // nunca deixa o painel sair inteiro da viewport, mesmo quando a
            // câmera joga o nó pra bem perto da borda. Centralizado, a calha
            // da trilha não entra na conta: ele não chega perto da borda.
            const folga = lado === 'center' ? 12 : GUTTER_NAV;
            const left = Math.max(12, Math.min(rawLeft, window.innerWidth - largura - folga));
            // o `top` é o CENTRO do painel (ele usa translateY(-50%)).
            // Compacto: composição empilhada — a câmera já subiu a tela pro
            // alto do quadro (MIRA_ABAIXO em ChipScene.tsx), então o texto
            // ocupa a faixa de baixo, em posição fixa e não colado no nó.
            // Largo: acompanha a altura do nó, com margem proporcional pra
            // não sair pelo topo em janela baixa.
            const alturaJanela = window.innerHeight;
            const top = compactoRef.current
              ? alturaJanela * 0.72
              : Math.max(alturaJanela * 0.28, Math.min(screen.y, alturaJanela * 0.72));
            el.style.left = `${left}px`;
            el.style.top = `${top}px`;

            const targetOffset = index / SEG_COUNT;
            const flashP = pulse(
              offset,
              targetOffset - SEG_LEN * 0.08,
              targetOffset,
              targetOffset + SEG_LEN * 0.35,
            );
            handle.setProgress(p, flashP);
          });
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="experience-3d">
      <Canvas
        // em celular a tela é densa (dpr 3 é comum) e renderizar nessa
        // densidade com bloom por cima derruba o frame rate — trava em 1,
        // que na prática é imperceptível num painel pequeno
        dpr={compacto ? 1 : [1, 1.5]}
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

      <SceneNav ref={sceneNavRef} stops={navStops} onJump={jumpTo} onStep={stepBy} />

      {/* texto ao lado de cada tela — alternando de lado, posicionado a cada
          frame pela projeção 2D da posição 3D do nó (ver tick) */}
      {TELA_PANELS.map(({ node, index, side }) => (
        <TelaPanel
          key={node.id}
          panelKey={node.panelKey!}
          ctaHref={node.ctaHref}
          side={compacto ? 'center' : side}
          ref={(handle) => {
            telaPanelRefs.current[index] = handle;
          }}
        />
      ))}

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
      <div ref={beam4Core} className="pres-beam-core" />
    </div>
  );
}
