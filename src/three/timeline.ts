/**
 * Linha do tempo do scroll: em que fração da página (offset 0–1) cada coisa
 * acontece — a abertura (hero → feixes → três textos), as telas com painel e
 * as paradas da trilha de navegação. Só dados e funções puras; quem desenha
 * é o Experience3D.tsx.
 */
import * as THREE from 'three';
import { SCENE_NODES } from './nodesConfig';
import { clamp01 } from '../lib/math';

export const SEG_COUNT = SCENE_NODES.length - 1;
export const SEG_LEN = 1 / SEG_COUNT;
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
export const HERO_FADE_END = PRES_TOTAL * 0.15;
export const JOIN_END = HERO_FADE_END * 0.6;
export const BEAM1_START = JOIN_END;
export const BEAM1_END = PRES_TOTAL * 0.22;
export const CARD1_ENTER_END = PRES_TOTAL * 0.3;
export const BEAM2_START = CARD1_ENTER_END;
export const BEAM2_END = PRES_TOTAL * 0.4;
export const CARD2_ENTER_END = PRES_TOTAL * 0.48;
export const BEAM3_START = CARD2_ENTER_END;
export const BEAM3_END = PRES_TOTAL * 0.6;
export const CARD3_ENTER_END = PRES_TOTAL * 0.68;
// depois que o terceiro texto termina de aparecer, segura na tela (dá tempo
// de ler os três) até começar a esmaecer tudo pra entrar na cena "sobre"
export const PRES_WIN_END = PRES_TOTAL * 0.95;
export const PRES_FADE_OUT_END = PRES_TOTAL * 1.0;
// feixe 4: sai do terceiro texto assim que ele termina de aparecer e viaja
// por todo o resto da apresentação (segurando + esmaecendo), chegando ao
// fim bem em PRES_TOTAL — que é exatamente onde a câmera 3D começa a se
// mover pra "sobre" (primeira tela), já que a apresentação ocupa dois
// segmentos inteiros do scroll. É essa coincidência que faz o feixe
// "conectar" com o início das telas em vez de só sumir no vazio.
export const BEAM4_START = CARD3_ENTER_END;
export const BEAM4_END = PRES_FADE_OUT_END;
export const BACKDROP_START = 0;

// posição de cada slide no "mundo" 2D (mesmos valores do translate em
// .presentation-block--slideN no CSS) — o painel faz um pan entre eles
// acompanhando o feixe, em vw/vh
export const PAN1 = { x: 0, y: 0 };
export const PAN2 = { x: 100, y: 30 };
export const PAN3 = { x: 6, y: 62 };

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
export const TRAIL3_AHEAD_3D = TRAIL3_FROM_3D.clone().lerp(TRAIL3_MID_3D, 0.2);

// telas que têm texto ao lado — o lado de cada uma vem do próprio node
// (node.panelSide, em nodesConfig.ts — mesma fonte que ChipScene.tsx usa pra
// girar a tela na direção certa), e a posição na tela vem da projeção 2D da
// posição 3D do nó, recalculada a cada frame
export const TELA_PANELS = SCENE_NODES.map((node, index) => ({ node, index }))
  .filter(({ node }) => node.position && node.panelKey)
  .map(({ node, index }) => ({
    node,
    index,
    side: node.panelSide ?? 'right',
  }));
const ULTIMO_PAINEL = TELA_PANELS[TELA_PANELS.length - 1].index;

/** paradas da trilha de navegação, em offset de scroll: o hero, os três
 * textos da apresentação e cada tela com painel. Os rótulos vêm das
 * traduções (ver montagem no componente). */
export const NAV_OFFSETS = [
  0,
  CARD1_ENTER_END,
  CARD2_ENTER_END,
  CARD3_ENTER_END,
  ...TELA_PANELS.map(({ index }) => index / SEG_COUNT),
];

/** qual parada está ativa: a mais próxima do offset atual */
export function navAtivo(offset: number) {
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
export function navPercorrido(offset: number) {
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

/**
 * Janela de visibilidade do painel de texto de cada tela: entra durante a
 * última metade do trajeto até ela, fica INTEIRO visível por um bom tempo
 * (o suficiente pra ler) e só então esmaece — antes do painel da próxima
 * tela começar a entrar, pra nunca ter dois textos disputando a atenção.
 */
export function telaPanelProgress(offset: number, index: number) {
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
export function enterProgress(offset: number, start: number, end: number) {
  const range = end - start;
  return range > 0 ? clamp01((offset - start) / range) : offset >= end ? 1 : 0;
}
