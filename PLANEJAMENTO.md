# Planejamento — cam-shadow-simulator v2

> **Objetivo:** transformar o cam-shadow-simulator num simulador de estúdio de vídeo próximo do real: assets 3D (incluindo modelos do Blender), biotipos de apresentador com reflexos realistas, sombras universais, câmera livre estilo "fantasma", controles completos de câmera (zoom, rotação, foco) e uma nova página "Bancada de Áudio e Vídeo".
>
> **Stack:** Vite + React 18 + TypeScript (strict) · three.js 0.169 · @react-three/fiber 8 · Zustand 5 · Chakra UI 2 · testes `node:test` + Playwright (`check-e2e.mjs`)
>
> **Regras de navegação:** sem react-router — abas via `useState` em `src/App.tsx` (`"dof" | "studio" | "av"`)
>
> **Métrica de progresso:** cada etapa tem checklist `- [ ]` + critérios de aceite; só marcar como concluída quando `npm run lint`, `npm run build` e `npm test` passarem.

---

## 0. Diagnóstico atual (baseline)

| Item | Situação hoje |
|---|---|
| Modelos 3D | 100% procedurais (`capsuleGeometry`, `boxGeometry`...), zero `.glb` |
| Dependências 3D | `three` + `@react-three/fiber` — **sem drei**, sem GLTFLoader |
| Câmera da cena | POV fixo da câmera PTZ ativa; sem OrbitControls, sem free-fly |
| Sombras | Budget de **4 luzes** com `castShadow`; `decay={0}` (luz não cai com distância) |
| Zoom/foco | Inexistentes no 3D; DoF calculado só em 2D (`cameraMath.computeDof`) |
| Personagem | `Character` procedural (`StudioScene3D.tsx:47-128`), escala por `heightCm`, sem biotipos |
| Reflexos | Materiais `meshStandardMaterial` simples, sem env map — nada de brilho especular real |
| Páginas | 2 abas: "Profundidade de campo" + "Estúdio de vídeo" |
| Persistência | `localStorage` (`cam-shadow-video-presets`) |

**Backlog já tipado (não implementado):** `src/types/index.ts` (`ViewportState {zoom, pan}`, `LightingPreset`, `StudioProject`) e `src/types/studio.ts` (`CameraMovement`, `AudioSetup`, `TimelineEvent`).

---

## 1. Assets 3D — GLB + importação do Blender

**Esforço:** 2–3 dias · **Prioridade:** alta

- [ ] Instalar `@react-three/drei` ^9 (compatível com fiber 8)
- [ ] Criar `public/models/` (+ subpasta `characters/`)
- [ ] Criar `src/videoStudio/assets/catalog.ts`
  - registro: `id → { file, name, scaleCm, defaultRotation, elementType, fallbackProc? }`
  - função `loadModel(id)` com `useGLTF` e **fallback** para geometria procedural se o arquivo faltar (erro amigável no console/UI)
- [ ] Novo campo `modelId?: string` nos tipos de elemento (`src/types/videoStudio.ts`)
- [ ] Painel ConfigPanel: seção "Adicionar objeto 3D" listando o catálogo (miniaturas/nomes)
- [ ] Bounding box automática → drag/clamp na sala e snap da planta baixa continuam funcionando (`StudioTopView.tsx`)
- [ ] Marcar `castShadow/receiveShadow` em todo GLB carregado (reaproveitar `useShadowFlags`)
- [ ] Modelos iniciais livres (CC0): cadeira, sofá, cyclorama/fundo, painel acústico detalhado, PTZ realista, softbox/LED panel, monitor/TV, planta, mesa redonda, podium, tapete
- [ ] *(Fase 2)* Compressão DRACO/KTX2 via `gltf-transform` no build

### Guia de exportação do Blender (colar no README do projeto)

```
1. Escala: 1 unidade = 1 metro (Scene Properties > Units > Metric)
2. Aplicar transformações: Ctrl+A > All Transforms
3. Eixo: modelo de frente para -Z, para cima = +Y (glTF converter cuida disso)
4. Nomear as meshes de material (ex.: "shirt", "skin", "hair") — permite override de cor no app
5. Export > glTF 2.0:
   - Format: glTF Binary (.glb)
   - Include > Selected Objects (se quiser só o objeto)
   - Transform > +Y Up ✓
   - Data > Apply Modifiers ✓, Cameras/Lights ✗ (a menos que queira)
   - Compression > Draco (opcional, reduz muito o tamanho)
6. Salvar em cam-shadow-simulator/public/models/<nome>.glb
7. Registrar em src/videoStudio/assets/catalog.ts
```

**Critérios de aceite:** `.glb` do Blender aparece na cena, arrasta/rotaciona na planta, projeta sombra e some com fallback amigável se deletado do disco.

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

**Esforço:** 2 dias · **Prioridade:** alta

- [ ] **Zoom óptico:** slider de focal 18–300 mm (usa `LensSpecs` existente) → `verticalFovDeg` já calculado; + **zoom digital** (corta o sensor, simula crop)
- [ ] **Rotação (pan/tilt):** sliders yaw/pitch da câmera ativa + **arrastar na visão de câmera** para girar; girar manual limpa `targetId` (mesma regra da planta baixa); botão "Reenquadrar no alvo"
- [ ] **Foco:** slider `focusDistanceCm` manual (modo MF) ou "autofocus no alvo"; alimenta `computeDof` (near/far/hiperfocal) — os 8 Metrics da `CameraViewSimulator` passam a refletir o foco manual
- [ ] **Bokeh no 3D:** instalar `@react-three/postprocessing` (v2) + `BokehEffect` ligado ao modo MF/foco manual
- [ ] **Exposição:** expor ISO/shutter/ND/já tipados em `CameraSettings` no painel → mapear para `toneMappingExposure` do Canvas (avisar "imagem subexposta/superexposta")
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
| 1 | Assets GLB + guia Blender | 2–3 dias | ⬜ pendente | |
| 2 | Biotipos do apresentador | 2 dias | ⬜ pendente | |
| 3 | Reflexos (Environment map) | 1 dia | ⬜ pendente | |
| 4 | Sombras universais | 0,5–1 dia | ⬜ pendente | |
| 5 | Modo fantasma (WASD) | 1 dia | ⬜ pendente | |
| 6 | Simulador de câmera | 2 dias | ⬜ pendente | |
| 7 | Bancada de Áudio e Vídeo | 2–3 dias | ⬜ pendente | |
| 8 | Testes e validação | 1 dia | ⬜ pendente | |
| | **Total** | **~11–14 dias** | **0/8** | |

**Ordem de execução:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 (cada etapa só inicia após o gate da anterior).

**Progresso geral:** `0 / 8` etapas · `0%`

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
