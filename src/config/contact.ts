/** Número do WhatsApp da empresa: só dígitos, com código do país (55) e DDD. */
const WHATSAPP_NUMBER = '5511917930168';

/** Perfil da empresa no Instagram (também vai no JSON-LD do index.html). */
export const INSTAGRAM_URL = 'https://www.instagram.com/wmc.tech/';

/**
 * Link de conversa no WhatsApp. Com `mensagem`, ela chega pré-preenchida no
 * campo de texto — o cliente só aperta enviar, e o atendimento já sabe que
 * ele veio do site.
 */
export function whatsappUrl(mensagem?: string) {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base;
}
