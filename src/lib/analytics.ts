/**
 * Medição de visitas (Microsoft Clarity: gratuito, mostra mapa de calor e
 * grava sessões anônimas — dá pra ver onde o visitante se perde).
 *
 * Só carrega se existir um ID no ambiente de build (`VITE_CLARITY_ID`, ver
 * .env.example). Sem ID, não faz nada: nenhum script de terceiro é baixado
 * e nenhum dado sai do navegador.
 */

type ClarityFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    clarity?: ClarityFn & { q?: unknown[] };
  }
}

export function iniciarAnalytics() {
  const id = import.meta.env.VITE_CLARITY_ID as string | undefined;
  if (!id || window.clarity) return;

  // fila que guarda chamadas feitas antes do script terminar de baixar
  const fila: ClarityFn & { q?: unknown[] } = function (...args: unknown[]) {
    (fila.q = fila.q || []).push(args);
  };
  window.clarity = fila;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${encodeURIComponent(id)}`;
  document.head.appendChild(script);
}

/** Marca um momento importante (ex.: clique no WhatsApp) nos relatórios. */
export function registrarEvento(nome: string) {
  window.clarity?.('event', nome);
}
