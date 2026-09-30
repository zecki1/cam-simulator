import { test } from "node:test";
import assert from "node:assert/strict";
import {
  findDependents,
  useVideoStudio,
} from "../store/videoStudioStore";
import {
  computeFraming,
  normalizeDeg,
  perspectiveLabel,
  relativeBearingDeg,
  rotationToward,
  verticalFovDeg,
} from "./cameraMath";
import {
  beamAngleRad,
  kelvinToRgb,
  lightAim,
  lightIntensity,
} from "./lighting";
import type {
  CameraElement,
  LightElement,
  SubjectElement,
} from "../types/videoStudio";

const FF_SENSOR = {
  name: "35mm (full frame)",
  width: 36,
  height: 24,
  cropFactor: 1,
  coc: 0.029,
};

function makeCamera(x: number, y: number): CameraElement {
  return {
    id: `cam-${x}-${y}`,
    name: "Câmera",
    type: "camera",
    position: { x, y },
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
    sensor: FF_SENSOR,
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

function makeSubject(
  x: number,
  y: number,
  rotation = 0
): SubjectElement {
  return {
    id: `subject-${x}-${y}`,
    name: "Participante",
    type: "subject",
    position: { x, y },
    rotation,
    visible: true,
    locked: false,
    heightCm: 175,
    role: "apresentador",
  };
}

function makeLight(patch: Partial<LightElement> = {}): LightElement {
  return {
    id: "light-1",
    name: "Spot",
    type: "light",
    position: { x: 100, y: 100 },
    rotation: 0,
    visible: true,
    locked: false,
    kind: "spot",
    heightCm: 200,
    intensity: 100,
    powerW: 100,
    colorTemp: 5600,
    beamAngle: 45,
    modifier: "nenhum",
    targetId: null,
    castShadow: true,
    ...patch,
  };
}

test("findDependents: mesa remove o computador apoiado sobre ela", () => {
  useVideoStudio.getState().loadLearningPreset();
  const { elements } = useVideoStudio.getState();

  const deps = findDependents(elements, "table-1");
  const ids = deps.map((d) => d.id).sort();
  assert.deepEqual(ids, ["pc-1"]);

  assert.equal(findDependents(elements, "cam-a").length, 0);
  assert.equal(findDependents(elements, "inexistente").length, 0);
});

test("removeElementCascade: remove mesa + computador e preserva o resto", () => {
  const store = useVideoStudio.getState();
  store.loadLearningPreset();
  const before = useVideoStudio.getState().elements.length;
  assert.equal(before, 9); // 2 câmeras, 4 luzes, apresentador, mesa, pc

  useVideoStudio.getState().removeElementCascade("table-1");

  const { elements } = useVideoStudio.getState();
  const ids = new Set(elements.map((el) => el.id));
  assert.ok(!ids.has("table-1"));
  assert.ok(!ids.has("pc-1"));
  assert.ok(ids.has("cam-a"));
  assert.ok(ids.has("light-key"));
  assert.ok(ids.has("light-ambient"));
  assert.ok(ids.has("subject-1"));
  assert.equal(elements.length, before - 2);
});

test("presets customizados: salvar e recarregar mantém o snapshot", () => {
  const store = useVideoStudio.getState();
  store.loadLearningPreset();
  useVideoStudio.getState().removeElement("cam-b");
  const snapshotLen = useVideoStudio.getState().elements.length;
  assert.equal(snapshotLen, 8);

  useVideoStudio.getState().saveCustomPreset("Meu preset");
  const saved = useVideoStudio
    .getState()
    .customPresets.find((p) => p.name === "Meu preset");
  assert.ok(saved);

  // muda o estado atual e volta pelo preset
  useVideoStudio.getState().loadLearningPreset();
  assert.ok(
    useVideoStudio.getState().elements.some((el) => el.id === "cam-b")
  );

  useVideoStudio.getState().loadCustomPreset(saved.id);
  const { elements } = useVideoStudio.getState();
  assert.equal(elements.length, snapshotLen);
  assert.ok(!elements.some((el) => el.id === "cam-b"));
  assert.ok(elements.some((el) => el.id === "subject-1"));

  // excluir preset
  useVideoStudio.getState().deleteCustomPreset(saved.id);
  assert.ok(
    !useVideoStudio
      .getState()
      .customPresets.some((p) => p.id === saved.id)
  );
});

test("relativeBearingDeg + perspectiveLabel: frontal, perfil e costas", () => {
  const subject = makeSubject(0, 0, 0);

  const front = relativeBearingDeg(subject, makeCamera(0, 500));
  assert.ok(Math.abs(front) < 0.001);
  assert.equal(perspectiveLabel(front), "frontal");

  const right = relativeBearingDeg(subject, makeCamera(500, 0));
  assert.ok(Math.abs(right - -90) < 0.001);
  assert.equal(perspectiveLabel(right), "perfil (lado direito)");

  const back = relativeBearingDeg(subject, makeCamera(0, -500));
  assert.ok(Math.abs(Math.abs(back) - 180) < 0.001);
  assert.equal(perspectiveLabel(back), "costas (contraluz)");
});

test("computeFraming: distância exata e altura do quadro coerente com o FOV", () => {
  const camera = makeCamera(350, 80);
  const subject = makeSubject(350, 390, 180);

  const framing = computeFraming(camera, subject);
  assert.ok(Math.abs(framing.distanceCm - 310) < 0.001);

  const vFovRad = (verticalFovDeg(camera) * Math.PI) / 180;
  const expected = 2 * 310 * Math.tan(vFovRad / 2);
  assert.ok(
    Math.abs(framing.frameHeightAtSubjectCm - expected) < 0.001
  );
  assert.ok(framing.frameHeightAtSubjectCm > 100);
  assert.ok(typeof framing.framingLabel === "string");
});

test("kelvinToRgb: 2700K quente e 6500K próximo do branco", () => {
  const warm = kelvinToRgb(2700);
  assert.ok(warm[0] > 0.95);
  assert.ok(warm[2] < 0.5);
  assert.ok(warm[0] - warm[2] > 0.4);

  const day = kelvinToRgb(6500);
  assert.ok(day[0] > 0.9 && day[1] > 0.9 && day[2] > 0.9);
});

test("rotationToward: rotação que aponta de A para B (0 = +y)", () => {
  // câmera frontal embaixo, apresentador em cima → 0°
  assert.ok(
    Math.abs(rotationToward({ x: 350, y: 80 }, { x: 350, y: 390 })) < 0.001
  );
  // diagonal frontal-esquerda (câmera B) → ~46°
  const diag = rotationToward({ x: 50, y: 100 }, { x: 350, y: 390 });
  assert.ok(diag > 44 && diag < 48, `diagonal = ${diag}°`);
  // atrás (para +y vindo de cima) → 180°
  assert.ok(
    Math.abs(rotationToward({ x: 350, y: 465 }, { x: 350, y: 390 }) - 180) <
      0.001
  );

  assert.equal(normalizeDeg(-45), 315);
  assert.equal(normalizeDeg(405), 45);
  assert.equal(normalizeDeg(0), 0);
});

test("lightAim: aponta para o alvo configurado ou na direção da rotação", () => {
  const elements = [makeSubject(350, 390)];

  const aimed = makeLight({ targetId: elements[0].id });
  const aim = lightAim(aimed, elements);
  assert.equal(aim.x, 350);
  assert.equal(aim.y, 390);
  assert.ok(Math.abs(aim.heightCm - 175 * 0.7) < 0.001);

  const free = makeLight({ rotation: 90 });
  const freeAim = lightAim(free, elements);
  assert.ok(Math.abs(freeAim.x - (100 + 400)) < 0.001);
  assert.ok(Math.abs(freeAim.y - 100) < 0.001);
});

test("lightIntensity e beamAngleRad respeitam potência, intensidade e limites", () => {
  assert.ok(Math.abs(lightIntensity(makeLight()) - 2.6) < 0.001);
  assert.ok(
    Math.abs(
      lightIntensity(makeLight({ intensity: 50, powerW: 200 })) -
        lightIntensity(makeLight({ intensity: 100, powerW: 100 }))
    ) < 0.001
  );

  const half45 = beamAngleRad(makeLight({ beamAngle: 45 }));
  assert.ok(Math.abs(half45 - Math.PI / 8) < 0.001);

  const wide = beamAngleRad(makeLight({ beamAngle: 180 }));
  assert.ok(wide < Math.PI / 2);
  const narrow = beamAngleRad(makeLight({ beamAngle: 1 }));
  assert.ok(narrow >= 0.05);
});
