import { Suspense, useEffect, useMemo, type ReactNode } from "react";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useVideoStudio } from "../store/videoStudioStore";
import { GLB_MODELS } from "./glbModels";
import { GlbModel, ModelErrorBoundary } from "./GlbModelView";
import { useShadowFlags } from "./gltfFit";
import { Environment, Lightformer } from "@react-three/drei";
import type {
  AcousticPanelElement,
  BoomMicElement,
  CameraElement,
  ChromaKeyElement,
  ComputerElement,
  LightElement,
  Room,
  StudioElement,
  SubjectElement,
  TableElement,
} from "../types/videoStudio";
import { cameraAimDeg, isInCameraCone, verticalFovDeg } from "./cameraMath";
import { isPanningRecently } from "./interact";
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

type Gain = [number, number, number];

/** Cor RGB multiplicada pelos ganhos do balance de branco da câmera. */
function gainColor(r: number, g: number, b: number, gain: Gain): THREE.Color {
  return new THREE.Color(r * gain[0], g * gain[1], b * gain[2]);
}

function Character({ subject }: { subject: SubjectElement }) {
  const h = subject.heightCm;
  const colors = ROLE_COLORS[subject.role];
  const ref = useShadowFlags();

  return (
    <group
      ref={ref}
      position={[subject.position.x, 0, -subject.position.y]}
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

/** Escolhe GLB (catálogo) ou malha procedural, com Suspense + fallback. */
function SubjectMesh({ subject }: { subject: SubjectElement }) {
  const entry = subject.glbModelId
    ? GLB_MODELS[subject.glbModelId]
    : undefined;
  if (!entry) return <Character subject={subject} />;
  const fallback = <Character subject={subject} />;
  return (
    <ModelErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <EnhancedGlbSubject
          url={entry.url}
          position={[subject.position.x, 0, -subject.position.y]}
          rotationY={subject.rotation * DEG}
          heightCm={subject.heightCm}
          tags={entry.tags}
        />
      </Suspense>
    </ModelErrorBoundary>
  );
}

/** GLB do participante com materiais físicos aprimorados para óculos/acessórios. */
function EnhancedGlbSubject({
  url,
  position,
  rotationY,
  heightCm,
  tags = [],
}: {
  url: string;
  position: [number, number, number];
  rotationY: number;
  heightCm: number;
  tags?: string[];
}) {
  const gltf = useLoader(GLTFLoader, url);
  const hasOculos = tags?.includes("oculos");
  const hasAcessorios = tags?.includes("acessorios");

  const fitted = useMemo(() => {
    const clone = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    let scale = 1;
    if (heightCm && heightCm > 0 && size.y > 0.001) {
      scale = heightCm / size.y;
    }
    const yOffset = -box.min.y * scale;
    clone.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const name = mesh.name.toLowerCase();
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (!mat) return;

      if (hasOculos && (name.includes("lens") || name.includes("glass") || name.includes("oculos") || name.includes("oculo"))) {
        const physMat = new THREE.MeshPhysicalMaterial({
          color: mat.color,
          transmission: 0.98,
          clearcoat: 1,
          clearcoatRoughness: 0.03,
          roughness: 0.05,
          metalness: 0,
          ior: 1.52,
          thickness: 0.5,
        });
        mesh.material = physMat;
      } else if (hasAcessorios && (
        name.includes("earring") || name.includes("brinco") ||
        name.includes("watch") || name.includes("relogio") ||
        name.includes("necklace") || name.includes("colar") ||
        name.includes("zipper") || name.includes("ziper") ||
        name.includes("button") || name.includes("botao") ||
        name.includes("buckle") || name.includes("fivela") ||
        name.includes("metal") || name.includes("jewelry") ||
        name.includes("joia") || name.includes("ring") || name.includes("anel")
      )) {
        const physMat = new THREE.MeshPhysicalMaterial({
          color: 0xE5E5E5,
          metalness: 1,
          roughness: 0.1,
        });
        mesh.material = physMat;
      } else {
        // materiais padrão: pele/roupa
        if (name.includes("skin") || name.includes("pele") || name.includes("face") || name.includes("body") || name.includes("corpo")) {
          mat.roughness = 0.65;
          mat.metalness = 0;
        } else {
          mat.roughness = 0.8;
          mat.metalness = 0;
        }
        mat.needsUpdate = true;
      }
    });

    return { clone, scale, offset: [-center.x * scale, yOffset, -center.z * scale] as [number, number, number] };
  }, [gltf, heightCm, hasOculos, hasAcessorios]);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <group scale={fitted.scale} position={fitted.offset}>
        <primitive object={fitted.clone} />
      </group>
    </group>
  );
}

function Floor({ room }: { room: Room }) {
  const color = room.floorColor ?? "#9EA9B5";
  const roughness = room.floorRoughness ?? 1;
  // floorTexture reserved for future texture support
  // const texture = room.floorTexture ?? "none";

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[room.widthCm / 2, 0, -room.lengthCm / 2]}
      receiveShadow
    >
      <planeGeometry args={[room.widthCm * 3, room.lengthCm * 3]} />
      <meshStandardMaterial color={color} roughness={roughness} />
    </mesh>
  );
}

function Walls({ room }: { room: Room }) {
  const { widthCm: w, lengthCm: l, heightCm: h } = room;
  const northColor = room.wallNorthColor ?? "#C9D2DA";
  const southColor = room.wallSouthColor ?? "#B9C4CE";
  const eastColor = room.wallEastColor ?? "#C9D2DA";
  const westColor = room.wallWestColor ?? "#C9D2DA";
  const ceilingColor = room.ceilingColor ?? "#E2E8F0";

  return (
    <group>
      {/* Piso estendido (para sombras fora da sala) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[w / 2, -0.1, -l / 2]}
        receiveShadow
      >
        <planeGeometry args={[w * 3, l * 3]} />
        <meshStandardMaterial color={room.floorColor ?? "#9EA9B5"} roughness={room.floorRoughness ?? 1} />
      </mesh>

      {/* Teto */}
      <mesh position={[w / 2, h + 5, -l / 2]} receiveShadow>
        <boxGeometry args={[w + 40, 10, l + 40]} />
        <meshStandardMaterial color={ceilingColor} roughness={1} />
      </mesh>

      {/* Parede Norte (z = +5) */}
      <mesh position={[w / 2, h / 2, 5]} receiveShadow>
        <boxGeometry args={[w + 40, h, 10]} />
        <meshStandardMaterial color={northColor} roughness={1} />
      </mesh>

      {/* Parede Sul (z = -(l + 5)) */}
      <mesh position={[w / 2, h / 2, -(l + 5)]} receiveShadow>
        <boxGeometry args={[w + 40, h, 10]} />
        <meshStandardMaterial color={southColor} roughness={1} />
      </mesh>

      {/* Parede Oeste (x = -5) */}
      <mesh position={[-5, h / 2, -l / 2]} receiveShadow>
        <boxGeometry args={[10, h, l + 40]} />
        <meshStandardMaterial color={westColor} roughness={1} />
      </mesh>

      {/* Parede Leste (x = w + 5) */}
      <mesh position={[w + 5, h / 2, -l / 2]} receiveShadow>
        <boxGeometry args={[10, h, l + 40]} />
        <meshStandardMaterial color={eastColor} roughness={1} />
      </mesh>
    </group>
  );
}

function TableMesh({ el }: { el: TableElement }) {
  const ref = useShadowFlags();
  const { widthCm: w, depthCm: d, heightCm: h } = el;
  return (
    <group ref={ref} position={[el.position.x, 0, -el.position.y]} rotation={[0, el.rotation * DEG, 0]}>
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
    <group ref={ref} position={[el.position.x, 0, -el.position.y]} rotation={[0, el.rotation * DEG, 0]}>
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
    <group ref={ref} position={[el.position.x, 0, -el.position.y]} rotation={[0, el.rotation * DEG, 0]}>
      <mesh position={[0, 100 + el.heightCm / 2, 0]}>
        <boxGeometry args={[el.widthCm, el.heightCm, 5]} />
        <meshStandardMaterial color="#9B8AE0" roughness={0.95} />
      </mesh>
    </group>
  );
}

/**
 * Fundo verde chroma (cyclorama): projeta sombra atrás de si e — quando
 * `receiveShadows` — recebe a sombra das luzes na frente (para visualizar/
 * tratar o key sujo por sombra; desligue para um fundo bem limpo).
 * Se `glbModelId` apontar para um modelo kind "fundo", usa o GLB com fallback
 * procedural.
 */
function ChromaKeyMesh({ el }: { el: ChromaKeyElement }) {
  const entry = el.glbModelId ? GLB_MODELS[el.glbModelId] : undefined;
  const hasFundoGlb = entry && entry.kind === "fundo";

  if (hasFundoGlb) {
    return (
      <ModelErrorBoundary fallback={<ChromaKeyProcedural el={el} />}>
        <Suspense fallback={<ChromaKeyProcedural el={el} />}>
          <GlbModel
            url={entry.url}
            position={[el.position.x, 0, -el.position.y]}
            rotationY={el.rotation * DEG}
            heightCm={el.heightCm}
            anchor="chao"
          />
        </Suspense>
      </ModelErrorBoundary>
    );
  }

  return <ChromaKeyProcedural el={el} />;
}

function ChromaKeyProcedural({ el }: { el: ChromaKeyElement }) {
  return (
    <group
      position={[el.position.x, 0, -el.position.y]}
      rotation={[0, el.rotation * DEG, 0]}
    >
      <mesh
        position={[0, el.heightCm / 2, 0]}
        castShadow
        receiveShadow={el.receiveShadows}
      >
        <boxGeometry args={[el.widthCm, el.heightCm, 6]} />
        <meshStandardMaterial color={el.color} roughness={0.9} metalness={0} />
      </mesh>
      {/* rodapé curvo sutil (ciclorama) */}
      <mesh position={[0, 12, 26]} rotation={[-Math.PI / 5, 0, 0]} castShadow receiveShadow={el.receiveShadows}>
        <boxGeometry args={[el.widthCm, 60, 5]} />
        <meshStandardMaterial color={el.color} roughness={0.9} />
      </mesh>
    </group>
  );
}

function aimYaw(
  from: { x: number; y: number },
  to: { x: number; y: number }
): number {
  // planta (x, y) → mundo (x, −y): o norte é −Z, então o yaw usa −dy
  return Math.atan2(to.x - from.x, -(to.y - from.y));
}

/** Suporte procedural (coluna + 3 pernas) usado pelo tripé padrão. */
function TripodMesh({ h }: { h: number }) {
  return (
    <>
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
    </>
  );
}

/** Corpo + lente procedural (orientado para onde a câmera grava). */
function CameraBodyMesh() {
  return (
    <group>
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
  );
}

/** Tripé + corpo completos (malha procedural de referência). */
function ProceduralCamera({ h, yaw }: { h: number; yaw: number }) {
  return (
    <>
      <TripodMesh h={h} />
      <group position={[0, h * 0.94, 0]} rotation={[0, yaw, 0]}>
        <CameraBodyMesh />
      </group>
    </>
  );
}

/**
 * Câmera na cena: procedural (padrão), corpo GLB encaixado no topo do
 * tripé (`kind: "camera"`), ou tripé + câmera GLB completo (`kind: "tripe"`)
 * escalado para a altura do suporte.
 */
function CameraMesh({ el, elements }: { el: CameraElement; elements: StudioElement[] }) {
  const ref = useShadowFlags();
  const target = el.targetId
    ? elements.find((t) => t.id === el.targetId)
    : undefined;
  const yaw = (target
    ? aimYaw(el.position, target.position)
    : el.rotation * DEG);
  const h = el.heightCm;
  const entry = el.glbModelId ? GLB_MODELS[el.glbModelId] : undefined;
  const yawOffset = (entry?.yawOffsetDeg ?? 0) * DEG;

  if (entry && entry.kind === "camera") {
    // tripé procedural + corpo de câmera GLB encaixado no topo
    return (
      <group ref={ref} position={[el.position.x, 0, -el.position.y]}>
        <TripodMesh h={h} />
        <ModelErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <group position={[0, h, 0]} rotation={[0, yaw + yawOffset, 0]}>
              <GlbModel
                url={entry.url}
                position={[0, 0, 0]}
                fitCm={entry.fitCm}
                anchor="topo"
              />
            </group>
          </Suspense>
        </ModelErrorBoundary>
      </group>
    );
  }

  if (entry) {
    // tripé + câmera num GLB único, escalado para a altura do suporte
    return (
      <group ref={ref} position={[el.position.x, 0, -el.position.y]}>
        <ModelErrorBoundary
          fallback={<ProceduralCamera h={h} yaw={yaw + yawOffset} />}
        >
          <Suspense fallback={<ProceduralCamera h={h} yaw={yaw + yawOffset} />}>
            <GlbModel
              url={entry.url}
              position={[0, 0, 0]}
              rotationY={yaw + yawOffset}
              heightCm={h}
            />
          </Suspense>
        </ModelErrorBoundary>
      </group>
    );
  }

  return (
    <group ref={ref} position={[el.position.x, 0, -el.position.y]}>
      <ProceduralCamera h={h} yaw={yaw} />
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
    <group ref={ref} position={[el.position.x, 0, -el.position.y]}>
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
  wbGain,
  inZone,
  shadowMapSize = 1024,
}: {
  light: LightElement;
  elements: StudioElement[];
  shadow: boolean;
  wbGain: Gain;
  /** Fora da zona de visão: a luz real continua iluminando, só o suporte visual some. */
  inZone: boolean;
  shadowMapSize: number;
}) {
  const ref = useShadowFlags();
  const aim = lightAim(light, elements);
  const color = useMemo(() => {
    const [r, g, b] = kelvinToRgb(light.colorTemp);
    return gainColor(r, g, b, wbGain);
  }, [light.colorTemp, wbGain]);
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

  // Decay físico (inverse square) se habilitado na luz
  const decay = light.physicalFalloff ? 2 : 0;

  // Bias por tipo de luz para evitar shadow acne
  const bias = light.kind === "spot" ? -0.0005
    : light.kind === "luminaria" || light.kind === "softbox" ? -0.001
    : light.kind === "luminaria_focal" ? -0.0003
    : -0.0008;
  const normalBias = light.kind === "spot" ? 3
    : light.kind === "luminaria" || light.kind === "softbox" ? 4
    : 2;

  const entry = light.glbModelId ? GLB_MODELS[light.glbModelId] : undefined;
  const hasSpotGlb = entry && entry.kind === "luz";

  return (
    <group>
      <primitive object={targetObj} position={[aim.x, aim.heightCm, -aim.y]} />

      {/* luz real configurada */}
      {isPratica ? (
        <pointLight
          position={[light.position.x, light.heightCm, -light.position.y]}
          color={color}
          intensity={intensity * 1.5}
          decay={decay}
        />
      ) : (
        <spotLight
          position={[light.position.x, light.heightCm, -light.position.y]}
          color={color}
          intensity={intensity}
          angle={angle}
          penumbra={penumbra}
          decay={decay}
          target={targetObj}
          castShadow={shadow}
          shadow-mapSize-width={shadowMapSize}
          shadow-mapSize-height={shadowMapSize}
          shadow-camera-near={20}
          shadow-camera-far={2500}
          shadow-bias={bias}
          shadow-normalBias={normalBias}
        />
      )}

      {/* suporte visual: GLB spot ou procedural — fora do cone some da cena */}
      {inZone && (
        <group ref={ref}>
          {hasSpotGlb ? (
            <ModelErrorBoundary fallback={null}>
              <Suspense fallback={null}>
                <GlbModel
                  url={entry.url}
                  position={[light.position.x, 0, -light.position.y]}
                  rotationY={yaw}
                  heightCm={light.heightCm}
                  anchor="chao"
                />
              </Suspense>
            </ModelErrorBoundary>
          ) : (
            <>
              <mesh position={[light.position.x, light.heightCm / 2, -light.position.y]}>
                <cylinderGeometry args={[2, 3, light.heightCm, 8]} />
                <meshStandardMaterial color="#5A5A5A" roughness={0.7} />
              </mesh>
              <group
                position={[light.position.x, light.heightCm, -light.position.y]}
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
            </>
          )}
        </group>
      )}
    </group>
  );
}

/** Aplica a exposição (ISO/obturador/abertura/ND) ao renderer da cena. */
function RendererExposure({ value }: { value: number }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.toneMappingExposure = value;
  }, [gl, value]);
  return null;
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
  aim,
  elements,
  room,
  exposure,
  wbGain,
}: {
  camera: CameraElement;
  /** Ponto de mira 3D (mundo): alvo configurado ou direção da rotação manual. */
  aim: { x: number; y: number; z: number };
  elements: StudioElement[];
  room: Room;
  /** Ganho linear de brilho vindo de ISO/obturador/abertura/ND (1 = neutro). */
  exposure: number;
  /** Ganhos RGB do balance de branco da câmera (5600 K = [1,1,1]). */
  wbGain: Gain;
}) {
  const camPos = {
    x: camera.position.x,
    y: camera.heightCm,
    z: -camera.position.y, // planta +y (norte) = −Z do mundo
  };
  const aimObj = { x: aim.x, y: aim.y, z: aim.z };

  const { shadowsEnabled, shadowBudget: storeShadowBudget } = useVideoStudio(
    (s) => ({ shadowsEnabled: s.shadowsEnabled, shadowBudget: s.shadowBudget })
  );

  const lights = elements.filter(
    (el): el is LightElement =>
      el.type === "light" && el.visible && el.intensity > 0
  );
  const hasLights = lights.length > 0;
  let shadowBudget = shadowsEnabled ? storeShadowBudget : 0;

  // Lightformers para o Environment Map — cada luz vira uma fonte de reflexo
  const lightformers = useMemo(() =>
    lights.map((light) => {
      const aim = lightAim(light, elements);
      const [r, g, b] = kelvinToRgb(light.colorTemp);
      const wbGain = lightIntensity(light) / 100; // aproximação simples
      return {
        position: [light.position.x, light.heightCm, -light.position.y] as [number, number, number],
        target: [aim.x, aim.heightCm, -aim.y] as [number, number, number],
        color: new THREE.Color(r * wbGain, g * wbGain, b * wbGain),
        intensity: lightIntensity(light) * 0.5,
        light,
      };
    }),
    [lights, elements]
  );

  const selectEl = useVideoStudio((s) => s.select);

  /** Direção atual de mira da câmera (alvo ou rotação manual). */
  const aimDeg = cameraAimDeg(camera, elements);

  /**
   * Zona de visão = cone horizontal da câmera (a mesma régua da planta
   * baixa): elemento fora dele sai da cena 3D.
   */
  const inCone = (el: { position: { x: number; y: number } }) =>
    isInCameraCone(camera, el.position, aimDeg);

  /** Torna o objeto clicável na cena 3D (seleção acompanha o painel). */
  const selectable = (el: StudioElement, children: ReactNode) => (
    <group
      key={el.id}
      onClick={(e) => {
        if (isPanningRecently()) return; // arraste de panorâmica não seleciona
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
    if (!inCone(el)) return null; // fora da zona de visão → fora da cena 3D
    switch (el.type) {
      case "subject":
        return selectable(el, <SubjectMesh subject={el} />);
      case "table":
        return selectable(el, <TableMesh el={el} />);
      case "computer":
        return selectable(el, <ComputerMesh el={el} elements={elements} />);
      case "acoustic_panel":
        return selectable(el, <PanelMesh el={el} />);
      case "chromakey":
        return selectable(el, <ChromaKeyMesh el={el} />);
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
      gl={{
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
        shadowMapType: THREE.PCFSoftShadowMap,
      }}
      onPointerMissed={() => {
        if (isPanningRecently()) return;
        selectEl(null);
      }}
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
      <RendererExposure value={exposure} />
      <CameraRig position={camPos} target={aimObj} fovDeg={verticalFovDeg(camera)} />

      {/* Environment Map com Lightformers — reflexos realistas nas superfícies */}
      <Environment
        resolution={256}
        background={false}
        frames={1}
      >
        {lightformers.map((lf) => (
          <Lightformer
            key={lf.light.id}
            position={lf.position}
            target={lf.target}
            color={lf.color}
            intensity={lf.intensity}
            scale={1.5}
          />
        ))}
      </Environment>

      {/* luz ambiente de base */}
      <ambientLight intensity={0.22} color={gainColor(1, 1, 1, wbGain)} />
      <hemisphereLight
        args={[
          gainColor(1, 1, 1, wbGain),
          gainColor(0.541, 0.541, 0.541, wbGain),
          0.16,
        ]}
      />
      {/* fallback só quando não há luzes configuradas */}
      {!hasLights && (
        <directionalLight
          position={[600, 1400, 800]}
          intensity={0.9}
          castShadow
          color={gainColor(1, 1, 1, wbGain)}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
      )}

      <Floor room={room} />
      <Walls room={room} />

      {elements.map(renderElement)}

      {lights.map((light) => {
        const shadow = shadowsEnabled && light.castShadow && shadowBudget > 0;
        if (shadow) shadowBudget -= 1;
        
        // Shadow map size: 2048 quando ≤3 luzes com sombra, senão 1024
        const lightsWithShadow = lights.filter(l => l.castShadow).length;
        const mapSize = shadowsEnabled && lightsWithShadow <= 3 ? 2048 : 1024;
        
        return selectable(
          light,
          <LightRig
            key={light.id}
            light={light}
            elements={elements}
            shadow={shadow}
            wbGain={wbGain}
            inZone={inCone(light)}
            shadowMapSize={mapSize}
          />
        );
      })}
    </Canvas>
  );
}
