import { test } from "vitest";
import assert from "node:assert/strict";
import {
  SUGGESTION_CATEGORIES,
  readLocalSuggestions,
  saveLocalSuggestion,
  submitSuggestion,
  validateSuggestion,
} from "./suggestions";

test("validateSuggestion aceita entrada válida e rejeita inválida", () => {
  assert.doesNotThrow(() =>
    validateSuggestion({
      category: "Iluminação",
      title: "Key light mais baixa",
      body: "Sugiro permitir presets de altura da key light.",
    })
  );

  assert.throws(
    () =>
      validateSuggestion({
        category: "Tecnologia" as never,
        title: "Válido o bastante",
        body: "Descrição longa o suficiente aqui.",
      }),
    /Categoria inválida/
  );

  assert.throws(
    () =>
      validateSuggestion({
        category: "Bug",
        title: "abc",
        body: "Descrição longa o suficiente aqui.",
      }),
    /título/
  );

  assert.throws(
    () =>
      validateSuggestion({
        category: "UI",
        title: "Título válido o bastante",
        body: "curta",
      }),
    /10 caracteres/
  );
});

test("saveLocalSuggestion persiste e readLocalSuggestions devolve", () => {
  const saved = saveLocalSuggestion({
    category: "Estúdio",
    title: "Preset de entrevista",
    body: "Um preset com key, fill e fundo já configurados.",
    contact: "aluno@email.com",
  });

  assert.match(saved.id, /^sug-/);
  assert.ok(!Number.isNaN(Date.parse(saved.createdAt)));

  const list = readLocalSuggestions();
  const found = list.find((s) => s.id === saved.id);
  assert.ok(found, "sugestão deveria estar na lista local");
  assert.equal(found.title, "Preset de entrevista");
  assert.equal(found.contact, "aluno@email.com");
});

test("submitSuggestion cai para o local quando não há backend", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error("sem rede");
  }) as typeof fetch;
  try {
    const result = await submitSuggestion({
      category: "Bug",
      title: "Erro ao exportar PNG",
      body: "O botão exportar PNG falha no Safari com canvas vazio.",
    });
    assert.deepEqual(result, { ok: true, mode: "local" });
    const list = readLocalSuggestions();
    assert.ok(
      list.some((s) => s.title === "Erro ao exportar PNG"),
      "sugestão deveria ter sido salva localmente"
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("categorias do sistema batem com a lista esperada", () => {
  assert.deepEqual(
    [...SUGGESTION_CATEGORIES],
    ["Iluminação", "Câmera", "Estúdio", "UI", "Bug"]
  );
});
