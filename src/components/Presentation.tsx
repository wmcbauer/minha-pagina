import { type RefObject } from 'react';
import EnergyCard, { type EnergyCardHandle } from './EnergyCard';

export interface PresentationBlockRefs {
  block: RefObject<HTMLDivElement>;
  card: RefObject<EnergyCardHandle>;
}

export interface PresentationRefs {
  resumo: PresentationBlockRefs;
  quemSomos: PresentationBlockRefs;
  transicao: PresentationBlockRefs;
}

/**
 * Seção de apresentação, entre o Hero e as telas — a câmera fica parada
 * aqui (mesma posição do hero). Os três blocos ocupam o mesmo lugar na
 * tela e se revezam: um de cada vez, vindo de baixo, controlado de fora
 * via os refs recebidos. Cada texto fica dentro de um retângulo com borda
 * que "acende" conforme a energia corre em volta dele (EnergyCard).
 */
export default function Presentation({ refs }: { refs: PresentationRefs }) {
  return (
    <div className="presentation">
      <div ref={refs.resumo.block} className="presentation-block">
        <EnergyCard ref={refs.resumo.card}>
          <p className="presentation-text">
            A WMC Tech apresenta todo tipo de solução digital que o seu negócio pode
            precisar — de sites e landing pages a sistemas de gestão, automação com
            inteligência artificial e integrações entre ferramentas. Se envolve
            tecnologia, a gente resolve.
          </p>
        </EnergyCard>
      </div>

      <div ref={refs.quemSomos.block} className="presentation-block">
        <EnergyCard ref={refs.quemSomos.card}>
          <div className="section-label">Quem somos</div>
          <p className="presentation-text">
            Somos uma equipe focada em tecnologia aplicada ao dia a dia de quem
            empreende. Entendemos que nem todo mundo entende de programação — e
            não precisa. Nosso trabalho é traduzir sua necessidade real (organizar
            o caixa, atender mais rápido, vender mais) numa solução simples de
            usar, sem enrolação técnica.
          </p>
        </EnergyCard>
      </div>

      <div ref={refs.transicao.block} className="presentation-block">
        <EnergyCard ref={refs.transicao.card}>
          <p className="presentation-text presentation-text--cta">
            Do site à automação, dá uma olhada em tudo que já resolvemos por aí — e
            no que podemos resolver por você. Role pra conhecer.
          </p>
        </EnergyCard>
      </div>
    </div>
  );
}
