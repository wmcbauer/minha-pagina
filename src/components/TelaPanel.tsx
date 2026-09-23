import { forwardRef, useImperativeHandle, useRef } from 'react';
import ScrambleText from './ScrambleText';
import { useLanguage } from '../hooks/useLanguage';
import type { TelaKey } from '../i18n/translations';
import type { PanelSide } from '../three/nodesConfig';

export interface TelaPanelHandle {
  getElement: () => HTMLDivElement | null;
  /** 0→1 (aparece → segura → esmaece) + um pulso passageiro de energia
   * (mesmo `applyTextEnergize` usado nos textos da apresentação) — desliza
   * de fora pra dentro (do lado onde o painel está) e acende um instante
   * quando termina de chegar, como se a energia que revelou a tela também
   * tivesse "escrito" o texto. */
  setProgress: (p: number, flashP: number) => void;
}

const TelaPanel = forwardRef<
  TelaPanelHandle,
  { panelKey: TelaKey; side: PanelSide; ctaHref?: string }
>(
  function TelaPanel({ panelKey, side, ctaHref }, ref) {
    const { t } = useLanguage();
    const panel = t.telas[panelKey];
    const rootRef = useRef<HTMLDivElement>(null);
    const topicRefs = useRef<(HTMLDivElement | null)[]>([]);

    useImperativeHandle(ref, () => ({
      getElement() {
        return rootRef.current;
      },
      setProgress(p, flashP) {
        const root = rootRef.current;
        if (!root) return;
        const clamped = Math.max(0, Math.min(1, p));

        // desliza a partir de FORA (mais longe da tela, no próprio lado do
        // painel) até a posição de descanso — condiz com o resto do site
        // (cartões/feixes sempre chegando de algum lugar, nunca só "aparecendo").
        // Dentro da tela não há "fora" pra vir: deslizar tiraria o texto de
        // dentro do retângulo, então ele só materializa no lugar.
        const SLIDE_PX = 46;
        const desloca = side === 'center' ? 0 : side === 'left' ? -SLIDE_PX : SLIDE_PX;
        const x = (1 - clamped) * desloca;
        root.style.opacity = String(clamped);
        root.style.pointerEvents = clamped > 0.05 ? 'auto' : 'none';
        root.style.transform = `translate(${x}px, -50%)`;

        // brilho passageiro de "energizado" — igual ao usado nos textos da
        // apresentação (applyTextEnergize em Experience3D.tsx)
        root.style.filter = flashP > 0.01
          ? `brightness(${1 + flashP * 0.4}) drop-shadow(0 0 ${flashP * 14}px rgba(143,195,240,${flashP * 0.7}))`
          : '';

        // cada tópico entra com um pequeno atraso em relação ao anterior —
        // uma cascata leve, não tudo de uma vez
        const STAGGER = 0.1;
        topicRefs.current.forEach((el, i) => {
          if (!el) return;
          const delay = i * STAGGER;
          const span = Math.max(0.0001, 1 - delay);
          const local = Math.max(0, Math.min(1, (clamped - delay) / span));
          el.style.opacity = String(local);
          el.style.transform = `translateY(${(1 - local) * 10}px)`;
        });
      },
    }));

    return (
      <div ref={rootRef} className={`tela-panel tela-panel--${side}`} style={{ opacity: 0 }}>
        <ScrambleText as="div" className="tela-panel-eyebrow" text={panel.eyebrow} duration={430} />
        <h3 className="tela-panel-heading">
          <ScrambleText text={panel.heading} duration={620} />
        </h3>
        <div className="tela-panel-topics">
          {panel.topics.map((topic, i) => (
            // a chave é o índice de propósito: a lista tem tamanho e ordem
            // fixos, só o texto muda quando troca o idioma — assim o React
            // atualiza no lugar em vez de remontar (e os refs do stagger
            // continuam válidos)
            <div
              key={i}
              className="tela-panel-topic"
              ref={(el) => {
                topicRefs.current[i] = el;
              }}
            >
              <ScrambleText as="div" className="tela-panel-topic-title" text={topic.title} duration={430} />
              <ScrambleText as="div" className="tela-panel-topic-desc" text={topic.desc} duration={560} />
            </div>
          ))}
        </div>
        {panel.cta && ctaHref && (
          <a className="tela-panel-cta" href={ctaHref} target="_blank" rel="noreferrer" aria-label={panel.cta}>
            <ScrambleText text={panel.cta} duration={430} />
          </a>
        )}
      </div>
    );
  },
);

export default TelaPanel;
