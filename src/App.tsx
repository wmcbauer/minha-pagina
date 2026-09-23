import { Suspense, lazy } from 'react';
import { LanguageProvider } from './hooks/useLanguage';
import Header from './components/Header';

// Code-split: o bundle do Three.js só entra quando a página realmente carrega.
const Experience3D = lazy(() => import('./three/Experience3D'));

export default function App() {
  return (
    <LanguageProvider>
      <Header />
      <Suspense fallback={null}>
        <Experience3D />
      </Suspense>
    </LanguageProvider>
  );
}
