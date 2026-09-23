import { forwardRef, useImperativeHandle, useRef } from 'react';
import { useLanguage } from '../hooks/useLanguage';

export interface SceneNavStop {
  /** posição no scroll (0–1) onde esse bloco está montado */
  offset: number;
  label: string;
}

export interface SceneNavHandle {
  /** qual bloco está ativo + o quanto do percurso já foi andado (0–1).
   * Chamado a cada frame pelo loop do Experience3D, então mexe direto no
   * DOM em vez de passar por estado do React. */
  setProgress: (indiceAtivo: number, percorrido: number) => void;
}

/**
 * Trilha de navegação: um nó por bloco de informação, na mesma linguagem do
 * feixe de energia do site — a linha "acende" até onde você já chegou e o nó
 * atual fica destacado. Clicar num nó salta pra aquele bloco; as setas das
 * pontas andam um bloco por vez.
 *
 * As setas não hijackam as teclas de direção de propósito: elas continuam
 * rolando a página normalmente. Aqui os controles são botões de verdade, então
 * já entram na ordem de tabulação e respondem a Enter/Espaço.
 */
const SceneNav = forwardRef<SceneNavHandle, {
  stops: SceneNavStop[];
  onJump: (offset: number) => void;
  onStep: (direcao: -1 | 1) => void;
}>(function SceneNav({ stops, onJump, onStep }, ref) {
  const { t } = useLanguage();
  const rootRef = useRef<HTMLElement>(null);
  const trilhaRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const ativoRef = useRef(-1);

  useImperativeHandle(ref, () => ({
    setProgress(indiceAtivo, percorrido) {
      if (trilhaRef.current) {
        trilhaRef.current.style.transform = `scaleY(${Math.max(0, Math.min(1, percorrido))})`;
      }
      if (ativoRef.current === indiceAtivo) return;
      ativoRef.current = indiceAtivo;
      dotRefs.current.forEach((el, i) => {
        if (!el) return;
        const ativo = i === indiceAtivo;
        el.classList.toggle('scene-nav-dot--active', ativo);
        // aria-current some quando não é o atual, em vez de virar "false"
        if (ativo) el.setAttribute('aria-current', 'true');
        else el.removeAttribute('aria-current');
      });
    },
  }));

  return (
    <nav ref={rootRef} className="scene-nav" aria-label={t.nav.inicio}>
      <button
        type="button"
        className="scene-nav-step"
        aria-label={t.nav.anterior}
        onClick={() => onStep(-1)}
      >
        <svg width="11" height="7" viewBox="0 0 12 8" fill="none" aria-hidden="true">
          <path d="M1 7L6 2L11 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="scene-nav-rail">
        {/* linha de fundo + a mesma linha "energizada" por cima, escalada
            pelo progresso — é o que dá a leitura de trilha percorrida */}
        <span className="scene-nav-line" aria-hidden="true" />
        <span ref={trilhaRef} className="scene-nav-line scene-nav-line--on" aria-hidden="true" />
        {stops.map((stop, i) => (
          <button
            key={stop.offset}
            type="button"
            className="scene-nav-dot"
            aria-label={stop.label}
            ref={(el) => {
              dotRefs.current[i] = el;
            }}
            onClick={() => onJump(stop.offset)}
          >
            <span className="scene-nav-dot-mark" aria-hidden="true" />
            <span className="scene-nav-dot-label" aria-hidden="true">{stop.label}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="scene-nav-step"
        aria-label={t.nav.proximo}
        onClick={() => onStep(1)}
      >
        <svg width="11" height="7" viewBox="0 0 12 8" fill="none" aria-hidden="true">
          <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </nav>
  );
});

export default SceneNav;
