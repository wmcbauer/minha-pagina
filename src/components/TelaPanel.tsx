import { forwardRef, useImperativeHandle, useRef } from 'react';
import ScrambleText from './ScrambleText';
import { useLanguage } from '../hooks/useLanguage';
import type { TelaKey } from '../i18n/translations';
import type { PanelSide } from '../three/nodesConfig';
import { INSTAGRAM_URL, whatsappUrl } from '../config/contact';
import { registrarEvento } from '../lib/analytics';

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
  { panelKey: TelaKey; side: PanelSide }
>(
  function TelaPanel({ panelKey, side }, ref) {
    const { t } = useLanguage();
    const panel = t.telas[panelKey];
    const rootRef = useRef<HTMLDivElement>(null);
    const topicRefs = useRef<(HTMLDivElement | null)[]>([]);
    const acesaRef = useRef(false);

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

        // contorno desenhado pela energia (mesma linguagem da entrada da
        // logo): dispara quando o painel termina de chegar e rearma quando
        // ele some, pra tocar de novo a cada visita à tela
        if (clamped >= 0.98 && !acesaRef.current) {
          acesaRef.current = true;
          root.classList.add('tela-panel--acesa');
        } else if (clamped <= 0.02 && acesaRef.current) {
          acesaRef.current = false;
          root.classList.remove('tela-panel--acesa');
        }

        // brilho passageiro de "energizado" — igual ao usado nos textos da
        // apresentação (applyTextEnergize em Experience3D.tsx)
        root.style.filter = flashP > 0.01
          ? `brightness(calc(1 + ${flashP * 0.4} * var(--flash-k))) drop-shadow(0 0 ${flashP * 14}px rgba(var(--accent-rgb),calc(${flashP * 0.7} * var(--flash-k))))`
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
        {/* moldura: quatro traços que a energia desenha em sequência (topo →
            direita → base → esquerda) + um pulso de luz no fim. Decorativo. */}
        <span className="tela-borda tela-borda--topo" aria-hidden="true" />
        <span className="tela-borda tela-borda--dir" aria-hidden="true" />
        <span className="tela-borda tela-borda--base" aria-hidden="true" />
        <span className="tela-borda tela-borda--esq" aria-hidden="true" />
        <span className="tela-brilho" aria-hidden="true" />
        <ScrambleText as="div" className="tela-panel-eyebrow" text={panel.eyebrow} duration={430} />
        <h2 className="tela-panel-heading">
          <ScrambleText text={panel.heading} duration={620} />
        </h2>
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
        {panel.cta && (
          <a
            className="tela-panel-cta"
            href={whatsappUrl(t.whatsapp.mensagem)}
            target="_blank"
            rel="noreferrer"
            aria-label={panel.cta}
            onClick={() => registrarEvento('whatsapp_contato')}
          >
            <ScrambleText text={panel.cta} duration={430} />
          </a>
        )}
        {/* no fecho do site, além do WhatsApp, o Instagram — quem ainda não
            está pronto pra conversar pode ver os projetos */}
        {panelKey === 'contato' && (
          <a
            className="tela-panel-insta"
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            onClick={() => registrarEvento('instagram_contato')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="16" height="16" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
            <span>{t.instagram.label}</span>
            <span className="tela-panel-insta-user">@wmc.tech</span>
          </a>
        )}
      </div>
    );
  },
);

export default TelaPanel;
