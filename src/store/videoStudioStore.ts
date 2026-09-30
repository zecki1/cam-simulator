import { create } from "zustand";
import type {
  AcousticPanelElement,
  BoomMicElement,
  CameraElement,
  ComputerElement,
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

const DEFAULT_ROOM: Room = { widthCm: 700, lengthCm: 500, heightCm: 280 };

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
      const el: CameraElement = {
        ...base(uid("cam"), `Câmera ${n}`, x, y),
        type: "camera",
        heightCm: 150,
        tripod: "tripode",
        lens: {
          model: "35mm f/1.8",
          focalLength: 35,
          maxAperture: 1.8,
          currentAperture: 1.8,
          minFocusDistance: 35,
          type: "prime",
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
      };
      return el;
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
  }
}

function learningStudioPreset(): StudioElement[] {
  const camA: CameraElement = {
    ...base("cam-a", "Câmera A — frontal", 350, 80),
    type: "camera",
    heightCm: 150,
    tripod: "tripode",
    lens: {
      model: "35mm f/1.8",
      focalLength: 35,
      maxAperture: 1.8,
      currentAperture: 1.8,
      minFocusDistance: 35,
      type: "prime",
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
    targetId: "subject-1",
  };

  const camB: CameraElement = {
    ...base("cam-b", "Câmera B — diagonal", 50, 100),
    type: "camera",
    heightCm: 140,
    tripod: "tripode",
    lens: {
      model: "50mm f/1.8",
      focalLength: 50,
      maxAperture: 1.8,
      currentAperture: 1.8,
      minFocusDistance: 45,
      type: "prime",
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
    targetId: "subject-1",
  };

  // 2 iluminações na FRENTE do apresentador (ele olha para -y)...
  const key: LightElement = {
    ...base("light-key", "Key — Spot", 221, 200),
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
  };

  const fill: LightElement = {
    ...base("light-fill", "Fill — Luminária", 520, 170),
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
  };

  // ...e 2 ATRÁS (contra-luz / recorte)
  const back: LightElement = {
    ...base("light-back", "Back — Luminária focal", 230, 465),
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
  };

  const ambient: LightElement = {
    ...base("light-ambient", "Back 2 — Prática", 470, 465),
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
  };

  const presenter: SubjectElement = {
    ...base("subject-1", "Apresentador", 350, 390),
    type: "subject",
    heightCm: 175,
    role: "apresentador",
    rotation: 180,
  };

  const table1: TableElement = {
    ...base("table-1", "Mesa — Estação 1", 150, 145),
    type: "table",
    widthCm: 160,
    depthCm: 80,
    heightCm: 75,
  };

  const pc1: ComputerElement = {
    ...base("pc-1", "Computador 1", 120, 145),
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

export type ToggleFlag = "showGrid" | "showDistances" | "showBeams" | "snapToGrid";

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
  addElement: (type: StudioElementType) => void;
  updateElement: (id: string, patch: Record<string, unknown>) => void;
  removeElement: (id: string) => void;
  /** Remove o elemento junto com seus dependentes (ex.: mesa + computadores). */
  removeElementCascade: (id: string) => void;
  select: (id: string | null) => void;
  setActiveCamera: (id: string) => void;
  setView: (view: StudioView) => void;
  toggle: (flag: ToggleFlag) => void;
  loadLearningPreset: () => void;
  clearAll: () => void;
  saveCustomPreset: (name: string) => void;
  deleteCustomPreset: (id: string) => void;
  loadCustomPreset: (id: string) => void;
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

  select: (id) => set({ selectedId: id }),

  setActiveCamera: (id) => set({ activeCameraId: id }),

  setView: (view) => set({ view }),

  toggle: (flag) => set((state) => ({ [flag]: !state[flag] }) as never),

  loadLearningPreset: () =>
    set({
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
}));

export const selectSubjects = (elements: StudioElement[]) =>
  elements.filter((el): el is SubjectElement => el.type === "subject");

export const selectCameras = (elements: StudioElement[]) =>
  elements.filter((el): el is CameraElement => el.type === "camera");
