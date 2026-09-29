import { Suspense, lazy, useCallback, useState } from 'react';
import { LanguageProvider } from './hooks/useLanguage';
import Header from './components/Header';
import WhatsAppButton from './components/WhatsAppButton';
import BootScreen from './components/BootScreen';

// Code-split: o bundle do Three.js só entra quando a página realmente carrega.
const Experience3D = lazy(() => import('./three/Experience3D'));

export default function App() {
  // vira true quando a experiência 3D termina de carregar e monta — é o sinal
  // pra tela de abertura (BootScreen) dar lugar ao hero de verdade
  const [pronto, setPronto] = useState(false);
  const aoFicarPronto = useCallback(() => setPronto(true), []);

  return (
    <LanguageProvider>
      <Header />
      <WhatsAppButton />
      <BootScreen escondido={pronto} />
      <Suspense fallback={null}>
        <Experience3D onPronto={aoFicarPronto} />
      </Suspense>
    </LanguageProvider>
  );
}
