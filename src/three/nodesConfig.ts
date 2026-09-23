import * as THREE from 'three';
import type { TelaKey } from '../i18n/translations';

export type PanelSide = 'left' | 'right' | 'center';

export interface SceneNode {
  id: string;
  /** posição do "nó" (tela) no espaço 3D — null para o hero (é o próprio chip) */
  position: THREE.Vector3 | null;
  camPos: THREE.Vector3;
  lookAt: THREE.Vector3;
  color: string;
  /** chave do texto do painel ao lado da tela — o conteúdo em si mora em
   * i18n/translations.ts (`telas`), pra acompanhar a troca de idioma */
  panelKey?: TelaKey;
  /** link do botão do painel, quando tem — fica aqui, e não na tradução,
   * porque URL é a mesma nos três idiomas */
  ctaHref?: string;
  /** vídeo exibido NA tela (em vez do painel escuro) — acende como uma TV
   * quando a energia chega nela (ver VideoScreenNode em ChipScene.tsx) */
  video?: string;
  /** onde fica o painel de texto dessa tela.
   * 'left'/'right': ao LADO da tela, que fica do lado oposto (ver AIM) e
   * gira pra encarar esse lado (ver NODE_ROTATION_Y em ChipScene.tsx).
   * 'center': DENTRO da tela — ela vem centralizada e de frente (sem giro,
   * senão o texto 2D não acompanharia a perspectiva do plano 3D), e o vídeo
   * por trás escurece pra não competir com a leitura. */
  panelSide?: PanelSide;
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// a câmera não mira exatamente no centro da tela: ela olha um pouco PRO LADO
// dela, o que joga a tela pro lado oposto da viewport e abre espaço pro
// painel de texto — sem isso a tela fica sempre no meio e todo o texto
// empilha numa borda só, deixando a outra metade vazia. Sinal positivo =
// tela vai pra esquerda (texto à direita), negativo = o contrário.
const AIM = 1.8;

export const SCENE_NODES: SceneNode[] = [
  {
    id: 'hero', position: null, camPos: V(0, 0.4, 7), lookAt: V(0, 0, 0), color: '#8fc3f0',
  },
  {
    // mesma câmera do hero — a câmera fica parada durante toda a
    // apresentação, só passa a se mover quando o scroll entra na cena "sobre"
    id: 'apresentacao', position: null, camPos: V(0, 0.4, 7), lookAt: V(0, 0, 0), color: '#8fc3f0',
  },
  {
    id: 'apresentacao-meio', position: null, camPos: V(0, 0.4, 7), lookAt: V(0, 0, 0), color: '#8fc3f0',
  },
  {
    // "nós vazios" (sem `position`, então a cena 3D os ignora) existem só pra
    // reservar scroll: cada um vale um segmento, e são eles que definem o
    // ritmo da abertura. Três deles = hero e apresentação se desenrolam com
    // calma, em vez de passarem correndo em pouquíssimo scroll.
    // PRES_TOTAL (Experience3D.tsx) tem que cobrir a mesma quantidade.
    id: 'apresentacao-fim', position: null, camPos: V(0, 0.4, 7), lookAt: V(0, 0, 0), color: '#8fc3f0',
  },
  {
    // texto à direita → mira deslocada pra direita, tela vai pra esquerda
    id: 'sobre', position: V(-2.6, 1.1, -6), camPos: V(-1.1, 0.9, -1.5), lookAt: V(-2.6 + AIM, 1.1, -6), color: '#8fc3f0',
    video: '/assets/video-sobre.mp4',
    panelSide: 'right',
    panelKey: 'sobre',
  },
  {
    // texto à esquerda → tela vai pra direita
    id: 'servicos', position: V(2.8, -0.6, -12), camPos: V(1.2, -0.3, -7), lookAt: V(2.8 - AIM, -0.6, -12), color: '#4a8fd4',
    video: '/assets/video-servicos.mp4',
    panelSide: 'left',
    panelKey: 'servicos',
  },
  {
    id: 'processo', position: V(-2.8, -1.2, -18), camPos: V(-1.1, -0.8, -13), lookAt: V(-2.8 + AIM, -1.2, -18), color: '#9aa7b8',
    video: '/assets/video-como-funciona.mp4',
    panelSide: 'right',
    panelKey: 'processo',
  },
  // (a cena "projetos" ficava aqui, entre processo e contato — removida por
  // ora. O texto dela segue pronto nos três idiomas em i18n/translations.ts,
  // sob a chave `projetos`: pra trazer de volta basta um nó novo com
  // panelKey: 'projetos'.)
  {
    // fecho do site: sem desvio de mira (lookAt no próprio nó) pra tela
    // chegar centralizada, e o texto vai DENTRO dela em vez de ao lado.
    // Câmera bem mais perto que nas outras (≈2.42 un em vez de ≈5) pra essa
    // tela dominar o quadro — é o ponto final, e o texto mora dentro dela.
    // Dois limites pra chegar mais perto que isso: abaixo de ~2.07 un a tela
    // passa da ALTURA da viewport; e a largura dela vira ~1.35× a altura da
    // viewport, então em telas menos largas que 1.35:1 ela transborda pelos
    // lados antes disso.
    // Em z=-24, e não -30, pra manter o passo de ~6 un entre cenas: sem a
    // "projetos" no meio, um salto de 12 un seria percorrido no MESMO scroll
    // de um de 6 e o trecho final passaria voando.
    id: 'contato', position: V(0, 0, -24), camPos: V(0, 0.12, -21.58), lookAt: V(0, 0, -24), color: '#8fc3f0',
    video: '/assets/video-contato.mp4',
    panelSide: 'center',
    panelKey: 'contato',
    ctaHref: 'https://wa.me/5511986812921',
  },
  {
    // nó vazio de sobra no fim, com a MESMA câmera do contato (ela não se
    // move aqui). Sem ele, a chegada da última tela caía exatamente no
    // fim do scroll e o clareamento não tinha percurso pra acontecer — o
    // visitante batia no fim da página no instante em que a tela acendia.
    id: 'fim', position: null, camPos: V(0, 0.12, -21.58), lookAt: V(0, 0, -24), color: '#8fc3f0',
  },
];
