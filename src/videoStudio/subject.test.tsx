import { test } from "vitest";
import assert from "node:assert/strict";
import { useVideoStudio } from "../store/videoStudioStore";
import { bodyWidthFactor, computeFraming } from "./cameraMath";
import { GLB_CATALOG } from "./glbCatalog";
import { GLB_MODELS } from "./glbModels";
import type { CameraElement, SubjectElement } from "../types/videoStudio";

const FF = {
  name: "35mm (full frame)",
  width: 36,
  height: 24,
  cropFactor: 1,
  coc: 0.029,
};

function makeCamera(x: number, y: number): CameraElement {
  return {
    id: "cam-biotipo",
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

function makeSubject(heightCm: number, y: number): SubjectElement {
  return {
    id: "subject-test",
    name: "Participante",
    type: "subject",
    position: { x: 0, y },
    rotation: 180,
    visible: true,
    locked: false,
    heightCm,
    role: "apresentador",
    pose: "em_pe",
    bodyType: "normal",
    shirtColor: "#2B6CB0",
    expression: "neutro",
    glasses: false,
    accessories: {
      earrings: false,
      watch: false,
      necklace: false,
      tie: false,
      badge: false,
    },
  };
}

test("addElement('subject') cria participante com os defaults da Etapa 5", () => {
  useVideoStudio.getState().addElement("subject");
  const el = useVideoStudio
    .getState()
    .elements.filter((e) => e.type === "subject")
    .pop() as SubjectElement;
  assert.ok(el, "participante criado");
  assert.equal(el.pose, "em_pe");
  assert.equal(el.bodyType, "normal");
  assert.equal(el.heightCm, 175);
  assert.equal(el.glasses, false);
  assert.equal(el.shirtColor, "#2B6CB0");
  assert.deepEqual(el.accessories, {
    earrings: false,
    watch: false,
    necklace: false,
    tie: false,
    badge: false,
  });
  useVideoStudio.getState().removeElementCascade(el.id);
});

test("biotipo: fator de largura (magro/normal/gordo) é determinístico", () => {
  assert.equal(bodyWidthFactor("magro"), 0.85);
  assert.equal(bodyWidthFactor("normal"), 1);
  assert.equal(bodyWidthFactor("gordo"), 1.2);
  assert.equal(bodyWidthFactor(undefined), 1, "ausente = normal");
  assert.ok(bodyWidthFactor("magro") < bodyWidthFactor("normal"));
  assert.ok(bodyWidthFactor("normal") < bodyWidthFactor("gordo"));
});

test("regra GLB vs procedural: preset usa GLB; sem id → procedural", () => {
  const presenter = useVideoStudio
    .getState()
    .elements.find((e) => e.id === "subject-1") as SubjectElement;
  assert.ok(presenter, "apresentador do preset existe");

  // espelho de SubjectMesh: entry = glbModelId ? GLB_MODELS[id] : undefined
  const entry = presenter.glbModelId ? GLB_MODELS[presenter.glbModelId] : undefined;
  assert.ok(entry, "preset tem GLB registrado");
  assert.equal(entry.kind, "personagem");
  assert.ok(GLB_CATALOG[presenter.glbModelId as string], "id no catálogo");

  // id inválido → undefined → cai na malha procedural (Character)
  assert.equal(GLB_MODELS["id_que_nao_existe"], undefined);

  // participante novo (sem glbModelId) → procedural
  useVideoStudio.getState().addElement("subject");
  const fresh = useVideoStudio
    .getState()
    .elements.filter((e) => e.type === "subject")
    .pop() as SubjectElement;
  assert.equal(fresh.glbModelId, undefined);
  const freshEntry = fresh.glbModelId ? GLB_MODELS[fresh.glbModelId] : undefined;
  assert.equal(freshEntry, undefined);
  useVideoStudio.getState().removeElementCascade(fresh.id);
});

test("altura × framing: mais alto ocupa mais quadro e muda o enquadramento", () => {
  const cam = makeCamera(0, 0);
  const baixo = makeSubject(175, 500); // 5 m de distância
  const alto = makeSubject(300, 500);

  const fBaixo = computeFraming(cam, baixo);
  const fAlto = computeFraming(cam, alto);

  assert.equal(fBaixo.distanceCm, fAlto.distanceCm);
  assert.equal(
    fBaixo.frameHeightAtSubjectCm,
    fAlto.frameHeightAtSubjectCm,
    "altura do quadro no sujeito depende só da câmera"
  );

  const span = (f: typeof fBaixo) =>
    (f.points.find((p) => p.key === "pes")?.yNorm ?? 0) -
    (f.points.find((p) => p.key === "topo")?.yNorm ?? 0);
  assert.ok(
    span(fAlto) > span(fBaixo),
    `sujeito mais alto ocupa mais quadro (${span(fAlto).toFixed(2)} > ${span(fBaixo).toFixed(2)})`
  );

  assert.equal(fBaixo.framingLabel, "Plano geral (corpo inteiro)");
  assert.ok(fBaixo.headInFrame && fBaixo.feetInFrame);
  assert.equal(
    fAlto.framingLabel,
    "Plano médio (cintura pra cima)",
    "participante de 3 m não cabe inteiro a 5 m com 35mm"
  );
  assert.ok(fAlto.headInFrame && !fAlto.feetInFrame);
});
