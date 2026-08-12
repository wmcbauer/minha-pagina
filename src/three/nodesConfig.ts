import * as THREE from 'three';

export interface SceneNode {
  id: string;
  /** posição do "nó" (tela) no espaço 3D — null para o hero (é o próprio chip) */
  position: THREE.Vector3 | null;
  camPos: THREE.Vector3;
  lookAt: THREE.Vector3;
  color: string;
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export const SCENE_NODES: SceneNode[] = [
  { id: 'hero',     position: null,               camPos: V(0, 0.4, 7),      lookAt: V(0, 0, 0),      color: '#8fc3f0' },
  { id: 'sobre',    position: V(-2.6, 1.1, -6),    camPos: V(-1.1, 0.9, -1.5), lookAt: V(-2.6, 1.1, -6), color: '#8fc3f0' },
  { id: 'servicos', position: V(2.8, -0.6, -12),   camPos: V(1.2, -0.3, -7),  lookAt: V(2.8, -0.6, -12), color: '#4a8fd4' },
  { id: 'processo', position: V(-2.8, -1.2, -18),  camPos: V(-1.1, -0.8, -13), lookAt: V(-2.8, -1.2, -18), color: '#9aa7b8' },
  { id: 'projetos', position: V(2.6, 1.3, -24),    camPos: V(1.1, 0.9, -19),  lookAt: V(2.6, 1.3, -24), color: '#4a8fd4' },
  { id: 'contato',  position: V(0, 0, -30),        camPos: V(0, 0.3, -25),   lookAt: V(0, 0, -30),     color: '#8fc3f0' },
];
