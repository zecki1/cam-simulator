import {
  Component,
  useMemo,
  type ReactNode,
} from "react";
import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { fitGltfObject, markShadowFlags } from "./gltfFit";

/** Se o GLB falhar ao carregar, cai de volta para a malha procedural. */
export class ModelErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Modelo 3D importado de .glb, auto-fitado (centralizado, escalado e com
 * sombras) e ancorado na posição/rotação do elemento da cena.
 */
export function GlbModel({
  url,
  position,
  rotationY = 0,
  heightCm,
  fitCm,
  anchor = "chao",
}: {
  url: string;
  position: [number, number, number];
  rotationY?: number;
  /** Altura-alvo em cm (auto-fit por altura do elemento). */
  heightCm?: number;
  /** Maior dimensão-alvo em cm (auto-fit por tamanho real, ex.: 24 cm). */
  fitCm?: number;
  anchor?: "chao" | "topo";
}) {
  const gltf = useLoader(GLTFLoader, url);

  const fitted = useMemo(() => {
    const clone = gltf.scene.clone(true);
    const fit = fitGltfObject(clone, { heightCm, fitCm, anchor });
    markShadowFlags(clone);
    return { clone, scale: fit.scale, offset: fit.offset };
  }, [gltf, heightCm, fitCm, anchor]);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <group scale={fitted.scale} position={fitted.offset}>
        <primitive object={fitted.clone} />
      </group>
    </group>
  );
}
