import { useEffect, useRef } from "react";
import * as THREE from "three";

export interface GltfFit {
  scale: number;
  offset: [number, number, number];
  box: THREE.Box3;
}

/**
 * Auto-fit de um objeto GLB clonado: escala para a altura do elemento
 * (`heightCm`) ou para a maior dimensão (`fitCm`), centraliza em XZ e
 * ancora os pés em y=0 (`"chao"`) ou centraliza em todos os eixos
 * (`"topo"` — ex.: corpo de câmera encaixado no topo do tripé).
 */
export function fitGltfObject(
  clone: THREE.Object3D,
  opts: { heightCm?: number; fitCm?: number; anchor?: "chao" | "topo" } = {}
): GltfFit {
  const { heightCm, fitCm, anchor = "chao" } = opts;
  const box = new THREE.Box3().setFromObject(clone);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  let scale = 1;
  if (fitCm && fitCm > 0) {
    const maxDim = Math.max(size.x, size.y, size.z);
    scale = maxDim > 0.001 ? fitCm / maxDim : 1;
  } else if (heightCm && heightCm > 0 && size.y > 0.001) {
    scale = heightCm / size.y;
  }
  const yOffset = anchor === "topo" ? -center.y * scale : -box.min.y * scale;
  return {
    scale,
    box,
    offset: [-center.x * scale, yOffset, -center.z * scale] as [number, number, number],
  };
}

/** Marca todas as malhas do grupo para projetar/receber sombras. */
export function markShadowFlags(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
}

/** Marca malhas para sombra quando o grupo monta/atualiza. */
export function useShadowFlags() {
  const ref = useRef<THREE.Group>(null);
  useEffect(() => {
    if (ref.current) markShadowFlags(ref.current);
  });
  return ref;
}
