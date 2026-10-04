import { useSyncExternalStore } from 'react';

/**
 * Tema do site (escuro ↔ claro).
 *
 * O estado mora no atributo `data-theme` do <html> — é ele que o CSS lê — e
 * este módulo é a ÚNICA porta pra mudá-lo. O mesmo valor é lido de dois
 * jeitos: pelo CSS (variáveis em index.css) e, pela cena 3D, direto de
 * `getTheme()` a cada frame. A cena não passa pelo React de propósito: na
 * troca com a onda de dados o novo visual precisa estar pronto quando o
 * navegador captura o retrato "novo", então quem troca o tema chama também
 * `renderizarCenaAgora()` (ver `registrarRenderizadorDaCena`).
 *
 * Antes da primeira pintura quem define o atributo é o script em index.html
 * (senão quem escolheu o claro veria um flash escuro a cada visita).
 */
export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'wmc-theme';
/** o `content` de <meta name="theme-color"> em cada tema (barra do navegador no celular) */
const THEME_COLOR: Record<Theme, string> = { dark: '#050810', light: '#f3f7fc' };

const listeners = new Set<() => void>();

/** Desenha um frame da cena 3D agora — registrado por quem é dono do Canvas
 * (CenaTema em Experience3D.tsx). Sem isso a cena só mostraria o tema novo no
 * PRÓXIMO frame do loop dela, e a troca com onda precisaria esperar por ele. */
let renderizarCena: (() => void) | null = null;
export function registrarRenderizadorDaCena(fn: (() => void) | null) {
  renderizarCena = fn;
}
/** Chame DEPOIS de o React commitar o tema novo (o bloom, por exemplo, é prop
 * React): o frame desenhado aqui já sai completo. */
export function renderizarCenaAgora() {
  renderizarCena?.();
}

export function getTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export function setTheme(theme: Theme) {
  if (theme === getTheme()) return;
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // localStorage indisponível (modo privado etc.): a troca vale só nesta visita
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Tema atual como estado do React — re-renderiza quando ele muda. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => 'dark' as Theme);
}
