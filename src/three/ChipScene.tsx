import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useScroll, Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { SCENE_NODES } from './nodesConfig';

/** Mesmo ângulo das telas — o texto acompanha essa inclinação. */
const NODE_ROTATION_Y = Math.PI / 6;

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

/** Câmera viaja pelo espaço 3D seguindo o offset de scroll (0 → 1). */
function CameraRig() {
  const scroll = useScroll();
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

/** Uma "tela" que só aparece quando o ponto de energia chega nela, e
 * continua acendendo mais conforme o scroll segue por perto. */
function ScreenNode({ index }: { index: number }) {
  const node = SCENE_NODES[index];
  const scroll = useScroll();
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
    // — revela suavemente só nesse instante final, não durante toda a
    // aproximação
    const appear = THREE.MathUtils.smoothstep(offset, targetOffset - REVEAL_WINDOW, targetOffset);
    matRef.current.opacity = appear;
    if (edgeMatRef.current) edgeMatRef.current.opacity = appear;
  });

  if (!node.position) return null;

  return (
    <group position={node.position}>
      <mesh rotation={[0, NODE_ROTATION_Y, 0]}>
        <planeGeometry args={[1.5, 0.95]} />
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
      <lineSegments rotation={[0, NODE_ROTATION_Y, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(1.5, 0.95)]} />
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
            <ScreenNode index={index} />
            <DataTrail index={index} velocityRef={velocityRef} directionRef={directionRef} />
          </group>
        );
      })}
    </>
  );
}
