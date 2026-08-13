import { Suspense, lazy, useEffect, useState } from 'react';
import { useDeviceTier } from './hooks/useDeviceTier';
import { useSupportsWebGL } from './hooks/useSupportsWebGL';
import LiteExperience from './LiteExperience';
import Experience3DBoundary from './components/Experience3DBoundary';

// Code-split: o bundle do Three.js só é baixado se o aparelho realmente for usar a versão 3D.
const Experience3D = lazy(() => import('./three/Experience3D'));

export default function App() {
  const tier = useDeviceTier();
  const webglOk = useSupportsWebGL();
  const [crashed, setCrashed] = useState(false);
  const use3D = tier === 'high' && webglOk && !crashed;

  useEffect(() => {
    document.documentElement.dataset.tier = tier;
  }, [tier]);

  // Erros dentro do loop de render do Three.js (useFrame) não passam pelo
  // Error Boundary do React — esse listener global é a segunda rede de
  // segurança: qualquer erro não tratado enquanto o 3D está ativo derruba
  // pra versão leve em vez de deixar a tela quebrada/em branco.
  useEffect(() => {
    if (!use3D) return;
    const onError = () => setCrashed(true);
    window.addEventListener('error', onError);
    return () => window.removeEventListener('error', onError);
  }, [use3D]);

  if (!use3D) return <LiteExperience tier={tier} />;

  return (
    <Experience3DBoundary fallback={<LiteExperience tier={tier} />}>
      <Suspense fallback={<LiteExperience tier={tier} />}>
        <Experience3D />
      </Suspense>
    </Experience3DBoundary>
  );
}
