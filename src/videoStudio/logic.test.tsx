import { test } from "vitest";
import assert from "node:assert/strict";
import {
  findDependents,
  useVideoStudio,
} from "../store/videoStudioStore";
import {
  cameraAimDeg,
  cameraAimPoint,
  computeFraming,
  focusDistanceCmOf,
  horizontalFovDeg,
  horizontalOffsetNorm,
  isInCameraCone,
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
import { applyCameraModel, cameraModelById } from "./cameraModels";
import {
  exposureGain,
  exposureInfo,
  exposureStops,
  whiteBalanceGain,
} from "./exposure";
import { GLB_CATALOG, glbCatalogOptions } from "./glbCatalog";
import { CHROMA_KEY_COLOR } from "../types/videoStudio";
import type { ChromaKeyElement } from "../types/videoStudio";
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

test("cameraAimDeg/cameraAimPoint: alvo configurado ou rotação manual do tripé", () => {
  const subject = makeSubject(350, 390);
  const elements = [subject];

  // com alvo: aponta para o participante e mira na altura do rosto/peito
  const cam = { ...makeCamera(350, 80), targetId: subject.id };
  assert.ok(Math.abs(cameraAimDeg(cam, elements)) < 0.001);
  const aimed = cameraAimPoint(cam, elements);
  assert.equal(aimed.x, 350);
  assert.equal(aimed.z, -390, "norte da planta (+y) = −Z do mundo");
  assert.ok(Math.abs(aimed.y - 175 * 0.65) < 0.001);

  // sem alvo: mira na direção da rotação (0 = +y da planta → −z), na altura do tripé
  const manual = { ...makeCamera(350, 80), targetId: null, rotation: 90 };
  assert.equal(cameraAimDeg(manual, elements), 90);
  const p = cameraAimPoint(manual, elements);
  assert.ok(Math.abs(p.x - (350 + 600)) < 0.001, "90° → +x");
  assert.ok(Math.abs(p.y - 150) < 0.001, "altura do tripé");
  const north = cameraAimPoint(
    { ...manual, rotation: 0 },
    elements
  );
  assert.ok(Math.abs(north.z - -(80 + 600)) < 0.001, "0° → −z (norte)");
});

test("horizontalOffsetNorm: participante no centro, deslocado ou fora do quadro", () => {
  const cam = makeCamera(350, 80); // aponta para 0° (+y)
  const ahead = { x: 350, y: 390 };
  assert.ok(Math.abs(horizontalOffsetNorm(cam, ahead, 0)) < 0.001);

  // girar a câmera põe o participante fora do quadro (atrás = infinito)
  const off = horizontalOffsetNorm(cam, ahead, 90);
  assert.ok(!Number.isFinite(off), `90° → ${off} (atrás, fora)`);
  const behind = horizontalOffsetNorm(cam, ahead, 180);
  assert.ok(!Number.isFinite(behind), "180° → participante atrás da câmera");
  // dentro do quadro, deslocado mas visível (±45° para câmera 35mm FF)
  const shifted = horizontalOffsetNorm(cam, ahead, 45);
  assert.ok(Math.abs(shifted) > 1 && Number.isFinite(shifted), `45° → ${shifted.toFixed(2)}`);

  // na borda exata do FOV horizontal o offset é ~±1
  const hFov = 2 * Math.atan(36 / 2 / 35) * (180 / Math.PI);
  const atEdge = horizontalOffsetNorm(cam, ahead, hFov / 2);
  assert.ok(
    Math.abs(Math.abs(atEdge) - 1) < 0.01,
    `borda do FOV → x = ${atEdge.toFixed(3)}`
  );
});

test("exposureStops: ISO/obturador/abertura/ND contam stops vs referência", () => {
  const cam = makeCamera(0, 0);
  cam.lens.currentAperture = 4; // referência: ISO 400 · 1/50 · f/4 · sem ND
  assert.equal(Math.round(exposureStops(cam) * 100) / 100, 0);

  assert.equal(
    exposureStops({ ...cam, settings: { ...cam.settings, iso: 800 } }),
    1
  );
  assert.equal(
    exposureStops({ ...cam, settings: { ...cam.settings, shutterSpeed: 100 } }),
    -1
  );
  assert.equal(
    exposureStops({
      ...cam,
      settings: { ...cam.settings, iso: 1600, ndFilter: 2 },
    }),
    0,
    "+2 (ISO) −2 (ND2) se anulam"
  );
  const wide = { ...cam, lens: { ...cam.lens, currentAperture: 2 } };
  assert.equal(exposureStops(wide), 2, "f/2 vs f/4 = +2 stops");
});

test("exposureGain/exposureInfo: ganho limitado e status em ±1 EV", () => {
  const cam = makeCamera(0, 0);
  cam.lens.currentAperture = 4;
  assert.equal(exposureGain(cam), 1);

  const info = exposureInfo(cam);
  assert.equal(info.status, "ok");
  assert.equal(info.description, "exposição adequada");

  const over = exposureInfo({
    ...cam,
    settings: { ...cam.settings, iso: 1600 },
  });
  assert.equal(over.status, "over");
  assert.equal(over.evLabel, "+2,0 EV");

  const under = exposureInfo({
    ...cam,
    settings: { ...cam.settings, ndFilter: 4 },
  });
  assert.equal(under.status, "under");
  assert.ok(exposureGain(cam) >= 0.05, "ganho nunca abaixo do limite");
});

test("whiteBalanceGain: 5600 K neutro; 3200 K azulada; 7500 K quente", () => {
  const neutral = whiteBalanceGain(5600);
  assert.ok(
    Math.abs(neutral[0] - 1) < 0.02 &&
      Math.abs(neutral[1] - 1) < 0.02 &&
      Math.abs(neutral[2] - 1) < 0.02
  );

  const wb3200 = whiteBalanceGain(3200); //WB frio demais → imagem azul
  assert.ok(wb3200[2] > wb3200[0], `gain azul ${wb3200[2]} > vermelho ${wb3200[0]}`);

  const wb7500 = whiteBalanceGain(7500); //WB quente demais → imagem laranja
  assert.ok(wb7500[0] > wb7500[2]);
});

test("setRoom: tamanho da sala editável com limites; preset volta ao padrão", () => {
  useVideoStudio.getState().loadLearningPreset();

  useVideoStudio.getState().setRoom({ widthCm: 200, lengthCm: 300 });
  let room = useVideoStudio.getState().room;
  assert.equal(room.widthCm, 200, "2 m de largura");
  assert.equal(room.lengthCm, 300, "3 m de profundidade");

  // limites seguros: mínimo 1 m, máximo 50 m
  useVideoStudio.getState().setRoom({ widthCm: 10, lengthCm: 99999 });
  room = useVideoStudio.getState().room;
  assert.equal(room.widthCm, 100);
  assert.equal(room.lengthCm, 5000);

  // o preset de reset restaura a sala padrão 7 × 5 m
  useVideoStudio.getState().loadLearningPreset();
  room = useVideoStudio.getState().room;
  assert.equal(room.widthCm, 700);
  assert.equal(room.lengthCm, 500);
  assert.equal(room.heightCm, 280);
});

test("preset: câmeras ao lado da mesa, luzes na frente e atrás fora do quadro", () => {
  useVideoStudio.getState().loadLearningPreset();
  const { elements } = useVideoStudio.getState();

  const cams = elements.filter(
    (el): el is CameraElement => el.type === "camera"
  );
  const lights = elements.filter(
    (el): el is LightElement => el.type === "light"
  );
  const subject = elements.find((el) => el.id === "subject-1")!;
  const table = elements.find((el) => el.id === "table-1")!;
  const camA = cams.find((c) => c.id === "cam-a")!;
  const camB = cams.find((c) => c.id === "cam-b")!;
  const key = lights.find((l) => l.id === "light-key")!;
  const fill = lights.find((l) => l.id === "light-fill")!;
  const backs = ["light-back", "light-ambient"].map(
    (id) => lights.find((l) => l.id === id)!
  );

  // câmera principal do lado da mesa; a outra ao lado da principal (≤ 2,5 m)
  const dist = (
    a: { position: { x: number; y: number } },
    b: { position: { x: number; y: number } }
  ) => Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y);
  assert.ok(dist(camA, table) <= 250, `câmera A ↔ mesa = ${dist(camA, table)} cm`);
  assert.ok(dist(camA, camB) <= 250, `câmera A ↔ B = ${dist(camA, camB)} cm`);

  // key/fill na frente das câmeras (entre câmeras e participante)
  for (const l of [key, fill]) {
    assert.ok(
      l.position.y > camA.position.y && l.position.y < subject.position.y,
      `${l.name} na frente das câmeras`
    );
  }

  // as 4 luzes ficam FORA do enquadramento das 2 câmeras;
  // back/ambient ainda atrás do participante
  for (const l of lights) {
    if (backs.includes(l)) {
      assert.ok(l.position.y > subject.position.y, `${l.name} atrás do participante`);
    }
    for (const cam of [camA, camB]) {
      const aim = cameraAimDeg(cam, elements);
      const x = horizontalOffsetNorm(cam, l.position, aim);
      assert.ok(
        !Number.isFinite(x) || Math.abs(x) > 1,
        `${l.name} fora do quadro da ${cam.name} (x = ${x})`
      );
    }
  }
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

test("applyCameraModel: modelo aplica sensor/ISO e limita a focal ao zoom da lente", () => {
  const cam = makeCamera(100, 100);
  const handcam = cameraModelById("sony_handcam")!;
  const patch = applyCameraModel(cam, handcam);

  assert.equal(patch.modelId, "sony_handcam");
  assert.equal(patch.sensor?.name, handcam.sensor.name);
  assert.equal(patch.lens?.focalLength, 35); // dentro do range 4,4–88
  assert.ok(handcam.isoOptions.includes(patch.settings!.iso!));
  assert.ok(handcam.fpsOptions.includes(patch.settings!.frameRate!));

  const tele = { ...cam, lens: { ...cam.lens, focalLength: 300 } };
  const cut = applyCameraModel(tele, handcam);
  assert.equal(cut.lens?.focalLength, 88); // cortado no máximo do zoom
});

test("applyCameraModel: abertura nunca mais aberta que o máximo da objetiva", () => {
  const cam = makeCamera(100, 100);
  const sl2 = cameraModelById("canon_sl2")!;

  // objetiva do corpo (f/1.8) no kit f/4 → sobe para f/4
  const kit = applyCameraModel(cam, sl2, sl2.lenses[0].label);
  assert.equal(kit.lens?.model, sl2.lenses[0].label);
  assert.equal(kit.lens?.currentAperture, 4);

  // 35mm f/1.8 existe no catálogo da Canon → mantém f/1.8
  const prime = applyCameraModel(cam, sl2, "35mm f/1.8");
  assert.equal(prime.lens?.currentAperture, 1.8);
});

test("select: selecionar câmera assume o POV; setActiveCamera seleciona no painel", () => {
  const store = useVideoStudio;
  store.getState().loadLearningPreset();

  store.getState().select("cam-b");
  let s = store.getState();
  assert.equal(s.selectedId, "cam-b");
  assert.equal(s.activeCameraId, "cam-b", "câmera selecionada vira o POV");

  store.getState().setActiveCamera("cam-a");
  s = store.getState();
  assert.equal(s.activeCameraId, "cam-a");
  assert.equal(s.selectedId, "cam-a", "POV selecionado aparece no painel");

  store.getState().select("subject-1");
  s = store.getState();
  assert.equal(s.selectedId, "subject-1");
  assert.equal(s.activeCameraId, "cam-a", "selecionar participante não muda o POV");
});

test("preset: câmeras A e B vêm com modelo Canon configurado", () => {
  const store = useVideoStudio;
  store.getState().loadLearningPreset();
  const cams = store
    .getState()
    .elements.filter((el): el is CameraElement => el.type === "camera");
  const a = cams.find((c) => c.id === "cam-a");
  const b = cams.find((c) => c.id === "cam-b");
  assert.equal(a?.modelId, "canon_sl2");
  assert.equal(b?.modelId, "canon_t7i");
  assert.ok((a?.sensor.cropFactor ?? 0) > 1, "sensor APS-C (crop > 1)");
});

test("isInCameraCone: dentro do cone, fora da zona de visão e atrás da câmera", () => {
  const cam = makeCamera(0, 0); // rotação 0 = +y, 35mm full frame
  const hFov = horizontalFovDeg(cam);
  assert.ok(hFov > 40 && hFov < 70, `FOV horizontal plausível (${hFov.toFixed(1)}°)`);

  // à frente (0°) e a 30° da direção de mira → dentro da zona
  assert.ok(isInCameraCone(cam, { x: 0, y: 500 }, 0));
  assert.ok(isInCameraCone(cam, { x: 250, y: 433 }, 0));

  // 40° (além do FOV/2 + folga de 10°), lateral puro e atrás → fora
  assert.ok(!isInCameraCone(cam, { x: 321, y: 383 }, 0));
  assert.ok(!isInCameraCone(cam, { x: 500, y: 0 }, 0));
  assert.ok(!isInCameraCone(cam, { x: 0, y: -500 }, 0));

  // rotação manual desloca o cone
  assert.ok(isInCameraCone(cam, { x: 500, y: 0 }, 90));
  assert.ok(!isInCameraCone(cam, { x: 0, y: 500 }, 90));

  // com alvo, a mira acompanha o participante
  const target = makeSubject(0, 500);
  const aimed = { ...cam, targetId: target.id };
  const aim = cameraAimDeg(aimed, [target]);
  assert.ok(isInCameraCone(aimed, { x: 0, y: 500 }, aim));
  assert.ok(!isInCameraCone(aimed, { x: -500, y: 0 }, aim));
});

test("catálogo GLB: modelos com label/arquivo/kind e opções por tipo", () => {
  const kinds = new Set(["personagem", "camera", "tripe", "tripe_simples", "luz", "fundo", "painel"]);
  for (const [id, m] of Object.entries(GLB_CATALOG)) {
    assert.ok(m.label && m.label.length > 2, `${id} sem label`);
    assert.ok(m.arquivo.endsWith(".glb"), `${id} sem arquivo .glb`);
    assert.ok(kinds.has(m.kind), `${id} kind inválido: ${m.kind}`);
  }
  const chars = glbCatalogOptions(["personagem"]);
  assert.ok(chars.length >= 5, "vários personagens no catálogo");
  assert.ok(chars.every((o) => GLB_CATALOG[o.value].kind === "personagem"));

  const cams = glbCatalogOptions(["camera", "tripe"]);
  assert.ok(cams.some((o) => o.value === "canon_60d"), "corpo de câmera listado");
  assert.ok(cams.some((o) => o.value === "tripe_camera"), "tripé + câmera listado");
  assert.equal(glbCatalogOptions([]).length, 0, "filtro vazio retorna vazio");
});

test("preset: participante vem com modelo 3D (GLB) selecionado", () => {
  useVideoStudio.getState().loadLearningPreset();
  const s = useVideoStudio
    .getState()
    .elements.find((el) => el.id === "subject-1");
  assert.equal(s?.glbModelId, "homem");
});

test("chromakey: criado com verde chroma, sombra ligada; edição desliga recebimento", () => {
  const store = useVideoStudio;
  store.getState().loadLearningPreset();
  store.getState().addElement("chromakey");

  const el = store
    .getState()
    .elements.find((e): e is ChromaKeyElement => e.type === "chromakey");
  assert.ok(el, "addElement('chromakey') cria o fundo");
  assert.equal(el.color, CHROMA_KEY_COLOR, "verde chroma padrão");
  assert.equal(el.receiveShadows, true, "sombra ligada por padrão");
  assert.equal(el.widthCm, 300);

  store.getState().updateElement(el.id, { receiveShadows: false });
  const after = store
    .getState()
    .elements.find((e): e is ChromaKeyElement => e.type === "chromakey");
  assert.equal(after?.receiveShadows, false, "toggle de sombra aplica");

  // a luz mira no centro do fundo quando ele é alvo
  const light = store
    .getState()
    .elements.find((e): e is LightElement => e.type === "light")!;
  store.getState().updateElement(light.id, { targetId: el.id });
  const lightAfter = store
    .getState()
    .elements.find((e): e is LightElement => e.type === "light")!;
  const aim = lightAim(lightAfter, store.getState().elements);
  assert.equal(aim.x, el.position.x, "luz mira na largura do fundo");
  assert.equal(aim.y, el.position.y);
  assert.ok(
    Math.abs(aim.heightCm - el.heightCm / 2) < 0.001,
    "altura do alvo = centro do fundo"
  );
});

test("zoom digital corta o FOV e o foco manual define a distância de foco", () => {
  const cam = makeCamera(350, 80);
  const baseV = verticalFovDeg(cam);
  const baseH = horizontalFovDeg(cam);

  // 2× = metade do FOV (corta o sensor)
  const zoomed = { ...cam, digitalZoom: 2 };
  assert.ok(
    Math.abs(verticalFovDeg(zoomed) - baseV / 2) < 1e-9,
    "zoom digital 2× reduz o FOV vertical pela metade"
  );
  assert.ok(
    Math.abs(horizontalFovDeg(zoomed) - baseH / 2) < 1e-9,
    "zoom digital 2× reduz o FOV horizontal pela metade"
  );
  // 1× ou ausente = sem mudança
  assert.equal(verticalFovDeg({ ...cam, digitalZoom: 1 }), baseV);

  // foco: AF cai no fallback (distância do participante), MF usa o valor manual
  assert.equal(focusDistanceCmOf(cam, 420), 420, "AF usa a distância do alvo");
  const mf: CameraElement = {
    ...cam,
    focusMode: "manual",
    focusDistanceCm: 180,
  };
  assert.equal(focusDistanceCmOf(mf, 420), 180, "MF usa a distância manual");
});
