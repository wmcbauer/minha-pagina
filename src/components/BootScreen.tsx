import { useEffect, useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';

/**
 * Tela de abertura: mostra a logo e a proposta enquanto a experiência 3D
 * (centenas de KB de bibliotecas) ainda baixa. Antes disso o visitante via
 * só fundo escuro. É idêntica ao bloco estático de index.html — mesma
 * marcação e mesmas classes — pra que a troca do HTML pelo React não
 * apareça como piscada.
 *
 * Quando a experiência monta (`escondido`), ela some num fade enquanto o
 * hero de verdade começa a materializar por baixo, e depois é removida.
 */
export default function BootScreen({ escondido }: { escondido: boolean }) {
  const { t } = useLanguage();
  const [removido, setRemovido] = useState(false);

  useEffect(() => {
    if (!escondido) return;
    const id = window.setTimeout(() => setRemovido(true), 700);
    return () => window.clearTimeout(id);
  }, [escondido]);

  if (removido) return null;

  return (
    <div className={`boot${escondido ? ' boot--fora' : ''}`} aria-hidden={escondido || undefined}>
      <div className="boot-inner">
        <img className="boot-logo" src="/assets/logo.png" alt="WMC Tech" width={909} height={327} />
        <h1 className="boot-title">{t.hero.subtitle}</h1>
        <p className="boot-support">{t.hero.support}</p>
      </div>
    </div>
  );
}
