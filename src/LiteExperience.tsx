import { SCENES } from './data/scenes';
import { useActiveScene } from './hooks/useActiveScene';
import type { DeviceTier } from './hooks/useDeviceTier';
import BgBlobs from './components/BgBlobs';
import Hero from './components/Hero';
import About from './components/About';
import Services from './components/Services';
import Process from './components/Process';
import Projects from './components/Projects';
import Contact from './components/Contact';

const SCENE_IDS = SCENES.map((s) => s.id);

/** Versão leve (CSS) — usada em aparelhos fracos ou quando o 3D não é suportado. */
export default function LiteExperience({ tier }: { tier: DeviceTier }) {
  const { containerRef, scrollTo } = useActiveScene(SCENE_IDS);

  return (
    <div className="app-shell">
      <BgBlobs tier={tier} />
      <main className="scenes-wrap" ref={containerRef}>
        <Hero tier={tier} onScrollNext={() => scrollTo('sobre')} />
        <About />
        <Services />
        <Process />
        <Projects />
        <Contact />
      </main>
    </div>
  );
}
