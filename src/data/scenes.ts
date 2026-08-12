export const SCENES = [
  { id: 'hero', label: 'Início' },
  { id: 'sobre', label: 'Sobre' },
  { id: 'servicos', label: 'Serviços' },
  { id: 'processo', label: 'Processo' },
  { id: 'projetos', label: 'Projetos' },
  { id: 'contato', label: 'Contato' },
] as const;

export type SceneId = (typeof SCENES)[number]['id'];
