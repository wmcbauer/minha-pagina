import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useScroll, Points, PointMaterial, useVideoTexture } from '@react-three/drei';
import * as THREE from 'three';
import { SCENE_NODES, type PanelSide } from './nodesConfig';
import { useCompactLayout } from '../hooks/useCompactLayout';

/** Quanto a tela é girada — o sentido depende de cada nó (ver screenRotationY). */
const NODE_ROTATION_Y = Math.PI / 6;

/** Direção do giro da tela: sempre encarando o lado onde está o painel de
 * texto (panelSide, em nodesConfig.ts) — nunca girada pro lado errado,
 * de costas pro próprio texto. Com o texto DENTRO dela ('center') não há
 * giro: o painel é HTML plano e não acompanharia a perspectiva do plano
 * inclinado, então a tela vem de frente pra câmera. */
function screenRotationY(panelSide: PanelSide | undefined, compacto: boolean) {
  // em layout compacto todo texto vai pra dentro da tela, então toda tela
  // vem de frente — girada, o texto 2D não acompanharia a perspectiva
  if (compacto || panelSide === 'center') return 0;
  return panelSide === 'left' ? -NODE_ROTATION_Y : NODE_ROTATION_Y;
}

/** quanto o vídeo assenta de brilho quando o texto fica por cima dele — só
 * o estado de REPOUSO: o clareamento da chegada continua indo até 1 */
const VIDEO_DIM_ATRAS_DO_TEXTO = 0.15;

/**
 * A borda fica um fio À FRENTE do plano, em vez de exatamente em cima dele.
 * Coplanares, os dois disputam o mesmo valor de profundidade e o teste
 * decide pixel a pixel quem aparece — e a aresta MAIS DISTANTE perde, por
 * ter menos precisão de profundidade. Como a câmera olha levemente de cima,
 * a aresta mais distante é a de baixo: era ela que sumia.
 * O valor é pequeno demais pra deslocar a borda visivelmente (menos de 1px
 * na tela), mas já basta pra ela ganhar o teste sempre.
 */
const BORDA_A_FRENTE = 0.005;

/**
 * Textura de brilho com gradiente radial (borda suave de verdade, não uma
 * esfera geométrica com bloom por cima) — gerada uma única vez via canvas e
 * reaproveitada em todos os feixes, igual à técnica usada em cenas 3D de
 * referência pra esse tipo de brilho suave sempre de frente pra câmera.
 */
const GLOW_TEXTURE = (() => {
  if (typeof document === 'undefined') return null;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.85)');
  gradient.addColorStop(0.55, 'rgba(255,255,255,0.18)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
})();

/**
 * Proporção de referência das distâncias de câmera em nodesConfig.ts: elas
 * foram escolhidas olhando uma viewport larga (~16:10).
 */
const ASPECT_REF = 1.6;

/**
 * O campo de visão da câmera é VERTICAL: a altura de mundo visível depende
 * só da distância, mas a LARGURA visível é essa altura × proporção da tela.
 * Numa tela estreita ou em retrato cabe muito menos largura, e as telas
 * (3.4 unidades) estouravam pelos lados — no celular chegavam a ser mais
 * largas que a viewport inteira.
 *
 * Então a câmera se afasta do ponto que está mirando na mesma medida em que
 * a proporção aperta. Em tela larga o fator é 1 e nada muda.
 */
function fatorDeAfastamento(aspect: number) {
  if (!Number.isFinite(aspect) || aspect <= 0) return 1;
  return Math.max(1, ASPECT_REF / aspect);
}

/**
 * Em layout compacto o texto não cabe DENTRO da tela (ela fica com ~84% da
 * largura da viewport, e o texto precisaria de mais que isso), então a
 * composição vira empilhada: tela em cima, texto embaixo. Pra isso a câmera
 * mira um pouco ABAIXO do nó, o que empurra a tela pra parte de cima do
 * quadro e libera a metade de baixo pro texto.
 *
 * Fração da altura visível: 0.18 sobe a tela o suficiente pra ela ficar
 * centrada em ~32% da altura, deixando a faixa de baixo livre.
 */
const MIRA_ABAIXO = 0.18;

/** Câmera viaja pelo espaço 3D seguindo o offset de scroll (0 → 1). */
function CameraRig() {
  const scroll = useScroll();
  const compacto = useCompactLayout();
  const tmpPos = useMemo(() => new THREE.Vector3(), []);
  const tmpLook = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const segCount = SCENE_NODES.length - 1;
    // scroll.offset pode vir NaN nos primeiros frames, antes do drei medir o
    // layout de scroll — sem essa guarda, o índice vira NaN e quebra tudo.
    const offset = Number.isFinite(scroll.offset) ? THREE.MathUtils.clamp(scroll.offset, 0, 1) : 0;
    const f = offset * segCount;
    const i = Math.min(segCount - 1, Math.max(0, Math.floor(f)));
    const t = THREE.MathUtils.smoothstep(f - i, 0, 1);
    const a = SCENE_NODES[i];
    const b = SCENE_NODES[i + 1];

    tmpPos.lerpVectors(a.camPos, b.camPos, t);
    tmpLook.lerpVectors(a.lookAt, b.lookAt, t);

    // afasta ao longo da própria direção de visão, então o enquadramento é
    // o mesmo — só mais longe, o que faz a largura da tela voltar a caber
    const fator = fatorDeAfastamento(state.size.width / state.size.height);
    if (fator > 1) tmpPos.sub(tmpLook).multiplyScalar(fator).add(tmpLook);

    // sobe a tela no quadro pra abrir espaço pro texto embaixo. Só vale onde
    // existe tela: na abertura (nós sem `position`) o hero é HTML e não se
    // move. O peso interpola entre os dois extremos do segmento, senão o
    // desvio saltaria de 1 pra 0 na virada de um segmento pro outro.
    if (compacto) {
      const peso = THREE.MathUtils.lerp(a.position ? 1 : 0, b.position ? 1 : 0, t);
      if (peso > 0) {
        // desfaz o desvio lateral do AIM (nodesConfig.ts): ele abre espaço
        // pro painel AO LADO, e em pilha o texto vai embaixo — a tela tem
        // que voltar pro centro horizontal
        const alvoX = THREE.MathUtils.lerp(
          a.position?.x ?? a.lookAt.x,
          b.position?.x ?? b.lookAt.x,
          t,
        );
        tmpLook.x = THREE.MathUtils.lerp(tmpLook.x, alvoX, peso);

        const distancia = tmpPos.distanceTo(tmpLook);
        const fov = (state.camera as THREE.PerspectiveCamera).fov;
        const alturaVisivel = 2 * distancia * Math.tan((fov * Math.PI) / 360);
        tmpLook.y -= alturaVisivel * MIRA_ABAIXO * peso;
      }
    }

    state.camera.position.lerp(tmpPos, 0.18);
    const currentLook = state.camera.userData.look ?? tmpLook.clone();
    currentLook.lerp(tmpLook, 0.18);
    state.camera.userData.look = currentLook;
    state.camera.lookAt(currentLook);
  });

  return null;
}

// quão antes da chegada a tela começa a se revelar — só o instante final da
// aproximação, não o trajeto inteiro (ela fica invisível até quase o ponto
// de energia chegar nela)
const REVEAL_WINDOW = 0.03;

const SEG_COUNT_CENA = SCENE_NODES.length - 1;
// quanto a tela ainda segura acesa depois que a energia passa, antes de
// começar a sumir. Curto de propósito: a câmera já está indo embora nesse
// trecho, então tela parada acesa vira uma placa atravessando o quadro.
const SAIDA_HOLD = (1 / SEG_COUNT_CENA) * 0.1;
// última tela com conteúdo: é o fecho do site e não some — o visitante
// termina olhando pra ela
const ULTIMA_TELA = SCENE_NODES.reduce((ultimo, n, i) => (n.position ? i : ultimo), -1);

/**
 * Visibilidade da tela ao longo do scroll. A saída é o espelho da entrada:
 * mesma janela (REVEAL_WINDOW), só que ao contrário, quando a energia segue
 * pra próxima. Antes a tela revelava e ficava acesa PRA SEMPRE, então ela
 * continuava passando pelo quadro enquanto a câmera ia embora.
 */
function screenExit(offset: number, targetOffset: number, index: number) {
  if (index === ULTIMA_TELA) return 1;
  const inicioSaida = targetOffset + SAIDA_HOLD;
  return 1 - THREE.MathUtils.smoothstep(offset, inicioSaida, inicioSaida + REVEAL_WINDOW);
}

function screenVisibility(offset: number, targetOffset: number, index: number) {
  const entra = THREE.MathUtils.smoothstep(offset, targetOffset - REVEAL_WINDOW, targetOffset);
  return entra * screenExit(offset, targetOffset, index);
}

// tamanho da "tela" em unidades de mundo — grande o bastante pra ocupar de
// verdade o seu lado da viewport, dividindo o espaço com o painel de texto
// (a folga do painel, PANEL_GAP em Experience3D.tsx, acompanha esse valor)
const SCREEN_W = 3.4;
const SCREEN_H = 2.15;
const SCREEN_PLANE_GEO = new THREE.PlaneGeometry(SCREEN_W, SCREEN_H);

/** Uma "tela" que só aparece quando o ponto de energia chega nela, e
 * continua acendendo mais conforme o scroll segue por perto. */
function ScreenNode({ index }: { index: number }) {
  const node = SCENE_NODES[index];
  const scroll = useScroll();
  const compacto = useCompactLayout();
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const edgeMatRef = useRef<THREE.LineBasicMaterial>(null);
  const segCount = SCENE_NODES.length - 1;
  const targetOffset = index / segCount;

  useFrame(() => {
    if (!matRef.current) return;
    const offset = Number.isFinite(scroll.offset) ? scroll.offset : 0;
    const dist = Math.abs(offset - targetOffset) * segCount;
    const intensity = THREE.MathUtils.clamp(1 - dist, 0.08, 1) * 1.6;
    matRef.current.emissiveIntensity = THREE.MathUtils.lerp(matRef.current.emissiveIntensity, intensity, 0.1);

    // invisível até o ponto de energia chegar (offset alcança targetOffset)
    // — revela suavemente só nesse instante final, e some da mesma forma
    // quando a energia segue adiante
    const visivel = screenVisibility(offset, targetOffset, index);
    matRef.current.opacity = visivel;
    if (edgeMatRef.current) edgeMatRef.current.opacity = visivel;
  });

  if (!node.position) return null;

  const rotY = screenRotationY(node.panelSide, compacto);

  return (
    // a rotação vive no grupo pra que o deslocamento da borda acompanhe a
    // inclinação da tela (ele precisa ser ao longo da normal do plano)
    <group position={node.position} rotation={[0, rotY, 0]}>
      <mesh>
        <planeGeometry args={[SCREEN_W, SCREEN_H]} />
        <meshStandardMaterial
          ref={matRef}
          color="#101828"
          emissive={node.color}
          emissiveIntensity={0.1}
          side={THREE.DoubleSide}
          metalness={0.4}
          roughness={0.4}
          transparent
          opacity={0}
        />
      </mesh>
      <lineSegments position={[0, 0, BORDA_A_FRENTE]}>
        <edgesGeometry args={[SCREEN_PLANE_GEO]} />
        <lineBasicMaterial ref={edgeMatRef} color={node.color} transparent opacity={0} />
      </lineSegments>
    </group>
  );
}

/**
 * Tela que exibe um vídeo (o "como funciona"). Mesma revelação das outras,
 * mas com cara de TV ligando: o painel preto aparece primeiro, o vídeo vai
 * clareando do escuro até o brilho normal e dá um estouro curto de luz bem
 * no instante em que a energia chega — o vídeo também só roda enquanto essa
 * tela está à vista, sempre começando do zero.
 */
function VideoScreenNode({ index }: { index: number }) {
  const node = SCENE_NODES[index];
  const scroll = useScroll();
  const texture = useVideoTexture(node.video!, { muted: true, loop: true, start: false, playsInline: true });
  const compacto = useCompactLayout();
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const edgeMatRef = useRef<THREE.LineBasicMaterial>(null);
  const playingRef = useRef(false);
  const segCount = SCENE_NODES.length - 1;
  const targetOffset = index / segCount;

  useFrame(() => {
    const offset = Number.isFinite(scroll.offset) ? scroll.offset : 0;
    const visivel = screenVisibility(offset, targetOffset, index);

    const video = texture.image as HTMLVideoElement | undefined;
    if (video) {
      if (visivel > 0.02 && !playingRef.current) {
        playingRef.current = true;
        video.currentTime = 0;
        void video.play();
      } else if (visivel <= 0.02 && playingRef.current) {
        playingRef.current = false;
        video.pause();
      }
    }

    if (matRef.current) {
      // o painel (preto) aparece bem antes do conteúdo acender — é isso que
      // dá a leitura de "tela ligando", em vez de a imagem só surgir do nada.
      // Na saída ele acompanha `visivel`, pra sumir junto com o resto.
      const entradaDoPainel = THREE.MathUtils.smoothstep(
        offset,
        targetOffset - REVEAL_WINDOW,
        targetOffset - REVEAL_WINDOW * 0.55,
      );
      matRef.current.opacity = entradaDoPainel * screenExit(offset, targetOffset, index);
      // estouro curto de brilho bem no instante da chegada, antes de
      // assentar no brilho normal (acima de 1 o bloom pega e estoura)
      const turnOnFlash = Math.max(0, 1 - Math.abs(offset - targetOffset) / (REVEAL_WINDOW * 0.6));
      // com texto por cima, o vídeo ainda acende INTEIRO na chegada (mesmo
      // clareamento das outras telas) e só depois assenta no escuro, já com
      // o texto por cima. Escurecer desde a chegada matava justamente o
      // momento em que a tela liga.
      let brilhoBase = 1;
      // escurece só quando há texto POR CIMA do vídeo. Em layout compacto o
      // texto vai abaixo da tela, não sobre ela, então o vídeo fica cheio.
      if (!compacto && node.panelSide === 'center') {
        const assentou = THREE.MathUtils.smoothstep(
          offset,
          targetOffset,
          targetOffset + REVEAL_WINDOW * 2,
        );
        brilhoBase = THREE.MathUtils.lerp(1, VIDEO_DIM_ATRAS_DO_TEXTO, assentou);
      }
      matRef.current.color.setScalar(visivel * (brilhoBase + turnOnFlash * 1.6));
    }
    if (edgeMatRef.current) edgeMatRef.current.opacity = visivel;
  });

  if (!node.position) return null;

  const rotY = screenRotationY(node.panelSide, compacto);

  return (
    <group position={node.position} rotation={[0, rotY, 0]}>
      <mesh>
        <planeGeometry args={[SCREEN_W, SCREEN_H]} />
        <meshBasicMaterial
          ref={matRef}
          map={texture}
          color="#000000"
          side={THREE.DoubleSide}
          toneMapped={false}
          transparent
          opacity={0}
        />
      </mesh>
      <lineSegments position={[0, 0, BORDA_A_FRENTE]}>
        <edgesGeometry args={[SCREEN_PLANE_GEO]} />
        <lineBasicMaterial ref={edgeMatRef} color={node.color} transparent opacity={0} />
      </lineSegments>
    </group>
  );
}

/**
 * Trilha curva do chip (ou nó anterior) até o nó — o feixe viaja de acordo
 * com o scroll. A cauda é um tubo que segue exatamente a curva (não uma
 * linha reta ao lado dela) e afunila até sumir na ponta mais antiga.
 */
const UP_AXIS = new THREE.Vector3(0, 1, 0);

// quanto da curva (em unidades de t, 0–1) a cauda cobre atrás da cabeça
const TAIL_T_SPAN = 0.42;
const TUBULAR_SEGMENTS = 20;
const RADIAL_SEGMENTS = 6;
const HEAD_RADIUS = 0.012;

/** Cria a geometria do tubo uma única vez (posições são reescritas todo frame). */
function useTailGeometry() {
  return useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const vertCount = (TUBULAR_SEGMENTS + 1) * (RADIAL_SEGMENTS + 1);
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertCount * 3), 3));
    const indices: number[] = [];
    for (let i = 0; i < TUBULAR_SEGMENTS; i++) {
      for (let j = 0; j < RADIAL_SEGMENTS; j++) {
        const a = i * (RADIAL_SEGMENTS + 1) + j;
        const b = a + RADIAL_SEGMENTS + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    geo.setIndex(indices);
    return geo;
  }, []);
}

/**
 * Velocidade/direção do scroll — calculada UMA VEZ só (aqui), não uma vez
 * por trilha. Antes, cada DataTrail tinha seu próprio prevOffsetRef/
 * velocityRef independente; mesmo lendo o mesmo scroll.offset, cada um
 * suavizava (lerp) esse valor separadamente, então bem na fronteira entre
 * uma trilha terminando e a próxima começando os dois liam números
 * ligeiramente diferentes — o suficiente pra "a energia sair" não
 * acontecer exatamente junto com "a energia anterior chegar". Com uma
 * fonte só, compartilhada via ref, todas as trilhas (e o handoff entre
 * elas) leem o EXATO mesmo valor no mesmo frame.
 */
function ScrollVelocityTracker({
  velocityRef,
  directionRef,
}: {
  velocityRef: React.MutableRefObject<number>;
  directionRef: React.MutableRefObject<number>;
}) {
  const scroll = useScroll();
  const prevOffsetRef = useRef(0);

  useFrame(() => {
    const offset = Number.isFinite(scroll.offset) ? scroll.offset : 0;
    const rawDelta = offset - prevOffsetRef.current;
    prevOffsetRef.current = offset;
    if (Math.abs(rawDelta) > 0.00005) directionRef.current = Math.sign(rawDelta);
    const targetVelocity = THREE.MathUtils.clamp(Math.abs(rawDelta) * 400, 0, 1);
    velocityRef.current = THREE.MathUtils.lerp(velocityRef.current, targetVelocity, targetVelocity > velocityRef.current ? 0.9 : 0.1);
  });

  return null;
}

function DataTrail({
  index,
  velocityRef,
  directionRef,
}: {
  index: number;
  velocityRef: React.MutableRefObject<number>;
  directionRef: React.MutableRefObject<number>;
}) {
  const from = SCENE_NODES[index - 1]?.position ?? new THREE.Vector3(0, 0, 0);
  const to = SCENE_NODES[index].position!;
  const mid = useMemo(
    () => new THREE.Vector3((from.x + to.x) / 2, (from.y + to.y) / 2 + 1.2, (from.z + to.z) / 2),
    [from, to],
  );
  const curve = useMemo(() => new THREE.QuadraticBezierCurve3(from, mid, to), [from, mid, to]);
  const headRef = useRef<THREE.Group>(null);
  const tailGeo = useTailGeometry();
  const tailMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const haloMatRef = useRef<THREE.SpriteMaterial>(null);
  const coreMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const coreMeshRef = useRef<THREE.Mesh>(null);
  const pointLightRef = useRef<THREE.PointLight>(null);
  const tangent = useMemo(() => new THREE.Vector3(), []);
  const point = useMemo(() => new THREE.Vector3(), []);
  const normal = useMemo(() => new THREE.Vector3(), []);
  const binormal = useMemo(() => new THREE.Vector3(), []);
  const scroll = useScroll();
  const segCount = SCENE_NODES.length - 1;
  // este trecho da viagem começa quando a cena anterior está ativa e termina
  // quando o scroll chega na cena de destino (index) — o feixe "chega" na
  // tela exatamente quando ela vira a cena atual.
  const segStart = (index - 1) / segCount;
  const segLen = 1 / segCount;

  useFrame((state) => {
    const offset = Number.isFinite(scroll.offset) ? scroll.offset : 0;
    const t = THREE.MathUtils.clamp((offset - segStart) / segLen, 0, 1);
    const dir = directionRef.current;

    // só esse trecho conta como "em foco" — os outros feixes ficam invisíveis
    // mesmo rolando, em vez de todos reagirem ao mesmo tempo
    const rawT = (offset - segStart) / segLen;
    const outsideSeg = Math.max(0, -rawT, rawT - 1);
    const segFactor = THREE.MathUtils.clamp(1 - outsideSeg * 8, 0, 1);
    const activeVelocity = velocityRef.current * segFactor;

    // cabeça — núcleo + halo, presos exatamente na curva
    if (headRef.current) {
      curve.getPointAt(t, point);
      curve.getTangentAt(Math.max(t, 0.001), tangent).normalize();
      headRef.current.position.copy(point);
      headRef.current.quaternion.setFromUnitVectors(UP_AXIS, tangent);

      // piscada de brilho rápida e meio errática (tipo elétrica), só forte
      // durante o scroll — combina duas frequências + ruído pra não ficar um
      // sino perfeitinho, mais "vivo"
      const et = state.clock.elapsedTime;
      const noise = Math.sin(et * 47 + index * 9.1) * Math.sin(et * 23 + index * 3.7);

      // mesmo comportamento do ponto que conecta a apresentação às telas
      // (applyCurvedBeam em Experience3D.tsx): fica mais intenso conforme
      // se aproxima do destino, como se estivesse carregando energia pra
      // entregar — pros dois pontos (2D e 3D) parecerem exatamente a
      // mesma coisa, só que em mundos diferentes
      const approachGlow = 1 + t * t * 1.6;
      const brightBoost = (1 + activeVelocity * 1.4 + Math.max(0, noise) * activeVelocity * 1.2) * approachGlow;
      // o ponto (núcleo + halo) só existe DE VERDADE enquanto o scroll está
      // rolando — sem piso, sem exceção. O piso que existia aqui foi um
      // remendo pra disfarçar um delay entre trilhas que na verdade vinha de
      // outro lugar (offset bruto vs. amortecido, já corrigido em
      // Experience3D.tsx); agora que a causa raiz sumiu, todas as trilhas
      // (2D e 3D) compartilham a MESMA velocidade a cada frame — uma pausa
      // no meio do scroll apaga todo mundo igual, no mesmo instante, então
      // não sobra vazio nem sobra ponto grudado sem motivo.
      const headVisible = activeVelocity;
      if (haloMatRef.current) {
        haloMatRef.current.color.setScalar(brightBoost);
        haloMatRef.current.opacity = 0.85 * headVisible;
      }
      if (coreMatRef.current) {
        coreMatRef.current.color.setScalar(brightBoost);
        coreMatRef.current.opacity = headVisible;
      }

      // pulsação de tamanho da esfera — pequena, suave, só durante o scroll,
      // separada do brilho: dá a sensação de energia passando pulsando
      if (coreMeshRef.current) {
        const sizePulse = (1 + Math.sin(et * 16 + index * 2.3) * 0.22 * activeVelocity) * (1 + t * t * 0.35);
        coreMeshRef.current.scale.setScalar(sizePulse);
      }

      // luz de verdade viajando junto com o feixe — ilumina o chip e as
      // telas por perto, fazendo eles reagirem/piscarem conforme ela passa,
      // dando a sensação de energia correndo pelo ambiente (não só um brilho
      // parado no próprio ponto)
      if (pointLightRef.current) {
        pointLightRef.current.intensity = activeVelocity * (1.6 + Math.max(0, noise) * 2.2);
      }
    }

    // cauda — tubo desenhado em cima da própria curva, afunilando até 0 na
    // ponta antiga; estica pro lado oposto ao sentido do scroll atual
    const pos = tailGeo.attributes.position.array as Float32Array;
    for (let i = 0; i <= TUBULAR_SEGMENTS; i++) {
      const frac = i / TUBULAR_SEGMENTS; // 0 = ponta antiga (sumindo), 1 = cabeça
      const tt = THREE.MathUtils.clamp(t - dir * TAIL_T_SPAN * (1 - frac), 0, 1);
      curve.getPointAt(tt, point);
      curve.getTangentAt(Math.max(tt, 0.001), tangent).normalize();
      normal.set(0, 1, 0);
      if (Math.abs(tangent.dot(normal)) > 0.9) normal.set(1, 0, 0);
      binormal.crossVectors(tangent, normal).normalize();
      normal.crossVectors(binormal, tangent).normalize();
      const radius = HEAD_RADIUS * frac * frac; // afunila rápido — some perto da ponta antiga
      for (let j = 0; j <= RADIAL_SEGMENTS; j++) {
        const angle = (j / RADIAL_SEGMENTS) * Math.PI * 2;
        const cx = Math.cos(angle) * radius;
        const cy = Math.sin(angle) * radius;
        const idx = (i * (RADIAL_SEGMENTS + 1) + j) * 3;
        pos[idx] = point.x + normal.x * cx + binormal.x * cy;
        pos[idx + 1] = point.y + normal.y * cx + binormal.y * cy;
        pos[idx + 2] = point.z + normal.z * cx + binormal.z * cy;
      }
    }
    tailGeo.attributes.position.needsUpdate = true;
    tailGeo.computeBoundingSphere();

    // rastro só fica visível enquanto o scroll está se movendo NESSE trecho —
    // e brilha mais forte quanto mais rápido o scroll (cor acima de 1 pra
    // empurrar o bloom)
    if (tailMatRef.current) {
      tailMatRef.current.opacity = activeVelocity;
      const boost = 1 + activeVelocity * 1.6;
      tailMatRef.current.color.setScalar(boost);
    }
  });

  return (
    <>
      {/* cauda — tubo colado na curva, afunilando até sumir, só visível em movimento */}
      <mesh geometry={tailGeo}>
        <meshBasicMaterial ref={tailMatRef} color="#ffffff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>

      <group ref={headRef}>
        {/* halo — sprite com gradiente radial (borda suave de verdade), sempre
            de frente pra câmera, bem menor que antes */}
        {GLOW_TEXTURE && (
          <sprite scale={[0.06, 0.06, 1]}>
            <spriteMaterial ref={haloMatRef} map={GLOW_TEXTURE} color="#ffffff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </sprite>
        )}

        {/* núcleo — só um pouco maior que a linha, pra se destacar sem virar bola */}
        <mesh ref={coreMeshRef}>
          <sphereGeometry args={[0.014, 12, 12]} />
          <meshBasicMaterial ref={coreMatRef} color="#ffffff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>

        {/* luz de verdade que viaja com o feixe — ilumina o chip/telas por
            perto, criando a sensação de energia passando pelo ambiente */}
        <pointLight ref={pointLightRef} color="#bfe3ff" intensity={0} distance={4.5} decay={2} />
      </group>
    </>
  );
}

/** Campo de partículas de fundo — bem barato (Points únicos). */
function Starfield() {
  const positions = useMemo(() => {
    const arr = new Float32Array(400 * 3);
    for (let i = 0; i < 400; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 40;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 24;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 60 - 10;
    }
    return arr;
  }, []);

  return (
    <Points positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial transparent color="#8fc3f0" size={0.035} sizeAttenuation depthWrite={false} opacity={0.55} />
    </Points>
  );
}

export default function ChipScene() {
  // compartilhada entre TODAS as trilhas (ver ScrollVelocityTracker) — é
  // isso que garante a energia de uma trilha sair exatamente no mesmo
  // instante em que a anterior chega, sem depender de cada uma suavizar a
  // própria velocidade separadamente
  const velocityRef = useRef(0);
  const directionRef = useRef(1);

  return (
    <>
      <ScrollVelocityTracker velocityRef={velocityRef} directionRef={directionRef} />
      <CameraRig />
      <Starfield />
      {SCENE_NODES.map((n, index) => {
        if (!n.position) return null; // hero e apresentação não têm tela — só a câmera passa por eles
        return (
          <group key={n.id}>
            {n.video ? <VideoScreenNode index={index} /> : <ScreenNode index={index} />}
            <DataTrail index={index} velocityRef={velocityRef} directionRef={directionRef} />
          </group>
        );
      })}
    </>
  );
}
