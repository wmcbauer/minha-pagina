import { type RefObject } from 'react';
import EnergyCard, { type EnergyCardHandle } from './EnergyCard';
import TextArrivalCard from './TextArrivalCard';
import TextArrivalCardSide from './TextArrivalCardSide';

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
export default function Presentation({
  refs,
  worldRef,
}: {
  refs: PresentationRefs;
  worldRef?: RefObject<HTMLDivElement>;
}) {
  return (
    <div className="presentation">
      {/* mundo 2D maior que a tela — o painel (Experience3D) faz um "pan"
          nele acompanhando o feixe, dando a sensação de movimento pra
          direita/esquerda entre os slides, em vez de tudo ficar visível
          junto numa tela parada */}
      <div ref={worldRef} className="presentation-world">
        <div ref={refs.resumo.block} className="presentation-block presentation-block--slide1">
          {/* esse primeiro card usa um traço diferente: a energia chega no
              meio do topo (onde o feixe pousa) e se encontra do lado direito,
              de onde ela vai seguir pro próximo texto */}
          <TextArrivalCard ref={refs.resumo.card}>
            <p className="presentation-text">
              A WMC Tech resolve todo tipo de necessidade digital do seu negócio:
            </p>
            <ul className="pres-bullets">
              <li>
                <span className="pres-bullet-dot" />
                <div>
                  <div className="pres-bullet-title">Landpages &amp; Sites</div>
                  <div className="pres-bullet-desc">Páginas rápidas e otimizadas pra converter.</div>
                </div>
              </li>
              <li>
                <span className="pres-bullet-dot" />
                <div>
                  <div className="pres-bullet-title">Criação de Sistemas</div>
                  <div className="pres-bullet-desc">Painéis e plataformas sob medida.</div>
                </div>
              </li>
              <li>
                <span className="pres-bullet-dot" />
                <div>
                  <div className="pres-bullet-title">Automação com IA</div>
                  <div className="pres-bullet-desc">Atendimento e fluxos inteligentes 24h.</div>
                </div>
              </li>
              <li>
                <span className="pres-bullet-dot" />
                <div>
                  <div className="pres-bullet-title">Integrações</div>
                  <div className="pres-bullet-desc">Sistemas e canais num fluxo só.</div>
                </div>
              </li>
            </ul>
          </TextArrivalCard>
        </div>

        <div ref={refs.quemSomos.block} className="presentation-block presentation-block--slide2">
          {/* segundo card: a energia chega pela esquerda (vinda do primeiro) e
              sai por baixo, seguindo em diagonal pro terceiro */}
          <TextArrivalCardSide ref={refs.quemSomos.card} className="pres-card--compact">
            <div className="section-label">Quem somos</div>
            <p className="presentation-text">
              Somos uma equipe focada em tecnologia aplicada ao dia a dia de quem
              empreende. Entendemos que nem todo mundo entende de programação — e
              não precisa. Nosso trabalho é traduzir sua necessidade real (organizar
              o caixa, atender mais rápido, vender mais) numa solução simples de
              usar, sem enrolação técnica.
            </p>
            <div className="pres-tiles">
              <div className="pres-tile">
                <div className="pres-tile-title">Comunicação direta</div>
                <div className="pres-tile-desc">Você fala com quem desenvolve</div>
              </div>
              <div className="pres-tile">
                <div className="pres-tile-title">Sem enrolação técnica</div>
                <div className="pres-tile-desc">Linguagem simples, do início ao fim</div>
              </div>
              <div className="pres-tile">
                <div className="pres-tile-title">Suporte contínuo</div>
                <div className="pres-tile-desc">Do ar ao pós-lançamento</div>
              </div>
            </div>
          </TextArrivalCardSide>
        </div>

        <div ref={refs.transicao.block} className="presentation-block presentation-block--slide3">
          <EnergyCard ref={refs.transicao.card} className="pres-card--compact">
            <p className="presentation-text presentation-text--cta">
              Do site à automação, dá uma olhada em tudo que já resolvemos por aí — e
              no que podemos resolver por você. Role pra conhecer.
            </p>
            <div className="pres-tags">
              <span className="pres-tag">Sites</span>
              <span className="pres-tag">Sistemas</span>
              <span className="pres-tag">Automação com IA</span>
              <span className="pres-tag">Integrações</span>
            </div>
          </EnergyCard>
        </div>
      </div>
    </div>
  );
}
