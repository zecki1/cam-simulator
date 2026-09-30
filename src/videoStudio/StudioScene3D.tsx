import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useVideoStudio } from "../store/videoStudioStore";
import type {
  AcousticPanelElement,
  BoomMicElement,
  CameraElement,
  ComputerElement,
  LightElement,
  Room,
  StudioElement,
  SubjectElement,
  TableElement,
} from "../types/videoStudio";
import { verticalFovDeg } from "./cameraMath";
import { beamAngleRad, kelvinToRgb, lightAim, lightIntensity } from "./lighting";

const DEG = Math.PI / 180;

const ROLE_COLORS: Record<
  SubjectElement["role"],
  { shirt: string; pants: string; hair: string }
> = {
  apresentador: { shirt: "#2B6CB0", pants: "#1A202C", hair: "#2D2D2D" },
  instrutor: { shirt: "#2F855A", pants: "#2D3748", hair: "#3B3B3B" },
  aluno: { shirt: "#DD6B20", pants: "#4A5568", hair: "#2D2D2D" },
};

const SKIN = "#D9A387";

/** Marca todas as malhas do grupo para projetar/receber sombras. */
function useShadowFlags() {
  const ref = useRef<THREE.Group>(null);
  useEffect(() => {
    ref.current?.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  });
  return ref;
}

function Character({ subject }: { subject: SubjectElement }) {
  const h = subject.heightCm;
  const colors = ROLE_COLORS[subject.role];
  const ref = useShadowFlags();

  return (
    <group
      ref={ref}
      position={[subject.position.x, 0, subject.position.y]}
      rotation={[0, subject.rotation * DEG, 0]}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.6, 0]} receiveShadow>
        <circleGeometry args={[h * 0.17, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.25} depthWrite={false} />
      </mesh>

      {[-1, 1].map((side) => (
        <mesh key={`leg${side}`} position={[side * h * 0.05, h * 0.245, 0]}>
          <capsuleGeometry args={[h * 0.042, h * 0.4, 4, 12]} />
          <meshStandardMaterial color={colors.pants} roughness={0.85} />
        </mesh>
      ))}

      {[-1, 1].map((side) => (
        <mesh key={`foot${side}`} position={[side * h * 0.05, h * 0.022, h * 0.028]}>
          <boxGeometry args={[h * 0.07, h * 0.044, h * 0.12]} />
          <meshStandardMaterial color="#1A1A1A" roughness={0.9} />
        </mesh>
      ))}

      <mesh position={[0, h * 0.67, 0]}>
        <capsuleGeometry args={[h * 0.085, h * 0.19, 6, 16]} />
        <meshStandardMaterial color={colors.shirt} roughness={0.8} />
      </mesh>

      {[-1, 1].map((side) => (
        <mesh
          key={`arm${side}`}
          position={[side * h * 0.115, h * 0.66, 0]}
          rotation={[0, 0, side * 0.06]}
        >
          <capsuleGeometry args={[h * 0.028, h * 0.26, 4, 10]} />
          <meshStandardMaterial color={colors.shirt} roughness={0.8} />
        </mesh>
      ))}

      {[-1, 1].map((side) => (
        <mesh key={`hand${side}`} position={[side * h * 0.128, h * 0.5, 0]}>
          <sphereGeometry args={[h * 0.026, 10, 10]} />
          <meshStandardMaterial color={SKIN} roughness={0.7} />
        </mesh>
      ))}

      <mesh position={[0, h * 0.875, 0]}>
        <cylinderGeometry args={[h * 0.026, h * 0.03, h * 0.05, 12]} />
        <meshStandardMaterial color={SKIN} roughness={0.7} />
      </mesh>

      <mesh position={[0, h * 0.945, 0]} scale={[1, 1.14, 1.02]}>
        <sphereGeometry args={[h * 0.068, 20, 20]} />
        <meshStandardMaterial color={SKIN} roughness={0.65} />
      </mesh>

      <mesh position={[0, h * 0.968, -h * 0.012]} scale={[1.04, 1.02, 1.04]}>
        <sphereGeometry args={[h * 0.066, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color={colors.hair} roughness={0.9} />
      </mesh>

      {[-1, 1].map((side) => (
        <mesh key={`eye${side}`} position={[side * h * 0.026, h * 0.955, h * 0.058]}>
          <sphereGeometry args={[h * 0.011, 8, 8]} />
          <meshStandardMaterial color="#1A1A1A" roughness={0.4} />
        </mesh>
      ))}

      <mesh position={[0, h * 0.935, h * 0.068]}>
        <sphereGeometry args={[h * 0.013, 8, 8]} />
        <meshStandardMaterial color={SKIN} roughness={0.65} />
      </mesh>
    </group>
  );
}

function Floor({ room }: { room: Room }) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[room.widthCm / 2, 0, room.lengthCm / 2]}
      receiveShadow
    >
      <planeGeometry args={[room.widthCm * 3, room.lengthCm * 3]} />
      <meshStandardMaterial color="#9EA9B5" roughness={1} />
    </mesh>
  );
}

function Walls({ room }: { room: Room }) {
  const { widthCm: w, lengthCm: l, heightCm: h } = room;
  const wall = (
    <meshStandardMaterial color="#C9D2DA" roughness={1} />
  );
  return (
    <group>
      <mesh position={[w / 2, h / 2, -5]} receiveShadow>
        <boxGeometry args={[w + 40, h, 10]} />
        {wall}
      </mesh>
      <mesh position={[w / 2, h / 2, l + 5]} receiveShadow>
        <boxGeometry args={[w + 40, h, 10]} />
        <meshStandardMaterial color="#B9C4CE" roughness={1} />
      </mesh>
      <mesh position={[-5, h / 2, l / 2]} receiveShadow>
        <boxGeometry args={[10, h, l + 40]} />
        {wall}
      </mesh>
      <mesh position={[w + 5, h / 2, l / 2]} receiveShadow>
        <boxGeometry args={[10, h, l + 40]} />
        {wall}
      </mesh>
    </group>
  );
}

function TableMesh({ el }: { el: TableElement }) {
  const ref = useShadowFlags();
  const { widthCm: w, depthCm: d, heightCm: h } = el;
  return (
    <group ref={ref} position={[el.position.x, 0, el.position.y]} rotation={[0, el.rotation * DEG, 0]}>
      <mesh position={[0, h - 2, 0]}>
        <boxGeometry args={[w, 4, d]} />
        <meshStandardMaterial color="#B08D57" roughness={0.7} />
      </mesh>
      {[
        [-w / 2 + 6, -d / 2 + 6],
        [w / 2 - 6, -d / 2 + 6],
        [-w / 2 + 6, d / 2 - 6],
        [w / 2 - 6, d / 2 - 6],
      ].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, (h - 4) / 2, lz]}>
          <boxGeometry args={[4, h - 4, 4]} />
          <meshStandardMaterial color="#6B5B45" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function tableUnder(el: ComputerElement, elements: StudioElement[]): number {
  const half = 8;
  for (const t of elements) {
    if (t.type !== "table") continue;
    const dx = el.position.x - t.position.x;
    const dy = el.position.y - t.position.y;
    const a = t.rotation * DEG;
    const lx = dx * Math.cos(a) + dy * Math.sin(a);
    const ly = -dx * Math.sin(a) + dy * Math.cos(a);
    if (Math.abs(lx) <= t.widthCm / 2 + half && Math.abs(ly) <= t.depthCm / 2 + half) {
      return t.heightCm;
    }
  }
  return 0;
}

function ComputerMesh({ el, elements }: { el: ComputerElement; elements: StudioElement[] }) {
  const ref = useShadowFlags();
  const baseY = tableUnder(el, elements);
  const screenW = el.monitorSizeIn * 2.4 * 0.0254 * 100 * 0.3937; // ≈ monitorSizeIn em cm (24" ≈ 53 cm)
  const w = el.monitorSizeIn * 2.2;
  const h = w * 0.58;
  void screenW;
  return (
    <group ref={ref} position={[el.position.x, 0, el.position.y]} rotation={[0, el.rotation * DEG, 0]}>
      {/* suporte */}
      <mesh position={[0, baseY + 5, 0]}>
        <boxGeometry args={[12, 10, 8]} />
        <meshStandardMaterial color="#2D3748" roughness={0.6} />
      </mesh>
      {/* monitor */}
      <mesh position={[0, baseY + 10 + h / 2, -4]}>
        <boxGeometry args={[w, h, 4]} />
        <meshStandardMaterial color="#1A202C" roughness={0.4} />
      </mesh>
      {/* tela (brilho sutil) */}
      <mesh position={[0, baseY + 10 + h / 2, -1.6]}>
        <boxGeometry args={[w - 3, h - 3, 0.6]} />
        <meshStandardMaterial
          color="#3D5A80"
          roughness={0.2}
          emissive="#24486E"
          emissiveIntensity={0.35}
        />
      </mesh>
      {/* teclado */}
      <mesh position={[0, baseY + 4.5, 16]}>
        <boxGeometry args={[w * 0.75, 3, 12]} />
        <meshStandardMaterial color="#4A5568" roughness={0.8} />
      </mesh>
    </group>
  );
}

function PanelMesh({ el }: { el: AcousticPanelElement }) {
  const ref = useShadowFlags();
  return (
    <group ref={ref} position={[el.position.x, 0, el.position.y]} rotation={[0, el.rotation * DEG, 0]}>
      <mesh position={[0, 100 + el.heightCm / 2, 0]}>
        <boxGeometry args={[el.widthCm, el.heightCm, 5]} />
        <meshStandardMaterial color="#9B8AE0" roughness={0.95} />
      </mesh>
    </group>
  );
}

function aimYaw(
  from: { x: number; y: number },
  to: { x: number; y: number }
): number {
  return Math.atan2(to.x - from.x, to.y - from.y);
}

function CameraMesh({ el, elements }: { el: CameraElement; elements: StudioElement[] }) {
  const ref = useShadowFlags();
  const target = el.targetId
    ? elements.find((t) => t.id === el.targetId)
    : undefined;
  const yaw = target
    ? aimYaw(el.position, target.position)
    : el.rotation * DEG;
  const h = el.heightCm;

  return (
    <group ref={ref} position={[el.position.x, 0, el.position.y]}>
      {/* coluna do tripé */}
      <mesh position={[0, h * 0.55, 0]}>
        <cylinderGeometry args={[2.5, 3, h * 0.75, 10]} />
        <meshStandardMaterial color="#3B3B3B" roughness={0.6} />
      </mesh>
      {/* 3 pernas */}
      {[0, 1, 2].map((i) => {
        const legYaw = i * 120 * DEG;
        const spread = Math.min(h * 0.4, 45);
        const topY = h * 0.7;
        return (
          <group key={i} rotation={[0, legYaw, 0]}>
            <mesh
              position={[spread / 2, topY / 2, 0]}
              rotation={[0, 0, Math.atan2(-spread, -topY)]}
            >
              <cylinderGeometry args={[1.6, 1.6, Math.hypot(spread, topY), 8]} />
              <meshStandardMaterial color="#3B3B3B" roughness={0.6} />
            </mesh>
          </group>
        );
      })}
      {/* corpo + lente (orientados para onde a câmera grava) */}
      <group position={[0, h * 0.94, 0]} rotation={[0, yaw, 0]}>
        <mesh>
          <boxGeometry args={[16, 14, 26]} />
          <meshStandardMaterial color="#222222" roughness={0.5} />
        </mesh>
        <mesh position={[0, 1, 17]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[6, 7, 9, 16]} />
          <meshStandardMaterial color="#111111" roughness={0.3} metalness={0.4} />
        </mesh>
        {/* visor de rodízio (topo) */}
        <mesh position={[0, 9, -2]}>
          <boxGeometry args={[10, 4, 10]} />
          <meshStandardMaterial color="#444444" roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

function BoomMesh({ el, elements }: { el: BoomMicElement; elements: StudioElement[] }) {
  const ref = useShadowFlags();
  const target = el.targetId
    ? elements.find((t) => t.id === el.targetId)
    : undefined;
  const aim = target
    ? { x: target.position.x, y: target.position.y }
    : {
        x: el.position.x + Math.sin(el.rotation * DEG) * 400,
        y: el.position.y + Math.cos(el.rotation * DEG) * 400,
      };
  const yaw = aimYaw(el.position, aim);
  const dist = Math.hypot(aim.x - el.position.x, aim.y - el.position.y) || 1;
  const aimH = target && target.type === "subject" ? target.heightCm * 0.8 : el.heightCm;
  const pitch = Math.atan2(aimH - el.heightCm, dist);

  return (
    <group ref={ref} position={[el.position.x, 0, el.position.y]}>
      <mesh position={[0, el.heightCm / 2, 0]}>
        <cylinderGeometry args={[2, 3, el.heightCm, 8]} />
        <meshStandardMaterial color="#4A5568" roughness={0.7} />
      </mesh>
      <group position={[0, el.heightCm, 0]} rotation={[0, yaw, 0, ]} >
        <group rotation={[-pitch, 0, 0]}>
          {/* haste */}
          <mesh position={[0, 0, el.reachCm / 2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[1.5, 1.5, el.reachCm, 8]} />
            <meshStandardMaterial color="#555555" roughness={0.6} />
          </mesh>
          {/* microfone */}
          <mesh position={[0, -2, el.reachCm + 6]} rotation={[Math.PI / 2, 0, 0]}>
            <capsuleGeometry args={[4, 10, 4, 10]} />
            <meshStandardMaterial color="#1A1A1A" roughness={0.5} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function LightRig({
  light,
  elements,
  shadow,
}: {
  light: LightElement;
  elements: StudioElement[];
  shadow: boolean;
}) {
  const ref = useShadowFlags();
  const aim = lightAim(light, elements);
  const color = useMemo(
    () => new THREE.Color(...kelvinToRgb(light.colorTemp)),
    [light.colorTemp]
  );
  const targetObj = useMemo(() => new THREE.Object3D(), []);

  const yaw = aimYaw(light.position, aim);
  const dist = Math.hypot(aim.x - light.position.x, aim.y - light.position.y) || 1;
  const pitch = Math.atan2(aim.heightCm - light.heightCm, dist);

  const isPratica = light.kind === "pratica";
  const intensity = lightIntensity(light);
  const angle = beamAngleRad(light);
  const penumbra =
    light.kind === "luminaria" || light.kind === "softbox"
      ? 1
      : light.kind === "luminaria_focal"
      ? 0.3
      : 0.55;

  return (
    <group>
      <primitive object={targetObj} position={[aim.x, aim.heightCm, aim.y]} />

      {/* luz real configurada */}
      {isPratica ? (
        <pointLight
          position={[light.position.x, light.heightCm, light.position.y]}
          color={color}
          intensity={intensity * 1.5}
          decay={0}
        />
      ) : (
        <spotLight
          position={[light.position.x, light.heightCm, light.position.y]}
          color={color}
          intensity={intensity}
          angle={angle}
          penumbra={penumbra}
          decay={0}
          target={targetObj}
          castShadow={shadow}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={20}
          shadow-camera-far={2500}
          shadow-bias={-0.0008}
          shadow-normalBias={2}
        />
      )}

      {/* suporte + cabeça da luminária (visual) */}
      <group ref={ref}>
        <mesh position={[light.position.x, light.heightCm / 2, light.position.y]}>
          <cylinderGeometry args={[2, 3, light.heightCm, 8]} />
          <meshStandardMaterial color="#5A5A5A" roughness={0.7} />
        </mesh>
        <group
          position={[light.position.x, light.heightCm, light.position.y]}
          rotation={[0, yaw, 0, "YXZ"]}
        >
          <group rotation={[-pitch, 0, 0]}>
            <mesh position={[0, 0, 10]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[9, 12, 20, 16]} />
              <meshStandardMaterial color="#333333" roughness={0.5} metalness={0.3} />
            </mesh>
            {/* asa de negativo (barn door) no topo */}
            <mesh position={[0, 11, 12]}>
              <boxGeometry args={[22, 2, 14]} />
              <meshStandardMaterial color="#2A2A2A" roughness={0.6} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

function CameraRig({
  position,
  target,
  fovDeg,
}: {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  fovDeg: number;
}) {
  const { camera, size } = useThree();

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.set(position.x, position.y, position.z);
    cam.up.set(0, 1, 0);
    cam.fov = fovDeg;
    cam.near = 5;
    cam.far = 8000;
    if (size.width > 0 && size.height > 0) {
      cam.aspect = size.width / size.height;
    }
    cam.lookAt(target.x, target.y, target.z);
    cam.updateProjectionMatrix();
  }, [camera, position, target, fovDeg, size]);

  return null;
}

/**
 * Cena 3D completa do estúdio vista pela câmera configurada:
 * personagem 3D, mesas, computadores, painéis, boom, outras câmeras,
 * paredes/chão e as luzes reais configuradas (ângulo, cor, potência e sombras).
 */
export default function StudioScene3D({
  camera,
  aimSubject,
  aimHeightCm,
  elements,
  room,
}: {
  camera: CameraElement;
  aimSubject: SubjectElement;
  aimHeightCm: number;
  elements: StudioElement[];
  room: Room;
}) {
  const camPos = {
    x: camera.position.x,
    y: camera.heightCm,
    z: camera.position.y,
  };
  const aimPos = {
    x: aimSubject.position.x,
    y: aimHeightCm,
    z: aimSubject.position.y,
  };

  const lights = elements.filter(
    (el): el is LightElement =>
      el.type === "light" && el.visible && el.intensity > 0
  );
  const hasLights = lights.length > 0;
  let shadowBudget = 4;

  const selectEl = useVideoStudio((s) => s.select);

  /** Torna o objeto clicável na cena 3D (seleção acompanha o painel). */
  const selectable = (el: StudioElement, children: ReactNode) => (
    <group
      key={el.id}
      onClick={(e) => {
        e.stopPropagation();
        selectEl(el.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      {children}
    </group>
  );

  const renderElement = (el: StudioElement) => {
    if (!el.visible) return null;
    switch (el.type) {
      case "subject":
        return selectable(el, <Character subject={el} />);
      case "table":
        return selectable(el, <TableMesh el={el} />);
      case "computer":
        return selectable(el, <ComputerMesh el={el} elements={elements} />);
      case "acoustic_panel":
        return selectable(el, <PanelMesh el={el} />);
      case "camera":
        if (el.id === camera.id) return null; // a própria câmera é o ponto de vista
        return selectable(el, <CameraMesh el={el} elements={elements} />);
      case "boom_mic":
        return selectable(el, <BoomMesh el={el} elements={elements} />);
      case "light":
        return null; // luzes renderizadas em LightRig (com a luz real)
      default:
        return null;
    }
  };

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
      onPointerMissed={() => selectEl(null)}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
      }}
      camera={{
        fov: verticalFovDeg(camera),
        near: 5,
        far: 8000,
        position: [camPos.x, camPos.y, camPos.z],
      }}
    >
      <CameraRig position={camPos} target={aimPos} fovDeg={verticalFovDeg(camera)} />

      {/* luz ambiente de base */}
      <ambientLight intensity={0.22} />
      <hemisphereLight args={["#ffffff", "#8a8a8a", 0.16]} />
      {/* fallback só quando não há luzes configuradas */}
      {!hasLights && (
        <directionalLight position={[600, 1400, 800]} intensity={0.9} castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
      )}

      <Floor room={room} />
      <Walls room={room} />

      {elements.map(renderElement)}

      {lights.map((light) => {
        const shadow = light.castShadow && shadowBudget > 0;
        if (shadow) shadowBudget -= 1;
        return selectable(
          light,
          <LightRig key={light.id} light={light} elements={elements} shadow={shadow} />
        );
      })}
    </Canvas>
  );
}
