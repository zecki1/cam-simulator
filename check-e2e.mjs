import { chromium } from "playwright";
import { statSync } from "node:fs";

const BASE = "http://127.0.0.1:5199/cam-simulator/";
const SHOTS = "/tmp/vs-e2e";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});

function assert(cond, msg) {
  if (!cond) {
    console.error("FALHOU:", msg);
    process.exitCode = 1;
    throw new Error(msg);
  }
  console.log("ok:", msg);
}

const deselect = async () => {
  const svgBox = await page.locator("#studio-topo-svg").boundingBox();
  await page.mouse.click(svgBox.x + 8, svgBox.y + 8);
};

await page.goto(BASE, { waitUntil: "networkidle" });
// limpa presets de execuções anteriores para não duplicar nomes
await page.evaluate(() => {
  try {
    localStorage.removeItem("cam-shadow-video-presets");
  } catch {
    /* sem localStorage */
  }
});
await page.reload({ waitUntil: "networkidle" });
await page.getByRole("button", { name: "Estúdio de vídeo" }).click();
await page.waitForSelector("#studio-topo-svg");

// ── 0) Preset padrão: 9 elementos (sem painel/boom/alunos) ──────────
await deselect();
await page.getByText("Elementos (9)").waitFor();
assert(true, "preset padrão tem 9 elementos (apresentador, 4 luzes, mesa, pc, 2 câmeras)");

// ── 0b) Triângulo âncora aponta para a FRETE (rot 180 → -y) ────────
const nose = await page.evaluate(() => {
  const circle = document.querySelector('#studio-topo-svg circle[r="16"]');
  const g = circle.parentElement;
  const path = g.querySelector("path");
  const nums = path.getAttribute("d").match(/-?\d+(\.\d+)?/g).map(Number);
  return {
    cx: Number(circle.getAttribute("cx")),
    cy: Number(circle.getAttribute("cy")),
    tx: nums[2],
    ty: nums[3],
  };
});
assert(
  nose.ty < nose.cy && Math.abs(nose.tx - nose.cx) < Math.abs(nose.ty - nose.cy),
  `triângulo aponta para a frente (-y): tip=(${nose.tx.toFixed(0)}, ${nose.ty.toFixed(0)})`
);

// ── 0c) Select do painel: câmera B — rotação sincroniza com a mira ──
const panelSelect = page.getByLabel("Elemento da planta");
await panelSelect.selectOption({ label: "Câmera B — diagonal (camera)" });
const rotCam = page.getByLabel("Rotação");
const v0 = Number(await rotCam.getAttribute("aria-valuenow"));
assert(v0 >= 40 && v0 <= 50, `rotação da câmera B sincronizada com a mira (${v0}°)`);
const frustum = page.locator('#studio-topo-svg path[d^="M 50 100"]');
const dBefore = await frustum.getAttribute("d");
await rotCam.press("ArrowRight");
const v1 = Number(await rotCam.getAttribute("aria-valuenow"));
const dAfter = await frustum.getAttribute("d");
assert(v1 === v0 + 5, `rotação manual da câmera B (${v0}° → ${v1}°)`);
assert(dBefore !== dAfter, "frustum da câmera girou junto com a rotação");

// ── 0d) Luz: rotação gira o feixe junto ─────────────────────────────
await panelSelect.selectOption({ label: "Key — Spot (light)" });
const rotLight = page.getByLabel("Rotação");
const lv0 = Number(await rotLight.getAttribute("aria-valuenow"));
assert(lv0 === 35, `rotação da Key sincronizada com a mira (${lv0}°)`);
const beam = page.locator('#studio-topo-svg path[d^="M 221 200"]').first();
const bBefore = await beam.getAttribute("d");
await rotLight.press("ArrowRight");
const bAfter = await beam.getAttribute("d");
assert(bBefore !== bAfter, "feixe da Key girou junto com a rotação");

// ── 1) PNG da planta baixa ──────────────────────────────────────────
const dl1 = page.waitForEvent("download");
await page.getByRole("button", { name: "Exportar PNG" }).click();
const download1 = await dl1;
const path1 = `${SHOTS}-planta.png`;
await download1.saveAs(path1);
assert(statSync(path1).size > 10_000, "PNG da planta baixa exportado (>10KB)");

// ── 2) Arrasto na planta baixa ──────────────────────────────────────
const label = page
  .locator("#studio-topo-svg text")
  .filter({ hasText: "Apresentador" })
  .first();
const before = await label.boundingBox();
assert(before, "rótulo do Apresentador encontrado");
// mira no primeiro glifo (o centro do texto pode cair num espaço vazio)
const startX = before.x + 4;
const startY = before.y + before.height / 2;
await page.mouse.move(startX, startY);
await page.mouse.down();
await page.mouse.move(startX + 80, startY + 40, { steps: 8 });
await page.mouse.up();
const after = await label.boundingBox();
const dx = after.x - before.x;
const dy = after.y - before.y;
assert(dx > 30 && dy > 15, `arrasto moveu o elemento (dx=${dx.toFixed(0)}px, dy=${dy.toFixed(0)}px)`);

// ── 3) Rotação 360° pelo slider (seta direita) ──────────────────────
const rotSlider = page.getByLabel("Rotação");
await rotSlider.waitFor();
const rotBefore = Number(await rotSlider.getAttribute("aria-valuenow"));
const handle = page.locator('#studio-topo-svg circle[fill="#3182CE"]').last();
const handleBefore = await handle.boundingBox();
assert(handleBefore, "alça de rotação visível");
for (let i = 0; i < 6; i++) await rotSlider.press("ArrowRight"); // 6 × 5° = 30°
await page.waitForTimeout(150);
const rotAfter = Number(await rotSlider.getAttribute("aria-valuenow"));
const handleAfter = await handle.boundingBox();
const moved = Math.hypot(
  handleAfter.x - handleBefore.x,
  handleAfter.y - handleBefore.y
);
assert(rotAfter > rotBefore, `rotação editada (${rotBefore}° → ${rotAfter}°)`);
assert(moved > 8, `alça de rotação girou (movedeu ${moved.toFixed(1)}px)`);

// ── 4) Preset customizado: salvar → reload → limpar → carregar ──────
await page.getByLabel("Nome do preset").fill("Preset e2e");
await page.getByRole("button", { name: "Salvar preset" }).click();
await page.reload({ waitUntil: "networkidle" });
await page.getByRole("button", { name: "Estúdio de vídeo" }).click();
await page.waitForSelector("#studio-topo-svg");
await page.getByRole("button", { name: "Preset e2e", exact: true }).waitFor();
assert(true, "preset customizado persistiu no reload (localStorage)");

await page.getByRole("button", { name: "Limpar" }).click();
await page.getByText("Elementos (0)").waitFor();
assert(true, "Limpar esvaziou o estúdio");

await page.getByRole("button", { name: "Preset e2e", exact: true }).click();
// carregar seleciona o apresentador (editor aberto) → desseleciona p/ ver a lista
await deselect();
await page.getByText("Elementos (9)").waitFor();
assert(true, "preset recarregou os 9 elementos");

// ── 5) Remoção em cascata (mesa → computador) ───────────────────────
await page.getByRole("button", { name: /Mesa — Estação 1/ }).waitFor();
await page.getByRole("button", { name: /Mesa — Estação 1/ }).click();
await page.getByRole("button", { name: "Remover", exact: true }).click();
await page.getByRole("button", { name: "Remover tudo" }).click();
await deselect();
await page.getByText("Elementos (7)").waitFor();
const pc1 = await page.getByRole("button", { name: /Computador 1/ }).count();
assert(pc1 === 0, "cascata removeu mesa + computador (9 → 7)");

// volta ao preset de aprendizagem para o próximo passo
await page.getByRole("button", { name: /Preset: estúdio de aprendizagem/ }).click();
await deselect();
await page.getByText("Elementos (9)").waitFor();

// ── 6) Visão da câmera: cena 3D + câmera B em perfil ────────────────
await page.getByRole("button", { name: "Visão da câmera" }).click();
await page.waitForSelector("#studio-camera-view canvas");
const canvasInfo = await page
  .locator("#studio-camera-view canvas")
  .evaluate((c) => ({ w: c.width, h: c.height }));
assert(canvasInfo.w > 0 && canvasInfo.h > 0, `canvas WebGL ativo (${canvasInfo.w}×${canvasInfo.h})`);

const camSelect = page.locator("select").first();
await camSelect.selectOption({ label: "Câmera B — diagonal" });
await page.waitForTimeout(400);
const frame = page.locator('[aria-label*="perfil (lado direito)"]');
assert((await frame.count()) >= 1, "câmera B → vista perfil (lado direito)");

// ── 7) Controle de objetos pela visão da câmera ─────────────────────
// 7a) seletor de objeto alterna para a mesa e abre o editor
const objSelect = page.getByLabel("Objeto");
await objSelect.selectOption({ label: "Mesa — Estação 1" });
const rotInCam = page.getByLabel("Rotação");
await rotInCam.waitFor();
assert(await rotInCam.isVisible(), "editor (Rotação) abre na visão da câmera");

// 7b) editar rotação na visão da câmera atualiza o estado ao vivo
const rotVal0 = Number(await rotInCam.getAttribute("aria-valuenow"));
await rotInCam.press("ArrowRight");
await rotInCam.press("ArrowRight");
const rotVal1 = Number(await rotInCam.getAttribute("aria-valuenow"));
assert(rotVal1 > rotVal0, `rotação da mesa editada na visão da câmera (${rotVal0}° → ${rotVal1}°)`);

// 7c) clicar no objeto na cena 3D seleciona ele (apresentador no centro)
const canvasBox = await page.locator("#studio-camera-view canvas").boundingBox();
await page.mouse.click(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
await page.waitForTimeout(300);
const objValue = await objSelect.inputValue();
assert(objValue === "subject-1", `clique na cena 3D selecionou o apresentador (${objValue})`);

await page.screenshot({ path: `${SHOTS}-camera-b.png` });

// ── 8) PNG da visão da câmera ───────────────────────────────────────
const dl2 = page.waitForEvent("download");
await page.getByRole("button", { name: "Exportar PNG" }).click();
const download2 = await dl2;
const path2 = `${SHOTS}-camera.png`;
await download2.saveAs(path2);
assert(statSync(path2).size > 10_000, "PNG da visão da câmera exportado (>10KB)");

// ── 9) mobile smoke ─────────────────────────────────────────────────
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto(BASE, { waitUntil: "networkidle" });
await mobile.getByRole("button", { name: "Estúdio de vídeo" }).click();
await mobile.waitForSelector("#studio-topo-svg");
await mobile.screenshot({ path: `${SHOTS}-mobile.png` });
assert(true, "mobile renderiza a planta baixa");

const relevantErrors = errors.filter((e) => !/favicon/i.test(e));
if (relevantErrors.length) {
  console.error("erros de console:", relevantErrors);
  process.exitCode = 1;
} else {
  console.log("ok: nenhum erro de console");
}

console.log(process.exitCode ? "RESULTADO: FALHAS" : "RESULTADO: TUDO OK");
await browser.close();
