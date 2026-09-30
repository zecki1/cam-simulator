/**
 * Endpoint de sugestões (Item 18) — Vercel Serverless Function.
 *
 * Encaminha a sugestão recebida do app para a equipe via Resend.
 * Variáveis de ambiente obrigatórias:
 *   RESEND_API_KEY      — chave da API do Resend
 *   SUGGESTION_TO_EMAIL — destino (ex.: equipe@dominio.com)
 *   RESEND_FROM_EMAIL   — remetente verificado no Resend (opcional,
 *                         padrão "onboarding@resend.dev")
 *
 * Sem as variáveis responde 501 e o cliente cai para o armazenamento local.
 */

const CATEGORIES = ["Iluminação", "Câmera", "Estúdio", "UI", "Bug"];

function text(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Método não permitido." });
    return;
  }

  const body = typeof req.body === "string" ? safeParse(req.body) : req.body;
  const category = text(body?.category, 40);
  const title = text(body?.title, 120);
  const suggestion = text(body?.body, 2000);
  const contact = text(body?.contact, 120);

  if (!CATEGORIES.includes(category)) {
    res.status(400).json({ ok: false, error: "Categoria inválida." });
    return;
  }
  if (title.length < 5 || suggestion.length < 10) {
    res
      .status(400)
      .json({ ok: false, error: "Título ou descrição muito curtos." });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.SUGGESTION_TO_EMAIL;
  if (!apiKey || !to) {
    res.status(501).json({
      ok: false,
      error: "RESEND_API_KEY / SUGGESTION_TO_EMAIL não configurados.",
    });
    return;
  }

  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: contact || undefined,
        subject: `[Sugestão · ${category}] ${title}`,
        text: [
          `Categoria: ${category}`,
          `Contato: ${contact || "não informado"}`,
          `Enviado em: ${new Date().toISOString()}`,
          "",
          suggestion,
        ].join("\n"),
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      res.status(502).json({
        ok: false,
        error: "Falha ao enviar via Resend.",
        detail: detail.slice(0, 300),
      });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(502).json({
      ok: false,
      error: "Erro inesperado ao enviar.",
      detail: String(err).slice(0, 300),
    });
  }
}

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
