const SCALE = 2;

interface SvgWithUrl {
  img: HTMLImageElement;
  url: string;
}

async function svgToImage(source: SVGSVGElement): Promise<SvgWithUrl> {
  const clone = source.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  try {
    const fontFamily = getComputedStyle(source).fontFamily;
    if (fontFamily) clone.setAttribute("font-family", fontFamily);
  } catch {
    // sem suporte a getComputedStyle — mantém fonte padrão
  }
  const xml = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(
    new Blob([xml], { type: "image/svg+xml;charset=utf-8" })
  );
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Não foi possível rasterizar o SVG."));
    img.src = url;
  });
  return { img, url };
}

function viewBoxOf(svg: SVGSVGElement): { w: number; h: number } {
  const vb = (svg.getAttribute("viewBox") ?? "").trim().split(/[\s,]+/);
  const w = Number(vb[2]);
  const h = Number(vb[3]);
  if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
    return { w, h };
  }
  const rect = svg.getBoundingClientRect();
  return { w: rect.width || 1200, h: rect.height || 800 };
}

function download(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, "image/png");
}

function stamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
    d.getHours()
  )}${pad(d.getMinutes())}`;
}

/** Exporta a planta baixa (vista superior) como PNG. */
export async function exportTopViewPng(): Promise<void> {
  const svg = document.getElementById("studio-topo-svg") as SVGSVGElement | null;
  if (!svg) throw new Error("Vista superior não encontrada.");

  const { w, h } = viewBoxOf(svg);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * SCALE);
  canvas.height = Math.round(h * SCALE);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponível.");

  const { img, url } = await svgToImage(svg);
  try {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  } finally {
    URL.revokeObjectURL(url);
  }
  download(canvas, `estudio-planta-${stamp()}.png`);
}

/** Exporta a visão da câmera (fundo + cena 3D + medições) como PNG. */
export async function exportCameraViewPng(): Promise<void> {
  const container = document.getElementById("studio-camera-view");
  if (!container) throw new Error("Visão da câmera não encontrada.");

  const rect = container.getBoundingClientRect();
  const W = Math.max(Math.round(rect.width * SCALE), 320);
  const H = Math.max(Math.round(rect.height * SCALE), 180);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponível.");

  // 1) fundo (parede, chão e guias)
  const base = container.querySelector("#studio-cam-base") as SVGSVGElement | null;
  if (base) {
    const { img, url } = await svgToImage(base);
    try {
      ctx.drawImage(img, 0, 0, W, H);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  // 2) cena 3D (WebGL com preserveDrawingBuffer)
  const gl = container.querySelector("canvas") as HTMLCanvasElement | null;
  if (gl) {
    ctx.drawImage(gl, 0, 0, W, H);
  }

  // 3) overlay de medições e rótulos
  const overlay = container.querySelector(
    "#studio-cam-overlay"
  ) as SVGSVGElement | null;
  if (overlay) {
    const { img, url } = await svgToImage(overlay);
    try {
      ctx.drawImage(img, 0, 0, W, H);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  download(canvas, `estudio-camera-${stamp()}.png`);
}
