import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useScroll, QuadraticBezierLine, Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { SCENE_NODES } from './nodesConfig';

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

/** O chip central — origem de tudo, no hero. */
function Chip() {
  const ref = useRef<THREE.Group>(null);
  const dots = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let x = -1; x <= 1; x += 0.5) {
      for (let y = -1; y <= 1; y += 0.5) {
        pts.push([x * 0.6, y * 0.6, 0.06]);
      }
    }
    return pts;
  }, []);

  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.15;
  });

  return (
    <group ref={ref}>
      <mesh>
        <boxGeometry args={[1.6, 1.6, 0.12]} />
        <meshStandardMaterial color="#101828" emissive="#4a8fd4" emissiveIntensity={0.25} metalness={0.6} roughness={0.35} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(1.6, 1.6, 0.12)]} />
        <lineBasicMaterial color="#8fc3f0" />
      </lineSegments>
      {dots.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshStandardMaterial color="#8fc3f0" emissive="#8fc3f0" emissiveIntensity={1.4} />
        </mesh>
      ))}
    </group>
  );
}

/** Uma "tela" que acende conforme o scroll se aproxima dela. */
function ScreenNode({ index }: { index: number }) {
  const node = SCENE_NODES[index];
  const scroll = useScroll();
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const segCount = SCENE_NODES.length - 1;
  const targetOffset = index / segCount;

  useFrame(() => {
    if (!matRef.current) return;
    const offset = Number.isFinite(scroll.offset) ? scroll.offset : 0;
    const dist = Math.abs(offset - targetOffset) * segCount;
    const intensity = THREE.MathUtils.clamp(1 - dist, 0.08, 1) * 1.6;
    matRef.current.emissiveIntensity = THREE.MathUtils.lerp(matRef.current.emissiveIntensity, intensity, 0.1);
  });

  if (!node.position) return null;

  return (
    <group position={node.position}>
      <mesh rotation={[0, Math.PI / 6, 0]}>
        <planeGeometry args={[1.5, 0.95]} />
        <meshStandardMaterial
          ref={matRef}
          color="#101828"
          emissive={node.color}
          emissiveIntensity={0.1}
          side={THREE.DoubleSide}
          metalness={0.4}
          roughness={0.4}
        />
      </mesh>
      <lineSegments rotation={[0, Math.PI / 6, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(1.5, 0.95)]} />
        <lineBasicMaterial color={node.color} />
      </lineSegments>
    </group>
  );
}

/** Trilha curva do chip (ou nó anterior) até o nó, com uma partícula fluindo continuamente. */
function DataTrail({ index }: { index: number }) {
  const from = SCENE_NODES[index - 1]?.position ?? new THREE.Vector3(0, 0, 0);
  const to = SCENE_NODES[index].position!;
  const mid = useMemo(
    () => new THREE.Vector3((from.x + to.x) / 2, (from.y + to.y) / 2 + 1.2, (from.z + to.z) / 2),
    [from, to],
  );
  const curve = useMemo(() => new THREE.QuadraticBezierCurve3(from, mid, to), [from, mid, to]);
  const particleRef = useRef<THREE.Mesh>(null);
  const speed = 0.12;
  const phase = index * 0.37;

  useFrame((state) => {
    if (!particleRef.current) return;
    const t = (state.clock.elapsedTime * speed + phase) % 1;
    const p = curve.getPointAt(t);
    particleRef.current.position.copy(p);
  });

  return (
    <>
      <QuadraticBezierLine start={from} end={to} mid={mid} color="#4a8fd4" lineWidth={1} transparent opacity={0.35} />
      <mesh ref={particleRef}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#eef2f6" emissive="#8fc3f0" emissiveIntensity={2} />
      </mesh>
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
  return (
    <>
      <CameraRig />
      <Starfield />
      <Chip />
      {SCENE_NODES.slice(1).map((n, i) => (
        <group key={n.id}>
          <ScreenNode index={i + 1} />
          <DataTrail index={i + 1} />
        </group>
      ))}
    </>
  );
}
