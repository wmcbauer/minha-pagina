import { forwardRef, useImperativeHandle, useRef, type ReactNode } from 'react';
import type { EnergyCardHandle } from './EnergyCard';

/**
 * Retângulo de energia pro segundo texto — a energia chega no meio da
 * borda esquerda (vindo do primeiro card) e se divide em dois caminhos que
 * contornam o retângulo, se encontrando no meio da borda de baixo, de onde
 * a corrente segue em diagonal pro terceiro card. Mesma lógica do
 * TextArrivalCard, só que girada 90°.
 */
const TextArrivalCardSide = forwardRef<EnergyCardHandle, { children: ReactNode; className?: string }>(
  function TextArrivalCardSide({ children, className }, ref) {
    const cardRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    // caminho curto: esquerda-centro → baixo-esquerda → baixo-centro
    const leftBottomRef = useRef<HTMLDivElement>(null);
    const bottomLeftRef = useRef<HTMLDivElement>(null);
    // caminho longo: esquerda-centro → topo-esquerda → topo → direita → baixo-direita → baixo-centro
    const leftTopRef = useRef<HTMLDivElement>(null);
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
        const hHalf = h / 2;

        // caminho A (curto): meio da esquerda até o meio de baixo
        const lenA = hHalf + half;
        const dA = clamped * lenA;
        const aLeft = Math.max(0, Math.min(dA, hHalf));
        const aBottom = Math.max(0, Math.min(dA - hHalf, half));

        // caminho B (longo): meio da esquerda, topo, direita, até o meio de baixo
        const lenB = hHalf + w + h + half;
        const dB = clamped * lenB;
        const bLeft = Math.max(0, Math.min(dB, hHalf));
        const bTop = Math.max(0, Math.min(dB - hHalf, w));
        const bRight = Math.max(0, Math.min(dB - hHalf - w, h));
        const bBottom = Math.max(0, Math.min(dB - hHalf - w - h, half));

        if (leftBottomRef.current) leftBottomRef.current.style.height = `${(aLeft / h) * 100}%`;
        if (bottomLeftRef.current) bottomLeftRef.current.style.width = `${(aBottom / w) * 100}%`;
        if (leftTopRef.current) leftTopRef.current.style.height = `${(bLeft / h) * 100}%`;
        if (topRef.current) topRef.current.style.width = `${(bTop / w) * 100}%`;
        if (rightRef.current) rightRef.current.style.height = `${(bRight / h) * 100}%`;
        if (bottomRightRef.current) bottomRightRef.current.style.width = `${(bBottom / w) * 100}%`;

        const visible = clamped > 0.01 && clamped < 0.999 ? '1' : '0';
        [leftBottomRef, bottomLeftRef, leftTopRef, topRef, rightRef, bottomRightRef].forEach((edgeRef) => {
          if (edgeRef.current) edgeRef.current.style.opacity = visible;
        });

        if (runnerARef.current) {
          const rx = aBottom > 0 ? aBottom : 0;
          const ry = aBottom > 0 ? h : hHalf + aLeft;
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
          } else if (bTop > 0) {
            rx = bTop;
            ry = 0;
          } else {
            rx = 0;
            ry = hHalf - bLeft;
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
        <div ref={contentRef} className="pres-card-content">
          {children}
        </div>
        <div ref={leftBottomRef} className="text-edge text-edge-side-left-bottom" />
        <div ref={bottomLeftRef} className="text-edge text-edge-side-bottom-left" />
        <div ref={leftTopRef} className="text-edge text-edge-side-left-top" />
        <div ref={topRef} className="text-edge text-edge-side-top" />
        <div ref={rightRef} className="text-edge text-edge-side-right" />
        <div ref={bottomRightRef} className="text-edge text-edge-side-bottom-right" />
        <div ref={runnerARef} className="pres-card-runner" />
        <div ref={runnerBRef} className="pres-card-runner" />
      </div>
    );
  },
);

export default TextArrivalCardSide;
