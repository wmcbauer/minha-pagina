/** Número do WhatsApp da empresa: só dígitos, com código do país (55) e DDD. */
export const WHATSAPP_NUMBER = '5511917930168';

/**
 * Link de conversa no WhatsApp. Com `mensagem`, ela chega pré-preenchida no
 * campo de texto — o cliente só aperta enviar, e o atendimento já sabe que
 * ele veio do site.
 */
export function whatsappUrl(mensagem?: string) {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base;
}
