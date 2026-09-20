import * as THREE from 'three';

export interface PanelTopic {
  title: string;
  desc: string;
}

export interface PanelContent {
  eyebrow: string;
  heading: string;
  topics: PanelTopic[];
  cta?: { label: string; href: string };
}

export interface SceneNode {
  id: string;
  /** posição do "nó" (tela) no espaço 3D — null para o hero (é o próprio chip) */
  position: THREE.Vector3 | null;
  camPos: THREE.Vector3;
  lookAt: THREE.Vector3;
  color: string;
  panel?: PanelContent;
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

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
    // segundo "nó vazio" só pra dar mais espaço de scroll pra apresentação
    // (junção da logo, feixe, textos) — sem isso ela ficava espremida em
    // pouquíssimo scroll comparado às outras cenas, parecendo bagunçada
    id: 'apresentacao-fim', position: null, camPos: V(0, 0.4, 7), lookAt: V(0, 0, 0), color: '#8fc3f0',
  },
  {
    id: 'sobre', position: V(-2.6, 1.1, -6), camPos: V(-1.1, 0.9, -1.5), lookAt: V(-2.6, 1.1, -6), color: '#8fc3f0',
    panel: {
      eyebrow: 'Quem somos',
      heading: 'Tecnologia feita por quem constrói de verdade',
      topics: [
        { title: 'Velocidade de entrega', desc: 'Do briefing ao ar em semanas, não meses.' },
        { title: 'Foco em conversão', desc: 'Cada decisão de design pensada pra gerar resultado.' },
        { title: 'Suporte direto', desc: 'Você fala com quem desenvolve, sem intermediários.' },
      ],
    },
  },
  {
    id: 'servicos', position: V(2.8, -0.6, -12), camPos: V(1.2, -0.3, -7), lookAt: V(2.8, -0.6, -12), color: '#4a8fd4',
    panel: {
      eyebrow: 'O que fazemos',
      heading: 'Tecnologia que gera resultado real',
      topics: [
        { title: 'Landpages & Sites', desc: 'Páginas rápidas e otimizadas pra converter.' },
        { title: 'Criação de Sistemas', desc: 'Painéis e plataformas sob medida.' },
        { title: 'Automação com IA', desc: 'Atendimento e fluxos inteligentes 24h.' },
        { title: 'Integrações', desc: 'Sistemas e canais num fluxo só.' },
      ],
    },
  },
  {
    id: 'processo', position: V(-2.8, -1.2, -18), camPos: V(-1.1, -0.8, -13), lookAt: V(-2.8, -1.2, -18), color: '#9aa7b8',
    panel: {
      eyebrow: 'Como funciona',
      heading: 'Um processo claro, do início ao ar',
      topics: [
        { title: '01 — Briefing', desc: 'Entendemos seu negócio e objetivos.' },
        { title: '02 — Design', desc: 'Layout validado com você antes de codar.' },
        { title: '03 — Desenvolvimento', desc: 'Código limpo, responsivo, com automações.' },
        { title: '04 — Entrega & Suporte', desc: 'Site no ar e suporte contínuo.' },
      ],
    },
  },
  {
    id: 'projetos', position: V(2.6, 1.3, -24), camPos: V(1.1, 0.9, -19), lookAt: V(2.6, 1.3, -24), color: '#4a8fd4',
    panel: {
      eyebrow: 'Projetos',
      heading: 'Sites que já colocamos no ar',
      topics: [
        { title: 'Estética Automotiva — 2024', desc: 'Agendamento online com painel administrativo.' },
        { title: 'Store — 2024', desc: 'Landing page de e-commerce com foco em conversão.' },
        { title: 'DevMovies — 2023', desc: 'Catálogo de filmes e séries por categorias.' },
      ],
    },
  },
  {
    id: 'contato', position: V(0, 0, -30), camPos: V(0, 0.3, -25), lookAt: V(0, 0, -30), color: '#8fc3f0',
    panel: {
      eyebrow: 'Contato',
      heading: 'Pronto para o próximo nível?',
      topics: [
        { title: 'Fale com a gente', desc: 'Descubra como transformar seu negócio.' },
      ],
      cta: { label: 'Falar no WhatsApp', href: 'https://wa.me/5511986812921' },
    },
  },
];
