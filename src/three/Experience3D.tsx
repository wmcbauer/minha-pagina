import { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { ScrollControls, useScroll } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import ChipScene from './ChipScene';
import { SCENE_NODES } from './nodesConfig';
import Hero from '../components/Hero';
import Presentation from '../components/Presentation';
import type { EnergyCardHandle } from '../components/EnergyCard';

const SEG_COUNT = SCENE_NODES.length - 1;
const SEG_LEN = 1 / SEG_COUNT;

// janela da apresentação dentro do primeiro trecho (hero → apresentação),
// onde a câmera fica parada — hero desaparece, os blocos entram, e tudo
// some de volta antes da câmera começar a se mover pra "sobre"
const HERO_FADE_END = SEG_LEN * 0.32;
// o feixe de energia começa a aparecer já no início do scroll — exatamente
// onde a logo ainda está parada, pra ficar visivelmente ligado a ela — e
// viaja até o primeiro texto, chegando junto com o fim do slide da logo; o
// texto só começa a aparecer quando o feixe chega (energia "entregando" a
// informação), por isso a janela dos blocos começa exatamente onde o feixe termina
const BEAM_START = 0;
const BEAM_END = SEG_LEN * 0.46;
const PRES_WIN_START = BEAM_END;
const PRES_WIN_END = SEG_LEN * 0.88;
const PRES_FADE_OUT_END = SEG_LEN * 1.0;
// o fundo sólido da apresentação cobre a tela desde o início do scroll —
// bem antes do texto aparecer — pra não deixar a cena 3D vazar no intervalo
// entre o hero sair de vista (deslizando) e o texto ainda não ter chegado
const BACKDROP_START = 0;

// posição vertical (vh) de onde o feixe chega (centro da tela, onde o texto
// fica) — o ponto de partida é medido de verdade no retângulo da logo, não
// chutado; MIN_BEAM_TRAVEL_VH garante uma descida visível mesmo se esse
// retângulo acabar ficando perto do centro da tela
const BEAM_BOTTOM_VH = 50;
const MIN_BEAM_TRAVEL_VH = 8;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

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

// janela de cada bloco dentro do progresso local (0–1) da apresentação —
// as janelas se sobrepõem um pouco pra dar um crossfade suave na troca
const BLOCK_WINDOW = 0.4;
// fração da janela de cada bloco em que ele está "entrando" — usada tanto
// pro fade/slide quanto pro traço de energia em volta da borda, os dois
// terminam juntos exatamente quando o bloco fica 100% visível
const ENTER_END = 0.22;
const EXIT_START = 0.75;

/** Entra de baixo (translateY positivo → 0), fica parado, depois sobe e some (→ negativo). */
function applyBlockTransform(el: HTMLDivElement | null, localP: number, windowStart: number) {
  if (!el) return;
  const p = clamp01((localP - windowStart) / BLOCK_WINDOW);
  let opacity: number;
  let y: number;
  if (p < ENTER_END) {
    const e = p / ENTER_END;
    opacity = e;
    y = (1 - e) * 45;
  } else if (p < EXIT_START) {
    opacity = 1;
    y = 0;
  } else {
    const e = (p - EXIT_START) / (1 - EXIT_START);
    opacity = 1 - e;
    y = -e * 45;
  }
  el.style.opacity = String(opacity);
  el.style.transform = `translateY(${y}px)`;
}

/**
 * Progresso 0→1 de energia correndo em volta da borda do card — sobe junto
 * com a entrada do bloco (mesma janela) e fica em 1 (borda toda acesa)
 * enquanto o bloco está em foco; some junto quando o bloco começa a sair.
 */
function blockEnergyProgress(localP: number, windowStart: number) {
  const p = clamp01((localP - windowStart) / BLOCK_WINDOW);
  if (p < ENTER_END) return p / ENTER_END;
  if (p < EXIT_START) return 1;
  const e = (p - EXIT_START) / (1 - EXIT_START);
  return clamp01(1 - e);
}

/**
 * Guarda uma referência ao elemento de scroll real que o drei cria — usada
 * pro botão "role para explorar" avançar uma página, e pra sumir o hero e
 * animar a apresentação conforme o scroll avança (via listener nativo, fora
 * do loop de render do Three.js — não trava nada por baixo).
 */
function ScrollElCapture({ onReady }: { onReady: (el: HTMLElement) => void }) {
  const scroll = useScroll();
  onReady(scroll.el);
  return null;
}

export default function Experience3D() {
  const scrollElRef = useRef<HTMLElement | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const logoFrameRef = useRef<HTMLDivElement>(null);
  const beamTopVhRef = useRef(28);
  const presRef = useRef<HTMLDivElement>(null);
  const resumoRef = useRef<HTMLDivElement>(null);
  const quemSomosRef = useRef<HTMLDivElement>(null);
  const transicaoRef = useRef<HTMLDivElement>(null);
  const resumoCardRef = useRef<EnergyCardHandle>(null);
  const quemSomosCardRef = useRef<EnergyCardHandle>(null);
  const transicaoCardRef = useRef<EnergyCardHandle>(null);
  const beamLineRef = useRef<HTMLDivElement>(null);
  const beamCoreRef = useRef<HTMLDivElement>(null);
  const beamFlashRef = useRef<HTMLDivElement>(null);

  const advanceOnePage = () => {
    const el = scrollElRef.current;
    if (!el) return;
    el.scrollBy({ top: el.clientHeight, behavior: 'smooth' });
  };

  const handleScrollReady = (el: HTMLElement) => {
    if (scrollElRef.current) return; // já configurado
    scrollElRef.current = el;

    // mede a borda de baixo do retângulo invisível em volta da logo — é
    // dali que o feixe sai de verdade, em vez de um valor chutado
    const measureLogo = () => {
      const frame = logoFrameRef.current;
      if (!frame) return;
      const r = frame.getBoundingClientRect();
      beamTopVhRef.current = (r.bottom / window.innerHeight) * 100;
    };
    requestAnimationFrame(measureLogo);
    window.addEventListener('resize', measureLogo);

    el.addEventListener('scroll', () => {
      const max = el.scrollHeight - el.clientHeight;
      const offset = max > 0 ? el.scrollTop / max : 0;

      // hero desliza pra cima e sai de vista (não só desaparece) logo no
      // início do primeiro trecho
      if (heroRef.current) {
        const heroP = clamp01(offset / HERO_FADE_END);
        heroRef.current.style.transform = `translateY(${-heroP * 100}vh)`;
        heroRef.current.style.opacity = heroP < 1 ? '1' : '0';
      }

      // apresentação: aparece depois do hero, some antes da câmera começar a
      // se mover pra "sobre"
      if (presRef.current) {
        let containerOpacity: number;
        if (offset < BACKDROP_START) containerOpacity = 0;
        else if (offset < PRES_WIN_END) containerOpacity = 1;
        else containerOpacity = clamp01(1 - (offset - PRES_WIN_END) / (PRES_FADE_OUT_END - PRES_WIN_END));
        presRef.current.style.opacity = String(containerOpacity);
        presRef.current.style.visibility = containerOpacity > 0.01 ? 'visible' : 'hidden';
      }

      // cada bloco tem sua própria janela, com um pouco de sobreposição pra
      // um substituir o outro suavemente — todos vindo de baixo, um de cada
      // vez (não acumula: entra, fica, sobe e some antes do próximo entrar)
      const winLen = PRES_WIN_END - PRES_WIN_START;
      const localP = winLen > 0 ? clamp01((offset - PRES_WIN_START) / winLen) : 0;
      applyBlockTransform(resumoRef.current, localP, 0);
      applyBlockTransform(quemSomosRef.current, localP, 0.3);
      applyBlockTransform(transicaoRef.current, localP, 0.6);

      // mesmo efeito de energia do feixe, agora correndo em volta da borda
      // de cada retângulo conforme o texto dele entra em foco
      resumoCardRef.current?.setProgress(blockEnergyProgress(localP, 0));
      quemSomosCardRef.current?.setProgress(blockEnergyProgress(localP, 0.3));
      transicaoCardRef.current?.setProgress(blockEnergyProgress(localP, 0.6));

      // feixe de energia: sai de onde a logo estava e desce até o primeiro
      // texto — quando chega, solta um clarão que "acorda" o texto (ligado
      // exatamente ao início da janela do primeiro bloco, acima)
      const beamRange = BEAM_END - BEAM_START;
      const beamRaw = beamRange > 0 ? (offset - BEAM_START) / beamRange : 0;
      const beamP = clamp01(beamRaw);
      const beamVisible = ramp(beamRaw, 0.15, 1, 1.15);
      const flashP = pulse(beamRaw, 0.82, 1, 1.7);

      // a logo é grande e o retângulo em volta dela pode chegar perto (ou
      // passar) do centro da tela — garante uma descida mínima visível
      // mesmo quando isso acontece, em vez de zerar o feixe
      const beamTopVh = beamTopVhRef.current;
      const beamBottomVh = Math.max(BEAM_BOTTOM_VH, beamTopVh + MIN_BEAM_TRAVEL_VH);
      if (beamLineRef.current) {
        beamLineRef.current.style.top = `${beamTopVh}vh`;
        beamLineRef.current.style.height = `${beamBottomVh - beamTopVh}vh`;
        beamLineRef.current.style.opacity = String(beamVisible * 0.85);
      }
      if (beamCoreRef.current) {
        const y = beamTopVh + beamP * (beamBottomVh - beamTopVh);
        beamCoreRef.current.style.top = `${y}vh`;
        beamCoreRef.current.style.opacity = String(beamVisible);
        const s = 1 + flashP * 0.8;
        beamCoreRef.current.style.transform = `translate(-50%, -50%) scale(${s})`;
      }
      if (beamFlashRef.current) {
        beamFlashRef.current.style.opacity = String(flashP * 0.6);
        beamFlashRef.current.style.transform = `translate(-50%, -50%) scale(${0.6 + flashP * 0.7})`;
      }
      // brilho passageiro no texto — como se a energia estivesse acendendo ele
      if (resumoRef.current) {
        resumoRef.current.style.filter = flashP > 0.01
          ? `brightness(${1 + flashP * 0.5}) drop-shadow(0 0 ${flashP * 16}px rgba(143,195,240,${flashP * 0.8}))`
          : '';
      }
    }, { passive: true });
  };

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
        <Hero onScrollNext={advanceOnePage} logoFrameRef={logoFrameRef} />
      </div>
      <div ref={presRef} className="presentation" style={{ opacity: 0, visibility: 'hidden' }}>
        <Presentation
          refs={{
            resumo: { block: resumoRef, card: resumoCardRef },
            quemSomos: { block: quemSomosRef, card: quemSomosCardRef },
            transicao: { block: transicaoRef, card: transicaoCardRef },
          }}
        />
      </div>

      {/* feixe de energia — sai de onde a logo estava e desce até o primeiro
          texto, "entregando" energia pra ele aparecer */}
      <div ref={beamLineRef} className="pres-beam-line" />
      <div ref={beamFlashRef} className="pres-beam-flash" />
      <div ref={beamCoreRef} className="pres-beam-core" />
    </div>
  );
}
