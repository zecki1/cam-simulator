import type { LensSpecs, SensorFormat, Point2D } from "./index";
import type { CameraSettings } from "./studio";

export type { Point2D };

export interface BaseElement {
  id: string;
  name: string;
  position: Point2D; // cm (origem = canto inferior esquerdo da sala)
  rotation: number; // graus
  visible: boolean;
  locked: boolean;
  /** id no catálogo GLB_MODELS (modelo 3D visual); ausente = malha procedural */
  glbModelId?: string;
}

export type TripodType =
  | "tripode"
  | "monopode"
  | "slider"
  | "gimbal"
  | "teto"
  | "gantry";

export interface CameraElement extends BaseElement {
  type: "camera";
  heightCm: number; // altura do suporte (tripé) em cm
  tripod: TripodType;
  lens: LensSpecs;
  sensor: SensorFormat;
  settings: CameraSettings;
  targetId: string | null;
  /** id no catálogo CAMERA_MODELS; ausente = configuração personalizada */
  modelId?: string;
}

export type LightKind =
  | "spot"
  | "luminaria"
  | "luminaria_focal"
  | "softbox"
  | "pratica";

export type LightModifier =
  | "nenhum"
  | "softbox"
  | "refletor"
  | "snoot"
  | "barn_doors"
  | "grade"
  | "difusor";

export interface LightElement extends BaseElement {
  type: "light";
  kind: LightKind;
  heightCm: number; // altura do suporte/ponto de fixação
  intensity: number; // 0-100%
  powerW: number;
  colorTemp: number; // Kelvin
  beamAngle: number; // graus (spots e focais)
  modifier: LightModifier;
  targetId: string | null;
  castShadow: boolean;
  /** Queda física da luz (inverse square law). Se true, usa decay=2; senão decay=0 (legacy). */
  physicalFalloff?: boolean;
}

export interface TableElement extends BaseElement {
  type: "table";
  widthCm: number;
  depthCm: number;
  heightCm: number;
}

export interface ComputerElement extends BaseElement {
  type: "computer";
  monitorSizeIn: number;
}

export interface AcousticPanelElement extends BaseElement {
  type: "acoustic_panel";
  widthCm: number;
  heightCm: number;
  nrc: number;
}

export type SubjectRole = "apresentador" | "instrutor" | "aluno";
export type SubjectPose = "em_pe" | "sentado" | "andando";
export type BodyType = "magro" | "normal" | "gordo";
export type Expression = "neutro" | "sorrindo" | "serio";

export interface SubjectElement extends BaseElement {
  type: "subject";
  heightCm: number; // altura do participante
  role: SubjectRole;
  /** Pose do participante */
  pose?: SubjectPose;
  /** Biotipo/corpo */
  bodyType?: BodyType;
  /** Cor da camisa/roupa (hex) */
  shirtColor?: string;
  /** Expressão facial */
  expression?: Expression;
  /** Usa óculos */
  glasses?: boolean;
  /** Acessórios: brincos, relogio, colar, gravata, cracha */
  accessories?: {
    earrings?: boolean;
    watch?: boolean;
    necklace?: boolean;
    tie?: boolean;
    badge?: boolean;
  };
}

export interface BoomMicElement extends BaseElement {
  type: "boom_mic";
  heightCm: number;
  reachCm: number;
  targetId: string | null;
}

/** Verde chroma padrão (Rec.709 green). */
export const CHROMA_KEY_COLOR = "#00B140";

export interface ChromaKeyElement extends BaseElement {
  type: "chromakey";
  widthCm: number; // largura do fundo
  heightCm: number; // altura (chão → topo)
  color: string;
  /**
   * O fundo recebe sombra projetada das luzes. Desligue para simular
   * um cyclorama bem iluminado (key mais limpo, sem sombra sujando o verde).
   */
  receiveShadows: boolean;
}

export type StudioElement =
  | CameraElement
  | LightElement
  | TableElement
  | ComputerElement
  | AcousticPanelElement
  | SubjectElement
  | BoomMicElement
  | ChromaKeyElement;

export type StudioElementType = StudioElement["type"];

export interface Room {
  widthCm: number;
  lengthCm: number;
  heightCm: number;
  /** Cor do piso (hex) */
  floorColor?: string;
  /** Cor das paredes - norte (hex) */
  wallNorthColor?: string;
  /** Cor das paredes - sul (hex) */
  wallSouthColor?: string;
  /** Cor das paredes - leste (hex) */
  wallEastColor?: string;
  /** Cor das paredes - oeste (hex) */
  wallWestColor?: string;
  /** Cor do teto (hex) */
  ceilingColor?: string;
  /** Textura do piso (nome do pattern SVG) */
  floorTexture?: string;
  /** Rugosidade do piso (0-1) para reflexos no Environment Map */
  floorRoughness?: number;
}

export type StudioView = "topo" | "camera" | "perspectiva";

export interface GhostState {
  enabled: boolean;
  position: [number, number, number]; // x, y, z em cm (mundo three.js: x, altura, -y)
  yaw: number;   // rotação horizontal (radianos)
  pitch: number; // rotação vertical (radianos)
  speed: number; // cm/frame
  pointerLocked: boolean;
}

export const LIGHT_KIND_LABELS: Record<LightKind, string> = {
  spot: "Spot",
  luminaria: "Luminária (painel LED)",
  luminaria_focal: "Luminária Focal (fresnel)",
  softbox: "Softbox",
  pratica: "Prática / luminária de ambiente",
};

export const TRIPOD_LABELS: Record<TripodType, string> = {
  tripode: "Tripé",
  monopode: "Monopé",
  slider: "Slider",
  gimbal: "Gimbal",
  teto: "Fixação no teto",
  gantry: "Gantry / Piso ao teto",
};

export const SUBJECT_ROLE_LABELS: Record<SubjectRole, string> = {
  apresentador: "Apresentador",
  instrutor: "Instrutor",
  aluno: "Aluno",
};
