import type { CameraElement } from "../types/videoStudio";
import { kelvinToRgb } from "./lighting";

/**
 * Referência neutra de exposição do estúdio: ISO 400 · 1/50 s · f/4 · sem ND.
 * Com esses valores a cena renderiza no brilho "correto" (0 EV); qualquer
 * mudança de ISO, obturador, abertura ou ND desvia a exposição em stops.
 */
export const REF_ISO = 400;
export const REF_SHUTTER = 50;
export const REF_APERTURE = 4;

/** Stops de exposição relativos à referência (>0 = imagem mais clara). */
export function exposureStops(camera: CameraElement): number {
  const s = camera.settings;
  const isoStops = Math.log2(Math.max(s.iso, 1) / REF_ISO);
  // tempo de exposição ∝ 1/shutterSpeed: 1/100 dura metade de 1/50 → −1 stop
  const shutterStops = Math.log2(REF_SHUTTER / Math.max(s.shutterSpeed, 1));
  // cada stop de abertura é raiz de 2 no f/number: f/2 vs f/4 = +2 stops
  const apertureStops =
    -2 * Math.log2(camera.lens.currentAperture / REF_APERTURE);
  const ndStops = -(s.ndFilter ?? 0);
  return isoStops + shutterStops + apertureStops + ndStops;
}

/** Ganho de brilho (fator linear) aplicado ao render, com limites seguros. */
export function exposureGain(camera: CameraElement): number {
  return Math.min(Math.max(2 ** exposureStops(camera), 0.05), 8);
}

export interface ExposureInfo {
  stops: number;
  status: "under" | "ok" | "over";
  /** Ex.: "+1,0 EV" / "−2,0 EV" / "0,0 EV" */
  evLabel: string;
  /** Texto curto em português para painel e overlay. */
  description: string;
}

function evLabel(stops: number): string {
  const rounded = Math.round(stops * 10) / 10;
  const text = Math.abs(rounded).toFixed(1).replace(".", ",");
  return `${rounded > 0 ? "+" : rounded < 0 ? "−" : ""}${text} EV`;
}

/**
 * Classifica a exposição: até ±1 EV de diferença passa como adequada;
 * acima é superexposta, abaixo subexposta.
 */
export function exposureInfo(camera: CameraElement): ExposureInfo {
  const stops = exposureStops(camera);
  const status =
    stops > 1 ? "over" : stops < -1 ? "under" : "ok";
  const description =
    status === "over"
      ? "imagem superexposta"
      : status === "under"
      ? "imagem subexposta"
      : "exposição adequada";
  return { stops, status, evLabel: evLabel(stops), description };
}

/** Cor do status para overlay/painel. */
export function exposureStatusColor(status: ExposureInfo["status"]): string {
  return status === "over" ? "#E53E3E" : status === "under" ? "#3182CE" : "#38A169";
}

/**
 * Ganhos RGB do balance de branco da câmera (5600 K = neutro).
 * WB em 3200 K "sob luz neutra" → resultado mais azulado; em 7500 K → mais quente.
 */
export function whiteBalanceGain(
  whiteBalanceK: number,
  refK = 5600
): [number, number, number] {
  const set = kelvinToRgb(whiteBalanceK);
  const ref = kelvinToRgb(refK);
  const gain = [0, 1, 2].map((i) => {
    const denom = Math.max(set[i], 0.05);
    return Math.min(Math.max(ref[i] / denom, 0.5), 2);
  });
  return [gain[0], gain[1], gain[2]];
}
