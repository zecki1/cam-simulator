import type { LensSpecs, SensorFormat } from "../types";
import type { CameraElement } from "../types/videoStudio";

export interface LensOption {
  label: string; // ex.: "18–55mm f/4–5.6 (kit)"
  focalMin: number; // mm
  focalMax: number; // mm (igual a focalMin quando é fixa)
  maxAperture: number; // abertura mais aberta (menor número f)
  type: LensSpecs["type"];
}

export interface CameraModel {
  id: string;
  label: string; // "Canon EOS SL2 (Rebel SL2)"
  kind: "dslr" | "handcam" | "ptz";
  sensor: SensorFormat;
  lenses: LensOption[];
  isoOptions: number[];
  fpsOptions: number[];
  resolution: string; // "1920×1080 · 60p"
  codec: string;
  notes: string; // ficha técnica resumida (exibida no painel)
  /** reservado para o .glb específico desta câmera (Etapa 1 do planejamento) */
  model3dId?: string;
}

export const APERTURE_OPTIONS = [1.2, 1.4, 1.8, 2, 2.8, 4, 5.6, 8, 11, 16];

const APS_C_CANON: SensorFormat = {
  name: "APS-C Canon",
  width: 22.3,
  height: 14.9,
  cropFactor: 1.6,
  coc: 0.019,
};

const SENSOR_1_25: SensorFormat = {
  name: '1/2.5" Exmor R',
  width: 5.76,
  height: 4.29,
  cropFactor: 6.0,
  coc: 0.005,
};

const SENSOR_1_28: SensorFormat = {
  name: '1/2.8" STARVIS',
  width: 5.18,
  height: 3.89,
  cropFactor: 6.7,
  coc: 0.0045,
};

const CANON_LENSES: LensOption[] = [
  { label: "18–55mm f/4–5.6 (kit)", focalMin: 18, focalMax: 55, maxAperture: 4, type: "zoom" },
  { label: "24mm f/2.8", focalMin: 24, focalMax: 24, maxAperture: 2.8, type: "prime" },
  { label: "35mm f/1.8", focalMin: 35, focalMax: 35, maxAperture: 1.8, type: "prime" },
  { label: "50mm f/1.8", focalMin: 50, focalMax: 50, maxAperture: 1.8, type: "prime" },
  { label: "85mm f/1.8", focalMin: 85, focalMax: 85, maxAperture: 1.8, type: "prime" },
  { label: "70–200mm f/4", focalMin: 70, focalMax: 200, maxAperture: 4, type: "zoom" },
];

export const CAMERA_MODELS: CameraModel[] = [
  {
    id: "canon_sl2",
    label: "Canon EOS SL2 (Rebel SL2)",
    kind: "dslr",
    sensor: APS_C_CANON,
    lenses: CANON_LENSES,
    isoOptions: [100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600],
    fpsOptions: [24, 25, 30, 50, 60],
    resolution: "1920×1080 · 60p",
    codec: "H.264",
    notes: "DSLR APS-C · Dual Pixel AF · vídeo 1080p60",
  },
  {
    id: "canon_t7i",
    label: "Canon EOS T7i (Rebel T800)",
    kind: "dslr",
    sensor: APS_C_CANON,
    lenses: CANON_LENSES,
    isoOptions: [100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600],
    fpsOptions: [24, 25, 30, 50, 60],
    resolution: "1920×1080 · 60p",
    codec: "H.264",
    notes: "DSLR APS-C · 45 pontos de AF · vídeo 1080p60",
  },
  {
    id: "sony_handcam",
    label: "Sony Handcam (FDR-AX43A)",
    kind: "handcam",
    sensor: SENSOR_1_25,
    lenses: [
      { label: "4,4–88mm f/1,8 (20× óptico)", focalMin: 4.4, focalMax: 88, maxAperture: 1.8, type: "zoom" },
    ],
    isoOptions: [100, 200, 400, 800, 1600, 3200, 6400, 12800],
    fpsOptions: [24, 30, 60, 120],
    resolution: "3840×2160 · 30p (4K)",
    codec: "XAVC S",
    notes: 'Handcam 4K · sensor 1/2.5" · zoom óptico 20× · estabilização óptica balanceada',
  },
  {
    id: "ptz_20x",
    label: 'PTZ 20× (1/2.8")',
    kind: "ptz",
    sensor: SENSOR_1_28,
    lenses: [
      { label: "5,4–108mm f/1,8 (20× óptico)", focalMin: 5.4, focalMax: 108, maxAperture: 1.8, type: "zoom" },
    ],
    isoOptions: [100, 200, 400, 800, 1600, 3200, 6400],
    fpsOptions: [30, 60],
    resolution: "1920×1080 · 60p",
    codec: "H.264 (RTSP)",
    notes: 'Câmera PTZ remota · sensor 1/2.8" · pan/tilt/zoom controlados pela switcher',
  },
];

export const cameraModelOptions = [
  { value: "", label: "Personalizada (sem modelo)" },
  ...CAMERA_MODELS.map((m) => ({ value: m.id, label: m.label })),
];

export function cameraModelById(id?: string | null): CameraModel | null {
  if (!id) return null;
  return CAMERA_MODELS.find((m) => m.id === id) ?? null;
}

/** Aberturas disponíveis para a objetiva (nunca mais aberta que o máximo dela). */
export function apertureOptionsFor(lens: LensOption | null): number[] {
  const max = lens ? lens.maxAperture : 1.2;
  const opts = APERTURE_OPTIONS.filter((a) => a >= max - 0.001);
  return opts.length > 0 ? opts : APERTURE_OPTIONS;
}

function closest(options: number[], target: number): number {
  return options.reduce((best, o) =>
    Math.abs(o - target) < Math.abs(best - target) ? o : best
  );
}

/**
 * Aplica as especificações do corpo+lente da câmera escolhida num
 * elemento. Preserva posição, altura, alvo e demais ajustes.
 */
export function applyCameraModel(
  camera: CameraElement,
  model: CameraModel,
  lensLabel?: string
): Partial<CameraElement> {
  const lens =
    model.lenses.find((l) => l.label === lensLabel) ??
    model.lenses.find((l) => l.label === camera.lens.model) ??
    model.lenses[0];

  const focal = Math.min(
    Math.max(camera.lens.focalLength, lens.focalMin),
    lens.focalMax
  );
  const apertures = apertureOptionsFor(lens);
  const aperture = apertures.includes(camera.lens.currentAperture)
    ? camera.lens.currentAperture
    : lens.maxAperture;
  const iso = model.isoOptions.includes(camera.settings.iso)
    ? camera.settings.iso
    : closest(model.isoOptions, camera.settings.iso);
  const fps = model.fpsOptions.includes(camera.settings.frameRate ?? 30)
    ? camera.settings.frameRate ?? model.fpsOptions[0]
    : closest(model.fpsOptions, camera.settings.frameRate ?? 30);

  return {
    modelId: model.id,
    sensor: model.sensor,
    lens: {
      ...camera.lens,
      model: lens.label,
      focalLength: focal,
      maxAperture: lens.maxAperture,
      currentAperture: aperture,
      type: lens.type,
    },
    settings: {
      ...camera.settings,
      iso,
      frameRate: fps,
      resolution: model.resolution,
      codec: model.codec,
    },
  };
}
