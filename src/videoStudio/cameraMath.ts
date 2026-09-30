import type { CameraElement, StudioElement, SubjectElement } from "../types/videoStudio";
import { distanceCm } from "./format";

const RAD_TO_DEG = 180 / Math.PI;
const DEG = Math.PI / 180;
/** Distância (cm) à frente da câmera usada como ponto de mira no modo manual. */
const AIM_LEAD_CM = 600;

export interface FramingPoint {
  key: "pes" | "cintura" | "ombros" | "olhos" | "topo";
  label: string;
  heightCm: number;
  /** posição normalizada no quadro: -1 topo, +1 base, relativa ao centro da mira */
  yNorm: number;
}

export interface FramingMetrics {
  distanceCm: number;
  verticalFovDeg: number;
  horizontalFovDeg: number;
  frameHeightAtSubjectCm: number;
  points: FramingPoint[];
  framingLabel: string;
  headInFrame: boolean;
  feetInFrame: boolean;
}

/** Zoom digital aplicado ao FOV (1 = desligado; corta o sensor). */
export function digitalZoomOf(camera: CameraElement): number {
  const z = camera.digitalZoom ?? 1;
  return Number.isFinite(z) && z > 1 ? Math.min(z, 4) : 1;
}

export function verticalFovDeg(camera: CameraElement): number {
  const base =
    2 * Math.atan(camera.sensor.height / 2 / camera.lens.focalLength) * RAD_TO_DEG;
  return base / digitalZoomOf(camera);
}

/** Normaliza um ângulo em graus para [0, 360). */
export function normalizeDeg(deg: number): number {
  const r = deg % 360;
  return r < 0 ? r + 360 : r;
}

/**
 * Rotação do elemento (graus, 0 = +y) que faz ele apontar de `from`
 * para `to`. Usada para sincronizar a rotação com a direção do alvo
 * antes de assumir controle manual.
 */
export function rotationToward(
  from: { x: number; y: number },
  to: { x: number; y: number }
): number {
  const headingDeg = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  return normalizeDeg(90 - headingDeg);
}

export function horizontalFovDeg(camera: CameraElement): number {
  const base =
    2 * Math.atan(camera.sensor.width / 2 / camera.lens.focalLength) * RAD_TO_DEG;
  return base / digitalZoomOf(camera);
}

/**
 * Distância de foco efetiva em cm. Foco manual (MF) usa `focusDistanceCm`;
 * autofoco (AF) usa o `fallbackCm` (distância até o participante/alvo).
 */
export function focusDistanceCmOf(
  camera: CameraElement,
  fallbackCm: number
): number {
  if (
    camera.focusMode === "manual" &&
    camera.focusDistanceCm &&
    camera.focusDistanceCm > 0
  ) {
    return camera.focusDistanceCm;
  }
  return fallbackCm;
}

/**
 * Direção (graus, 0 = +y) em que a câmera realmente aponta: o alvo
 * configurado ("Mirar em"), ou — sem alvo — a rotação manual do tripé.
 */
export function cameraAimDeg(
  camera: CameraElement,
  elements: StudioElement[]
): number {
  const t = camera.targetId
    ? elements.find((el) => el.id === camera.targetId)
    : undefined;
  return t ? rotationToward(camera.position, t.position) : camera.rotation;
}

/**
 * Ponto de mira 3D da câmera (coordenadas de mundo: x, altura, z):
 * com alvo → posição do alvo na altura do rosto/peito (65% da altura);
 * sem alvo → ponto à frente na direção da rotação, na altura do tripé
 * (pan horizontal, como ajustar a cabeça do tripé).
 *
 * Conversão de planta para o mundo3D: **norte (+y da planta) = −Z**.
 * Com a câmera olhando para −Z e up +Y, o leste (+x) fica à direita do
 * quadro — igual à planta. Mapear +y → +Z espelharia a imagem na
 * horizontal (three.js coloca −X à direita quando olhamos para +Z).
 */
export function cameraAimPoint(
  camera: CameraElement,
  elements: StudioElement[]
): { x: number; y: number; z: number } {
  const t = camera.targetId
    ? elements.find((el) => el.id === camera.targetId)
    : undefined;
  if (t && "heightCm" in t) {
    return {
      x: t.position.x,
      y: t.heightCm * 0.65,
      z: -t.position.y,
    };
  }
  return {
    x: camera.position.x + Math.sin(camera.rotation * DEG) * AIM_LEAD_CM,
    y: camera.heightCm,
    z: -(camera.position.y + Math.cos(camera.rotation * DEG) * AIM_LEAD_CM),
  };
}

/**
 * Deslocamento horizontal normalizado de um ponto no quadro da câmera,
 * relativo à direção de mira: 0 = centro do quadro, ±1 = bordas.
 * Valores com |x| > 1 ficam fora do quadro.
 */
export function horizontalOffsetNorm(
  camera: CameraElement,
  point: { x: number; y: number },
  aimDeg: number
): number {
  const bearing = rotationToward(camera.position, point);
  const err = normalizeDeg(bearing - aimDeg + 180) - 180;
  // atrás da câmera (|erro| ≥ 90°) nunca aparece no quadro — tan seria
  // periódico de 180° e projetaria o ponto no centro de forma errada
  if (Math.abs(err) >= 90) return err < 0 ? -Infinity : Infinity;
  const hHalfRad = (horizontalFovDeg(camera) * DEG) / 2;
  return Math.tan(err * DEG) / Math.tan(hHalfRad);
}

/**
 * Se um ponto está dentro da zona de visão (cone horizontal) da câmera —
 * a mesma régua do frustum desenhado na planta baixa — com folga extra de
 * `marginDeg` além do FOV horizontal para objetos grandes na borda.
 * Elementos fora do cone são omitidos da cena 3D.
 */
export function isInCameraCone(
  camera: CameraElement,
  point: { x: number; y: number },
  aimDeg: number,
  marginDeg = 10
): boolean {
  const bearing = rotationToward(camera.position, point);
  const err = normalizeDeg(bearing - aimDeg + 180) - 180;
  return Math.abs(err) <= horizontalFovDeg(camera) / 2 + marginDeg;
}

export interface Projector {
  distanceCm: number;
  vFovRad: number;
  aimAngle: number;
  aimHeightCm: number;
  frameHeightCm: number;
  /** converte uma altura acima do chão (cm) em posição normalizada no quadro (-1 topo, +1 base) */
  yNormOf: (heightCm: number) => number;
  /** converte uma altura acima do chão (cm) em pixels do quadro (frameHeight px de altura) */
  yPixOf: (heightCm: number, framePx: number) => number;
}

/**
 * Cria o projetor da câmera para o participante: por padrão a câmera mira
 * automaticamente na altura do rosto/peito do participante; passando
 * `aimAngleRad` (ex.: 0 = nível) usa o ângulo de mira real da câmera.
 * Usa a projeção perspectiva exata (tan da diferença de ângulos),
 * igual à câmera perspectiva do render 3D.
 */
export function makeProjector(
  camera: CameraElement,
  subject: SubjectElement,
  aimAngleRad?: number
): Projector {
  const d = distanceCm(camera.position, subject.position) || 1;
  const camH = camera.heightCm;
  const subjH = subject.heightCm;
  const vFovRad = (verticalFovDeg(camera) * Math.PI) / 180;
  const aimHeightCm = subjH * 0.65;
  const aimAngle =
    aimAngleRad ?? Math.atan((aimHeightCm - camH) / d);

  const yNormOf = (heightCm: number) => {
    const angle = Math.atan((heightCm - camH) / d);
    return -Math.tan(angle - aimAngle) / Math.tan(vFovRad / 2);
  };

  const yPixOf = (heightCm: number, framePx: number) =>
    (framePx / 2) * (1 + yNormOf(heightCm));

  return {
    distanceCm: d,
    vFovRad,
    aimAngle,
    aimHeightCm,
    frameHeightCm: 2 * d * Math.tan(vFovRad / 2),
    yNormOf,
    yPixOf,
  };
}

/**
 * Bearing relativo do participante em relação à câmera, em graus
 * normalizados para [-180, 180]:
 *   0 = câmera na frente do participante
 *  90 = câmera à esquerda do participante
 * -90 = câmera à direita do participante
 * 180 = câmera atrás do participante
 */
export function relativeBearingDeg(
  subject: SubjectElement,
  camera: CameraElement
): number {
  // direção que o participante olha (rotação 0 = +y)
  const facing = Math.PI / 2 - (subject.rotation * Math.PI) / 180;
  const toCamera = Math.atan2(
    camera.position.y - subject.position.y,
    camera.position.x - subject.position.x
  );
  let deg = ((toCamera - facing) * 180) / Math.PI;
  while (deg > 180) deg -= 360;
  while (deg < -180) deg += 360;
  return deg;
}

/** Descrição da perspectiva vista pela câmera a partir do bearing. */
export function perspectiveLabel(bearingDeg: number): string {
  const b = Math.abs(bearingDeg);
  if (b <= 45) return "frontal";
  if (b >= 135) return "costas (contraluz)";
  if (bearingDeg > 0) return "perfil (lado esquerdo)";
  return "perfil (lado direito)";
}

/**
 * Calcula o enquadramento projetando o participante no quadro da câmera.
 * Por padrão mira na altura do peito/rosto do participante; passando
 * `aimAngleRad` usa o ângulo de mira real (ex.: 0 = câmera nivelada).
 */
export function computeFraming(
  camera: CameraElement,
  subject: SubjectElement,
  aimAngleRad?: number
): FramingMetrics {
  const d = distanceCm(camera.position, subject.position) || 1;
  const subjH = subject.heightCm;

  const vFov = (verticalFovDeg(camera) * Math.PI) / 180;
  const hFov = (horizontalFovDeg(camera) * Math.PI) / 180;

  const projector = makeProjector(camera, subject, aimAngleRad);
  const toNorm = (heightCm: number) => projector.yNormOf(heightCm);

  const definitions: Omit<FramingPoint, "yNorm">[] = [
    { key: "pes", label: "Pés", heightCm: 0 },
    { key: "cintura", label: "Cintura", heightCm: subjH * 0.5 },
    { key: "ombros", label: "Ombros", heightCm: subjH * 0.82 },
    { key: "olhos", label: "Olhos", heightCm: subjH * 0.94 },
    { key: "topo", label: "Topo da cabeça", heightCm: subjH },
  ];

  const points: FramingPoint[] = definitions.map((def) => ({
    ...def,
    yNorm: toNorm(def.heightCm),
  }));

  const yOf = (key: FramingPoint["key"]) =>
    points.find((p) => p.key === key)!.yNorm;

  const feetInFrame = yOf("pes") <= 1;
  const headInFrame = yOf("topo") >= -1;

  let framingLabel: string;
  if (feetInFrame && headInFrame) {
    framingLabel = "Plano geral (corpo inteiro)";
  } else if (!feetInFrame && yOf("cintura") <= 1 && yOf("topo") >= -1) {
    framingLabel = "Plano médio (cintura pra cima)";
  } else if (yOf("cintura") > 1 && yOf("ombros") <= 1 && yOf("topo") >= -1) {
    framingLabel = "Plano americano (ombros pra cima)";
  } else if (yOf("ombros") > 1 && yOf("olhos") >= -1 && yOf("topo") >= -1) {
    framingLabel = "Primeiro plano (rosto)";
  } else if (yOf("olhos") < -1) {
    framingLabel = "Grosso plano / detalhe";
  } else {
    framingLabel = "Participante cortado no quadro";
  }

  const frameHeightAtSubjectCm = 2 * d * Math.tan(vFov / 2);

  return {
    distanceCm: d,
    verticalFovDeg: vFov * RAD_TO_DEG,
    horizontalFovDeg: hFov * RAD_TO_DEG,
    frameHeightAtSubjectCm,
    points,
    framingLabel,
    headInFrame,
    feetInFrame,
  };
}

export interface DofResult {
  hyperfocalMm: number;
  nearMm: number;
  farMm: number;
  totalMm: number;
}

/** Profundidade de campo com distâncias em unidades métricas (entrada: distância em mm) */
export function computeDof(
  focalLengthMm: number,
  aperture: number,
  cocMm: number,
  subjectDistanceMm: number
): DofResult {
  const hyperfocalMm =
    focalLengthMm +
    (focalLengthMm * focalLengthMm) / (aperture * Math.max(cocMm, 0.0001));

  const nearMm =
    (hyperfocalMm * subjectDistanceMm) /
    (hyperfocalMm + (subjectDistanceMm - focalLengthMm));

  const farDenominator = hyperfocalMm - (subjectDistanceMm - focalLengthMm);
  const farMm =
    farDenominator <= 0
      ? Number.POSITIVE_INFINITY
      : (hyperfocalMm * subjectDistanceMm) / farDenominator;

  return {
    hyperfocalMm,
    nearMm,
    farMm,
    totalMm: farMm - nearMm,
  };
}
