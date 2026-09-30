export type UnitSystem = 'metric' | 'imperial';

export interface Point2D {
  x: number;
  y: number;
}

export interface Dimensions2D {
  width: number;
  height: number;
}

export interface Bounds2D {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// ─── Equipment Types ────────────────────────────────────────────────

export type LightType = 
  | 'key' 
  | 'fill' 
  | 'back' 
  | 'rim' 
  | 'hair' 
  | 'background' 
  | 'kicker' 
  | 'catchlight'
  | 'ambient';

export type LightModifier = 
  | 'none'
  | 'softbox_small'
  | 'softbox_medium' 
  | 'softbox_large'
  | 'softbox_strip'
  | 'octabox'
  | 'umbrella_shoot_through'
  | 'umbrella_reflective'
  | 'beauty_dish'
  | 'beauty_dish_grid'
  | 'grid_10'
  | 'grid_20'
  | 'grid_30'
  | 'grid_40'
  | 'snoot'
  | 'barn_doors'
  | 'gel_cto'
  | 'gel_ctb'
  | 'gel_plus_green'
  | 'gel_minus_green'
  | 'scrim'
  | 'flag'
  | 'reflector_white'
  | 'reflector_silver'
  | 'reflector_gold'
  | 'reflector_black';

export type StandType = 
  | 'light_stand'
  | 'c_stand'
  | 'boom_arm'
  | 'floor_stand'
  | 'desktop_stand'
  | 'wall_mount'
  | 'ceiling_mount';

export interface LightSpecs {
  type: LightType;
  power: number; // watts
  colorTemp: number; // kelvin
  cri: number; // 90-99
  tlc: number; // 90-99
  modifier: LightModifier;
  stand: StandType;
  intensity: number; // 0-100%
  distance: number; // from subject (cm)
  height: number; // stand height (cm)
  angle: number; // horizontal angle (-180 to 180)
  tilt: number; // vertical tilt (-90 to 90)
  spill: number; // 0-100%
  focusable: boolean; // for fresnels
}

export interface CameraSpecs {
  position: Point2D; // x, y in studio (cm)
  height: number; // camera height from floor (cm)
  angle: number; // horizontal angle (-180 to 180)
  tilt: number; // vertical tilt (-90 to 90)
  lens: LensSpecs;
  sensor: SensorFormat;
  dof: DofSettings;
}

export interface LensSpecs {
  focalLength: number; // mm
  maxAperture: number; // f-stop
  currentAperture: number; // f-stop
  minFocusDistance: number; // cm
  type: 'prime' | 'zoom' | 'macro' | 'tilt_shift' | 'anamorphic';
  brand?: string;
  model?: string;
}

export interface SensorFormat {
  name: string;
  width: number; // mm
  height: number; // mm
  cropFactor: number;
  coc: number; // circle of confusion
}

export interface DofSettings {
  subjectDistance: number; // cm
  showDofZone: boolean;
  showHyperfocal: boolean;
}

export interface SubjectSpecs {
  id: string;
  type: 'person' | 'product' | 'group' | 'custom';
  position: Point2D;
  height: number; // cm
  width: number; // cm
  depth: number; // cm
  rotation: number; // degrees
  pose?: string;
}

export interface StudioObject {
  id: string;
  type: 'light' | 'camera' | 'subject' | 'prop' | 'backdrop' | 'flag' | 'reflector';
  position: Point2D;
  rotation: number; // degrees
  locked: boolean;
  visible: boolean;
  label: string;
  specs: LightSpecs | CameraSpecs | SubjectSpecs | Record<string, unknown>;
}

// ─── Studio Layout ────────────────────────────────────────────────

export interface StudioLayout {
  id: string;
  name: string;
  dimensions: Dimensions2D; // cm
  gridSize: number; // cm
  snapToGrid: boolean;
  showRulers: boolean;
  backgroundColor: string;
  objects: StudioObject[];
  createdAt: number;
  updatedAt: number;
}

// ─── Lighting Presets ─────────────────────────────────────────────

export interface LightingPreset {
  id: string;
  name: string;
  category: 'portrait' | 'product' | 'video' | 'cinematic' | 'high_key' | 'low_key' | 'creative';
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  lights: Omit<LightSpecs, 'distance' | 'height' | 'angle' | 'tilt'>[];
  camera: Omit<CameraSpecs, 'position' | 'height' | 'angle' | 'tilt'>;
  subject: Omit<SubjectSpecs, 'position' | 'rotation'>;
  diagram?: string; // SVG or mermaid
  notes?: string;
}

// ─── Tutorials ────────────────────────────────────────────────────

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  action: 'add_light' | 'move_light' | 'change_modifier' | 'adjust_camera' | 'set_power' | 'set_color_temp' | 'explain';
  targetId?: string;
  highlightArea?: Bounds2D;
  validation?: () => boolean;
  nextStepId?: string;
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  category: 'lighting_basics' | 'portrait' | 'product' | 'video' | 'advanced';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // minutes
  steps: TutorialStep[];
  prerequisites?: string[];
  learningObjectives: string[];
}

// ─── App State ────────────────────────────────────────────────────

export interface ViewportState {
  zoom: number;
  pan: Point2D;
  selectedObjectId: string | null;
  hoveredObjectId: string | null;
  mode: 'select' | 'add_light' | 'add_camera' | 'add_subject' | 'measure';
}

export interface AppSettings {
  unitSystem: UnitSystem;
  language: 'pt-BR' | 'en';
  theme: 'light' | 'dark' | 'system';
  snapToGrid: boolean;
  gridSize: number;
  showGrid: boolean;
  showRulers: boolean;
  showGuides: boolean;
  autoSave: boolean;
  animationsEnabled: boolean;
}

// ─── Export/Import ────────────────────────────────────────────────

export interface StudioProject {
  version: number;
  layout: StudioLayout;
  settings: AppSettings;
  viewport: ViewportState;
  metadata: {
    name: string;
    author: string;
    description: string;
    tags: string[];
    createdAt: number;
    updatedAt: number;
  };
}