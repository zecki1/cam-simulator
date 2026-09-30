import { test } from "vitest";
import assert from "node:assert/strict";
import { GLB_CATALOG, glbCatalogOptions, type GlbKind } from "./glbCatalog";
import { GLB_MODELS, glbOptionsFor } from "./glbModels";

const ALL_KINDS: GlbKind[] = [
  "personagem",
  "camera",
  "tripe",
  "tripe_simples",
  "luz",
  "fundo",
  "painel",
];

test("catálogo: toda entrada tem label, arquivo .glb e kind válido", () => {
  const ids = Object.keys(GLB_CATALOG);
  assert.ok(ids.length >= 20, `catálogo grande o bastante (${ids.length})`);
  for (const [id, entry] of Object.entries(GLB_CATALOG)) {
    assert.ok(entry.label.length > 0, `${id}: label vazio`);
    assert.ok(
      entry.arquivo.toLowerCase().endsWith(".glb"),
      `${id}: arquivo "${entry.arquivo}" não é .glb`
    );
    assert.ok(
      ALL_KINDS.includes(entry.kind),
      `${id}: kind "${entry.kind}" desconhecido`
    );
    if (entry.anchor) {
      assert.ok(
        entry.anchor === "chao" || entry.anchor === "topo",
        `${id}: âncora inválida`
      );
    }
  }
});

test("catálogo: cobre todos os kinds (personagem, câmera, tripé, luz, fundo, painel)", () => {
  const present = new Set(Object.values(GLB_CATALOG).map((e) => e.kind));
  for (const kind of ALL_KINDS) {
    assert.ok(present.has(kind), `kind ausente no catálogo: ${kind}`);
  }
  assert.equal(present.size, ALL_KINDS.length);
});

test("registro completo: todo id do catálogo tem URL em GLB_MODELS (arquivo existe)", () => {
  // glbModels.ts lança exceção no load se algum arquivo não estiver registrado
  for (const [id] of Object.entries(GLB_CATALOG)) {
    const model = GLB_MODELS[id];
    assert.ok(model, `GLB_MODELS sem entrada para "${id}"`);
    assert.ok(model.url.length > 0, `${id}: URL vazia`);
    assert.equal(model.kind, GLB_CATALOG[id].kind, `${id}: kind divergente`);
  }
});

test("fallback: id desconhecido → undefined (a cena cai no procedural)", () => {
  const lookup = GLB_MODELS as Record<string, unknown>;
  assert.equal(lookup["nao_existe"], undefined);
  assert.equal(lookup[""], undefined);
});

test("opções do select: completas e filtradas por kind", () => {
  const all = glbCatalogOptions();
  assert.equal(all.length, Object.keys(GLB_CATALOG).length);

  const persons = glbOptionsFor(["personagem"]);
  assert.ok(persons.length >= 10, `personagens: ${persons.length}`);
  for (const opt of persons) {
    assert.equal(GLB_CATALOG[opt.value].kind, "personagem");
    assert.ok(opt.label.length > 0);
  }

  const tripes = glbOptionsFor(["tripe", "tripe_simples"]);
  assert.ok(tripes.length >= 2);
  for (const opt of tripes) {
    assert.ok(["tripe", "tripe_simples"].includes(GLB_CATALOG[opt.value].kind));
  }
});
