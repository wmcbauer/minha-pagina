import { forwardRef, useImperativeHandle, useRef, type ReactNode } from 'react';
import type { EnergyCardHandle } from './EnergyCard';

/**
 * Retângulo de energia pro primeiro texto — a energia chega no meio do topo
 * (onde o feixe vertical pousa) e se divide em dois caminhos que contornam
 * o retângulo, se encontrando no meio da borda direita (de onde a corrente
 * segue adiante, pro próximo texto). Um caminho é curto (topo → direita),
 * o outro é longo (topo → esquerda → baixo → direita) — os dois terminam
 * juntos porque cada um anda proporcional ao seu próprio comprimento.
 */
const TextArrivalCard = forwardRef<EnergyCardHandle, { children: ReactNode; className?: string }>(
  function TextArrivalCard({ children, className }, ref) {
    const cardRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    // caminho curto: topo-centro → topo-direita → direita-centro
    const topRightRef = useRef<HTMLDivElement>(null);
    const rightTopRef = useRef<HTMLDivElement>(null);
    // caminho longo: topo-centro → topo-esquerda → esquerda → baixo → direita-centro
    const topLeftRef = useRef<HTMLDivElement>(null);
    const leftRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const rightBottomRef = useRef<HTMLDivElement>(null);
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

        // caminho A (curto): meio do topo até o meio da direita
        const lenA = half + hHalf;
        const dA = clamped * lenA;
        const aTop = Math.max(0, Math.min(dA, half));
        const aRight = Math.max(0, Math.min(dA - half, hHalf));

        // caminho B (longo): meio do topo, esquerda, baixo, até o meio da direita
        const lenB = half + h + w + hHalf;
        const dB = clamped * lenB;
        const bTop = Math.max(0, Math.min(dB, half));
        const bLeft = Math.max(0, Math.min(dB - half, h));
        const bBottom = Math.max(0, Math.min(dB - half - h, w));
        const bRight = Math.max(0, Math.min(dB - half - h - w, hHalf));

        // porcentagem sempre relativa ao lado TOTAL do card (w ou h) — é
        // contra isso que o navegador resolve % de width/height, não contra
        // o comprimento máximo pretendido de cada segmento
        if (topRightRef.current) topRightRef.current.style.width = `${(aTop / w) * 100}%`;
        if (rightTopRef.current) rightTopRef.current.style.height = `${(aRight / h) * 100}%`;
        if (topLeftRef.current) topLeftRef.current.style.width = `${(bTop / w) * 100}%`;
        if (leftRef.current) leftRef.current.style.height = `${(bLeft / h) * 100}%`;
        if (bottomRef.current) bottomRef.current.style.width = `${(bBottom / w) * 100}%`;
        if (rightBottomRef.current) rightBottomRef.current.style.height = `${(bRight / h) * 100}%`;

        // mesma margem de 1% do retângulo da logo, pra absorver o scrollTop
        // residual do ScrollControls e não acender os traços sem scroll real
        const visible = clamped > 0.01 && clamped < 0.999 ? '1' : '0';
        [topRightRef, rightTopRef, topLeftRef, leftRef, bottomRef, rightBottomRef].forEach((edgeRef) => {
          if (edgeRef.current) edgeRef.current.style.opacity = visible;
        });

        if (runnerARef.current) {
          const rx = aRight > 0 ? w : half + aTop;
          const ry = aRight > 0 ? aRight : 0;
          runnerARef.current.style.opacity = visible;
          runnerARef.current.style.transform = `translate(${rx - 4}px, ${ry - 4}px)`;
        }
        if (runnerBRef.current) {
          let rx: number;
          let ry: number;
          if (bRight > 0) {
            rx = w;
            ry = h - bRight;
          } else if (bBottom > 0) {
            // a borda de baixo (.text-edge-bottom) cresce da ESQUERDA pra
            // DIREITA (left:-1px fixo, width aumentando) — o ponto tem que
            // acompanhar essa ponta, não andar ao contrário dela
            rx = bBottom;
            ry = h;
          } else if (bLeft > 0) {
            rx = 0;
            ry = bLeft;
          } else {
            rx = half - bTop;
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
        <div ref={contentRef} className="pres-card-content">
          {children}
        </div>
        <div ref={topRightRef} className="text-edge text-edge-top-right" />
        <div ref={rightTopRef} className="text-edge text-edge-right-top" />
        <div ref={topLeftRef} className="text-edge text-edge-top-left" />
        <div ref={leftRef} className="text-edge text-edge-left" />
        <div ref={bottomRef} className="text-edge text-edge-bottom" />
        <div ref={rightBottomRef} className="text-edge text-edge-right-bottom" />
        <div ref={runnerARef} className="pres-card-runner" />
        <div ref={runnerBRef} className="pres-card-runner" />
      </div>
    );
  },
);

export default TextArrivalCard;
