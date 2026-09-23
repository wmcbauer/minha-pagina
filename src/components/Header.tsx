import { useLanguage } from '../hooks/useLanguage';
import ScrambleText from './ScrambleText';
import type { Language } from '../i18n/translations';

// os rótulos materializam junto com o hero, em cascata da esquerda pra
// direita — mesmo efeito de dado se resolvendo usado nos textos da abertura
const OPTIONS: { code: Language; label: string; delay: number }[] = [
  { code: 'pt', label: 'PT', delay: 150 },
  { code: 'en', label: 'EN', delay: 280 },
  { code: 'es', label: 'ES', delay: 410 },
];

export default function Header() {
  const { language, setLanguage } = useLanguage();

  return (
    <header className="site-header">
      <div className="lang-switch" role="group" aria-label="Idioma">
        {OPTIONS.map(({ code, label, delay }) => (
          <button
            key={code}
            type="button"
            className={`lang-option${code === language ? ' lang-option--active' : ''}`}
            // o rótulo visível embaralha na entrada, então o nome do botão
            // vem daqui — assim nunca depende do que o texto está exibindo
            // naquele instante
            aria-label={label}
            aria-pressed={code === language}
            onClick={() => setLanguage(code)}
          >
            <ScrambleText text={label} delay={delay} duration={380} />
          </button>
        ))}
      </div>
    </header>
  );
}
