import { forwardRef, useImperativeHandle, useRef, type ReactNode } from 'react';
import type { EnergyCardHandle } from './EnergyCard';

/**
 * Retângulo de energia da logo — diferente do EnergyCard dos textos (que
 * desenha a borda inteira em sentido horário): aqui a energia sai dos dois
 * lados (esquerdo e direito) descendo, e se junta no centro da borda de
 * baixo, de onde o feixe segue pro texto. `setProgress(1)` = totalmente
 * acesa e junta no centro; `setProgress(0)` = apagada, recolhida pros
 * cantos de cima.
 */
const LogoEnergyFrame = forwardRef<EnergyCardHandle, { children: ReactNode; className?: string }>(
  function LogoEnergyFrame({ children, className }, ref) {
    const cardRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const leftRef = useRef<HTMLDivElement>(null);
    const rightRef = useRef<HTMLDivElement>(null);
    const bottomLeftRef = useRef<HTMLDivElement>(null);
    const bottomRightRef = useRef<HTMLDivElement>(null);
    const runnerLeftRef = useRef<HTMLDivElement>(null);
    const runnerRightRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      setProgress(p: number) {
        const card = cardRef.current;
        if (!card) return;
        const w = card.offsetWidth;
        const h = card.offsetHeight;
        if (!w || !h) return;

        const clamped = Math.max(0, Math.min(1, p));
        const half = w / 2;
        const pathLen = h + half; // desce o lado inteiro, depois metade da base
        const d = clamped * pathLen;

        const side = Math.max(0, Math.min(d, h));
        const base = Math.max(0, Math.min(d - h, half));

        // o traço para um pouco ANTES da posição real do ponto — o brilho da
        // borda (box-shadow) vaza alguns pixels na ponta, o que fazia parecer
        // que o rastro ia além do ponto; encurtando só o traço (o ponto
        // continua exatamente em `d`, calculado acima), o brilho do próprio
        // ponto cobre essa sobra e nada fica visível à frente dele. Só corta
        // enquanto ainda está animando — quando termina (os dois lados se
        // encontram no centro), o corte some pra eles se tocarem de verdade,
        // sem deixar um vão parado ali.
        const EDGE_TRIM_PX = clamped < 0.999 ? 6 : 0;
        const dEdge = Math.max(0, d - EDGE_TRIM_PX);
        const edgeSide = Math.max(0, Math.min(dEdge, h));
        const edgeBase = Math.max(0, Math.min(dEdge - h, half));

        // mesmo com 0% de altura/largura, o box-shadow das bordas ainda
        // desenha um pontinho brilhante no canto (sombra de uma caixa de
        // área zero não é totalmente invisível) — sem isso, os dois cantos
        // ficavam acesos antes mesmo do usuário rolar a página. A margem de
        // 1% (não zero) absorve o scrollTop residual de ~1px que o
        // ScrollControls deixa por padrão, que sozinho já bastava pra
        // "contar" como progresso e acender os cantos sem nenhum scroll real
        const edgesVisible = clamped > 0.01 ? '1' : '0';
        if (leftRef.current) {
          leftRef.current.style.height = `${(edgeSide / h) * 100}%`;
          leftRef.current.style.opacity = edgesVisible;
        }
        if (rightRef.current) {
          rightRef.current.style.height = `${(edgeSide / h) * 100}%`;
          rightRef.current.style.opacity = edgesVisible;
        }
        // a largura em % desses dois é resolvida pelo navegador contra a
        // largura TOTAL do card (containing block), não contra `half` — por
        // isso a conversão usa `w`, senão o traço renderiza com o dobro do
        // comprimento pretendido e passa muito à frente do ponto
        if (bottomLeftRef.current) {
          bottomLeftRef.current.style.width = `${(edgeBase / w) * 100}%`;
          bottomLeftRef.current.style.opacity = edgesVisible;
        }
        if (bottomRightRef.current) {
          bottomRightRef.current.style.width = `${(edgeBase / w) * 100}%`;
          bottomRightRef.current.style.opacity = edgesVisible;
        }

        const visible = clamped > 0.01 && clamped < 0.999 ? '1' : '0';
        if (runnerLeftRef.current) {
          runnerLeftRef.current.style.opacity = visible;
          const rx = base > 0 ? base : 0;
          const ry = base > 0 ? h : side;
          runnerLeftRef.current.style.transform = `translate(${rx - 4}px, ${ry - 4}px)`;
        }
        if (runnerRightRef.current) {
          runnerRightRef.current.style.opacity = visible;
          const rx = w - (base > 0 ? base : 0);
          const ry = base > 0 ? h : side;
          runnerRightRef.current.style.transform = `translate(${rx - 4}px, ${ry - 4}px)`;
        }
      },
      getElement() {
        return cardRef.current;
      },
      setContentBrightness(p: number) {
        const clamped = Math.max(0, Math.min(1, p));
        // escurece e desaparece por completo (logo + subtítulo) conforme a
        // energia sai dele, sem afetar a borda/traço/runners
        const brightness = 1 - clamped * 0.85;
        if (contentRef.current) {
          contentRef.current.style.filter = `brightness(${brightness})`;
          contentRef.current.style.opacity = String(1 - clamped);
        }
      },
      setFade(p: number) {
        const clamped = Math.max(0, Math.min(1, p));
        // esmaece o retângulo inteiro (borda + traço + runners) — chamado
        // enquanto a tela desliza pra fora, depois que a junção já terminou
        if (cardRef.current) cardRef.current.style.opacity = String(1 - clamped);
      },
    }));

    return (
      <div ref={cardRef} className={`pres-card${className ? ` ${className}` : ''}`}>
        {/* a logo vem primeiro no DOM (fica "atrás"), pra energia e o ponto
            de junção sempre desenharem por cima dela, nunca escondidos */}
        <div ref={contentRef} className="pres-card-content">
          {children}
        </div>
        <div ref={leftRef} className="logo-edge logo-edge-left" />
        <div ref={rightRef} className="logo-edge logo-edge-right" />
        <div ref={bottomLeftRef} className="logo-edge logo-edge-bottom-left" />
        <div ref={bottomRightRef} className="logo-edge logo-edge-bottom-right" />
        <div ref={runnerLeftRef} className="pres-card-runner" />
        <div ref={runnerRightRef} className="pres-card-runner" />
      </div>
    );
  },
);

export default LogoEnergyFrame;
