import type { LightElement, StudioElement } from "../types/videoStudio";

const DEG = Math.PI / 180;

/** Converte temperatura de cor (Kelvin) em RGB 0-1 (aproximação de Tanner Helland). */
export function kelvinToRgb(kelvin: number): [number, number, number] {
  const temp = Math.min(Math.max(kelvin, 1000), 40000) / 100;
  let r: number;
  let g: number;
  let b: number;

  if (temp <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(temp) - 161.1195681661;
    b = temp <= 19 ? 0 : 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(temp - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(temp - 60, -0.0755148492);
    b = 255;
  }

  const clamp255 = (v: number) => Math.min(Math.max(v, 0), 255) / 255;
  return [clamp255(r), clamp255(g), clamp255(b)];
}

/**
 * Intensidade da luz para o render 3D (three.js, sem queda com distância).
 * Combina potência (W) e intensidade (%) da luz configurada.
 */
export function lightIntensity(light: LightElement): number {
  return (light.intensity / 100) * (light.powerW / 100) * 2.6;
}

/** Abertura do facho em radianos (metade do ângulo total), com limites seguros. */
export function beamAngleRad(light: LightElement): number {
  const half = (Math.max(light.beamAngle, 5) / 2) * DEG;
  return Math.min(Math.max(half, 0.05), Math.PI / 2 - 0.05);
}

export interface AimPoint {
  x: number;
  heightCm: number;
  y: number;
}

function elementAimHeight(el: StudioElement): number {
  switch (el.type) {
    case "subject":
      return el.heightCm * 0.7;
    case "table":
      return el.heightCm;
    case "camera":
      return el.heightCm;
    case "acoustic_panel":
      return 100 + el.heightCm / 2;
    case "chromakey":
      return el.heightCm / 2; // centro do fundo
    default:
      return 80;
  }
}

/**
 * Ponto para onde a luz aponta: o alvo configurado (na altura de
 * interesse) ou, sem alvo, a direção da rotação da própria luz.
 */
export function lightAim(
  light: LightElement,
  elements: StudioElement[]
): AimPoint {
  if (light.targetId) {
    const target = elements.find((el) => el.id === light.targetId);
    if (target) {
      return {
        x: target.position.x,
        heightCm: elementAimHeight(target),
        y: target.position.y,
      };
    }
  }
  // direção livre pela rotação (0 = +y), alcance fixo de 400 cm
  const dirX = Math.sin(light.rotation * DEG);
  const dirY = Math.cos(light.rotation * DEG);
  return {
    x: light.position.x + dirX * 400,
    heightCm: light.heightCm,
    y: light.position.y + dirY * 400,
  };
}
