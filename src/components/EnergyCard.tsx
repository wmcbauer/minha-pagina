import { forwardRef, useImperativeHandle, useRef, type ReactNode } from 'react';

export interface EnergyCardHandle {
  /** 0→1: desenha a borda progressivamente (sentido horário, a partir do
   * canto superior esquerdo) e posiciona o "runner" brilhante na ponta do
   * traço — o mesmo efeito de energia correndo, só que em volta do retângulo. */
  setProgress: (p: number) => void;
}

const EnergyCard = forwardRef<EnergyCardHandle, { children: ReactNode; className?: string }>(
  function EnergyCard({ children, className }, ref) {
    const cardRef = useRef<HTMLDivElement>(null);
    const topRef = useRef<HTMLDivElement>(null);
    const rightRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const leftRef = useRef<HTMLDivElement>(null);
    const runnerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      setProgress(p: number) {
        const card = cardRef.current;
        if (!card) return;
        const w = card.offsetWidth;
        const h = card.offsetHeight;
        if (!w || !h) return;

        const clamped = Math.max(0, Math.min(1, p));
        const perim = 2 * (w + h);
        const d = clamped * perim;

        const top = Math.max(0, Math.min(d, w));
        const right = Math.max(0, Math.min(d - w, h));
        const bottom = Math.max(0, Math.min(d - w - h, w));
        const left = Math.max(0, Math.min(d - w - h - w, h));

        if (topRef.current) topRef.current.style.width = `${(top / w) * 100}%`;
        if (rightRef.current) rightRef.current.style.height = `${(right / h) * 100}%`;
        if (bottomRef.current) bottomRef.current.style.width = `${(bottom / w) * 100}%`;
        if (leftRef.current) leftRef.current.style.height = `${(left / h) * 100}%`;

        // ponto atual, bem na ponta do traço já desenhado
        let rx: number;
        let ry: number;
        if (d < w) {
          rx = d;
          ry = 0;
        } else if (d < w + h) {
          rx = w;
          ry = d - w;
        } else if (d < w + h + w) {
          rx = w - (d - w - h);
          ry = h;
        } else {
          rx = 0;
          ry = h - (d - w - h - w);
        }

        if (runnerRef.current) {
          runnerRef.current.style.opacity = clamped > 0.001 && clamped < 0.999 ? '1' : '0';
          runnerRef.current.style.transform = `translate(${rx - 4}px, ${ry - 4}px)`;
        }
      },
    }));

    return (
      <div ref={cardRef} className={`pres-card${className ? ` ${className}` : ''}`}>
        <div ref={topRef} className="pres-edge pres-edge-top" />
        <div ref={rightRef} className="pres-edge pres-edge-right" />
        <div ref={bottomRef} className="pres-edge pres-edge-bottom" />
        <div ref={leftRef} className="pres-edge pres-edge-left" />
        <div ref={runnerRef} className="pres-card-runner" />
        {children}
      </div>
    );
  },
);

export default EnergyCard;
