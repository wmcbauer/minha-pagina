import { forwardRef, useImperativeHandle, useRef, type ReactNode } from 'react';

export interface EnergyCardHandle {
  /** 0→1: desenha a borda progressivamente (a partir do canto superior
   * esquerdo, em dois caminhos que contornam o retângulo em sentidos
   * opostos) e posiciona os "runners" brilhantes na ponta de cada traço —
   * o mesmo efeito de energia correndo, só que em volta do retângulo. */
  setProgress: (p: number) => void;
  /** elemento raiz do card — usado por quem precisa medir a posição dele na tela. */
  getElement: () => HTMLDivElement | null;
  /** 0→1: escurece o conteúdo do card (não a borda/traço/runners) — usado pra dar a
   * sensação de que o conteúdo está perdendo energia conforme ela sai dele. */
  setContentBrightness?: (p: number) => void;
  /** 0→1: esmaece o retângulo inteiro (borda, traço e runners inclusos) —
   * usado enquanto a tela desliza pra fora, pra tudo sumir junto. */
  setFade?: (p: number) => void;
}

/**
 * Retângulo de energia pro terceiro texto — a energia chega no canto
 * superior esquerdo (vindo do card anterior) e se divide em dois caminhos
 * que contornam o retângulo em sentidos opostos, cobrindo os 4 lados, se
 * encontrando no meio da base (de onde o feixe seguinte sai, rumo às
 * telas). Um caminho é curto (esquerda → base), o outro é longo (topo →
 * direita → base) — os dois terminam juntos porque cada um anda
 * proporcional ao seu próprio comprimento.
 */
const EnergyCard = forwardRef<EnergyCardHandle, { children: ReactNode; className?: string }>(
  function EnergyCard({ children, className }, ref) {
    const cardRef = useRef<HTMLDivElement>(null);
    // caminho curto: topo-esquerda → esquerda → base (até o centro)
    const leftRef = useRef<HTMLDivElement>(null);
    const bottomLeftRef = useRef<HTMLDivElement>(null);
    // caminho longo: topo-esquerda → topo → direita → base (até o centro)
    const topRef = useRef<HTMLDivElement>(null);
    const rightRef = useRef<HTMLDivElement>(null);
    const bottomRightRef = useRef<HTMLDivElement>(null);
    const runnerARef = useRef<HTMLDivElement>(null);
    const runnerBRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      setProgress(p: number) {
        const card = cardRef.current;
        if (!card) return;
        const w = card.offsetWidth;
        const h = card.offsetHeight;
        if (!w || !h) return;

        const clamped = Math.max(0, Math.min(1, p));
        const half = w / 2;

        // caminho A (curto): desce pela esquerda, depois vai até o meio da base
        const lenA = h + half;
        const dA = clamped * lenA;
        const aLeft = Math.max(0, Math.min(dA, h));
        const aBottom = Math.max(0, Math.min(dA - h, half));

        // caminho B (longo): cruza o topo, desce pela direita, depois vai
        // até o meio da base
        const lenB = w + h + half;
        const dB = clamped * lenB;
        const bTop = Math.max(0, Math.min(dB, w));
        const bRight = Math.max(0, Math.min(dB - w, h));
        const bBottom = Math.max(0, Math.min(dB - w - h, half));

        if (leftRef.current) leftRef.current.style.height = `${(aLeft / h) * 100}%`;
        if (bottomLeftRef.current) bottomLeftRef.current.style.width = `${(aBottom / w) * 100}%`;
        if (topRef.current) topRef.current.style.width = `${(bTop / w) * 100}%`;
        if (rightRef.current) rightRef.current.style.height = `${(bRight / h) * 100}%`;
        if (bottomRightRef.current) bottomRightRef.current.style.width = `${(bBottom / w) * 100}%`;

        const visible = clamped > 0.01 && clamped < 0.999 ? '1' : '0';
        [leftRef, bottomLeftRef, topRef, rightRef, bottomRightRef].forEach((edgeRef) => {
          if (edgeRef.current) edgeRef.current.style.opacity = visible;
        });

        if (runnerARef.current) {
          const rx = aBottom > 0 ? aBottom : 0;
          const ry = aBottom > 0 ? h : aLeft;
          runnerARef.current.style.opacity = visible;
          runnerARef.current.style.transform = `translate(${rx - 4}px, ${ry - 4}px)`;
        }
        if (runnerBRef.current) {
          let rx: number;
          let ry: number;
          if (bBottom > 0) {
            rx = w - bBottom;
            ry = h;
          } else if (bRight > 0) {
            rx = w;
            ry = bRight;
          } else {
            rx = bTop;
            ry = 0;
          }
          runnerBRef.current.style.opacity = visible;
          runnerBRef.current.style.transform = `translate(${rx - 4}px, ${ry - 4}px)`;
        }
      },
      getElement() {
        return cardRef.current;
      },
    }));

    return (
      <div ref={cardRef} className={`pres-card${className ? ` ${className}` : ''}`}>
        <div ref={leftRef} className="text-edge text-edge-left" />
        <div ref={bottomLeftRef} className="text-edge text-edge-bottom" />
        <div ref={topRef} className="pres-edge pres-edge-top" />
        <div ref={rightRef} className="pres-edge pres-edge-right" />
        <div ref={bottomRightRef} className="pres-edge pres-edge-bottom" />
        <div ref={runnerARef} className="pres-card-runner" />
        <div ref={runnerBRef} className="pres-card-runner" />
        {children}
      </div>
    );
  },
);

export default EnergyCard;
