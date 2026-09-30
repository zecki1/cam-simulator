/**
 * Pinos da anatomia da câmera: dados puros (sem JSX) — ver CameraAnatomy.tsx.
 */
/**
 * Cada pino aponta uma parte física do corpo da câmera e explica o que ela
 * faz — ligando a parte ao campo correspondente do painel de configuração.
 * `u/v/w` são frações (0–1) do bounding box do modelo.
 */
export interface CameraPart {
  id: string;
  titulo: string;
  u: number;
  v: number;
  w: number;
  /** Campo correspondente no painel do simulador. */
  campo: string;
  texto: string;
}

export const CAMERA_PARTS: CameraPart[] = [
  {
    id: "lente",
    titulo: "1 · Lente (objetiva)",
    u: 0.5,
    v: 0.42,
    w: 0.1,
    campo: "Objetiva · Zoom (focal)",
    texto:
      "A lente reúne a luz da cena e projeta a imagem sobre o sensor. A distância focal (mm) define o ângulo de visão: 16 mm é grande-angulação (cabe mais espaço, distorce as bordas), 50 mm é “normal” (parecido com o olho) e 200 mm é teleobjetiva (aproxima o plano e comprime a perspectiva). No painel, “Zoom”/“Distância focal” controlam isso — e a distância da câmera ao assunto completa o enquadramento.",
  },
  {
    id: "diafragma",
    titulo: "2 · Anel de diafragma",
    u: 0.68,
    v: 0.44,
    w: 0.3,
    campo: "Abertura (f/)",
    texto:
      "Dentro da lente há um diafragma (tipo pupilão) que abre ou fecha o orifício por onde a luz passa. f/1.8 = boca grande: entra muita luz e a profundidade de campo fica rasa (fundo desfocado). f/11 = boca pequena: menos luz, tudo em foco. Cada passo (f/1.8 → f/2.8 → f/4 …) dobra ou corta pela metade a quantidade de luz — e é um dos três controles de exposição.",
  },
  {
    id: "sensor",
    titulo: "3 · Sensor",
    u: 0.5,
    v: 0.52,
    w: 0.48,
    campo: "Sensor / ficha técnica",
    texto:
      "O sensor (CMOS/CCD) é a “plaquinha” que substitui o filme: converte a luz em sinal digital. O tamanho importa: full frame (36×24 mm) vs APS-C (crop ×1.5) muda o campo de visão (mesmo objeto “parece” maior no full frame) e o desfoque (CoC, círculo de confusão) usado para calcular a profundidade de campo. No painel, a ficha do modelo mostra sensor, CoC, resolução e codec.",
  },
  {
    id: "obturador",
    titulo: "4 · Obturador (cortina)",
    u: 0.5,
    v: 0.5,
    w: 0.72,
    campo: "Velocidade de obturador",
    texto:
      "Antes de gravar, uma cortina cobre o sensor; o obturador a abre por uma fração de segundo. 1/50 s é o padrão de vídeo (coerente com a frequência da rede elétrica, evita flicker das luzes) e deixa o movimento “natural”; 1/500 s congela ação rápida; 1/15 s arrasta luz (rastro intencional). Junto com ISO e abertura, forma a tríade da exposição: trocar um pelo outro na mesma razão mantém o brilho.",
  },
  {
    id: "iso",
    titulo: "5 · ISO (botões do topo)",
    u: 0.42,
    v: 0.95,
    w: 0.62,
    campo: "ISO",
    texto:
      "O ISO amplifica o sinal do sensor. Dobrar o ISO dobra o brilho da mesma imagem (sem mexer em abertura/obturador), mas o custo é o ruído: ISO 100/200 é limpo, ISO 1600+ ganha granulado visível, principalmente nas sombras. Use o menor ISO que a cena permitir e complete a exposição com abertura e obturador.",
  },
  {
    id: "visor",
    titulo: "6 · Visor / tela traseira",
    u: 0.5,
    v: 0.66,
    w: 0.97,
    campo: "POV: aba “Visão da câmera”",
    texto:
      "O visor óptico (ou a tela articulada) é onde o operador enquadra, foca e confere o que está gravando. No simulador, o equivalente é a câmera selecionada no seletor “Câmera da simulação”: a visão da câmera mostra o enquadramento, o desfoque (profundidade de campo) e os ajustes de exposição — use-a para validar tudo antes de “gravar”.",
  },
  {
    id: "wb",
    titulo: "7 · Balanço de branco (botões)",
    u: 0.74,
    v: 0.92,
    w: 0.55,
    campo: "Balanço de branco (K)",
    texto:
      "Define “o que é branco” sob a luz do set: ~3200 K para tungstênio (luz quente de lâmpada), ~5600 K para luz do dia/LED frio. Se errar, a imagem inteira fica alaranjada ou azulada. No simulador, o WB ganha a temperatura das luzes por plano e a câmera aplica o ganho de correção — o status de exposição mostra o resultado.",
  },
];
