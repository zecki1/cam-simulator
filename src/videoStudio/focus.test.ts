import { test } from "vitest";
import assert from "node:assert/strict";
import {
  computeDof,
  digitalZoomOf,
  focusDistanceCmOf,
  verticalFovDeg,
} from "./cameraMath";
import type { CameraElement } from "../types/videoStudio";

const FF = {
  name: "35mm (full frame)",
  width: 36,
  height: 24,
  cropFactor: 1,
  coc: 0.029,
};

function makeCamera(): CameraElement {
  return {
    id: "cam-foco",
    name: "Câmera",
    type: "camera",
    position: { x: 0, y: 0 },
    rotation: 0,
    visible: true,
    locked: false,
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
    sensor: FF,
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
}

test("foco: AF usa a distância até o alvo; MF usa a distância manual", () => {
  const cam = makeCamera();
  assert.equal(focusDistanceCmOf(cam, 420), 420, "AF cai no fallback (alvo)");

  const mf = { ...makeCamera(), focusMode: "manual" as const, focusDistanceCm: 50 };
  assert.equal(focusDistanceCmOf(mf, 420), 50, "MF usa focusDistanceCm");

  // MF sem distância válida → volta pro alvo
  const invalid = { ...mf, focusDistanceCm: 0 };
  assert.equal(focusDistanceCmOf(invalid, 420), 420);
});

test("foco: near < distância de foco < far e hiperfocal coerente", () => {
  const dof = computeDof(35, 1.8, FF.coc, 3000); // 3 m
  assert.ok(dof.nearMm < 3000, `near (${dof.nearMm.toFixed(0)}mm) < 3000`);
  assert.ok(dof.farMm > 3000, `far (${dof.farMm.toFixed(0)}mm) > 3000`);
  assert.ok(
    dof.hyperfocalMm > 3000,
    `hiperfocal (${(dof.hyperfocalMm / 1000).toFixed(1)}m) > 3m (senão tudo estaria em foco)`
  );
  assert.ok(dof.totalMm > 0 && Number.isFinite(dof.totalMm));
  assert.ok(
    dof.nearMm >= 0 && dof.nearMm < dof.farMm,
    "faixa de profundidade válida"
  );
});

test("foco: mais perto = faixa mais rasa (f/1.8, 35mm)", () => {
  const perto = computeDof(35, 1.8, FF.coc, 1000); // 1 m
  const longe = computeDof(35, 1.8, FF.coc, 5000); // 5 m
  assert.ok(
    perto.totalMm < longe.totalMm,
    `1m (${perto.totalMm.toFixed(0)}mm) < 5m (${longe.totalMm.toFixed(0)}mm)`
  );
});

test("foco: MF 50cm vs 1500cm desloca a faixa de profundidade", () => {
  const near50 = computeDof(35, 1.8, FF.coc, 500);
  const near15 = computeDof(35, 1.8, FF.coc, 15000);
  assert.ok(near50.farMm < near15.nearMm, "faixas separadas (50cm vs 15m)");
  assert.ok(near50.nearMm < 500 && 500 < near50.farMm, "50cm dentro da faixa");
  assert.ok(near15.nearMm < 15000 && 15000 < near15.farMm, "15m dentro da faixa");
  assert.ok(
    near50.totalMm < near15.totalMm,
    "foco perto tem faixa mais rasa que foco longe"
  );
});

test("zoom digital: corta o FOV e é limitado a 4×", () => {
  const cam = makeCamera();
  const base = verticalFovDeg(cam);

  const zoom2 = { ...cam, digitalZoom: 2 };
  assert.equal(digitalZoomOf(zoom2), 2);
  assert.ok(
    Math.abs(verticalFovDeg(zoom2) - base / 2) < 1e-9,
    "zoom 2× divide o FOV vertical pela metade"
  );

  const zoom4 = { ...cam, digitalZoom: 4 };
  assert.equal(digitalZoomOf(zoom4), 4);
  assert.ok(verticalFovDeg(zoom4) < verticalFovDeg(zoom2));

  // valores inválidos/desligados → 1×
  assert.equal(digitalZoomOf(cam), 1);
  assert.equal(digitalZoomOf({ ...cam, digitalZoom: 0 }), 1);
  assert.equal(digitalZoomOf({ ...cam, digitalZoom: -2 }), 1);
  assert.equal(digitalZoomOf({ ...cam, digitalZoom: 99 }), 4, "clamp em 4×");
});
