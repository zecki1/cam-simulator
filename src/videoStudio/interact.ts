/** Evita que um arraste de panorâmica dispare clique/seleção na cena 3D. */
let lastPanAt = 0;

export function markPan(): void {
  lastPanAt = Date.now();
}

export function isPanningRecently(ms = 350): boolean {
  return Date.now() - lastPanAt < ms;
}
