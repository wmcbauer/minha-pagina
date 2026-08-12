import { useEffect, useRef, useState } from 'react';

/**
 * Observa as cenas dentro do container com scroll e:
 *  - marca qual está ativa (pra navegação por pontinhos)
 *  - adiciona/remove a classe `is-active` em cada cena (efeito de profundidade via CSS)
 * Tudo via IntersectionObserver — sem scroll listener rodando a cada frame.
 */
export function useActiveScene(sceneIds: readonly string[]) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeId, setActiveId] = useState<string>(sceneIds[0]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const elements = sceneIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle('is-active', entry.isIntersecting);
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            setActiveId(entry.target.id);
          }
        });
      },
      { root, threshold: [0, 0.5, 0.99] },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sceneIds]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return { containerRef, activeId, scrollTo };
}
