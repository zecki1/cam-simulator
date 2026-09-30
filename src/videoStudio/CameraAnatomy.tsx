import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  Box,
  Button,
  Flex,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
} from "@chakra-ui/react";
import { GLB_MODELS } from "./glbModels";
import { CAMERA_PARTS, type CameraPart } from "./cameraParts";
import { fitGltfObject, markShadowFlags } from "./gltfFit";


type PinRefs = Record<string, HTMLButtonElement | null>;

function AnatomyStage({
  parts,
  selectedId,
  pinRefs,
}: {
  parts: CameraPart[];
  selectedId: string | null;
  pinRefs: React.MutableRefObject<PinRefs>;
}) {
  const gltf = useLoader(GLTFLoader, GLB_MODELS.canon_60d.url);
  const groupRef = useRef<THREE.Group>(null);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const [rotY, setRotY] = useState(-0.5);
  const dragRef = useRef<{ x: number; rot: number } | null>(null);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const off = useMemo(() => new THREE.Vector3(), []);

  const fitted = useMemo(() => {
    const clone = gltf.scene.clone(true);
    const fit = fitGltfObject(clone, { fitCm: 1, anchor: "topo" });
    markShadowFlags(clone);
    return { clone, scale: fit.scale, offset: fit.offset, box: fit.box };
  }, [gltf]);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    g.updateMatrixWorld();
    const bx = fitted.box.max.x - fitted.box.min.x;
    const by = fitted.box.max.y - fitted.box.min.y;
    const bz = fitted.box.max.z - fitted.box.min.z;
    off.set(fitted.offset[0], fitted.offset[1], fitted.offset[2]);
    for (const p of parts) {
      const btn = pinRefs.current[p.id];
      if (!btn) continue;
      tmp.set(
        fitted.box.min.x + p.u * bx,
        fitted.box.min.y + p.v * by,
        fitted.box.min.z + p.w * bz
      )
        .multiplyScalar(fitted.scale)
        .add(off);
      g.localToWorld(tmp);
      tmp.project(camera);
      const behind = tmp.z > 1;
      btn.style.opacity = behind ? "0.25" : "1";
      btn.style.pointerEvents = behind ? "none" : "auto";
      btn.style.left = `${((tmp.x * 0.5 + 0.5) * size.width).toFixed(1)}px`;
      btn.style.top = `${((-tmp.y * 0.5 + 0.5) * size.height).toFixed(1)}px`;
    }
  });

  return (
    <group
      ref={groupRef}
      rotation={[0, rotY, 0]}
      onPointerDown={(e) => {
        dragRef.current = { x: e.clientX, rot: rotY };
        e.stopPropagation();
      }}
      onPointerMove={(e) => {
        const d = dragRef.current;
        if (d) setRotY(d.rot + (e.clientX - d.x) * 0.01);
      }}
      onPointerUp={() => {
        dragRef.current = null;
      }}
      onPointerLeave={() => {
        dragRef.current = null;
      }}
      onClick={() => {
        dragRef.current = null;
      }}
    >
      <group scale={fitted.scale} position={fitted.offset}>
        <primitive object={fitted.clone} />
      </group>
      {/* pino selecionado marcado no próprio 3D */}
      {parts
        .filter((p) => p.id === selectedId)
        .map((p) => (
          <mesh
            key={p.id}
            position={[
              fitted.offset[0] + (fitted.box.min.x + p.u * (fitted.box.max.x - fitted.box.min.x)) * fitted.scale,
              fitted.offset[1] + (fitted.box.min.y + p.v * (fitted.box.max.y - fitted.box.min.y)) * fitted.scale,
              fitted.offset[2] + (fitted.box.min.z + p.w * (fitted.box.max.z - fitted.box.min.z)) * fitted.scale,
            ]}
          >
            <sphereGeometry args={[0.045, 16, 16]} />
            <meshBasicMaterial color="#F6AD55" />
          </mesh>
        ))}
    </group>
  );
}

/**
 * Modal com o corpo da câmera em 3D (GLB camera60d-teste) e pino em cada
 * parte: clique no pino (ou no índice) e leia o que a parte faz + o campo
 * correspondente no painel do simulador. Arraste para girar.
 */
export default function CameraAnatomy({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pinRefs = useRef<PinRefs>({});
  const selected = CAMERA_PARTS.find((p) => p.id === selectedId) ?? null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          Anatomia da câmera{" "}
          <Text as="span" fontWeight="normal" color="gray.500" fontSize="sm">
            — corpo Canon 60D (clique nos pinos · arraste para girar)
          </Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={5}>
          <Flex direction={{ base: "column", md: "row" }} gap={4}>
            <Box
              position="relative"
              flex="1"
              h={{ base: "300px", md: "440px" }}
              minW={0}
              borderRadius="md"
              bg="gray.900"
              overflow="hidden"
              cursor="grab"
              _active={{ cursor: "grabbing" }}
            >
              <Canvas
                camera={{ fov: 35, position: [0, 0.25, 2.4] }}
                dpr={[1, 2]}
                style={{ touchAction: "none" }}
              >
                <ambientLight intensity={0.7} />
                <hemisphereLight args={["#ffffff", "#444444", 0.6]} />
                <directionalLight position={[3, 4, 2]} intensity={1.4} castShadow />
                <directionalLight position={[-3, 2, -3]} intensity={0.5} />
                <Suspense fallback={null}>
                  <AnatomyStage
                    parts={CAMERA_PARTS}
                    selectedId={selectedId}
                    pinRefs={pinRefs}
                  />
                </Suspense>
              </Canvas>

              {/* Pins projetados por frame (sobre o canvas) */}
              <Box position="absolute" inset={0} pointerEvents="none">
                {CAMERA_PARTS.map((p, i) => (
                  <Button
                    key={p.id}
                    ref={(el) => {
                      pinRefs.current[p.id] = el;
                    }}
                    data-part={p.id}
                    aria-label={`Parte: ${p.titulo}`}
                    size="sm"
                    h="30px"
                    minW="30px"
                    p={0}
                    borderRadius="full"
                    position="absolute"
                    left={0}
                    top={0}
                    pointerEvents="none"
                    transform="translate(-50%, -50%)"
                    colorScheme={selectedId === p.id ? "orange" : "blue"}
                    variant={selectedId === p.id ? "solid" : "outline"}
                    bgColor={selectedId === p.id ? "orange.400" : undefined}
                    onClick={() => setSelectedId(p.id)}
                  >
                    {i + 1}
                  </Button>
                ))}
              </Box>

              <Text
                position="absolute"
                bottom={2}
                left={3}
                fontSize="xs"
                color="gray.400"
                pointerEvents="none"
              >
                arraste para girar
              </Text>
            </Box>

            <Box w={{ base: "100%", md: "300px" }} flexShrink={0}>
              <Text fontSize="xs" textTransform="uppercase" color="gray.500" mb={2} letterSpacing="wider">
                Partes ({CAMERA_PARTS.length})
              </Text>
              <Flex direction="column" gap={1} mb={3}>
                {CAMERA_PARTS.map((p) => (
                  <Button
                    key={p.id}
                    size="sm"
                    justifyContent="flex-start"
                    variant={selectedId === p.id ? "solid" : "ghost"}
                    colorScheme={selectedId === p.id ? "orange" : "gray"}
                    onClick={() => setSelectedId(p.id)}
                    textAlign="left"
                    whiteSpace="normal"
                    h="auto"
                    py={1}
                  >
                    {p.titulo}
                  </Button>
                ))}
              </Flex>

              {selected ? (
                <Box bg="gray.100" _dark={{ bg: "gray.700" }} borderRadius="md" p={3}>
                  <Text fontWeight="semibold" fontSize="sm" mb={1}>
                    {selected.titulo}
                  </Text>
                  <Text
                    fontSize="xs"
                    color="blue.600"
                    _dark={{ color: "blue.300" }}
                    mb={2}
                  >
                    Campo no simulador: <b>{selected.campo}</b>
                  </Text>
                  <Text fontSize="sm">{selected.texto}</Text>
                </Box>
              ) : (
                <Text fontSize="sm" color="gray.500">
                  Clique em um pino da câmera para ver para que serve a parte e
                  onde ajustá-la no painel.
                </Text>
              )}
            </Box>
          </Flex>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
