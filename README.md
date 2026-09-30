# Cam Simulator

> Simulador de câmera e estúdio de vídeo para web: profundidade de campo, iluminação com sombras e plantas baixas de estúdio — tudo no navegador, sem backend.

[![Stack](https://img.shields.io/badge/stack-Vite%20%2B%20React%20%2B%20TypeScript-blue)](#stack)
[![Tests](https://img.shields.io/badge/testes-Vitest%20%2B%20Playwright-green)](#testes)
[![Status](https://img.shields.io/badge/status-v0.1%20%E2%80%94%20simulador%20atual%20funcionando%2C%20v0.2%20em%20planejamento-orange)](#roadmap)

---

## Ideia do projeto

Um **simulador de imagem o mais próximo do real possível**, para estudar/ensinar enquadramento, iluminação e óptica de câmeras antes de entrar no estúdio físico. O usuário monta a cena (participantes, luzes, câmeras PTZ, mobília), enquadra em tempo real e vê o resultado com sombras, distância, FOV, profundidade de campo e limites do hiperfocal.

O projeto evolui de um simulador de profundidade de campo para um **estúdio de vídeo completo em 3D**, com biotipos de apresentador, reflexos realistas e uma bancada de conexões de áudio/vídeo (ver [PLANEJAMENTO.md](./PLANEJAMENTO.md)).

---

## O que já está feito (v0.1)

### Aba "Profundidade de campo"
- Simulador de DoF com **abertura, distância focal e distância do sujeito**
- Cálculo de **hiperfocal, limite próximo e limite distante** em tempo real
- Gráfico visual do cone de foco com marcadores (cães/humano) e faixa de nitidez
- Presets de setups prontos ( retrato, paisagem etc.) e seleção de câmera (sensor full-frame/APSC/micro 4/3)
- Unidades **métricas/imperiais** e tema claro/escuro
- Comparação visual de aberturas (imagens de lentes)

### Aba "Estúdio de vídeo"
- **Planta baixa 2D (SVG)** com grade, réguas em metros, snap à grade, arrastar/rotacionar elementos e alça de rotação 360°
- **Visão de câmera com cena 3D (three.js)** a partir do POV da câmera PTZ ativa
- Elementos do estúdio: participantes, câmeras (lente/sensor/configurações ISO/shutter/ND), luzes (spot, luminária, softbox, prática), mesa, computadores, painéis acústicos, microfone boom, **fundo chroma key**
- **Modelos 3D substituíveis (GLB)**: select "Modelo 3D" em qualquer elemento — personagens (homem/mulher + variações), câmeras (Canon 60D, tripé+câmera), luzes (Spot-Luz), fundo verde (Fundo-verde) — com auto-fit (centraliza, escala, ancoragem chão/topo) e fallback procedural
- **Culling por zona de visão**: elementos fora do cone horizontal da câmera (margem 10°) não são renderizados na 3D — a luz real continua iluminando
- **Correção de espelhamento horizontal**: planta +y (norte) = −Z do mundo three.js; `cameraAimPoint`, `aimYaw`, posições, luzes, piso e paredes ajustados
- **Chroma key (fundo verde)**: largura/altura editáveis, toggle "Receber sombras" para visualizar/limpar sombra projetada no key; GLB Fundo-verde com fallback procedural
- **Anatomia da câmera (Canon 60D)**: modal com pins clicáveis em 7 partes (lente, diafragma, sensor, obturador, ISO, visor, WB) ligando cada parte ao campo do painel; drag para girar, seleção destaca pin
- **Sombras universais**: `PCFSoftShadowMap` (suaves), budget 8 luzes, `shadowMapSize` dinâmico (2048 quando ≤3 luzes), `castShadow` default ligado, toggle global + por luz, **queda física opcional** (`decay={2}` inverse square law), bias por tipo de luz
- **Luzes com sombras reais** (`castShadow` por luz), temperatura de cor em Kelvin, cone de feixe e intensidade por potência
- Câmeras **PTZ com alvo automático** (miram o participante) e mira manual (rotacionar limpa o alvo)
- Cálculos de câmera: **FOV vertical/horizontal, enquadramento (plano geral/médio/americano/primeiro plano), ângulo relativo (frontal/perfil/contraluz), DoF e hiperfocal** — exibidos em 8 métricas
- Controles de cena: grade, distâncias, feixes de luz, encaixe na grade, sombras liga/desliga
- **Exportar PNG** da planta e da visão de câmera
- **Presets customizados** salvos em `localStorage` + preset de estúdio de aprendizagem
- Remoção em cascata (remove mesa → remove computadores apoiados nela)
- Layout **responsivo** (desktop/tablet/mobile)

### Qualidade
- TypeScript strict, ESLint sem warnings
- Testes unitários **Vitest 2** (store, câmera math, luzes, catálogo GLB, culling, presets) + teste responsivo com Playwright + suíte E2E manual

---

## O que falta fazer (roadmap v0.2)

Detalhamento completo, critérios de aceite e métricas em **[PLANEJAMENTO.md](./PLANEJAMENTO.md)**.

| # | Etapa | Esforço | Status |
|---|---|---|---|
| 1 | Assets 3D `.glb` (importação, catálogo, auto-fit, fallback) | 2–3 dias | ✅ **concluída** |
| 2 | Biotipos do apresentador (homem/mulher, sentado, porte, óculos, cor da camisa) | 2 dias | ✅ **concluída** |
| 3 | Reflexos realistas (Environment map em óculos/brincos/relógio) | 1 dia | ✅ **concluída** |
| 4 | Sombras universais (toda luz projeta sombra, queda com distância) | 0,5–1 dia | ✅ **concluída** |
| 5 | Modo perspectiva "fantasma" (WASD + mouse) | 1 dia | ✅ **concluída** |
| 6 | Simulador 100% de câmera (zoom, pan/tilt, foco manual + bokeh, **anatomia interativa**) | 2 dias | 🔄 **parcial (modelos câmera + pan + anatomia ✓)** |
| 7 | Nova página: **Bancada de Áudio e Vídeo** (patchbay + mesa de vídeo + controle das 2 PTZ) | 2–3 dias | ⬜ pendente |
| 8 | Testes e validação das etapas acima | 1 dia | ⬜ pendente |

**Progresso: 6/8 etapas concluídas · Etapa 6 parcial (modelos de câmera + pan + anatomia ✓)**

---

## Stack

| Camada | Tecnologias |
|---|---|
| Build | Vite 5, TypeScript 5 (strict) |
| UI | React 18, Chakra UI 2, framer-motion, react-icons |
| 3D | three.js 0.169, @react-three/fiber 8 |
| Estado | Zustand 5 (persistência em `localStorage`) |
| Testes | **Vitest 2**, Playwright |
| Lint | ESLint 8 + @typescript-eslint + react-hooks |

---

## Como rodar

```bash
npm install
npm run dev        # http://127.0.0.1:5173/cam-simulator/
```

### Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (Vite) |
| `npm run build` | Type-check (`tsc`) + build de produção em `dist/` |
| `npm run preview` | Serve o build de produção |
| `npm run lint` | ESLint com `--max-warnings 0` |
| `npm test` | Testes unitários + teste responsivo (Playwright) |
| `node check-e2e.mjs` | Suíte E2E manual (ver abaixo) |

### E2E manual

Terminal 1 (porta fixa 5199):

```bash
npm run dev -- --port 5199
```

Terminal 2:

```bash
node check-e2e.mjs   # screenshots em /tmp/vs-e2e
```

> O `base` do Vite é `/cam-simulator/` (GitHub Pages em `zecki1.github.io/cam-simulator/`). Se renomear o repo, ajuste `vite.config.ts`, `check-e2e.mjs` e `src/App.responsive.test.tsx`.

---

## Estrutura do projeto

```
cam-simulator/
├── PLANEJAMENTO.md          # Roadmap v0.2 detalhado (checklists + métricas)
├── check-e2e.mjs            # Suíte E2E manual (Playwright)
├── index.html
├── vitest.config.ts         # Vitest config (react, node env)
├── vite.config.ts           # base: /cam-simulator/
└── src/
    ├── App.tsx              # Shell: abas "dof" | "studio" (+ futuro "av")
    ├── PhotographyGraphic.tsx  # Gráfico SVG da profundidade de campo
    ├── selectStyles.ts      # Estilos de <select> para tema claro/escuro
    ├── assets/
    │   ├── models/           # GLBs (personagens, câmeras, luzes, fundos)
    │   └── (lentes)          # Imagens de lentes
    ├── utils/units.ts       # Métrico / imperial
    ├── types/
    │   ├── videoStudio.ts   # Tipos usados pelo estúdio (elementos, sala, câmera)
    │   ├── studio.ts        # Backlog tipado (movimentos, áudio, timeline)
    │   └── index.ts         # Backlog tipado (ViewportState, presets...)
    ├── store/
    │   └── videoStudioStore.ts   # Estado global do estúdio (Zustand)
    └── videoStudio/
        ├── VideoStudioPage.tsx   # Layout da aba estúdio (toolbar + views + painel)
        ├── StudioTopView.tsx     # Planta baixa SVG (drag, snap, rotação)
        ├── CameraViewSimulator.tsx # Visão de câmera (SVG + 3D + overlay + métricas)
        ├── StudioScene3D.tsx     # Cena three.js (luzes, sombras, modelos)
        ├── ConfigPanel.tsx       # Painel lateral de configuração
        ├── CameraAnatomy.tsx     # Anatomia da câmera (pins 3D + explicações)
        ├── cameraMath.ts         # FOV, enquadramento, DoF, hiperfocal (matemática pura)
        ├── exposure.ts           # Exposição (ISO/obturador/ND) e balanço de branco
        ├── lighting.ts           # Kelvin→RGB, intensidade, mira da luz
        ├── cameraModels.ts       # Catálogo de corpos/lentes de câmera
        ├── glbCatalog.ts         # Catálogo puro de GLBs (dados + kinds)
        ├── glbModels.ts          # GLB_MODELS (dados + URLs Vite ?url)
        ├── gltfFit.ts            # Auto-fit de GLB (escala, offset, bbox)
        ├── GlbModelView.tsx      # Componentes GLB reutilizáveis (GlbModel, ErrorBoundary)
        ├── cameraParts.ts        # Dados dos pins da anatomia (sem JSX)
        ├── interact.ts           # Anti-clique após arraste (pan na visão de câmera)
        ├── exportImage.ts        # Exportar PNG
        ├── format.ts             # Formatação de números
        └── logic.test.tsx        # Testes do store/câmera/luzes/GLB/culling
```

---

## Arquitetura & convenções

- **Sem react-router**: as páginas são abas controladas por `useState` em `src/App.tsx` (`"dof" | "studio"`, futuro `"av"`)
- **Estado**: um único store Zustand (`videoStudioStore`); ações como `addElement`, `updateElement`, `setActiveCamera`, presets
- **Persistência**: `localStorage` com a chave `cam-shadow-video-presets` (presets customizados)
- **Estilo**: Chakra UI + estilos inline (`useColorModeValue`), sem Tailwind/CSS Modules
- **Sombras**: budget atual de 4 luzes com `castShadow` e `decay={0}` (limitação conhecida → Etapa 4 do planejamento)
- **Personagem**: geometria procedural dimensionada por `heightCm` — a fonte da verdade para enquadramento, foco e sombra

---

## Roadmap imediato

1. Etapa 1 do [PLANEJAMENTO.md](./PLANEJAMENTO.md): assets `.glb` + guia de exportação do Blender
2. Gate de qualidade por etapa: `npm run lint && npm run build && npm test`

---

## Visão de Futuro — Roadmap Expandido (v0.3+)

> **Objetivo:** transformar o simulador em uma **plataforma educacional completa** de estúdio de vídeo/fotografia com gamificação, ranking, banco de dados multiplayer e simulação física realista.

### 🎮 Navegação e Controles (Modo "Fantasma" / Free-fly)
- **WASD** — andar pelo estúdio (frente/trás/esquerda/direita)
- **Espaço / Shift** — subir / descer (elevação da câmera livre)
- **Enter** — "Possuir" a câmera PTZ ativa (teleporta para o POV da câmera, mantém posição)
- **Mouse / Pointer Lock** — olhar ao redor (yaw/pitch)
- **Scroll** — alterar velocidade de movimento
- **Esc** — soltar pointer lock, voltar à navegação de UI
- **HUD** — posição (m), velocidade, botão "Voltar à planta" / "Possuir câmera PTZ"
- **Colisão simples** com paredes da sala (clamp no `Room`); sem colisão com objetos na v1

### 🧭 Tooltips Contextuais e Edição Inline (Planta Baixa + Visão 3D)
- **Hover em qualquer elemento** → tooltip com nome, tipo, atalhos (ex.: `R` rotaciona, `Delete` remove, `E` edita)
- **Clique direito** → menu radial: Editar propriedades / Duplicar / Travar / Remover / "Focar câmera aqui"
- **Arrastar com `Alt`** → clona o elemento (cópia rápida)
- **Snap visual** → linha tracejada quando alinhado a grade/outro elemento
- **Painel lateral "Inspect"** ao selecionar — edição rápida sem abrir modal

### ❓ Quiz Interativo e Gamificação (no README e no App)
- **README interativo**: blocos de pergunta/resposta embutidos (ex.: "Qual abertura dá menor profundidade de campo? a) f/1.8  b) f/8  c) f/16") — validação imediata
- **Modo "Teste de Conhecimento"** no app:
  - Perguntas sobre iluminação (lei do inverso do quadrado, temperatura de cor, razão key/fill)
  - Fotografia (triângulo de exposição, hiperfocal, crop factor)
  - Filmagem (180° shutter, codecs, frame rates)
  - Estúdio (posicionamento de key/fill/back, chroma key, segurança elétrica)
- **Pontuação por categoria** → radar chart de competências
- **Streaks diários** e **conquistas** (ex.: "Mestre do Chroma Key", "Ninja do Hiperfocal")

### 🏆 Sistema de Ranking e Contas (Backend)
| Opção | Prós | Contras |
|---|---|---|
| **Supabase** (PostgreSQL + Auth + Realtime) | SQL completo, row-level security, realtime barato, edge functions | Cold start ocasional |
| **Vercel KV / Postgres** | Integração nativa Vercel, serverless, DX excelente | Vendor lock-in, limites free tier |
| **Firebase / Firestore** | Offline sync, listeners em tempo real, Auth grátis generoso | NoSQL, queries complexas limitadas, preço escala |

**Escolha recomendada:** **Supabase** — melhor custo/benefício para dados relacionais (usuários, scores, presets, histórico), Auth nativo (email/senha + magic link), Realtime para colaboração futura, e edge functions para enviar e-mails via Resend.

**Schema inicial:**
```sql
users (id, name, email, avatar_url, created_at, elo_rating)
quiz_sessions (id, user_id, category, score, max_streak, started_at, finished_at)
questions (id, category, difficulty, prompt, options_json, correct_index, explanation)
user_presets (id, user_id, name, studio_json, is_public, likes, created_at)
tips (id, user_id, title, body, category, status, created_at)
```

**Cadastro obrigatório:** nome + email (verificado via magic link) → entra no ranking global (Elo por categoria + global).

### 🎭 Simulação Física Realista do Ambiente
- **Sombras obrigatórias por padrão** em toda luz (`castShadow: true` default), toggle global + por luz para desabilitar (performance)
- **Queda de luz física** (`decay={2}`) opcional por luz (checkbox "Queda realista")
- **Reflexos realistas (Environment Map)**:
  - **Óculos** nos personagens → `transmission` + `clearcoat` + `roughness ~0.05` → reflexo dos spots/softboxes
  - **Acessórios metálicos** (brincos, relógio, microfone, botões da câmera) → `metalness: 1, roughness: 0.1`
  - **Pele/roupa** → roughness calibrado (pele 0.6, tecido 0.8)
  - Atualização do Environment ao mover/intensificar luzes
- **Personagens manipuláveis**:
  - **Pose**: em pé / sentado / andando (blend shapes ou GLBs separados)
  - **Biotipo**: magro / normal / gordo (escala procedural de tronco/membros)
  - **Acessórios**: óculos, brincos, relógio, gravata, crachá (anexados ao skeleton/bones)
  - **Cor da camisa/roupa** → color picker → override de material no GLB (`mesh.name === "shirt"`)
  - **Expressão facial** (básico: neutro, sorrindo, sério) via morph targets

### 🧱 Colisão e Validação de Layout (Planta Baixa)
- **Bounding box 2D** de cada elemento (baseado no GLB ou geometria procedural)
- **Impedir sobreposição**: ao arrastar, snap para borda do outro elemento (não atravessa)
- **Zonas de exclusão**: área mínima ao redor de câmeras (espaço do operador), tripés, luzes (segurança)
- **Feedback visual**: contorno vermelho + shake suave ao tentar invadir zona ocupada
- **Modo "Livre" (toggle)** → desativa colisão para layouts rápidos/artísticos

### 💡 Sistema de Dicas, Ideias e Sugestões (via Resend)
- **Botão "💡 Sugerir melhoria"** no header → modal com categoria (Iluminação / Câmera / Estúdio / UI / Bug) + textarea
- **Envio via Resend API** (serverless function Supabase/Vercel) → email para equipe + confirmado ao usuário
- **Painel admin** (roteado só para admins) → lista, status (nova/em análise/implementada/fechada), resposta
- **Notificação in-app** quando sugestão do usuário for implementada
- **Dicas contextuais automáticas** (ex.: "Key light muito alta → sombra no olho. Tente baixar 20 cm")

### 🎨 Personalização Visual do Estúdio (Planta Baixa) ✅ **IMPLEMENTADA**
- **Seção "Aparência da Sala"** no ConfigPanel:
  - **Cor do piso** (color picker) — aplicada ao mesh do piso
  - **Cor do teto** (color picker) — aplicada ao mesh do teto
  - **Cor das paredes** independentes (norte/sul/leste/oeste) — cada parede com cor própria
  - **Rugosidade do piso** (slider 0.05–1) → afeta reflexos no Environment Map
  - **Textura do piso** (select: nenhuma/grade/pontos/linhas) — base para futura implementação
- **Persistência**: cores e rugosidade salvas no preset via `localStorage`

### 📦 Novos Modelos GLB a Catalogar (já no `src/assets/models/`)
| Arquivo | Tipo sugerido | Notas |
|---|---|---|
| `Homem-camisa-cinza.glb` | Personagem | Variação |
| `Homem-camisa-cinza2.glb` | Personagem | Variação |
| `Homem-camisa-preta2.glb` | Personagem | Variação |
| `Homem-camisa-preta3.glb` | Personagem | Variação |
| `Mulher-modelo-bikini-branco.glb` | Personagem | Variação |
| `Mulher-modelo-bikini-florido.glb` | Personagem | Variação |
| `Mulher-modelo-bikini-preto.glb` | Personagem | Variação |
| `Mulher-modelo-branca.glb` | Personagem | Variação |
| `Mulher-modelo-jaqueta.glb` | Personagem | **Com jaqueta + possíveis zíperes metálicos** → reflexos |
| `Mulher-modelo-morena-social.glb` | Personagem | **Apresentadora padrão** |
| `Spot-Luz.glb` | Luz (kind "luz") | Já integrado no LightRig |
| `Tripé-camera-video.glb` | Tripé+câmera (kind "tripe") | **Base para câmera** — já usado no CameraMesh kind "tripe" |
| **Modelos com óculos** (a identificar) | Personagem | **Lentes → `transmission` + `clearcoat` para reflexo realista** |
| **Modelos com acessórios metálicos** | Personagem | **Brincos/relógio/colar → `metalness: 1`** |

### 📋 Próximas Etapas Priorizadas (além do PLANEJAMENTO.md atual)

| # | Etapa | Descrição | Esforço |
|---|---|---|---|
| 9 | **Autenticação + Ranking** | Supabase Auth + tabela `users` + Elo por categoria | 2–3 dias |
| 10 | **Quiz Engine** | Motor de perguntas (categorias, dificuldade, explicação) + UI de jogo | 2 dias |
| 11 | **Modo Fantasma (WASD)** | Free-fly com pointer lock, HUD, colisão paredes, "Possuir PTZ" | 2 dias | ✅ **concluída** |
| 12 | **Colisão na Planta** | Bounding boxes 2D, snap anti-sobreposição, zonas de exclusão | 1–2 dias | ✅ **concluída** |
| 13 | **Environment Map + Reflexos** | `<Environment>` + Lightformers por luz, materiais físicos (óculos, metal) | 2 dias | ✅ **concluída** |
| 14 | **Personagem Avançado** | Pose, biotipo, acessórios, override cor roupa, expressões | 3 dias | ✅ **concluída** |
| 15 | **Sombras Físicas + Queda** | decay=2 opcional, PCFSoftShadowMap, bias por tipo, budget 8 | 1 dia | ✅ **concluída** |
| 16 | **Customização Sala** | Cor piso/paredes/teto, textura, refletividade | 1 dia | ✅ **concluída** |
| 17 | **Tooltips + Edição Inline** | Hover tooltip, menu radial, painel Inspect, Alt+arrasta clonar | 1–2 dias |
| 18 | **Sistema de Dicas (Resend)** | Modal sugestão → Edge Function → Resend → Admin panel | 1 dia |
| 19 | **Catálogo Novos GLBs** | Registrar 12+ modelos novos, identificar óculos/acessórios, configurar materiais | 1 dia |
| 20 | **README Interativo** | Blocos de quiz embutidos (MDX ou componente React no README renderizado) | 0,5 dia |

---

## Roadmap imediato (atualizado)

1. **Etapa 9–11** do roadmap expandido: Auth+Ranking, Quiz, Modo Fantasma
2. Gate de qualidade por etapa: `npm run lint && npm run build && npm test`
3. Deploy contínuo na Vercel (preview por PR + produção em `main`)

---

## Créditos

Baseado no [Depth Of Field Simulator](https://github.com/jherr/cam-shadow-simulator) de **Jack Herrington (jherr)** — a aba de profundidade de campo origina daquele projeto. O restante (estúdio de vídeo, luzes/sombras, câmeras PTZ, plantas baixas, anatomia da câmera, chroma key, catálogo GLB) é desenvolvimento deste repositório.
