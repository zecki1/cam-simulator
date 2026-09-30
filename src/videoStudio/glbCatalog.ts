/**
 * Dados puros do catálogo de modelos 3D (sem import de assets — testável
 * fora do Vite). As URLs ficam em glbModels.ts.
 *
 * Para adicionar um modelo: jogue o .glb em src/assets/models/, registre
 * aqui (arquivo = nome do arquivo) e a URL é resolvida automaticamente.
 *
 * Kinds:
 * - personagem: participantes (apresentadores/alunos)
 * - camera: corpo de câmera (encaixa no topo do tripé procedural)
 * - tripe: tripé + câmera em um único GLB (substitui o suporte)
 * - tripe_simples: tripé sozinho (para usar com corpo de câmera separado)
 * - luz: luminária/spot (substitui o suporte visual; a luz real continua)
 * - fundo: fundo de estúdio (chroma/ciclorama, substitui a malha procedural)
 * - painel: painel acústico (substitui a malha procedural)
 */
export type GlbKind = "personagem" | "camera" | "tripe" | "tripe_simples" | "luz" | "fundo" | "painel";

export interface GlbCatalogEntry {
  label: string;
  /** Nome do arquivo em src/assets/models/. */
  arquivo: string;
  kind: GlbKind;
  /**
   * Ancoragem do modelo:
   * - "chao": pés apoiados em y=0 (personagens, tripés, luzes)
   * - "topo": centralizado no ponto de ancoragem (corpo de câmera no topo do tripé)
   */
  anchor?: "chao" | "topo";
  /** Maior dimensão-alvo em cm no auto-fit (padrão = usar a altura do elemento). */
  fitCm?: number;
  /** Rotação Y extra (graus) para alinhar a frente do modelo com a mira. */
  yawOffsetDeg?: number;
  /** Tags para busca/filtro futuro (ex.: "oculos", "acessorios", "sentado"). */
  tags?: string[];
}

const PERSONAGEM = { kind: "personagem", anchor: "chao" } as const;

export const GLB_CATALOG: Record<string, GlbCatalogEntry> = {
  // ── Apresentadores padrão (homem/mulher) ──────────────────────────────
  homem: {
    label: "Homem (apresentador padrão)",
    arquivo: "Homem-camisa-preta.glb",
    ...PERSONAGEM,
  },
  mulher: {
    label: "Mulher (apresentadora padrão)",
    arquivo: "Mulher-modelo-morena-social.glb",
    ...PERSONAGEM,
  },

  // ── Homens — variações ────────────────────────────────────────────────
  homem_cinza: {
    label: "Homem — camisa cinza",
    arquivo: "Homem-camisa-cinza.glb",
    ...PERSONAGEM,
  },
  homem_cinza2: {
    label: "Homem — camisa cinza 2",
    arquivo: "Homem-camisa-cinza2.glb",
    ...PERSONAGEM,
  },
  homem_preto2: {
    label: "Homem — camisa preta 2",
    arquivo: "Homem-camisa-preta2.glb",
    ...PERSONAGEM,
  },
  homem_preto3: {
    label: "Homem — camisa preta 3",
    arquivo: "Homem-camisa-preta3.glb",
    ...PERSONAGEM,
  },
  homem_oculos: {
    label: "Homem — de óculos (em pé)",
    arquivo: "Homem-de-oculos-em-pe.glb",
    ...PERSONAGEM,
    tags: ["oculos"],
  },
  homem_idoso: {
    label: "Homem — idoso estiloso",
    arquivo: "Homem-idoso-estiloso.glb",
    ...PERSONAGEM,
  },
  homem_palito: {
    label: "Homem — palito (magro)",
    arquivo: "Homem-palito.glb",
    ...PERSONAGEM,
  },
  homem_sentado_oculos: {
    label: "Homem — sentado com óculos",
    arquivo: "Homem-sentado-com-oculos.glb",
    ...PERSONAGEM,
    tags: ["oculos", "sentado"],
  },
  homem_shorts: {
    label: "Homem — shorts",
    arquivo: "Homem-shorts.glb",
    ...PERSONAGEM,
  },
  homem_slash: {
    label: "Homem — slash",
    arquivo: "Homem-slash.glb",
    ...PERSONAGEM,
  },
  homem_social_acessorios: {
    label: "Homem — social com acessórios",
    arquivo: "Homem-social-com-acessorios.glb",
    ...PERSONAGEM,
    tags: ["acessorios"],
  },
  homem_social: {
    label: "Homem — social",
    arquivo: "Homem-social.glb",
    ...PERSONAGEM,
  },

  // ── Mulheres — variações ──────────────────────────────────────────────
  mulher_branca: {
    label: "Mulher — blusa branca",
    arquivo: "Mulher-modelo-branca.glb",
    ...PERSONAGEM,
  },
  mulher_jaqueta: {
    label: "Mulher — jaqueta de couro",
    arquivo: "Mulher-modelo-jaqueta.glb",
    ...PERSONAGEM,
  },
  mulher_bikini_branco: {
    label: "Mulher — bikini branco",
    arquivo: "Mulher-modelo-bikini-branco.glb",
    ...PERSONAGEM,
  },
  mulher_bikini_florido: {
    label: "Mulher — bikini florido",
    arquivo: "Mulher-modelo-bikini-florido.glb",
    ...PERSONAGEM,
  },
  mulher_bikini_preto: {
    label: "Mulher — bikini preto",
    arquivo: "Mulher-modelo-bikini-preto.glb",
    ...PERSONAGEM,
  },
  mulher_lingerie: {
    label: "Mulher — lingerie branca",
    arquivo: "Mulher-branca-lingerie.glb",
    ...PERSONAGEM,
  },
  mulher_oculos: {
    label: "Mulher — de óculos",
    arquivo: "Mulher-de-oculos.glb",
    ...PERSONAGEM,
    tags: ["oculos"],
  },
  mulher_pe_sensual: {
    label: "Mulher — em pé sensual",
    arquivo: "Mulher-em-pe-sensual.glb",
    ...PERSONAGEM,
  },
  mulher_academia: {
    label: "Mulher — roupa academia",
    arquivo: "Mulher-roupa-academia.glb",
    ...PERSONAGEM,
  },
  mulher_sentada_acessorios: {
    label: "Mulher — sentada com acessórios",
    arquivo: "Mulher-sentada-com-acessorios.glb",
    ...PERSONAGEM,
    tags: ["acessorios", "sentado"],
  },
  mulher_sentada_intima: {
    label: "Mulher — sentada roupa íntima",
    arquivo: "Mulher-sentada-roupa-intima.glb",
    ...PERSONAGEM,
    tags: ["sentado"],
  },
  mulher_colegial: {
    label: "Mulher — vestida colegial",
    arquivo: "Mulher-vestida-colegial.glb",
    ...PERSONAGEM,
  },
  mulher_gala: {
    label: "Mulher — vestido gala",
    arquivo: "Mulher-vestido-gala.glb",
    ...PERSONAGEM,
  },
  mulher_indigena: {
    label: "Mulher — visual indígena",
    arquivo: "Mulher-visual-indigena.glb",
    ...PERSONAGEM,
  },

  // ── Câmera ────────────────────────────────────────────────────────────
  canon_60d: {
    label: "Canon 60D (corpo)",
    arquivo: "Canon-60d.glb",
    kind: "camera",
    anchor: "topo",
    fitCm: 24,
  },

  // ── Tripés ────────────────────────────────────────────────────────────
  tripe_camera: {
    label: "Tripé com câmera (GLB completo)",
    arquivo: "Tripé-camera-video.glb",
    kind: "tripe",
    anchor: "chao",
  },
  tripe_spot: {
    label: "Tripé com spot grande",
    arquivo: "Tripé-com-spot-grande.glb",
    kind: "tripe",
    anchor: "chao",
  },
  tripe_simples: {
    label: "Tripé simples",
    arquivo: "Tripé.glb",
    kind: "tripe_simples",
    anchor: "chao",
  },

  // ── Luzes ─────────────────────────────────────────────────────────────
  spot_luz: {
    label: "Spot de luz (refletor)",
    arquivo: "Spot-Luz.glb",
    kind: "luz",
    anchor: "chao",
  },

  // ── Fundos ────────────────────────────────────────────────────────────
  fundo_verde: {
    label: "Fundo verde (chroma)",
    arquivo: "Fundo-verde.glb",
    kind: "fundo",
    anchor: "chao",
  },

  // ── Painéis ───────────────────────────────────────────────────────────
  painel_acustico: {
    label: "Painel acústico",
    arquivo: "Painel-acustico.glb",
    kind: "painel",
    anchor: "chao",
  },
};

/** Opções do select de "Modelo 3D" para um tipo de elemento (vazio = procedural). */
export function glbCatalogOptions(
  kinds?: GlbKind[]
): { value: string; label: string }[] {
  const list = Object.entries(GLB_CATALOG).filter(
    ([, m]) => !kinds || kinds.includes(m.kind)
  );
  return list.map(([id, m]) => ({ value: id, label: m.label }));
}