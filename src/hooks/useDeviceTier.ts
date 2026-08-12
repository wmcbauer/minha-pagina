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
    const lowMemory = typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4;
    const lowCores = (navigator.hardwareConcurrency ?? 4) <= 4;

    const isLow = reducedMotion || narrowViewport || lowMemory || lowCores;
    setTier(isLow ? 'low' : 'high');
  }, []);

  return tier;
}
