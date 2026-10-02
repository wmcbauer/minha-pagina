/**
 * Componentes sem visual que ficam DENTRO do Canvas só pra tirar de lá algo
 * que o resto da página (DOM 2D) precisa: o elemento de scroll, o offset
 * amortecido e a câmera.
 */
import type { MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useScroll } from '@react-three/drei';
import type * as THREE from 'three';

/**
 * Guarda uma referência ao elemento de scroll real que o drei cria — usada
 * pra sumir o hero e animar a apresentação conforme o scroll avança (via
 * listener nativo, fora do loop de render do Three.js — não trava nada por
 * baixo).
 */
export function ScrollElCapture({ onReady }: { onReady: (el: HTMLElement) => void }) {
  const scroll = useScroll();
  onReady(scroll.el);
  return null;
}

/**
 * Copia `scroll.offset` (o valor JÁ AMORTECIDO pelo `damping` do
 * ScrollControls — o mesmo que a câmera, os nós e as trilhas 3D usam) pra
 * fora do Canvas, a cada frame. Antes, o hero/apresentação/feixes 2D liam
 * `el.scrollTop / max` diretamente — o valor BRUTO, instantâneo, sem
 * amortecimento — enquanto TUDO na cena 3D reage ao offset amortecido, que
 * sempre fica um pouco atrás do bruto. Era exatamente essa defasagem entre
 * "o 2D já chegou" (bruto, instantâneo) e "o 3D ainda não saiu" (amortecido,
 * um passo atrás) que causava o delay — não dá pra sincronizar duas partes
 * que literalmente leem relógios diferentes. Usando o mesmo valor amortecido
 * dos dois lados, os dois se movem sempre juntos, por construção.
 */
export function ScrollOffsetCapture({ offsetRef }: { offsetRef: MutableRefObject<number> }) {
  const scroll = useScroll();
  useFrame(() => {
    offsetRef.current = Number.isFinite(scroll.offset) ? scroll.offset : 0;
  });
  return null;
}

/**
 * Expõe a câmera 3D pra fora do Canvas — usada pra projetar a origem do
 * mundo (0,0,0) na tela: é exatamente o ponto de onde a primeira trilha 3D
 * (DataTrail índice 3, chip→"sobre", em ChipScene.tsx) parte. Mirando o
 * feixe 4 (2D) nesse mesmo ponto projetado, ele termina bem onde a trilha
 * 3D começa — uma linha contínua entre os dois mundos, em vez de dois
 * efeitos desconectados.
 */
export function CameraCapture({ onReady }: { onReady: (camera: THREE.Camera) => void }) {
  const { camera } = useThree();
  onReady(camera);
  return null;
}
