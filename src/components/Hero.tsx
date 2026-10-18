import type { RefObject } from 'react';
import LogoEnergyFrame from './LogoEnergyFrame';
import { Logo } from './Logo';
import ScrambleText from './ScrambleText';
import type { EnergyCardHandle } from './EnergyCard';
import { useLanguage } from '../hooks/useLanguage';
import { whatsappUrl } from '../config/contact';
import { registrarEvento } from '../lib/analytics';

export default function Hero({
  logoCardRef,
  onVerMais,
}: {
  logoCardRef?: RefObject<EnergyCardHandle>;
  /** botão secundário: leva pro primeiro bloco de soluções */
  onVerMais?: () => void;
}) {
  const { t } = useLanguage();

  return (
    <section id="hero" className="scene-hero">
      <div className="hero-overlay" />
      <div className="hero-glow" />
      {/* entrada do site: tudo "materializa" como dado se resolvendo — os
          textos saem de ruído (ScrambleText) e a logo é desenhada traço a
          traço pela energia (ver "Entrada da logo" no CSS). A
          escada de delays abaixo é a ordem em que cada peça chega. */}
      <div className="hero-inner">
        <ScrambleText as="div" className="hero-eyebrow" text={t.hero.eyebrow} delay={80} duration={520} />
        {/* mesmo "plano" visual dos textos (retângulo de energia), mas aqui a
            energia sai dos dois lados da logo e se junta embaixo, de onde
            desce o feixe até o texto */}
        <LogoEnergyFrame ref={logoCardRef} className="pres-card--logo">
          <span className="hero-logo-wrap">
            <Logo className="hero-logo-img" />
          </span>
          <ScrambleText as="h1" className="hero-sub" text={t.hero.subtitle} delay={620} duration={680} />
        </LogoEnergyFrame>
        {/* a ação vem logo abaixo da promessa: quem já chegou decidido não
            precisa atravessar a página inteira pra pedir orçamento */}
        <div className="hero-acoes">
          <a
            className="hero-cta"
            href={whatsappUrl(t.whatsapp.mensagem)}
            target="_blank"
            rel="noreferrer"
            onClick={() => registrarEvento('whatsapp_hero')}
          >
            <ScrambleText text={t.hero.cta} delay={900} duration={480} />
          </a>
          <button type="button" className="hero-cta hero-cta--sec" onClick={onVerMais}>
            <ScrambleText text={t.hero.ctaSecundario} delay={980} duration={480} />
          </button>
        </div>
        <ul className="hero-provas">
          {t.hero.provas.map((prova, i) => (
            <li key={i}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8.5L6.5 12L13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <ScrambleText text={prova} delay={1060 + i * 80} duration={480} />
            </li>
          ))}
        </ul>
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
