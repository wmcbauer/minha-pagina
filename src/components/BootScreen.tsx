import { useEffect, useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';

/**
 * Tela de abertura: só o selo da marca pulsando enquanto a experiência 3D
 * (centenas de KB de bibliotecas) ainda baixa. De propósito NÃO mostra a
 * logo grande nem o texto: eles são a entrada do hero (materialização), e
 * mostrá-los aqui antes faria o efeito parecer uma repetição de algo que o
 * visitante já viu pronto. O <h1> fica só pra leitor de tela e buscadores.
 * É idêntica ao bloco estático de index.html — mesma marcação e mesmas
 * classes — pra que a troca do HTML pelo React não apareça como piscada.
 *
 * Quando a experiência monta (`escondido`), ela some num fade curto enquanto
 * o hero de verdade começa a materializar por baixo, e depois é removida.
 */
export default function BootScreen({ escondido }: { escondido: boolean }) {
  const { t } = useLanguage();
  const [removido, setRemovido] = useState(false);

  useEffect(() => {
    if (!escondido) return;
    const id = window.setTimeout(() => setRemovido(true), 450);
    return () => window.clearTimeout(id);
  }, [escondido]);

  if (removido) return null;

  return (
    <div className={`boot${escondido ? ' boot--fora' : ''}`} aria-hidden={escondido || undefined}>
      <div className="boot-inner">
        <img className="boot-mark" src="/assets/logo-mark.svg" alt="" width={84} height={84} />
        <h1 className="sr-only">{t.hero.subtitle}</h1>
      </div>
    </div>
  );
}
