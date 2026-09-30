export interface StudioDimensions {
  width: number; // cm
  length: number; // cm
  height: number; // cm
}

export interface GridSettings {
  size: number; // cm
  majorLines: number; // every N lines
  snapEnabled: boolean;
  showGrid: boolean;
  showRulers: boolean;
  showGuides: boolean;
}

export interface StudioObject {
  id: string;
  type: 'wall' | 'window' | 'door' | 'light' | 'camera' | 'subject' | 'backdrop' | 'prop' | 'power_outlet' | 'rigging_point';
  name: string;
  position: { x: number; y: number }; // cm from origin (bottom-left)
  rotation: number; // degrees
  dimensions: { width: number; depth: number; height?: number };
  color: string;
  locked: boolean;
  visible: boolean;
  metadata?: Record<string, unknown>;
}

export interface CameraPosition {
  id: string;
  name: string;
  position: { x: number; y: number; z: number }; // cm
  target: { x: number; y: number; z: number }; // look-at point
  lens: LensSetup;
  settings: CameraSettings;
}

export interface LensSetup {
  id: string;
  name: string;
  focalLength: number; // mm
  aperture: number; // f-stop
  sensorFormat: 'full-frame' | 'aps-c' | 'mft' | 'super35' | '1-inch';
  minFocus: number; // cm
  maxFocus: number; // cm/infinity
}

export interface CameraSettings {
  iso: number;
  shutterSpeed: number; // denominator (e.g., 1/50 = 50)
  shutterAngle?: number; // for video
  whiteBalance: number; // kelvin
  ndFilter: number; // stops
  frameRate?: number; // fps for video
  resolution?: string;
  codec?: string;
}

export interface LightSetup {
  id: string;
  name: string;
  type: 'key' | 'fill' | 'back' | 'rim' | 'hair' | 'background' | 'kicker' | 'ambient' | 'practical';
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number } | null;
  intensity: number; // 0-100%
  power: number; // watts
  colorTemp: number; // kelvin
  modifier: LightModifier;
  modifierSize?: { width: number; height: number; depth: number };
  barnDoors?: { top: number; bottom: number; left: number; right: number }; // degrees
  gel?: GelType;
  flags?: FlagPosition[];
  falloff: 'inverse-square' | 'linear' | 'flat';
  showBeam: boolean;
  showFalloff: boolean;
}

export type LightModifier = 
  | 'none' 
  | 'softbox_rect' | 'softbox_octa' | 'softbox_strip' 
  | 'umbrella_shoot' | 'umbrella_reflect' 
  | 'beauty_dish' | 'beauty_dish_grid' 
  | 'grid_10' | 'grid_20' | 'grid_30' | 'grid_40'
  | 'snoot' | 'fresnel' | 'barn_doors' 
  | 'scrim' | 'silk' | 'china_ball'
  | 'reflector_white' | 'reflector_silver' | 'reflector_gold' | 'reflector_black'
  | 'v_flat' | 'flag' | 'cucoloris';

export type GelType = 'none' | 'cto_full' | 'cto_half' | 'cto_quarter' | 'ctb_full' | 'ctb_half' | 'plus_green' | 'minus_green' | 'color';

export interface FlagPosition {
  id: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  dimensions: { width: number; height: number };
}

export interface VideoScene {
  id: string;
  name: string;
  type: 'studio' | 'location';
  location?: LocationData;
  studio?: StudioSetup;
  cameras: CameraShot[];
  lights: LightSetup[];
  subjects: SubjectPosition[];
  audio?: AudioSetup;
  duration: number; // seconds
  timeline: TimelineEvent[];
}

export interface LocationData {
  name: string;
  type: 'indoor' | 'outdoor' | 'mixed';
  dimensions?: { width: number; length: number; height: number };
  ambientLight: {
    colorTemp: number;
    intensity: number; // lux
    direction: number; // degrees
    quality: 'hard' | 'soft' | 'mixed';
  };
  timeOfDay: 'dawn' | 'morning' | 'noon' | 'afternoon' | 'golden_hour' | 'blue_hour' | 'night';
  weather: 'clear' | 'cloudy' | 'overcast' | 'rain' | 'fog';
  surfaces: SurfaceMaterial[];
  obstacles: Obstacle[];
}

export interface SurfaceMaterial {
  id: string;
  name: string;
  reflectance: number; // 0-1
  color: string;
  roughness: number; // 0-1
}

export interface Obstacle {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  dimensions: { width: number; height: number; depth: number };
  rotation: number;
}

export interface StudioSetup {
  dimensions: StudioDimensions;
  walls: Wall[];
  ceiling: Ceiling;
  floor: Floor;
  powerOutlets: PowerOutlet[];
  riggingPoints: RiggingPoint[];
  backdrops: Backdrop[];
}

export interface Wall {
  id: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  height: number;
  material: 'drywall' | 'concrete' | 'brick' | 'cyc' | 'green_screen' | 'blue_screen' | 'fabric';
  color: string;
  windows: Window[];
  doors: Door[];
}

export interface Window {
  id: string;
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  sillHeight: number;
  treatment: 'none' | 'sheer' | 'blackout' | 'frosted' | 'nd_gel';
  orientation: number; // degrees from north
}

export interface Door {
  id: string;
  position: { x: number; y: number };
  width: number;
  height: number;
  type: 'standard' | 'double' | 'rollup' | 'sliding';
  swing: 'in' | 'out' | 'left' | 'right';
}

export interface Ceiling {
  height: number;
  type: 'grid' | 'solid' | 'exposed' | 'cyc';
  riggingPoints: RiggingPoint[];
  color: string;
  reflectance: number;
}

export interface Floor {
  material: 'concrete' | 'wood' | 'vinyl' | 'carpet' | 'marley' | 'cyc';
  color: string;
  reflectance: number;
  level: boolean;
}

export interface PowerOutlet {
  id: string;
  position: { x: number; y: number; z: number };
  amperage: number;
  voltage: number;
  phases: number;
  inUse: boolean;
}

export interface RiggingPoint {
  id: string;
  position: { x: number; y: number; z: number };
  capacity: number; // kg
  type: 'pipe' | 'point' | 'truss' | 'chain_hoist';
  occupied: boolean;
}

export interface Backdrop {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  dimensions: { width: number; height: number };
  material: 'paper' | 'fabric' | 'vinyl' | 'cyc_wall' | 'green_screen' | 'blue_screen' | 'printed';
  color: string;
  pattern?: string;
  rolled: boolean;
}

export interface CameraShot {
  id: string;
  name: string;
  cameraId: string;
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  lens: LensSetup;
  settings: CameraSettings;
  movement?: CameraMovement;
  startTime: number; // seconds
  endTime: number;
  order: number;
}

export interface CameraMovement {
  type: 'static' | 'dolly' | 'truck' | 'pedestal' | 'pan' | 'tilt' | 'zoom' | 'crane' | 'slider' | 'gimbal' | 'steadycam' | 'drone';
  path?: { x: number; y: number; z: number }[];
  speed: number; // cm/s or deg/s
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface SubjectPosition {
  id: string;
  name: string;
  type: 'talent' | 'product' | 'prop' | 'vehicle' | 'crowd';
  position: { x: number; y: number; z: number };
  rotation: number;
  dimensions: { width: number; height: number; depth: number };
  markers: MarkPosition[];
  blocking: BlockingInstruction[];
}

export interface MarkPosition {
  id: string;
  label: string;
  position: { x: number; y: number };
  color: string;
}

export interface BlockingInstruction {
  time: number; // seconds
  position: { x: number; y: number };
  action: string;
}

export interface AudioSetup {
  microphones: MicPosition[];
  ambientNoise: number; // dB
  roomTone: boolean;
}

export interface MicPosition {
  id: string;
  type: 'shotgun' | 'lavalier' | 'handheld' | 'boundary' | 'stereo' | 'ambisonic';
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number } | null;
  pattern: 'cardioid' | 'supercardioid' | 'hypercardioid' | 'omni' | 'figure8' | 'wide';
  gain: number;
  phantomPower: boolean;
}

export interface TimelineEvent {
  time: number;
  type: 'camera_cut' | 'camera_move' | 'light_change' | 'subject_move' | 'audio_cue' | 'fx' | 'marker';
  description: string;
  data?: Record<string, unknown>;
}

export interface MeasurementTool {
  id: string;
  type: 'distance' | 'angle' | 'area' | 'height' | 'ratio' | 'exposure' | 'color_temp';
  startPoint: { x: number; y: number; z?: number };
  endPoint: { x: number; y: number; z?: number };
  label: string;
  color: string;
  visible: boolean;
}

export interface StudioViewState {
  mode: '2d' | '3d' | 'camera_view' | 'light_view';
  zoom: number;
  pan: { x: number; y: number };
  selectedObjectId: string | null;
  hoveredObjectId: string | null;
  activeTool: 'select' | 'measure' | 'add_light' | 'add_camera' | 'add_subject' | 'add_wall' | 'add_backdrop' | 'add_flag';
  gridSettings: GridSettings;
  showMeasurements: boolean;
  showLightBeams: boolean;
  showLightFalloff: boolean;
  showCameraFrustum: boolean;
  showSafeAreas: boolean;
  snapToGrid: boolean;
}

export interface ExportData {
  studio: StudioSetup;
  cameraPositions: CameraPosition[];
  lightSetups: LightSetup[];
  videoScenes: VideoScene[];
  measurements: MeasurementTool[];
  metadata: {
    name: string;
    author: string;
    description: string;
    createdAt: number;
    updatedAt: number;
    version: number;
  };
}