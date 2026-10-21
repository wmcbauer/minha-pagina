import { useLanguage } from '../hooks/useLanguage';
import { INSTAGRAM_URL } from '../config/contact';
import { registrarEvento } from '../lib/analytics';

/** Ícone do Instagram no topo, no mesmo quadrado do botão de tema. */
export default function InstagramLink() {
  const { t } = useLanguage();
  return (
    <a
      className="theme-toggle"
      href={INSTAGRAM_URL}
      target="_blank"
      rel="noreferrer"
      aria-label={t.instagram.aria}
      title={t.instagram.aria}
      onClick={() => registrarEvento('instagram_topo')}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
    </a>
  );
}
