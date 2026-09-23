import { useEffect, useRef, useState, type ElementType } from 'react';

// glifos que ocupam o lugar de cada letra enquanto ela ainda não assentou —
// dígitos e símbolos técnicos, pra dar leitura de dado bruto virando palavra
const GLYPHS = '01#%&*+=<>[]{}/\\|';

const glifo = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

const prefereReduzido = () =>
  typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** embaralha mantendo os espaços — sem eles a palavra vira um bloco só e
 * some a silhueta do texto, que é o que segura o layout durante a entrada */
const ruido = (texto: string) =>
  texto.split('').map((c) => (c === ' ' ? ' ' : glifo())).join('');

/**
 * Texto que "materializa": começa como ruído do mesmo comprimento e vai
 * resolvendo da esquerda pra direita até virar a frase real.
 *
 * O ruído inicial tem o tamanho final de propósito — assim o elemento já
 * ocupa o espaço certo desde o primeiro frame e nada pula de lugar quando
 * o texto aparece.
 */
export default function ScrambleText({
  text,
  delay = 0,
  duration = 700,
  className,
  as: Tag = 'span',
}: {
  text: string;
  /** espera antes de começar a resolver (pra escalonar os elementos) */
  delay?: number;
  /** tempo até resolver por inteiro — fixo, não por caractere, senão frase
   * longa demoraria muito mais que frase curta e a sequência desandava */
  duration?: number;
  className?: string;
  as?: ElementType;
}) {
  const [visivel, setVisivel] = useState(() => (prefereReduzido() ? text : ruido(text)));
  const frameRef = useRef(0);
  const primeiraVezRef = useRef(true);

  useEffect(() => {
    // o delay existe pra escalonar a abertura do site. Numa troca de idioma
    // ele só faria o texto demorar a voltar, então a partir da segunda vez
    // a materialização começa na hora.
    const espera = primeiraVezRef.current ? delay : 0;
    primeiraVezRef.current = false;

    if (prefereReduzido()) {
      setVisivel(text);
      return;
    }

    const inicio = performance.now() + espera;
    const passo = (agora: number) => {
      const decorrido = agora - inicio;
      if (decorrido < 0) {
        // ainda na espera: segue como ruído
        setVisivel(ruido(text));
        frameRef.current = requestAnimationFrame(passo);
        return;
      }
      const frente = (decorrido / duration) * text.length;
      if (frente >= text.length) {
        setVisivel(text);
        return;
      }
      let saida = '';
      for (let i = 0; i < text.length; i += 1) {
        const c = text[i];
        saida += i < frente || c === ' ' ? c : glifo();
      }
      setVisivel(saida);
      frameRef.current = requestAnimationFrame(passo);
    };

    frameRef.current = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(frameRef.current);
  }, [text, delay, duration]);

  // o texto real fica no DOM pra leitor de tela e indexação; o que anima é
  // uma cópia decorativa, escondida da acessibilidade
  return (
    <Tag className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{visivel}</span>
    </Tag>
  );
}
