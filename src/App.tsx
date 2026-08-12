import { Suspense, lazy, useEffect } from 'react';
import { useDeviceTier } from './hooks/useDeviceTier';
import { useSupportsWebGL } from './hooks/useSupportsWebGL';
import LiteExperience from './LiteExperience';

// Code-split: o bundle do Three.js só é baixado se o aparelho realmente for usar a versão 3D.
const Experience3D = lazy(() => import('./three/Experience3D'));

export default function App() {
  const tier = useDeviceTier();
  const webglOk = useSupportsWebGL();
  const use3D = tier === 'high' && webglOk;

  useEffect(() => {
    document.documentElement.dataset.tier = tier;
  }, [tier]);

  if (!use3D) return <LiteExperience tier={tier} />;

  return (
    <Suspense fallback={<LiteExperience tier={tier} />}>
      <Experience3D />
    </Suspense>
  );
}
