/** Utilidades numéricas das animações de scroll (feixes, painéis, pulsos). */

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Sobe de 0 a 1 até `inEnd`, segura em 1 até `outStart`, desce a 0 até `outEnd`. */
export function ramp(x: number, inEnd: number, outStart: number, outEnd: number) {
  if (x <= 0 || x >= outEnd) return 0;
  if (x < inEnd) return x / inEnd;
  if (x < outStart) return 1;
  return 1 - (x - outStart) / (outEnd - outStart);
}

/** Pulso triangular: sobe de `start` a `peak`, desce de `peak` a `end`. */
export function pulse(x: number, start: number, peak: number, end: number) {
  if (x < start || x > end) return 0;
  if (x < peak) return (x - start) / (peak - start);
  return 1 - (x - peak) / (end - peak);
}
