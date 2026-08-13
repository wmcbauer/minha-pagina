import { useEffect, useState } from 'react';

export type DeviceTier = 'low' | 'high';

/**
 * Heurística leve para decidir se o aparelho aguenta efeitos pesados
 * (vídeo de fundo, blur grande, animações contínuas).
 * Roda uma única vez — nada de listeners contínuos.
 */
export function useDeviceTier(): DeviceTier {
  const [tier, setTier] = useState<DeviceTier>('low');

  useEffect(() => {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const narrowViewport = window.matchMedia('(max-width: 768px)').matches;

    // navigator.deviceMemory/hardwareConcurrency não existem em todo navegador
    // (ex: Firefox, Safari) — nesse caso, não penaliza, assume capaz.
    // Só marca "fraco" por hardware se memória E núcleos forem baixos ao mesmo
    // tempo (sinal fraco isolado não é confiável o bastante sozinho).
    const cores = navigator.hardwareConcurrency ?? 8;
    const memory = nav.deviceMemory;
    const weakHardware = cores <= 2 && typeof memory === 'number' && memory <= 2;

    const isLow = reducedMotion || narrowViewport || weakHardware;
    setTier(isLow ? 'low' : 'high');
  }, []);

  return tier;
}
