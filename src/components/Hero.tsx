import type { RefObject } from 'react';

export default function Hero({
  onScrollNext,
  logoFrameRef,
}: {
  onScrollNext: () => void;
  logoFrameRef?: RefObject<HTMLDivElement>;
}) {
  return (
    <section id="hero" className="scene-hero">
      <div className="hero-overlay" />
      <div className="hero-inner">
        {/* retângulo invisível em volta da logo — só serve de referência pra
            saber de onde o feixe de energia sai, não aparece na tela */}
        <div ref={logoFrameRef} className="hero-logo-frame">
          <img className="hero-logo-img" src="/assets/logo.png" alt="WMC Tech" width={909} height={327} />
        </div>
        <p className="hero-sub">Soluções web sob medida para o seu negócio vender e crescer mais.</p>
        <button type="button" className="scroll-hint" onClick={onScrollNext}>
          <span>role para explorar</span>
          <span className="arrow" />
        </button>
      </div>
    </section>
  );
}
