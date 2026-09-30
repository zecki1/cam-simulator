# Planejamento — cam-shadow-simulator v2

> **Objetivo:** transformar o cam-shadow-simulator num simulador de estúdio de vídeo próximo do real: assets 3D (incluindo modelos do Blender), biotipos de apresentador com reflexos realistas, sombras universais, câmera livre estilo "fantasma", controles completos de câmera (zoom, rotação, foco) e uma nova página "Bancada de Áudio e Vídeo".
>
> **Stack:** Vite + React 18 + TypeScript (strict) · three.js 0.169 · @react-three/fiber 8 · Zustand 5 · Chakra UI 2 · testes **Vitest 2** + Playwright (`check-e2e.mjs`)
>
> **Regras de navegação:** sem react-router — abas via `useState` em `src/App.tsx` (`"dof" | "studio" | "av"`)
>
> **Métrica de progresso:** cada etapa tem checklist `- [ ]` + critérios de aceite; só marcar como concluída quando `npm run lint`, `npm run build` e `npm test` passarem.

---

## 0. Diagnóstico atual (baseline)

| Item | Situação hoje |
|---|---|
| Modelos 3D | **16 arquivos `.glb`** em `src/assets/models/` (personagens, câmeras, luzes, fundos) + geometria procedural fallback |
| Dependências 3D | `three` + `@react-three/fiber` — **sem drei**; `GLTFLoader` direto via `useLoader` |
| Câmera da cena | POV fixo da câmera PTZ ativa; pan/tilt por arraste (sem OrbitControls); **modo fantasma planejado (Etapa 5)** |
| Sombras | Budget de **4 luzes** com `castShadow`; `decay={0}` (luz não cai com distância); GLBs recebem/projetam |
| Zoom/foco | **Parcial**: zoom/focal no painel + `computeDof` em 2D; foco manual e bokeh no 3D pendentes (Etapa 6) |
| Personagem | GLBs substituíveis (catálogo `glbCatalog.ts`); campo `glbModelId` em `BaseElement`; escala por `heightCm`; 10 biotipos disponíveis |
| Reflexos | Materiais `meshStandardMaterial` simples, sem env map — planejado na Etapa 3 |
| Páginas | 2 abas: "Profundidade de campo" + "Estúdio de vídeo"; futura "av" (Etapa 7) |
| Persistência | `localStorage` (`cam-shadow-video-presets`) |

**Backlog já tipado (não implementado):** `src/types/index.ts` (`ViewportState {zoom, pan}`, `LightingPreset`, `StudioProject`) e `src/types/studio.ts` (`CameraMovement`, `AudioSetup`, `TimelineEvent`).

---

## 1. Assets 3D — GLB + catálogo + auto-fit (✅ **CONCLUÍDA**)

**Esforço real:** 2 dias · **Status:** concluída em 30/09/2026

**O que foi feito (diferente do planejado original):**

- [x] Catálogo puro em `src/videoStudio/glbCatalog.ts` (dados sem import de asset — testável) + `src/videoStudio/glbModels.ts` (URLs Vite `?url`)
- [x] Tipos: `GlbKind = "personagem" | "camera" | "tripe" | "luz" | "fundo"` com `anchor: "chao" | "topo"`, `fitCm`, `yawOffsetDeg`
- [x] Campo `glbModelId?: string` em `BaseElement` (`src/types/videoStudio.ts`)
- [x] Select "Modelo 3D (GLB)" no ConfigPanel (seção comum para todos os elementos)
- [x] Auto-fit genérico `fitGltfObject` (`gltfFit.ts`): centraliza XZ, escala por `heightCm` ou `fitCm`, ancora pés (`chao`) ou centro (`topo`)
- [x] Componentes reutilizáveis: `GlbModel`, `ModelErrorBoundary`, `useShadowFlags` (`GlbModelView.tsx`)
- [x] Fallback procedural via `ModelErrorBoundary` + `Suspense` → geometria procedural se GLB falhar
- [x] **Sombras** em todos os GLBs via `markShadowFlags` + `useShadowFlags`
- [x] **Culling por zona de visão**: `isInCameraCone` aplicado em `renderElement` + `LightRig { inZone }`
- [x] **Correção de espelhamento**: planta +y = −Z mundo; `cameraAimPoint.z = −pos.y`, `aimYaw = atan2(dx, −dy)`, todas posições `[x,0,−y]`
- [x] **16 GLBs catalogados** em `src/assets/models/`:
  - Personagens (10): `homem` (apresentador padrão), `mulher` (apresentadora), + 8 variações (cinza, preto, branco, jaqueta, bikini...)
  - Câmera: `canon_60d` (corpo, `kind: "camera"`, `anchor: "topo"`, `fitCm: 24`), `tripe_camera` (tripé+câmera GLB completo, `kind: "tripe"`)
  - Luz: `spot_luz` (refletor, `kind: "luz"`)
  - Fundo: `fundo_verde` (cyclorama chroma, `kind: "fundo"`)
- [x] **Chroma key (fundo verde)**: elemento `ChromaKeyElement { widthCm, heightCm, color, receiveShadows }` + GLB `fundo_verde` com fallback procedural + toggle "Receber sombras"
- [x] **Luzes com GLB**: `LightRig` renderiza `Spot-Luz.glb` (kind "luz") no lugar do suporte procedural; luz real + cone mantidos; rotação `yaw` em direção ao alvo
- [x] **Anatomia da câmera** (`CameraAnatomy.tsx`): modal com Canon 60D GLB, 7 pins clicáveis (lente, diafragma, sensor, obturador, ISO, visor, WB) ligando cada parte ao campo do painel; drag para girar
- [x] **Testes**: catálogo GLB, culling, preset `glbModelId: "homem"` — 28 testes Vitest verdes
- [x] Migração `node:test` → **Vitest 2** (`vitest.config.ts`, scripts `test`/`test:watch`)

**Critérios de aceite ATENDIDOS:** `.glb` aparece na cena, arrasta/rotaciona na planta, projeta/recebe sombra, fallback procedural se GLB faltar, select "Modelo 3D" funciona em todos os elementos, culling por cone validado (0.0 diff), espelhamento corrigido (Playwright: B esquerda x=0.2, direita x=0.85, atrás null).

---

## 2. Biotipos do apresentador (Misto GLB + procedural)

**Esforço:** 2 dias · **Prioridade:** alta

### 2.1 Novos campos em `SubjectElement`

```ts
gender: "m" | "f";
bodyType: "magro" | "normal" | "gordo";
pose: "em_pe" | "sentado";
glasses: boolean;
accessories: { brincos: boolean; relogio: boolean };
shirtColor: string;   // color picker, default por role
// heightCm existente passa a aceitar 140–210
```

- [ ] Estender `SubjectElement` + labels em `src/types/videoStudio.ts`
- [ ] Presets rápidos de biotype no ConfigPanel (ex.: "Homem alto de óculos", "Mulher sentada")

### 2.2 Camada 1 — GLB (visual principal)

- [ ] Modelos base `characters/homem.glb` e `characters/mulher.glb` (Mixamo/Sketchfab CC0)
- [ ] Override de material por nome de mesh: `shirt` → `shirtColor` (traverse + trocar `material.color`)
- [ ] Escalar por `heightCm` (altura real do GLB × razão)

### 2.3 Camada 2 — procedural (combinações não cobertas)

- [ ] Expandir `Character` (`StudioScene3D.tsx`): `bodyType` escala tronco/membros; `pose sentada` recolhe pernas e abaixa o tronco (~45% da altura)
- [ ] Seleção automática: existe GLB compatível (gender + pose) → GLB; senão → procedural

### 2.4 Acessórios (sempre procedurais, anexados ao personagem)

- [ ] Óculos: armação (`torus`/`box`) + duas lentes
- [ ] Brincos: pequenos discos metálicos no rosto
- [ ] Relógio: caixa + pulseira no pulso
- [ ] Cor da camisa: input `type="color"` no ConfigPanel → aplica em GLB (override) ou procedural (`ROLE_COLORS` vira fallback)

**Critérios de aceite:** trocar biotype atualiza a cena, o enquadramento (`computeFraming`), a régua de altura e o cálculo de foco sem quebrar; sombra acompanha a nova silhueta.

---

## 3. Reflexos realistas (Environment map)

**Esforço:** 1 dia · **Prioridade:** alta

- [ ] `<Environment resolution={256}>` do drei com `<Lightformer>`s espelhando cada luz ativa (posição, `kelvinToRgb(colorTemp)`, intensidade via `lightIntensity`)
- [ ] Reagir a mudanças: re-render do Environment quando luzes mudarem de lugar/intensidade (effect no store)
- [ ] Materiais:
  - [ ] Lentes de óculos: `meshPhysicalMaterial` — `transmission`, `clearcoat`, `roughness ~0.05`
  - [ ] Brincos/relogio: `metalness: 1`, `roughness: 0.1`
  - [ ] Pele/roupa: roughness calibrado (pele 0.6, roupa 0.8)
- [ ] Comprovar visualmente: reflexo dos lumináculos nos óculos/brincos/relógio na visão de câmera

**Critérios de aceite:** ao mover um spot na planta, o reflexo correspondente aparece/move nos acessórios metálicos e nas lentes.

---

## 4. Sombras universais

**Esforço:** 0,5–1 dia · **Prioridade:** alta

- [ ] Remover/elevar o `shadowBudget = 4` (`StudioScene3D.tsx:511`) → todas as luzes com `castShadow` recebem sombra (ou budget 8 com downgrade de mapSize)
- [ ] Switch global "Gerar sombras" **ligado por padrão** (hoje no `ConfigPanel.tsx:615-622`)
- [ ] Sombras suaves: `PCFSoftShadowMap` no `gl` do Canvas; mapSize 1024 → 2048 quando ≤3 luzes sombreadoras
- [ ] Ajuste fino: `shadow-bias` / `shadow-normalBias` por tipo de luz (evitar acne no chão)
- [ ] Novo toggle por luz: **"Queda de luz com distância"** → `decay={2}` físico (hoje fixo `decay={0}` em `lighting.ts`/`LightRig`)
- [ ] GLBs herdam `castShadow/receiveShadow` (Etapa 1)
- [ ] Personagem sentado/gordo projeta silhueta correta

**Critérios de aceite:** toda luz acesa projeta sombra de todos os objetos; toggle global desliga tudo; cena < 60 FPS estável no build de produção.

---

## 5. Modo perspectiva "fantasma" (WASD + mouse)

**Esforço:** 1 dia · **Prioridade:** média

- [ ] Store: `view: "topo" | "camera" | "perspectiva"` + `ghost: { position, yaw, pitch, speed }`
- [ ] Botão "Perspectiva" na toolbar do `VideoStudioPage.tsx`
- [ ] Controles: clique ativa pointer lock → mouse olha; **WASD** anda; **Q/E** sobe/desce; **Shift** corrida; scroll altera velocidade
- [ ] Colisão simples com paredes da sala (clamp no `Room`) — sem colisão com objetos na v1
- [ ] HUD: posição (m), velocidade, botão **"Possuir câmera PTZ"** (teleporta para o POV da câmera ativa) e "Voltar"
- [ ] Posição persiste no store ao alternar abas de view
- [ ] Sair do pointer lock com `Esc`

**Critérios de aceite:** andar livre pelo estúdio vendo sombras/reflexos; "possuir câmera" cai exatamente no enquadramento da PTZ ativa.

---

## 6. Simulador 100% de câmera (zoom, rotação, foco)

**Esforço:** 2 dias · **Prioridade:** alta · **Status:** 🔄 em andamento (modelos, rotação, exposição, sala ✓)

- [x] **Modelos de câmera:** catálogo `src/videoStudio/cameraModels.ts` com **Canon EOS SL2, Canon EOS T7i, Sony Handcam (FDR-AX43A), PTZ 20×** — corpo define sensor (mm/crop/CoC), ISO, fps, resolução, codec e objetivas; aplicados via `applyCameraModel()` (preserva posição/alvo)
- [x] **Painel de configuração da câmera** (direita): Modelo + ficha técnica, Objetiva, **Zoom (focal) em slider** por faixa real da lente (ex.: kit 18–55 mm), Abertura limitada ao máximo da lente, ISO/fps do modelo, **Filtro ND**, alvo, POV
- [x] **Rotação:** slider do painel gira a câmera selecionada + **arrastar na visão da câmera (pan)** — horizontal gira, assume direção manual (solta `targetId`), guarda anti-clique após arraste (`interact.ts`)
- [x] **Sincronização POV ↔ painel:** selecionar câmera (dropdown/CLI/Objeto) → ela vira POV *e* aparece no painel; trocar POV → seleciona a câmera (`select`/`setActiveCamera` no store)
- [ ] **Zoom digital** (corta o sensor, simula crop)
- [ ] **Tilt:** limitar pitch no pan/tilt e botão "Reenquadrar no alvo"
- [x] **Exposição:** ISO/obturador/abertura/ND → `toneMappingExposure` do Canvas (módulo `exposure.ts`, referência ISO 400 · 1/50 · f/4); alerta "imagem subexposta/superexposta" (±1 EV) no painel e no overlay da visão da câmera
- [x] **Balanço de branco:** Kelvin da câmera (2800–7500 K) → ganhos RGB aplicados a todas as luzes do render (5600 K = neutro); rótulo corrigido para "Balanço de branco"
- [x] **Sala editável:** seção "Sala (planta)" no painel (largura/profundura/altura em m, com limites); `setRoom` no store; `loadLearningPreset` restaura o padrão 7 × 5 m
- [x] **Layout do preset:** câmera A ao lado da mesa, B ao lado da principal, key/fill na frente do participante e back/ambient atrás — as 4 luzes ficam fora do enquadramento das 2 câmeras
- [x] **GLBs organizados:** `personagem-man.glb` e `camera60d-teste.glb` movidos para `src/assets/models/`
- [ ] **Foco:** slider `focusDistanceCm` manual (modo MF) ou "autofocus no alvo"; alimenta `computeDof` (near/far/hiperfocal) — os 8 Metrics da `CameraViewSimulator` passam a refletir o foco manual
- [ ] **Bokeh no 3D:** instalar `@react-three/postprocessing` (v2) + `BokehEffect` ligado ao modo MF/foco manual
- [ ] **Extras (backlog):** zebra/false color, peaking de foco, aspect frame guides (2.39:1, 1:1)
- [ ] Exportar PNG continua funcionando (`exportImage.ts`)

**Critérios de aceite:** zoom muda o enquadramento igual lente real; foco manual desfoca fundo no 3D e atualiza os números de DoF; pan/tilt mantém ou limpa o alvo conforme o modo.

---

## 7. Nova página — Bancada de Áudio e Vídeo (abas "dof | studio | av")

**Esforço:** 2–3 dias · **Prioridade:** média

- [ ] `App.tsx`: terceiro botão "Bancada A/V" → `page: "dof" | "studio" | "av"`
- [ ] Tipos: `src/types/audioVideo.ts` (canais, buses, outputs, PTZ, conexões)
- [ ] Store: `src/store/audioVideoStore.ts` (Zustand + `localStorage` chave `cam-shadow-av-patches`)
- [ ] `src/audioVideo/`
  - [ ] `AudioVideoPage.tsx` — layout (toolbar + patchbay central + painel lateral)
  - [ ] `VideoSwitcher.tsx` — inputs 1–4, PGM/PVW, botões CUT/AUTO, T-bar simplificado
  - [ ] `AudioMixer.tsx` — canais 1–8, gains, buses, returns, VU meters animados
  - [ ] `Patchbay.tsx` — SVG com **cabos em bézier arrastáveis** (origem → destino), clique no cabo seleciona, `Delete` remove; cores por tipo (áudio = verde, vídeo = amarelo, PTZ = azul)
  - [ ] `PtzController.tsx` — controle das **2 câmeras PTZ**: pan/tilt/zoom por botões (press-and-hold), slider de velocidade, presets P1–P4 (salvar/chamar)
- [ ] **Integração com o estúdio:** mover PTZ na bancada atualiza `position/rotation` da câmera correspondente no `videoStudioStore` (câmeras A/B = PTZ 1/2) — sincronização nas duas direções
- [ ] Validações: feedback visual de conflito (ex.: 2 fontes no mesmo canal PGM), botão "Limpar patchbay"
- [ ] Persistência: conexões + presets PTZ em `localStorage`

**Critérios de aceite:** criar conexões mesa↔switcher, controlar as 2 PTZ da bancada e ver a câmera do estúdio girar; recarregar a página mantém tudo.

---

## 8. Testes e validação

**Esforço:** 1 dia · **Prioridade:** alta (gate de todas as etapas)

- [ ] Testes `node:test` novos (`src/**/*.test.tsx`):
  - [ ] `assets/catalog.test.ts` — registro completo, fallback de arquivo ausente
  - [ ] biotypes — montagem de `SubjectElement`, regra GLB vs procedural, altura × framing
  - [ ] foco — `focusDistanceCm` → near/far/hiperfocal
  - [ ] `audioVideoStore.test.ts` — criar/remover conexão, preset PTZ, persistência
- [ ] Atualizar `check-e2e.mjs`:
  - [ ] nova aba "Bancada A/V" abre e renderiza
  - [ ] modo perspectiva carrega e WASD move a câmera (posição muda no HUD)
  - [ ] troca de biotype atualiza a cena
  - [ ] zoom/foco alteram os Metrics
  - [ ] todos os testes existentes seguem verdes
- [ ] Gate por etapa: `npm run lint` && `npm run build` && `npm test`
- [ ] Checagem de performance: FPS na cena com todas as luzes sombreadoras

---

## Roadmap e métrica

| # | Etapa | Esforço | Status | Concluída em |
|---|---|---|---|---|
| 1 | Assets GLB + catálogo + auto-fit + fallback | 2 dias | ✅ **concluída** | 30/09/2026 |
| 2 | Biotipos do apresentador | 2 dias | ⬜ pendente | |
| 3 | Reflexos (Environment map) | 1 dia | ⬜ pendente | |
| 4 | Sombras universais | 0,5–1 dia | ⬜ pendente | |
| 5 | Modo fantasma (WASD) | 1 dia | ⬜ pendente | |
| 6 | Simulador 100% de câmera (zoom, pan/tilt, foco, anatomia) | 2 dias | 🔄 **parcial** | modelos+pan+anatomia ✓ 30/09 |
| 7 | Bancada de Áudio e Vídeo | 2–3 dias | ⬜ pendente | |
| 8 | Testes e validação | 1 dia | ⬜ pendente | |
| | **Total** | **~11–14 dias** | **1/8** | |

**Ordem de execução:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 (cada etapa só inicia após o gate da anterior).

**Progresso geral:** `1 / 8` etapas concluídas · Etapa 6 parcial (modelos GLB, catálogo, pan/tilt, exposição/WB, sala, preset, chromakey, anatomia ✓) · gate Etapa 1: `lint`+`build`+`test` ✓

---

## Regras de ouro

1. **Padrões existentes primeiro:** Chakra UI + estilos inline (sem Tailwind/CSS Modules), Zustand para estado, `node:test` para testes — nada de inventar stack nova.
2. **Sem react-router:** abas continuam por `useState` em `App.tsx`.
3. **Persistir tudo em `localStorage`** (padrão dos presets atuais) — nada de backend.
4. **Fallback sempre:** GLB ausente → procedural; asset quebrado → mensagem amigável, nunca tela branca.
5. **`heightCm` é a fonte da verdade** do personagem: enquadramento, régua, foco e sombra derivam dele.
6. **Gate de qualidade por etapa:** `lint` + `build` + `test` verdes antes de marcar `- [x]`.
7. **Performance:** sombras e env map são os maiores custos — medir FPS antes/after cada etapa que mexe com luz.
8. **Assets de terceiros só CC0/licença livre**, com crédito no README.
