/**
 * Sistema de dicas/sugestões (Item 18).
 *
 * O envio real usa a Edge Function/serverless `/api/suggest` (Vercel), que
 * encaminha para a API do Resend quando `RESEND_API_KEY` e
 * `SUGGESTION_TO_EMAIL` estão configurados. Sem backend (dev ou deploy
 * estático), a sugestão fica guardada em `localStorage` para não se perder.
 */

export const SUGGESTION_CATEGORIES = [
  "Iluminação",
  "Câmera",
  "Estúdio",
  "UI",
  "Bug",
] as const;

export type SuggestionCategory = (typeof SUGGESTION_CATEGORIES)[number];

export interface SuggestionInput {
  category: SuggestionCategory;
  title: string;
  body: string;
  contact?: string;
}

export interface Suggestion extends SuggestionInput {
  id: string;
  createdAt: string;
}

const STORAGE_KEY = "cam-simulator.suggestions";

/** Fallback em memória quando não há localStorage (node/SSR/testes). */
const memoryStore: Suggestion[] = [];

function readStorage(): Suggestion[] {
  try {
    if (typeof localStorage === "undefined") return [...memoryStore];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Suggestion[]) : [];
  } catch {
    return [...memoryStore];
  }
}

/** Lista as sugestões salvas localmente. */
export function readLocalSuggestions(): Suggestion[] {
  return readStorage();
}

/** Valida e normaliza a entrada; lança Error com mensagem em pt-BR. */
export function validateSuggestion(input: SuggestionInput): void {
  if (!SUGGESTION_CATEGORIES.includes(input.category)) {
    throw new Error("Categoria inválida.");
  }
  if (!input.title || input.title.trim().length < 5) {
    throw new Error("O título precisa de ao menos 5 caracteres.");
  }
  if (!input.body || input.body.trim().length < 10) {
    throw new Error("Descreva a sugestão com pelo menos 10 caracteres.");
  }
}

/** Salva a sugestão localmente (localStorage ou memória) e retorna a cópia. */
export function saveLocalSuggestion(input: SuggestionInput): Suggestion {
  validateSuggestion(input);
  const suggestion: Suggestion = {
    ...input,
    title: input.title.trim(),
    body: input.body.trim(),
    contact: input.contact?.trim() || undefined,
    id: `sug-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  const list = [...readStorage(), suggestion];
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return suggestion;
    }
  } catch {
    // quota cheia ou modo privado → cai para a memória
  }
  memoryStore.push(suggestion);
  return suggestion;
}

/**
 * Envia a sugestão: tenta a API `/api/suggest` (Resend via serverless);
 * se não houver backend, salva localmente. Sempre retorna `{ ok: true }`
 * quando a entrada é válida — o `mode` diz onde ela acabou.
 */
export async function submitSuggestion(
  input: SuggestionInput
): Promise<{ ok: true; mode: "api" | "local" }> {
  validateSuggestion(input);
  try {
    const res = await fetch("/api/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const type = res.headers.get("content-type") ?? "";
    // SPA dev server responde 200 com index.html para rotas desconhecidas
    if (res.ok && type.includes("application/json")) {
      const data: unknown = await res.json();
      if (data && typeof data === "object" && "ok" in data && (data as { ok: boolean }).ok) {
        return { ok: true, mode: "api" };
      }
    }
  } catch {
    // sem rede/backend → segue para o armazenamento local
  }
  saveLocalSuggestion(input);
  return { ok: true, mode: "local" };
}
