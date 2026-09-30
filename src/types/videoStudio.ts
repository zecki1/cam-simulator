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

export interface SubjectElement extends BaseElement {
  type: "subject";
  heightCm: number; // altura do participante
  role: SubjectRole;
}

export interface BoomMicElement extends BaseElement {
  type: "boom_mic";
  heightCm: number;
  reachCm: number;
  targetId: string | null;
}

export type StudioElement =
  | CameraElement
  | LightElement
  | TableElement
  | ComputerElement
  | AcousticPanelElement
  | SubjectElement
  | BoomMicElement;

export type StudioElementType = StudioElement["type"];

export interface Room {
  widthCm: number;
  lengthCm: number;
  heightCm: number;
}

export type StudioView = "topo" | "camera";

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
