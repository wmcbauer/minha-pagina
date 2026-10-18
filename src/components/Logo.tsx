import type { CSSProperties } from 'react';

/** atraso de entrada de cada traço (ver "Entrada da logo" no CSS) */
const d = (segundos: number) => ({ '--d': `${segundos}s` }) as CSSProperties;

/**
 * A logo em SVG inline: as cores vêm de classes (ver `.logo-*` em index.css),
 * que leem as variáveis do tema — assim a mesma marca vale no escuro e no
 * claro sem um arquivo por tema. O favicon (public/assets/logo-icon.svg)
 * é à parte: tem fundo próprio e serve igual nos dois.
 */

/** logo completa: anel com W + "WMC" + "TECH" */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 8 250 104"
      width={250}
      height={104}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="WMC Tech"
    >
      {/* pathLength=1: cada traço mede "1", então o CSS desenha qualquer
          um deles com o mesmo stroke-dasharray, sem medir comprimento real */}
      <path className="logo-anel logo-traco" pathLength={1} style={d(0.15)} d="M85.7 31.7 A44 44 0 1 0 85.7 88.3" strokeWidth="6" />
      <path className="logo-w logo-traco" pathLength={1} style={d(0.45)} d="M30 44 L41 76 L52 56 L63 76 L74 44" strokeWidth="6" />
      <circle className="logo-ponto logo-ponto-entra" cx="85.7" cy="31.7" r="6.5" />
      <g className="logo-w" transform="translate(122,29) scale(0.6)" strokeWidth="9">
        <path className="logo-traco" pathLength={1} style={d(0.6)} d="M0 0 L17 60 L34 20 L51 60 L68 0" />
        <path className="logo-traco" pathLength={1} style={d(0.75)} d="M82 60 L82 0 L106 40 L130 0 L130 60" />
        <path className="logo-traco" pathLength={1} style={d(0.9)} d="M198 12 A30 30 0 1 0 198 48" />
      </g>
      <g className="logo-anel" transform="translate(122,76) scale(0.52)" strokeWidth="5.5">
        <path className="logo-traco" pathLength={1} style={d(1.0)} d="M0 0 H24 M12 0 V30" />
        <path className="logo-traco" pathLength={1} style={d(1.08)} d="M58 0 H34 V30 H58 M34 15 H52" />
        <path className="logo-traco" pathLength={1} style={d(1.16)} d="M95 6 A15 15 0 1 0 95 24" />
        <path className="logo-traco" pathLength={1} style={d(1.24)} d="M108 0 V30 M132 0 V30 M108 15 H132" />
      </g>
      <path className="logo-linha logo-traco" pathLength={1} style={d(1.35)} d="M199 84 H241" strokeWidth="1.5" />
    </svg>
  );
}

/** só o selo (anel com W) — usado na tela de carregamento. O mesmo desenho
 * está duplicado em index.html (primeira pintura); mantenha os dois iguais. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      width={84}
      height={84}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path className="logo-anel" d="M74.5 29.4 A32 32 0 1 0 74.5 70.6" strokeWidth="7.5" />
      <path className="logo-w" d="M33 39 L41.5 64 L50 49 L58.5 64 L67 39" strokeWidth="7.5" />
      <circle className="logo-ponto" cx="74.5" cy="29.4" r="7" />
    </svg>
  );
}
