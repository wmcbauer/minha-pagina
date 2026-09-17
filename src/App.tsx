import { Suspense, lazy } from 'react';

// Code-split: o bundle do Three.js só entra quando a página realmente carrega.
const Experience3D = lazy(() => import('./three/Experience3D'));

export default function App() {
  return (
    <Suspense fallback={null}>
      <Experience3D />
    </Suspense>
  );
}
