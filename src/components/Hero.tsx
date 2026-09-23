import type { RefObject } from 'react';
import LogoEnergyFrame from './LogoEnergyFrame';
import ScrambleText from './ScrambleText';
import type { EnergyCardHandle } from './EnergyCard';
import { useLanguage } from '../hooks/useLanguage';

export default function Hero({
  logoCardRef,
}: {
  logoCardRef?: RefObject<EnergyCardHandle>;
}) {
  const { t } = useLanguage();

  return (
    <section id="hero" className="scene-hero">
      <div className="hero-overlay" />
      <div className="hero-glow" />
      {/* entrada do site: tudo "materializa" como dado se resolvendo — os
          textos saem de ruído (ScrambleText) e a logo assenta de um borrão
          claro pra imagem nítida, com uma varredura descendo por cima. A
          escada de delays abaixo é a ordem em que cada peça chega. */}
      <div className="hero-inner">
        <ScrambleText as="div" className="hero-eyebrow" text={t.hero.eyebrow} delay={80} duration={520} />
        {/* mesmo "plano" visual dos textos (retângulo de energia), mas aqui a
            energia sai dos dois lados da logo e se junta embaixo, de onde
            desce o feixe até o texto */}
        <LogoEnergyFrame ref={logoCardRef} className="pres-card--logo">
          <span className="hero-logo-wrap">
            <img className="hero-logo-img" src="/assets/logo.png" alt="WMC Tech" width={909} height={327} />
          </span>
          <ScrambleText as="p" className="hero-sub" text={t.hero.subtitle} delay={620} duration={680} />
        </LogoEnergyFrame>
        <ScrambleText as="p" className="hero-support" text={t.hero.support} delay={920} duration={700} />
        <ScrambleText as="div" className="hero-badge" text={t.hero.badge} delay={1180} duration={520} />
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
