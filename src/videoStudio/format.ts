export const cmToM = (cm: number): number => cm / 100;

/** Formata centímetros como metros no padrão pt-BR: 350 → "3,50 m" */
export function formatMeters(
  cm: number,
  decimals = 2,
  suffix = " m"
): string {
  return `${(cm / 100).toFixed(decimals).replace(".", ",")}${suffix}`;
}

/** Formata centímetros: 175,4 → "175 cm" */
export function formatCm(cm: number, decimals = 0): string {
  return `${cm.toFixed(decimals).replace(".", ",")} cm`;
}

/** Formata milímetros como metros (cálculos ópticos em mm) */
export function formatMmAsMeters(mm: number, decimals = 2): string {
  if (!Number.isFinite(mm) || mm <= 0) return "∞";
  return `${(mm / 1000).toFixed(decimals).replace(".", ",")} m`;
}

export function formatNumber(
  value: number,
  decimals = 1,
  suffix = ""
): string {
  return `${value.toFixed(decimals).replace(".", ",")}${suffix}`;
}

/** Distância horizontal entre dois pontos em cm */
export function distanceCm(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}
