import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getTheme, type Theme } from '../lib/theme';

/**
 * Cores da cena 3D em cada tema. Espelham as variáveis de index.css
 * (`--bg`, `--accent`, `--hot`...) — o three.js não lê custom property do CSS,
 * então os valores moram aqui também. Mudou lá, mude aqui.
 *
 * No claro o brilho aditivo some (somar luz num fundo claro não aparece), então
 * a cabeça e a cauda dos feixes passam a ser desenhadas com mistura normal e
 * em azul escuro, e o bloom é desligado.
 */
export const CENA: Record<
  Theme,
  {
    fundo: string;
    estrelas: string;
    estrelasOpacidade: number;
    cauda: string;
    halo: string;
    nucleo: string;
    blending: THREE.Blending;
    bloom: number;
    /** quanto escurecer (luminosidade) a cor de borda das telas */
    escurecerBorda: number;
  }
> = {
  dark: {
    fundo: '#050810',
    estrelas: '#8fc3f0',
    estrelasOpacidade: 0.55,
    cauda: '#ffffff',
    halo: '#ffffff',
    nucleo: '#ffffff',
    blending: THREE.AdditiveBlending,
    bloom: 1.4,
    escurecerBorda: 0,
  },
  light: {
    fundo: '#f3f7fc',
    estrelas: '#2a6db5',
    estrelasOpacidade: 0.5,
    cauda: '#1d5aa0',
    halo: '#2a6db5',
    nucleo: '#0a2a52',
    blending: THREE.NormalBlending,
    bloom: 0,
    escurecerBorda: 0.3,
  },
};

/** cor de borda de uma tela no tema atual: no claro, a cor do nó escurece
 * pra ter contraste com o fundo */
export function corDeBorda(hex: string, tema: Theme) {
  const cor = new THREE.Color(hex);
  const quanto = CENA[tema].escurecerBorda;
  if (quanto > 0) cor.offsetHSL(0, 0, -quanto);
  return cor;
}

/**
 * Chama `aoMudar` no primeiro frame e depois a cada troca de tema. Lê direto
 * de `getTheme()` (não do React) pra o frame logo após a troca já sair com as
 * cores novas — é esse frame que a transição de tema captura.
 */
export function useMudancaDeTema(aoMudar: (tema: Theme) => void) {
  const ultimo = useRef<Theme | null>(null);
  useFrame(() => {
    const tema = getTheme();
    if (tema === ultimo.current) return;
    ultimo.current = tema;
    aoMudar(tema);
  });
}
