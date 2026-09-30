import { create } from "zustand";
import { applyCameraModel, cameraModelById } from "../videoStudio/cameraModels";
import { CHROMA_KEY_COLOR } from "../types/videoStudio";
import type {
  AcousticPanelElement,
  BoomMicElement,
  CameraElement,
  ChromaKeyElement,
  ComputerElement,
  GhostState,
  LightElement,
  Room,
  StudioElement,
  StudioElementType,
  StudioView,
  SubjectElement,
  TableElement,
} from "../types/videoStudio";

let seq = 0;
const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

const DEFAULT_ROOM: Room = {
  widthCm: 700,
  lengthCm: 500,
  heightCm: 280,
  floorColor: "#9EA9B5",
  wallNorthColor: "#C9D2DA",
  wallSouthColor: "#B9C4CE",
  wallEastColor: "#C9D2DA",
  wallWestColor: "#C9D2DA",
  ceilingColor: "#E2E8F0",
  floorTexture: "none",
  floorRoughness: 1,
};

const FULL_FRAME_SENSOR = {
  name: "35mm (full frame)",
  width: 36,
  height: 24,
  cropFactor: 1,
  coc: 0.029,
};

function base(id: string, name: string, x: number, y: number) {
  return {
    id,
    name,
    position: { x, y },
    rotation: 0,
    visible: true,
    locked: false,
  };
}

function countOfType(elements: StudioElement[], type: StudioElementType) {
  return elements.filter((el) => el.type === type).length + 1;
}

function createElement(
  type: StudioElementType,
  elements: StudioElement[],
  room: Room
): StudioElement {
  const n = countOfType(elements, type);
  const x = Math.round((room.widthCm / 2) / 25) * 25;
  const y = Math.round((room.lengthCm / 2) / 25) * 25;

  switch (type) {
    case "camera": {
      const model = cameraModelById("canon_sl2")!;
      const baseCam: CameraElement = {
        ...base(uid("cam"), `Câmera ${n}`, x, y),
        type: "camera",
        heightCm: 150,
        tripod: "tripode",
        lens: {
          model: model.lenses[0].label,
          focalLength: 24,
          maxAperture: model.lenses[0].maxAperture,
          currentAperture: model.lenses[0].maxAperture,
          minFocusDistance: 30,
          type: model.lenses[0].type,
        },
        sensor: FULL_FRAME_SENSOR,
        settings: {
          iso: 400,
          shutterSpeed: 50,
          whiteBalance: 5600,
          ndFilter: 0,
          frameRate: 30,
          resolution: "1920x1080",
          codec: "H.264",
        },
        targetId: null,
        glbModelId: "canon_60d",
      };
      return { ...baseCam, ...applyCameraModel(baseCam, model) };
    }
    case "light": {
      const el: LightElement = {
        ...base(uid("light"), `Spot ${n}`, x, y),
        type: "light",
        kind: "spot",
        heightCm: 200,
        intensity: 80,
        powerW: 300,
        colorTemp: 5600,
        beamAngle: 45,
        modifier: "barn_doors",
        targetId: null,
        castShadow: true,
        physicalFalloff: true,
        glbModelId: "spot_luz",
      };
      return el;
    }
    case "table": {
      const el: TableElement = {
        ...base(uid("table"), `Mesa ${n}`, x, y),
        type: "table",
        widthCm: 160,
        depthCm: 80,
        heightCm: 75,
      };
      return el;
    }
    case "computer": {
      const el: ComputerElement = {
        ...base(uid("pc"), `Computador ${n}`, x, y),
        type: "computer",
        monitorSizeIn: 24,
      };
      return el;
    }
    case "acoustic_panel": {
      const el: AcousticPanelElement = {
        ...base(uid("panel"), `Painel acústico ${n}`, x, y),
        type: "acoustic_panel",
        widthCm: 120,
        heightCm: 60,
        nrc: 0.8,
      };
      return el;
    }
    case "subject": {
      const el: SubjectElement = {
        ...base(uid("subject"), `Participante ${n}`, x, y),
        type: "subject",
        heightCm: 175,
        role: "apresentador",
        pose: "em_pe",
        bodyType: "normal",
        shirtColor: "#2B6CB0",
        expression: "neutro",
        glasses: false,
        accessories: {
          earrings: false,
          watch: false,
          necklace: false,
          tie: false,
          badge: false,
        },
      };
      return el;
    }
    case "boom_mic": {
      const el: BoomMicElement = {
        ...base(uid("boom"), `Boom ${n}`, x, y),
        type: "boom_mic",
        heightCm: 210,
        reachCm: 100,
        targetId: null,
      };
      return el;
    }
    case "chromakey": {
      const el: ChromaKeyElement = {
        ...base(uid("chroma"), `Chroma key ${n}`, x, y),
        type: "chromakey",
        widthCm: 300,
        heightCm: 250,
        color: CHROMA_KEY_COLOR,
        receiveShadows: true,
        glbModelId: "fundo_verde",
      };
      return el;
    }
  }
}

function learningStudioPreset(): StudioElement[] {
  const sl2 = cameraModelById("canon_sl2")!;
  const t7i = cameraModelById("canon_t7i")!;

  const camA: CameraElement = {
    ...base("cam-a", "Câmera A — frontal", 280, 90),
    type: "camera",
    heightCm: 150,
    tripod: "tripode",
    modelId: sl2.id,
    lens: {
      model: sl2.lenses[0].label,
      focalLength: 24,
      maxAperture: 4,
      currentAperture: 4,
      minFocusDistance: 30,
      type: "zoom",
    },
    sensor: sl2.sensor,
    settings: {
      iso: 400,
      shutterSpeed: 50,
      whiteBalance: 5600,
      ndFilter: 0,
      frameRate: 30,
      resolution: sl2.resolution,
      codec: sl2.codec,
    },
    targetId: "subject-1",
    glbModelId: "canon_60d",
  };

  const camB: CameraElement = {
    ...base("cam-b", "Câmera B — diagonal", 430, 80),
    type: "camera",
    heightCm: 140,
    tripod: "tripode",
    modelId: t7i.id,
    lens: {
      model: "50mm f/1.8",
      focalLength: 50,
      maxAperture: 1.8,
      currentAperture: 1.8,
      minFocusDistance: 45,
      type: "prime",
    },
    sensor: t7i.sensor,
    settings: {
      iso: 400,
      shutterSpeed: 50,
      whiteBalance: 5600,
      ndFilter: 0,
      frameRate: 30,
      resolution: t7i.resolution,
      codec: t7i.codec,
    },
    targetId: "subject-1",
    glbModelId: "canon_60d",
  };

  // 2 iluminações na FRENTE das câmeras (entre elas e o apresentador,
  // fora do eixo de enquadramento)...
  const key: LightElement = {
    ...base("light-key", "Key — Spot", 170, 250),
    type: "light",
    kind: "spot",
    heightCm: 200,
    intensity: 85,
    powerW: 300,
    colorTemp: 5600,
    beamAngle: 45,
    modifier: "grade",
    targetId: "subject-1",
    castShadow: true,
    glbModelId: "spot_luz",
  };

  const fill: LightElement = {
    ...base("light-fill", "Fill — Luminária", 560, 250),
    type: "light",
    kind: "luminaria",
    heightCm: 190,
    intensity: 50,
    powerW: 150,
    colorTemp: 5600,
    beamAngle: 90,
    modifier: "difusor",
    targetId: "subject-1",
    castShadow: false,
    glbModelId: "spot_luz",
  };

  // ...e 2 ATRÁS do participante, fora do quadro das duas câmeras
  const back: LightElement = {
    ...base("light-back", "Back — Luminária focal", 650, 470),
    type: "light",
    kind: "luminaria_focal",
    heightCm: 220,
    intensity: 70,
    powerW: 200,
    colorTemp: 4500,
    beamAngle: 20,
    modifier: "barn_doors",
    targetId: "subject-1",
    castShadow: true,
    glbModelId: "spot_luz",
  };

  const ambient: LightElement = {
    ...base("light-ambient", "Back 2 — Prática", 120, 470),
    type: "light",
    kind: "pratica",
    heightCm: 240,
    intensity: 40,
    powerW: 100,
    colorTemp: 4000,
    beamAngle: 120,
    modifier: "nenhum",
    targetId: "subject-1",
    castShadow: false,
    glbModelId: "spot_luz",
  };

  const presenter: SubjectElement = {
    ...base("subject-1", "Apresentador", 350, 390),
    type: "subject",
    heightCm: 175,
    role: "apresentador",
    rotation: 180,
    glbModelId: "homem",
  };

  const table1: TableElement = {
    ...base("table-1", "Mesa — Estação 1", 120, 110),
    type: "table",
    widthCm: 160,
    depthCm: 80,
    heightCm: 75,
  };

  const pc1: ComputerElement = {
    ...base("pc-1", "Computador 1", 105, 110),
    type: "computer",
    monitorSizeIn: 24,
  };

  // Preset padrão: apresentador, 4 iluminações, 1 mesa, 1 computador,
  // 2 câmeras (sem painéis acústicos, sem boom, sem bloom).
  return [
    camA,
    camB,
    key,
    fill,
    back,
    ambient,
    presenter,
    table1,
    pc1,
  ];
}

export type ToggleFlag =
  "showGrid"
  | "showDistances"
  | "showBeams"
  | "snapToGrid"
  | "shadowsEnabled"
  | "shadowsDefaultOn";

// ─── Presets customizados (localStorage) ─────────────────────────────

export interface CustomPreset {
  id: string;
  name: string;
  savedAt: number;
  elements: StudioElement[];
}

const PRESETS_KEY = "cam-shadow-video-presets";

function readPresets(): CustomPreset[] {
  try {
    const raw =
      typeof localStorage !== "undefined"
        ? localStorage.getItem(PRESETS_KEY)
        : null;
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CustomPreset[]) : [];
  } catch {
    return [];
  }
}

function writePresets(presets: CustomPreset[]) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
    }
  } catch {
    // armazenamento indisponível — ignora
  }
}

/**
 * Elementos que dependem do elemento informado.
 * Mesa → computadores apoiados sobre ela.
 */
export function findDependents(
  elements: StudioElement[],
  id: string
): StudioElement[] {
  const target = elements.find((el) => el.id === id);
  if (!target || target.type !== "table") return [];

  const table = target as TableElement;
  const halfW = table.widthCm / 2 + 5;
  const halfD = table.depthCm / 2 + 5;
  const a = (table.rotation * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);

  return elements.filter((el) => {
    if (el.type !== "computer") return false;
    if (el.id === id) return false;
    const dx = el.position.x - table.position.x;
    const dy = el.position.y - table.position.y;
    // rota inversa para o espaço local da mesa
    const lx = dx * cos + dy * sin;
    const ly = -dx * sin + dy * cos;
    return Math.abs(lx) <= halfW && Math.abs(ly) <= halfD;
  });
}

interface VideoStudioState {
  room: Room;
  elements: StudioElement[];
  selectedId: string | null;
  activeCameraId: string | null;
  view: StudioView;
  showGrid: boolean;
  showDistances: boolean;
  showBeams: boolean;
  snapToGrid: boolean;
  gridSizeCm: number;
  customPresets: CustomPreset[];
  /** Modo livre "fantasma" (WASD + mouse) para navegar pelo estúdio */
  ghost: GhostState;
  /** Configurações globais de sombra */
  shadowsEnabled: boolean;       // liga/desliga sombras globalmente
  shadowsDefaultOn: boolean;     // padrão: sombras ligadas para novas luzes
  shadowMapSize: number;         // resolução do shadow map (1024, 2048, etc.)
  shadowBudget: number;          // máx. de luzes com sombra simultâneas
  addElement: (type: StudioElementType) => void;
  updateElement: (id: string, patch: Record<string, unknown>) => void;
  /** Duplica um elemento (cópia deslocada 25 cm, seleciona a cópia). */
  duplicateElement: (id: string) => void;
  removeElement: (id: string) => void;
  /** Remove o elemento junto com seus dependentes (ex.: mesa + computadores). */
  removeElementCascade: (id: string) => void;
  select: (id: string | null) => void;
  setActiveCamera: (id: string) => void;
  setView: (view: StudioView) => void;
  toggle: (flag: ToggleFlag) => void;
  /** Redimensiona a sala (planta). Valores em cm, com limites seguros. */
  setRoom: (patch: Partial<Room>) => void;
  loadLearningPreset: () => void;
  clearAll: () => void;
  saveCustomPreset: (name: string) => void;
  deleteCustomPreset: (id: string) => void;
  loadCustomPreset: (id: string) => void;
  /** Shadow actions */
  setShadowsEnabled: (enabled: boolean) => void;
  setShadowsDefaultOn: (enabled: boolean) => void;
  setShadowMapSize: (size: number) => void;
  setShadowBudget: (budget: number) => void;
  /** Ghost actions */
  setGhostEnabled: (enabled: boolean) => void;
  setGhostPosition: (pos: [number, number, number]) => void;
  setGhostRotation: (yaw: number, pitch: number) => void;
  setGhostSpeed: (speed: number) => void;
  setGhostPointerLock: (locked: boolean) => void;
  /** Move ghost com colisão nas paredes */
  moveGhost: (dx: number, dy: number, dz: number) => void;
}

export const useVideoStudio = create<VideoStudioState>()((set) => ({
  room: DEFAULT_ROOM,
  elements: learningStudioPreset(),
  selectedId: "subject-1",
  activeCameraId: "cam-a",
  view: "topo",
  showGrid: true,
  showDistances: true,
  showBeams: true,
  snapToGrid: true,
  gridSizeCm: 25,
  customPresets: readPresets(),
  ghost: {
    enabled: false,
    position: [350, 170, -250],
    yaw: 0,
    pitch: 0,
    speed: 80,
    pointerLocked: false,
  },
  // Sombras: ligadas por padrão, budget 8, PCFSoftShadowMap (2048 quando ≤3)
  shadowsEnabled: true,
  shadowsDefaultOn: true,
  shadowMapSize: 2048,
  shadowBudget: 8,

  addElement: (type) =>
    set((state) => {
      const el = createElement(type, state.elements, state.room);
      return {
        elements: [...state.elements, el],
        selectedId: el.id,
        activeCameraId:
          el.type === "camera" ? el.id : state.activeCameraId,
      };
    }),

  updateElement: (id, patch) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? ({ ...el, ...patch } as StudioElement) : el
      ),
    })),

  duplicateElement: (id) =>
    set((state) => {
      const el = state.elements.find((e) => e.id === id);
      if (!el) return state;
      const copy = {
        ...el,
        id: uid(el.type),
        name: `${el.name} (cópia)`,
        position: { x: el.position.x + 25, y: el.position.y + 25 },
      } as StudioElement;
      return {
        elements: [...state.elements, copy],
        selectedId: copy.id,
      };
    }),

  removeElement: (id) =>
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      activeCameraId:
        state.activeCameraId === id ? null : state.activeCameraId,
    })),

  removeElementCascade: (id) =>
    set((state) => {
      const dependentIds = new Set(
        findDependents(state.elements, id).map((el) => el.id)
      );
      dependentIds.add(id);

      const elements = state.elements
        .filter((el) => !dependentIds.has(el.id))
        .map((el) =>
          "targetId" in el && el.targetId && dependentIds.has(el.targetId)
            ? { ...el, targetId: null }
            : el
        );

      return {
        elements,
        selectedId:
          state.selectedId && dependentIds.has(state.selectedId)
            ? null
            : state.selectedId,
        activeCameraId:
          state.activeCameraId && dependentIds.has(state.activeCameraId)
            ? null
            : state.activeCameraId,
      };
    }),

  /**
   * Selecionar uma câmera também assume ela como POV da simulação —
   * assim o painel lateral e a visão da câmera sempre falam da mesma.
   */
  select: (id) =>
    set((state) => {
      const el = id ? state.elements.find((x) => x.id === id) : null;
      return {
        selectedId: id,
        ...(el && el.type === "camera" ? { activeCameraId: el.id } : {}),
      };
    }),

  /** Trocar o POV também seleciona a câmera no painel de controle. */
  setActiveCamera: (id) => set({ activeCameraId: id, selectedId: id }),

  setView: (view) =>
    set((state) => ({
      view,
      // o modo livre WASD só fica ativo na vista "perspectiva"
      ghost: { ...state.ghost, enabled: view === "perspectiva" },
    })),

  toggle: (flag) => set((state) => ({ [flag]: !state[flag] }) as never),

  setRoom: (patch) =>
    set((state) => {
      const clamp = (v: number, min: number, max: number) =>
        Math.min(Math.max(Math.round(v), min), max);
      const room = { ...state.room };
      if (patch.widthCm !== undefined)
        room.widthCm = clamp(patch.widthCm, 100, 5000);
      if (patch.lengthCm !== undefined)
        room.lengthCm = clamp(patch.lengthCm, 100, 5000);
      if (patch.heightCm !== undefined)
        room.heightCm = clamp(patch.heightCm, 100, 800);
      return { room };
    }),

  loadLearningPreset: () =>
    set({
      room: DEFAULT_ROOM,
      elements: learningStudioPreset(),
      selectedId: "subject-1",
      activeCameraId: "cam-a",
    }),

  clearAll: () =>
    set({ elements: [], selectedId: null, activeCameraId: null }),

  saveCustomPreset: (name) =>
    set((state) => {
      const preset: CustomPreset = {
        id: uid("preset"),
        name:
          name.trim() ||
          `Preset ${state.customPresets.length + 1}`,
        savedAt: Date.now(),
        elements: JSON.parse(
          JSON.stringify(state.elements)
        ) as StudioElement[],
      };
      const customPresets = [...state.customPresets, preset];
      writePresets(customPresets);
      return { customPresets };
    }),

  deleteCustomPreset: (id) =>
    set((state) => {
      const customPresets = state.customPresets.filter(
        (p) => p.id !== id
      );
      writePresets(customPresets);
      return { customPresets };
    }),

  loadCustomPreset: (id) =>
    set((state) => {
      const preset = state.customPresets.find((p) => p.id === id);
      if (!preset) return state;
      const elements = JSON.parse(
        JSON.stringify(preset.elements)
      ) as StudioElement[];
      const firstCam = elements.find((el) => el.type === "camera");
      const firstSubject = elements.find((el) => el.type === "subject");
      return {
        elements,
        selectedId: firstSubject?.id ?? null,
        activeCameraId: firstCam?.id ?? null,
      };
    }),

  // Ghost actions
  setGhostEnabled: (enabled) =>
    set((state) => ({
      ghost: { ...state.ghost, enabled },
      view: enabled ? "perspectiva" : "topo",
    })),
  setGhostPosition: (position) =>
    set((state) => ({ ghost: { ...state.ghost, position } })),
  setGhostRotation: (yaw, pitch) =>
    set((state) => ({
      ghost: { ...state.ghost, yaw, pitch },
    })),
  setGhostSpeed: (speed) =>
    set((state) => ({ ghost: { ...state.ghost, speed } })),
  setGhostPointerLock: (pointerLocked) =>
    set((state) => ({ ghost: { ...state.ghost, pointerLocked } })),
  moveGhost: (dx, dy, dz) =>
    set((state) => {
      const { room, ghost } = state;
      if (!ghost.enabled) return state;

      const currentX = ghost.position[0];
      const currentY = -ghost.position[2];
      const currentHeight = ghost.position[1];

      const cos = Math.cos(ghost.yaw);
      const sin = Math.sin(ghost.yaw);
      const worldDx = dx * cos - dz * sin;
      const worldDz = dx * sin + dz * cos;

      let newX = currentX + worldDx;
      let newY = currentY - worldDz;
      const newHeight = Math.max(50, Math.min(room.heightCm - 50, currentHeight + dy));

      const margin = 30;
      newX = Math.max(margin, Math.min(room.widthCm - margin, newX));
      newY = Math.max(margin, Math.min(room.lengthCm - margin, newY));

      return {
        ghost: {
          ...ghost,
          position: [newX, newHeight, -newY],
        },
      };
    }),

  // Shadow actions
  setShadowsEnabled: (enabled) => set({ shadowsEnabled: enabled }),
  setShadowsDefaultOn: (enabled) => set({ shadowsDefaultOn: enabled }),
  setShadowMapSize: (size) => set({ shadowMapSize: size }),
  setShadowBudget: (budget) => set({ shadowBudget: budget }),
}));

export const selectSubjects = (elements: StudioElement[]) =>
  elements.filter((el): el is SubjectElement => el.type === "subject");

export const selectCameras = (elements: StudioElement[]) =>
  elements.filter((el): el is CameraElement => el.type === "camera");
