import { useLanguage } from '../hooks/useLanguage';
import { whatsappUrl } from '../config/contact';
import { registrarEvento } from '../lib/analytics';

/**
 * Botão de WhatsApp fixo no canto, visível durante a página inteira: quem já
 * se convenceu no segundo bloco não precisa rolar até o fim pra achar como
 * chamar. Com texto (e não só um ícone) de propósito — quem não é de
 * tecnologia reconhece "Falar no WhatsApp" mais rápido do que um símbolo.
 */
export default function WhatsAppButton() {
  const { t } = useLanguage();

  return (
    <a
      className="whatsapp-fab"
      href={whatsappUrl(t.whatsapp.mensagem)}
      target="_blank"
      rel="noreferrer"
      aria-label={t.whatsapp.label}
      onClick={() => registrarEvento('whatsapp_flutuante')}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.2 3.6c-.5.4-1.3.1-1.3-.6V16A2.5 2.5 0 0 1 4 13.5v-8Z"
          fill="currentColor"
        />
      </svg>
      <span className="whatsapp-fab-label">{t.whatsapp.label}</span>
    </a>
  );
}
