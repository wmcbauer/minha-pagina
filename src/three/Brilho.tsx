import { EffectComposer, Bloom } from '@react-three/postprocessing';

/**
 * Bloom da cena 3D, num arquivo à parte pra virar um pedaço de código
 * separado (a biblioteca postprocessing pesa quase tanto quanto o three.js).
 * Experience3D só o carrega quando o visitante começa a rolar: durante a
 * abertura a cena fica inteira coberta pela apresentação, então o brilho não
 * faz falta nenhuma — e baixar/executar isso junto com o resto era boa parte
 * do travamento no celular.
 */
export default function Brilho({ intensidade }: { intensidade: number }) {
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={intensidade}
        luminanceThreshold={0.15}
        luminanceSmoothing={0.3}
        mipmapBlur
        radius={0.7}
      />
    </EffectComposer>
  );
}
