import { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { ScrollControls, Scroll, useScroll } from '@react-three/drei';
import ChipScene from './ChipScene';
import { SCENE_NODES } from './nodesConfig';
import Hero from '../components/Hero';
import About from '../components/About';
import Services from '../components/Services';
import Process from '../components/Process';
import Projects from '../components/Projects';
import Contact from '../components/Contact';

/** Guarda uma referência ao elemento de scroll real que o drei cria, pro botão "role para explorar" poder avançar uma página. */
function ScrollElCapture({ onReady }: { onReady: (el: HTMLElement) => void }) {
  const scroll = useScroll();
  onReady(scroll.el);
  return null;
}

export default function Experience3D() {
  const scrollElRef = useRef<HTMLElement | null>(null);

  const advanceOnePage = () => {
    const el = scrollElRef.current;
    if (!el) return;
    el.scrollBy({ top: el.clientHeight, behavior: 'smooth' });
  };

  return (
    <div className="experience-3d">
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ fov: 55, position: [0, 0.4, 7], near: 0.1, far: 80 }}
      >
        <color attach="background" args={['#050810']} />
        <fog attach="fog" args={['#050810', 10, 34]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[0, 2, 4]} intensity={1.4} color="#8fc3f0" />
        <pointLight position={[-4, -2, -14]} intensity={0.8} color="#4a8fd4" />
        <Suspense fallback={null}>
          <ScrollControls pages={SCENE_NODES.length} damping={0.25}>
            <ScrollElCapture onReady={(el) => { scrollElRef.current = el; }} />
            <ChipScene />
            <Scroll html style={{ width: '100%', position: 'relative', zIndex: 1 }}>
              <div className="page-3d page-3d--hero"><Hero tier="low" onScrollNext={advanceOnePage} /></div>
              <div className="page-3d page-3d--side"><About /></div>
              <div className="page-3d page-3d--side"><Services /></div>
              <div className="page-3d page-3d--side"><Process /></div>
              <div className="page-3d page-3d--side"><Projects /></div>
              <div className="page-3d page-3d--side"><Contact /></div>
            </Scroll>
          </ScrollControls>
        </Suspense>
      </Canvas>
    </div>
  );
}
