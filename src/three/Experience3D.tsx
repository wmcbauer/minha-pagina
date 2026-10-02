import { Suspense, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { ScrollControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import ChipScene from './ChipScene';
import { SCENE_NODES } from './nodesConfig';
import {
  SEG_COUNT, SEG_LEN, HERO_FADE_END, JOIN_END,
  BEAM1_START, BEAM1_END, CARD1_ENTER_END, BEAM2_START, BEAM2_END, CARD2_ENTER_END,
  BEAM3_START, BEAM3_END, CARD3_ENTER_END, PRES_WIN_END, PRES_FADE_OUT_END,
  BEAM4_START, BEAM4_END, BACKDROP_START, PAN1, PAN2, PAN3, TRAIL3_AHEAD_3D,
  TELA_PANELS, NAV_OFFSETS, navAtivo, navPercorrido, telaPanelProgress, enterProgress,
} from './timeline';
import { pointAt, applyBeam, applyCurvedBeam, projectPoint, applyTextEnergize } from './beams';
import { ScrollElCapture, ScrollOffsetCapture, CameraCapture } from './captures';
import { clamp01, lerp, pulse } from '../lib/math';
import Hero from '../components/Hero';
import Presentation from '../components/Presentation';
import TelaPanel, { type TelaPanelHandle } from '../components/TelaPanel';
import SceneNav, { type SceneNavHandle, type SceneNavStop } from '../components/SceneNav';
import { useLanguage } from '../hooks/useLanguage';
import { useCompactLayout } from '../hooks/useCompactLayout';
import type { EnergyCardHandle } from '../components/EnergyCard';

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

export default function Experience3D({ onPronto }: { onPronto?: () => void }) {
  const { t } = useLanguage();
  // avisa o App que a experiência montou (a tela de abertura pode sair). Fica
  // num ref pra o efeito rodar UMA vez, sem depender da identidade da função.
  const onProntoRef = useRef(onPronto);
  onProntoRef.current = onPronto;
  useEffect(() => {
    onProntoRef.current?.();
  }, []);
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
    // sem barra visível: o scroll agora é só encaixe entre blocos (ver
    // useEffect de navegação por gesto, abaixo) — uma barra arrastável
    // deixaria escapar pro meio de um bloco, driblando esse encaixe
    el.classList.add('scroll-sem-barra');
    if (primeiraVez) requestAnimationFrame(measureLogo);
  };

  // rótulos da trilha: reaproveitam o que já existe traduzido — só o hero e
  // dois textos da apresentação precisaram de rótulo próprio
  const navStops: SceneNavStop[] = [
    { offset: NAV_OFFSETS[0], label: t.nav.inicio },
    { offset: NAV_OFFSETS[1], label: t.nav.solucoes },
    { offset: NAV_OFFSETS[2], label: t.nav.equipe },
    { offset: NAV_OFFSETS[3], label: t.nav.naPratica },
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

  // Scroll agora é só encaixe: cada gesto (roda do mouse, arrasto no touch,
  // Page Down/Up, setas, espaço) troca de UM bloco inteiro pro outro, nunca
  // pára no meio — em vez de deixar o navegador rolar livre em cima do
  // contêiner do drei, barramos o comportamento nativo dele por completo
  // (preventDefault em tudo) e reaproveitamos o MESMO stepBy() dos botões
  // da trilha, que já sempre pousa exatamente num NAV_OFFSETS.
  useEffect(() => {
    // trava enquanto uma transição está em andamento — sem isso, um wheel de
    // trackpad (que dispara dezenas de eventos por gesto) pularia vários
    // blocos de uma vez só num único movimento de dedo
    let travado = false;
    const TRAVA_MS = 700;
    const destravarLogo = () => {
      window.setTimeout(() => {
        travado = false;
      }, TRAVA_MS);
    };
    const passo = (direcao: -1 | 1) => {
      if (travado) return;
      travado = true;
      stepBy(direcao);
      destravarLogo();
    };

    // Um painel de texto que passou da altura da janela (zoom, celular deitado)
    // rola por dentro — sem esta exceção o resto do texto ficaria inalcançável,
    // já que a rolagem da página virou salto entre blocos. A folga de 24px
    // ignora os poucos px de deslocamento da animação de entrada.
    const painelRolavelSobre = (alvo: EventTarget | null) => {
      const painel = (alvo as HTMLElement | null)?.closest?.('.tela-panel') as HTMLElement | null;
      if (!painel) return false;
      // só conta se o painel realmente rola (overflow auto/scroll). Comparar
      // scrollHeight sozinho dava falso positivo no painel central: o véu
      // escuro (::before) sai da caixa e infla o scrollHeight, e a roda sobre
      // o Contato escapava do encaixe e deixava a página rolar livre.
      const overflowY = getComputedStyle(painel).overflowY;
      if (overflowY !== 'auto' && overflowY !== 'scroll') return false;
      return painel.scrollHeight > painel.clientHeight + 24;
    };

    const aoRodar = (e: WheelEvent) => {
      if (painelRolavelSobre(e.target)) return;
      e.preventDefault();
      if (Math.abs(e.deltaY) < 1) return; // ruído — trackpad às vezes dispara delta quase zero
      passo(e.deltaY > 0 ? 1 : -1);
    };

    // touch: sem 'wheel', então mede o arrasto entre o começo e o fim — só
    // conta gesto de UM dedo só; com dois (pinça de zoom) deixa passar
    // intocado, senão quem precisa dar zoom pra enxergar melhor perde essa
    // opção, e um dedo levantando da pinça não dispararia troca de bloco
    let touchInicioY = 0;
    let gestoDeUmDedo = false;
    const LIMIAR_SWIPE_PX = 40;
    let toqueEmPainelRolavel = false;
    const aoComecarToque = (e: TouchEvent) => {
      gestoDeUmDedo = e.touches.length === 1;
      if (gestoDeUmDedo) touchInicioY = e.touches[0].clientY;
      toqueEmPainelRolavel = painelRolavelSobre(e.target);
    };
    const aoMoverToque = (e: TouchEvent) => {
      if (e.touches.length > 1) gestoDeUmDedo = false; // virou pinça no meio do gesto
      // gesto que começou dentro de um painel rolável é pra rolar o painel
      if (toqueEmPainelRolavel) {
        gestoDeUmDedo = false; // e não conta como troca de bloco
        return;
      }
      if (e.touches.length === 1) e.preventDefault();
    };
    const aoSoltarToque = (e: TouchEvent) => {
      if (!gestoDeUmDedo || e.touches.length > 0) return;
      const delta = touchInicioY - e.changedTouches[0].clientY;
      if (Math.abs(delta) < LIMIAR_SWIPE_PX) return;
      passo(delta > 0 ? 1 : -1);
    };

    // teclado: as mesmas teclas que o navegador usaria pra rolar a página
    // nativamente — sem interceptar aqui, dariam outro jeito de parar no meio
    const TECLAS_PROXIMO = ['PageDown', 'ArrowDown', ' '];
    const TECLAS_ANTERIOR = ['PageUp', 'ArrowUp'];
    const aoTeclar = (e: KeyboardEvent) => {
      // não intercepta espaço/setas quando o foco está num controle que usa
      // essas teclas pro próprio propósito (botão, link) — evita "roubar" a
      // tecla de quem só quer ativar o elemento focado
      const alvo = e.target as HTMLElement | null;
      if (alvo && (alvo.tagName === 'BUTTON' || alvo.tagName === 'A')) return;
      if (TECLAS_PROXIMO.includes(e.key)) {
        e.preventDefault();
        passo(1);
      } else if (TECLAS_ANTERIOR.includes(e.key)) {
        e.preventDefault();
        passo(-1);
      }
    };

    window.addEventListener('wheel', aoRodar, { passive: false });
    window.addEventListener('touchstart', aoComecarToque, { passive: true });
    window.addEventListener('touchmove', aoMoverToque, { passive: false });
    window.addEventListener('touchend', aoSoltarToque, { passive: true });
    window.addEventListener('keydown', aoTeclar);
    return () => {
      window.removeEventListener('wheel', aoRodar);
      window.removeEventListener('touchstart', aoComecarToque);
      window.removeEventListener('touchmove', aoMoverToque);
      window.removeEventListener('touchend', aoSoltarToque);
      window.removeEventListener('keydown', aoTeclar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            // Com texto maior os painéis ficaram mais altos, e a faixa fixa
            // de 28%–72% cortava o topo dos maiores. Agora o limite vem da
            // ALTURA REAL do painel: ele nunca invade a faixa do header/idioma
            // (em cima) nem o botão de WhatsApp (embaixo, maior no celular).
            const alturaPainel = el.offsetHeight;
            const margemTopo = 84;
            const margemBase = compactoRef.current ? 76 : 24;
            const minCentro = alturaPainel / 2 + margemTopo;
            const maxCentro = alturaJanela - alturaPainel / 2 - margemBase;
            // Sem tela (`semTela`, o Contato) não há nada acima pra o texto
            // ficar abaixo: ele vai no meio da janela, no celular e no
            // desktop. Nas demais, no layout compacto o texto ocupa a faixa de
            // baixo, sob a tela.
            const desejado = node.semTela
              ? alturaJanela / 2
              : compactoRef.current
                ? alturaJanela * 0.72
                : screen.y;
            // se nem assim cabe (janela muito baixa), centraliza — o painel
            // tem max-height e rola por dentro (ver CSS)
            const top = minCentro <= maxCentro
              ? Math.max(minCentro, Math.min(desejado, maxCentro))
              : alturaJanela / 2;
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
