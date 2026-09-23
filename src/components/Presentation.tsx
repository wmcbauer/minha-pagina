import { type RefObject } from 'react';
import EnergyCard, { type EnergyCardHandle } from './EnergyCard';
import TextArrivalCard from './TextArrivalCard';
import TextArrivalCardSide from './TextArrivalCardSide';
import ScrambleText from './ScrambleText';
import { useLanguage } from '../hooks/useLanguage';

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
  const { t } = useLanguage();

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
            <ScrambleText as="p" className="presentation-text" text={t.card1.intro} duration={620} />
            <ul className="pres-bullets">
              {/* chave por índice: a lista tem tamanho e ordem fixos nos três
                  idiomas, só o texto muda — assim o item é atualizado no
                  lugar e o ScrambleText anima a troca, em vez de remontar */}
              {t.card1.bullets.map((bullet, i) => (
                <li key={i}>
                  <span className="pres-bullet-dot" />
                  <div>
                    <ScrambleText as="div" className="pres-bullet-title" text={bullet.title} duration={430} />
                    <ScrambleText as="div" className="pres-bullet-desc" text={bullet.desc} duration={560} />
                  </div>
                </li>
              ))}
            </ul>
          </TextArrivalCard>
        </div>

        <div ref={refs.quemSomos.block} className="presentation-block presentation-block--slide2">
          {/* segundo card: a energia chega pela esquerda (vinda do primeiro) e
              sai por baixo, seguindo em diagonal pro terceiro */}
          <TextArrivalCardSide ref={refs.quemSomos.card} className="pres-card--compact">
            <ScrambleText as="div" className="section-label" text={t.card2.label} duration={430} />
            <ScrambleText as="p" className="presentation-text" text={t.card2.paragraph} duration={700} />
            <div className="pres-tiles">
              {t.card2.tiles.map((tile, i) => (
                <div className="pres-tile" key={i}>
                  <ScrambleText as="div" className="pres-tile-title" text={tile.title} duration={430} />
                  <ScrambleText as="div" className="pres-tile-desc" text={tile.desc} duration={560} />
                </div>
              ))}
            </div>
          </TextArrivalCardSide>
        </div>

        <div ref={refs.transicao.block} className="presentation-block presentation-block--slide3">
          <EnergyCard ref={refs.transicao.card} className="pres-card--compact">
            <ScrambleText as="p" className="presentation-text presentation-text--cta" text={t.card3.cta} duration={700} />
            <div className="pres-tags">
              {t.card3.tags.map((tag, i) => (
                <ScrambleText as="span" className="pres-tag" key={i} text={tag} duration={430} />
              ))}
            </div>
          </EnergyCard>
        </div>
      </div>
    </div>
  );
}
