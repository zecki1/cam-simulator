import canon60dUrl from "../assets/models/Canon-60d.glb?url";
import fundoVerdeUrl from "../assets/models/Fundo-verde.glb?url";
import homemCinza2Url from "../assets/models/Homem-camisa-cinza2.glb?url";
import homemCinzaUrl from "../assets/models/Homem-camisa-cinza.glb?url";
import homemIdosoUrl from "../assets/models/Homem-idoso-estiloso.glb?url";
import homemOculosUrl from "../assets/models/Homem-de-oculos-em-pe.glb?url";
import homemPalitoUrl from "../assets/models/Homem-palito.glb?url";
import homemPreto2Url from "../assets/models/Homem-camisa-preta2.glb?url";
import homemPreto3Url from "../assets/models/Homem-camisa-preta3.glb?url";
import homemPretoUrl from "../assets/models/Homem-camisa-preta.glb?url";
import homemSentadoOculosUrl from "../assets/models/Homem-sentado-com-oculos.glb?url";
import homemShortsUrl from "../assets/models/Homem-shorts.glb?url";
import homemSlashUrl from "../assets/models/Homem-slash.glb?url";
import homemSocialAcessoriosUrl from "../assets/models/Homem-social-com-acessorios.glb?url";
import homemSocialUrl from "../assets/models/Homem-social.glb?url";
import mulherAcessoriosSentadaUrl from "../assets/models/Mulher-sentada-com-acessorios.glb?url";
import mulherAcademiaUrl from "../assets/models/Mulher-roupa-academia.glb?url";
import mulherBikiniBrancoUrl from "../assets/models/Mulher-modelo-bikini-branco.glb?url";
import mulherBikiniFloridoUrl from "../assets/models/Mulher-modelo-bikini-florido.glb?url";
import mulherBikiniPretoUrl from "../assets/models/Mulher-modelo-bikini-preto.glb?url";
import mulherBrancaUrl from "../assets/models/Mulher-modelo-branca.glb?url";
import mulherBrancaLingerieUrl from "../assets/models/Mulher-branca-lingerie.glb?url";
import mulherColegialUrl from "../assets/models/Mulher-vestida-colegial.glb?url";
import mulherGalaUrl from "../assets/models/Mulher-vestido-gala.glb?url";
import mulherIndigenaUrl from "../assets/models/Mulher-visual-indigena.glb?url";
import mulherJaquetaUrl from "../assets/models/Mulher-modelo-jaqueta.glb?url";
import mulherMorenaUrl from "../assets/models/Mulher-modelo-morena-social.glb?url";
import mulherOculosUrl from "../assets/models/Mulher-de-oculos.glb?url";
import mulherPeSensualUrl from "../assets/models/Mulher-em-pe-sensual.glb?url";
import mulherSentadaIntimaUrl from "../assets/models/Mulher-sentada-roupa-intima.glb?url";
import painelAcusticoUrl from "../assets/models/Painel-acustico.glb?url";
import spotLuzUrl from "../assets/models/Spot-Luz.glb?url";
import tripeCameraUrl from "../assets/models/Tripé-camera-video.glb?url";
import tripeSimplesUrl from "../assets/models/Tripé.glb?url";
import tripeSpotUrl from "../assets/models/Tripé-com-spot-grande.glb?url";
import { GLB_CATALOG, glbCatalogOptions, type GlbKind } from "./glbCatalog";

export type { GlbKind };
export { glbCatalogOptions };

/** URLs resolvidas pelo Vite por nome de arquivo. */
const URLS: Record<string, string> = {
  // Personagens — homens
  "Homem-camisa-preta.glb": homemPretoUrl,
  "Homem-camisa-cinza.glb": homemCinzaUrl,
  "Homem-camisa-cinza2.glb": homemCinza2Url,
  "Homem-camisa-preta2.glb": homemPreto2Url,
  "Homem-camisa-preta3.glb": homemPreto3Url,
  "Homem-de-oculos-em-pe.glb": homemOculosUrl,
  "Homem-idoso-estiloso.glb": homemIdosoUrl,
  "Homem-palito.glb": homemPalitoUrl,
  "Homem-sentado-com-oculos.glb": homemSentadoOculosUrl,
  "Homem-shorts.glb": homemShortsUrl,
  "Homem-slash.glb": homemSlashUrl,
  "Homem-social-com-acessorios.glb": homemSocialAcessoriosUrl,
  "Homem-social.glb": homemSocialUrl,

  // Personagens — mulheres
  "Mulher-modelo-morena-social.glb": mulherMorenaUrl,
  "Mulher-modelo-branca.glb": mulherBrancaUrl,
  "Mulher-modelo-jaqueta.glb": mulherJaquetaUrl,
  "Mulher-modelo-bikini-branco.glb": mulherBikiniBrancoUrl,
  "Mulher-modelo-bikini-florido.glb": mulherBikiniFloridoUrl,
  "Mulher-modelo-bikini-preto.glb": mulherBikiniPretoUrl,
  "Mulher-branca-lingerie.glb": mulherBrancaLingerieUrl,
  "Mulher-de-oculos.glb": mulherOculosUrl,
  "Mulher-em-pe-sensual.glb": mulherPeSensualUrl,
  "Mulher-roupa-academia.glb": mulherAcademiaUrl,
  "Mulher-sentada-com-acessorios.glb": mulherAcessoriosSentadaUrl,
  "Mulher-sentada-roupa-intima.glb": mulherSentadaIntimaUrl,
  "Mulher-vestida-colegial.glb": mulherColegialUrl,
  "Mulher-vestido-gala.glb": mulherGalaUrl,
  "Mulher-visual-indigena.glb": mulherIndigenaUrl,

  // Câmera
  "Canon-60d.glb": canon60dUrl,

  // Tripés
  "Tripé-camera-video.glb": tripeCameraUrl,
  "Tripé-com-spot-grande.glb": tripeSpotUrl,
  "Tripé.glb": tripeSimplesUrl,

  // Luzes
  "Spot-Luz.glb": spotLuzUrl,

  // Fundos
  "Fundo-verde.glb": fundoVerdeUrl,

  // Painéis
  "Painel-acustico.glb": painelAcusticoUrl,
};

/** Catálogo completo (dados + URL) para a cena 3D. */
export const GLB_MODELS: Record<string, GlbModel> = Object.fromEntries(
  Object.entries(GLB_CATALOG).map(([id, entry]) => {
    const url = URLS[entry.arquivo];
    if (!url) {
      throw new Error(`glbModels: URL não registrada para "${entry.arquivo}"`);
    }
    return [id, { ...entry, url }];
  })
);

export interface GlbModel {
  label: string;
  url: string;
  kind: GlbKind;
  anchor?: "chao" | "topo";
  fitCm?: number;
  yawOffsetDeg?: number;
  tags?: string[];
}

/** Opções do select de "Modelo 3D" (com URL) para a cena/painel. */
export function glbOptionsFor(kinds?: GlbKind[]): {
  value: string;
  label: string;
}[] {
  return glbCatalogOptions(kinds);
}