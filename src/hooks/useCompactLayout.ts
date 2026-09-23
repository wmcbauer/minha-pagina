import { useEffect, useState } from 'react';

/**
 * Abaixo disso não cabe "tela + folga + painel" lado a lado: numa largura
 * dessas o texto passa a ir DENTRO da tela (como já acontece na cena de
 * contato) e as telas vêm de frente pra câmera, sem o giro de 30°.
 *
 * Retrato entra na conta junto com a largura porque o campo de visão é
 * VERTICAL: numa tela em pé cabe pouca largura de mundo, e o layout lateral
 * não tem para onde ir mesmo num tablet de 768px.
 */
const CONSULTA = '(max-width: 1024px), (orientation: portrait)';

const medir = () =>
  typeof window !== 'undefined' && window.matchMedia(CONSULTA).matches;

/** `true` quando a viewport não tem espaço pro layout lateral das telas. */
export function useCompactLayout() {
  const [compacto, setCompacto] = useState(medir);

  useEffect(() => {
    const mq = window.matchMedia(CONSULTA);
    const aoMudar = () => setCompacto(mq.matches);
    mq.addEventListener('change', aoMudar);
    // realinha caso a viewport tenha mudado entre o primeiro render e aqui
    aoMudar();
    return () => mq.removeEventListener('change', aoMudar);
  }, []);

  return compacto;
}
