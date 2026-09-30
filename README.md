# Cam Simulator

> Simulador de câmera e estúdio de vídeo para web: profundidade de campo, iluminação com sombras e plantas baixas de estúdio — tudo no navegador, sem backend.

[![Stack](https://img.shields.io/badge/stack-Vite%20%2B%20React%20%2B%20TypeScript-blue)](#stack)
[![Tests](https://img.shields.io/badge/testes-node%3Atest%20%2B%20Playwright-green)](#testes)
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
- Elementos do estúdio: participantes, câmeras (lente/sensor/configurações ISO/shutter/ND), luzes (spot, luminária, softbox, prática), mesa, computadores, painéis acústicos, microfone boom
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
- Testes unitários (store, câmera math, luzes) + teste responsivo com Playwright + suíte E2E manual

---

## O que falta fazer (roadmap v0.2)

Detalhamento completo, critérios de aceite e métricas em **[PLANEJAMENTO.md](./PLANEJAMENTO.md)**.

| # | Etapa | Esforço | Status |
|---|---|---|---|
| 1 | Assets 3D `.glb` (inclui importação de modelos do Blender) | 2–3 dias | ⬜ pendente |
| 2 | Biotipos do apresentador (homem/mulher, sentado, porte, óculos, cor da camisa) | 2 dias | ⬜ pendente |
| 3 | Reflexos realistas (Environment map em óculos/brincos/relógio) | 1 dia | ⬜ pendente |
| 4 | Sombras universais (toda luz projeta sombra, queda com distância) | 0,5–1 dia | ⬜ pendente |
| 5 | Modo perspectiva "fantasma" (WASD + mouse) | 1 dia | ⬜ pendente |
| 6 | Simulador 100% de câmera (zoom, rotação pan/tilt, foco manual + bokeh) | 2 dias | ⬜ pendente |
| 7 | Nova página: **Bancada de Áudio e Vídeo** (patchbay + mesa de vídeo + controle das 2 PTZ) | 2–3 dias | ⬜ pendente |
| 8 | Testes e validação das etapas acima | 1 dia | ⬜ pendente |

**Progresso: 0/8 etapas · 0%**

---

## Stack

| Camada | Tecnologias |
|---|---|
| Build | Vite 5, TypeScript 5 (strict) |
| UI | React 18, Chakra UI 2, framer-motion, react-icons |
| 3D | three.js 0.169, @react-three/fiber 8 |
| Estado | Zustand 5 (persistência em `localStorage`) |
| Testes | `node:test` (via `tsx`), Playwright |
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
├── vite.config.ts           # base: /cam-simulator/
└── src/
    ├── App.tsx              # Shell: abas "dof" | "studio" (+ futuro "av")
    ├── PhotographyGraphic.tsx  # Gráfico SVG da profundidade de campo
    ├── selectStyles.ts      # Estilos de <select> para tema claro/escuro
    ├── assets/              # Imagens de lentes
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
        ├── cameraMath.ts         # FOV, enquadramento, DoF, hiperfocal (matemática pura)
        ├── lighting.ts           # Kelvin→RGB, intensidade, mira da luz
        ├── exportImage.ts        # Exportar PNG
        ├── format.ts             # Formatação de números
        └── logic.test.tsx        # Testes do store/câmera/luzes
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

## Créditos

Baseado no [Depth Of Field Simulator](https://github.com/jherr/cam-shadow-simulator) de **Jack Herrington (jherr)** — a aba de profundidade de campo origina daquele projeto. O restante (estúdio de vídeo, luzes/sombras, câmeras PTZ, plantas baixas) é desenvolvimento deste repositório.
