import type { DeviceTier } from '../hooks/useDeviceTier';

export default function Hero({ tier, onScrollNext }: { tier: DeviceTier; onScrollNext: () => void }) {
  const showVideo = tier === 'high';

  return (
    <section id="hero" className="scene scene-hero">
      {showVideo && (
        <video className="hero-video" autoPlay muted loop playsInline poster="/assets/logo.png">
          <source src="/assets/bg-video.mp4" type="video/mp4" />
        </video>
      )}
      <div className="hero-overlay" />
      <div className="scene-inner hero-inner">
        <img className="hero-logo-img" src="/assets/logo.png" alt="WMC Tech" width={620} height={620} />
        <p className="hero-sub">Soluções web sob medida para o seu negócio vender e crescer mais.</p>
        <button type="button" className="scroll-hint" onClick={onScrollNext}>
          <span>role para explorar</span>
          <span className="arrow" />
        </button>
      </div>
    </section>
  );
}
