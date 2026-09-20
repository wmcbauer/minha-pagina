import type { RefObject } from 'react';
import LogoEnergyFrame from './LogoEnergyFrame';
import type { EnergyCardHandle } from './EnergyCard';

export default function Hero({
  logoCardRef,
}: {
  logoCardRef?: RefObject<EnergyCardHandle>;
}) {
  return (
    <section id="hero" className="scene-hero">
      <div className="hero-overlay" />
      <div className="hero-glow" />
      <div className="hero-inner">
        <div className="hero-eyebrow">Desenvolvimento web · Automação · IA</div>
        {/* mesmo "plano" visual dos textos (retângulo de energia), mas aqui a
            energia sai dos dois lados da logo e se junta embaixo, de onde
            desce o feixe até o texto */}
        <LogoEnergyFrame ref={logoCardRef} className="pres-card--logo">
          <img className="hero-logo-img" src="/assets/logo.png" alt="WMC Tech" width={909} height={327} />
          <p className="hero-sub">Soluções web sob medida para o seu negócio vender e crescer mais.</p>
        </LogoEnergyFrame>
        <p className="hero-support">
          Sites, sistemas e automações prontos para vender por você — do primeiro contato ao pós-venda.
        </p>
        <div className="hero-badge">Projetos entregues em todo o Brasil</div>
      </div>
      <div className="hero-scroll-cue" aria-hidden="true">
        <span className="hero-scroll-line" />
        <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
          <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </section>
  );
}
