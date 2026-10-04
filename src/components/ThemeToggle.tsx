import { useRef } from 'react';
import { flushSync } from 'react-dom';
import { useLanguage } from '../hooks/useLanguage';
import { getTheme, renderizarCenaAgora, setTheme, useTheme } from '../lib/theme';
import { trocarComOnda } from '../lib/ondaDeDados';

/**
 * Botão sol/lua do header. O ícone mostra o tema ATUAL (lua = escuro, sol =
 * claro) e o clique troca com a onda de dados partindo do próprio botão.
 */
export default function ThemeToggle() {
  const { t } = useLanguage();
  const tema = useTheme();
  const botao = useRef<HTMLButtonElement>(null);
  const claro = tema === 'light';

  const alternar = () => {
    const r = botao.current?.getBoundingClientRect();
    const origem = r
      ? { x: r.left + r.width / 2, y: r.top + r.height / 2 }
      : { x: window.innerWidth - 40, y: 40 };
    const novo = getTheme() === 'light' ? 'dark' : 'light';
    // Tudo síncrono, dentro da transição: o React commita (ícone, bloom...) e
    // a cena 3D desenha um frame já no tema novo. Assim o retrato "novo" sai
    // completo sem esperar o próximo frame do loop.
    void trocarComOnda(origem, () => {
      flushSync(() => setTheme(novo));
      renderizarCenaAgora();
    });
  };

  return (
    <button
      ref={botao}
      type="button"
      className="theme-toggle"
      onClick={alternar}
      aria-label={claro ? t.tema.paraEscuro : t.tema.paraClaro}
      title={claro ? t.tema.paraEscuro : t.tema.paraClaro}
    >
      {claro ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
        </svg>
      )}
    </button>
  );
}
