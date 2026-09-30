import { useRef } from "react";
import { useColorModeValue } from "@chakra-ui/react";
import { useVideoStudio } from "../store/videoStudioStore";
import type {
  AcousticPanelElement,
  CameraElement,
  ChromaKeyElement,
  LightElement,
  StudioElement,
  TableElement,
} from "../types/videoStudio";
import { distanceCm, formatMeters } from "./format";
import { horizontalFovDeg } from "./cameraMath";

const DEG = Math.PI / 180;

/** Retorna o bounding box 2D (em cm, planta) de um elemento. */
function getElementBounds(el: StudioElement): { minX: number; maxX: number; minY: number; maxY: number } {
  const { position } = el;
  let halfW = 25; // default radius for unknown elements
  let halfD = 25;

  switch (el.type) {
    case "subject": {
      halfW = 30;
      halfD = 30;
      break;
    }
    case "camera": {
      halfW = 40;
      halfD = 40;
      break;
    }
    case "light": {
      halfW = 30;
      halfD = 30;
      break;
    }
    case "table": {
      const t = el as TableElement;
      halfW = t.widthCm / 2;
      halfD = t.depthCm / 2;
      break;
    }
    case "computer": {
      halfW = 40;
      halfD = 50;
      break;
    }
    case "acoustic_panel": {
      const p = el as AcousticPanelElement;
      halfW = p.widthCm / 2;
      halfD = 30; // profundidade padrão do painel
      break;
    }
    case "chromakey": {
      const ck = el as ChromaKeyElement;
      halfW = ck.widthCm / 2;
      halfD = 30; // profundidade do fundo
      break;
    }
    case "boom_mic": {
      halfW = 30;
      halfD = 30;
      break;
    }
    default: {
      halfW = 30;
      halfD = 30;
    }
  }

  // Se snapToGrid estiver ativo, arredondar para grade
  // (o drag já faz isso, mas mantemos consistência)
  return {
    minX: position.x - halfW,
    maxX: position.x + halfW,
    minY: position.y - halfD,
    maxY: position.y + halfD,
  };
}

/** Verifica se dois elementos colidem (sobreposição de bounding boxes). */
function elementsCollide(a: StudioElement, b: StudioElement, margin = 5): boolean {
  const ba = getElementBounds(a);
  const bb = getElementBounds(b);
  return !(
    ba.maxX + margin <= bb.minX ||
    bb.maxX + margin <= ba.minX ||
    ba.maxY + margin <= bb.minY ||
    bb.maxY + margin <= ba.minY
  );
}

function headingOf(el: StudioElement, target?: { x: number; y: number }) {
  if (target) {
    return Math.atan2(target.y - el.position.y, target.x - el.position.x);
  }
  return Math.PI / 2 - el.rotation * DEG;
}

function FlippedLabel({
  x,
  y,
  children,
  fill,
  fontSize = 14,
  anchor = "middle",
  weight = 600,
}: {
  x: number;
  y: number;
  children: React.ReactNode;
  fill: string;
  fontSize?: number;
  anchor?: "start" | "middle" | "end";
  weight?: number;
}) {
  return (
    <text
      transform={`translate(${x} ${y}) scale(1 -1)`}
      fill={fill}
      fontSize={fontSize}
      fontWeight={weight}
      textAnchor={anchor}
    >
      {children}
    </text>
  );
}

function ElementShape({
  el,
  selected,
  activeCamera,
}: {
  el: StudioElement;
  selected: boolean;
  activeCamera: boolean;
}) {
  const outline = selected
    ? "#3182CE"
    : activeCamera
    ? "#DD6B20"
    : undefined;

  switch (el.type) {
    case "subject": {
      const dir = headingOf(el);
      const r = 16;
      const nose = 30;
      return (
        <g>
          <circle
            cx={el.position.x}
            cy={el.position.y}
            r={r}
            fill="#4A5568"
            stroke={outline ?? "#2D3748"}
            strokeWidth={outline ? 4 : 1.5}
          />
          {/* triânculo âncora: aponta para a FRETE do participante */}
          <path
            d={`M ${el.position.x + Math.cos(dir - 0.4) * r} ${
              el.position.y + Math.sin(dir - 0.4) * r
            } L ${el.position.x + Math.cos(dir) * nose} ${
              el.position.y + Math.sin(dir) * nose
            } L ${el.position.x + Math.cos(dir + 0.4) * r} ${
              el.position.y + Math.sin(dir + 0.4) * r
            } Z`}
            fill={outline ?? "#2D3748"}
          />
        </g>
      );
    }

    case "camera": {
      // corpo da câmera alinhado à direção da mira (alvo ou rotação)
      const aimDir =
        headingOf(el, targetPositionOf(el)) * (180 / Math.PI);
      return (
        <g>
          {/* pernas do tripé */}
          {[0, 120, 240].map((a) => (
            <line
              key={a}
              x1={el.position.x}
              y1={el.position.y}
              x2={el.position.x + Math.cos(a * DEG) * 26}
              y2={el.position.y + Math.sin(a * DEG) * 26}
              stroke="#718096"
              strokeWidth={3}
            />
          ))}
          <circle
            cx={el.position.x}
            cy={el.position.y}
            r={14}
            fill={activeCamera ? "#DD6B20" : "#4A5568"}
            stroke={outline ?? "#2D3748"}
            strokeWidth={outline ? 4 : 1.5}
          />
          <rect
            x={el.position.x - 16}
            y={el.position.y - 10}
            width={32}
            height={20}
            rx={4}
            fill="#2D3748"
            transform={`rotate(${aimDir} ${el.position.x} ${el.position.y})`}
          />
        </g>
      );
    }

    case "light": {
      const el2 = el as LightElement;
      const target = targetPositionOf(el2);
      const dir = headingOf(el2, target);
      return (
        <g>
          <circle
            cx={el2.position.x}
            cy={el2.position.y}
            r={14}
            fill="#F6E05E"
            stroke={outline ?? "#D69E2E"}
            strokeWidth={outline ? 4 : 1.5}
          />
          <path
            d={`M ${el2.position.x} ${el2.position.y} L ${
              el2.position.x + Math.cos(dir) * 24
            } ${el2.position.y + Math.sin(dir) * 24}`}
            stroke="#975A16"
            strokeWidth={4}
            strokeLinecap="round"
          />
        </g>
      );
    }

    case "table": {
      const el2 = el as Extract<StudioElement, { type: "table" }>;
      return (
        <g>
          <rect
            x={el2.position.x - el2.widthCm / 2}
            y={el2.position.y - el2.depthCm / 2}
            width={el2.widthCm}
            height={el2.depthCm}
            rx={6}
            fill="#C4A484"
            stroke={outline ?? "#8B7355"}
            strokeWidth={outline ? 4 : 1.5}
            transform={`rotate(${-el2.rotation} ${el2.position.x} ${el2.position.y})`}
          />
        </g>
      );
    }

    case "computer": {
      const el2 = el as Extract<StudioElement, { type: "computer" }>;
      const w = el2.monitorSizeIn * 2.4;
      return (
        <g>
          <rect
            x={el2.position.x - w / 2}
            y={el2.position.y - 14}
            width={w}
            height={28}
            rx={3}
            fill="#2D3748"
            stroke={outline ?? "#1A202C"}
            strokeWidth={outline ? 4 : 1}
            transform={`rotate(${-el2.rotation} ${el2.position.x} ${el2.position.y})`}
          />
        </g>
      );
    }

    case "acoustic_panel": {
      const el2 = el as Extract<StudioElement, { type: "acoustic_panel" }>;
      return (
        <g>
          <rect
            x={el2.position.x - el2.widthCm / 2}
            y={el2.position.y - 5}
            width={el2.widthCm}
            height={10}
            rx={4}
            fill="#9F7AEA"
            stroke={outline ?? "#6B46C1"}
            strokeWidth={outline ? 4 : 1.5}
            transform={`rotate(${-el2.rotation} ${el2.position.x} ${el2.position.y})`}
          />
        </g>
      );
    }

    case "chromakey": {
      const el2 = el as Extract<StudioElement, { type: "chromakey" }>;
      return (
        <g>
          <rect
            x={el2.position.x - el2.widthCm / 2}
            y={el2.position.y - 6}
            width={el2.widthCm}
            height={12}
            rx={4}
            fill={el2.color}
            stroke={outline ?? "#00752A"}
            strokeWidth={outline ? 4 : 1.5}
            transform={`rotate(${-el2.rotation} ${el2.position.x} ${el2.position.y})`}
          />
        </g>
      );
    }

    case "boom_mic": {
      const el2 = el as Extract<StudioElement, { type: "boom_mic" }>;
      const target = targetPositionOf(el2);
      const dir = headingOf(el2, target);
      const end = {
        x: el2.position.x + Math.cos(dir) * el2.reachCm,
        y: el2.position.y + Math.sin(dir) * el2.reachCm,
      };
      return (
        <g>
          <line
            x1={el2.position.x}
            y1={el2.position.y}
            x2={end.x}
            y2={end.y}
            stroke="#718096"
            strokeWidth={3}
          />
          <circle
            cx={end.x}
            cy={end.y}
            r={7}
            fill="#2D3748"
            stroke={outline ?? "#1A202C"}
            strokeWidth={outline ? 4 : 1}
          />
          <circle
            cx={el2.position.x}
            cy={el2.position.y}
            r={8}
            fill="#A0AEC0"
            stroke={outline ?? "#718096"}
            strokeWidth={outline ? 4 : 1}
          />
        </g>
      );
    }
  }
}

function labelOffsetFor(el: StudioElement) {
  switch (el.type) {
    case "subject":
      return 38;
    case "camera":
      return 40;
    case "light":
      return 34;
    case "table":
      return (el.depthCm ?? 80) / 2 + 16;
    case "computer":
      return 30;
    case "acoustic_panel":
      return 24;
    case "chromakey":
      return 24;
    case "boom_mic":
      return 30;
  }
}

function targetPositionOf(
  el: CameraElement | LightElement | Extract<StudioElement, { type: "boom_mic" }>
): { x: number; y: number } | undefined {
  if (!el.targetId) return undefined;
  const store = useVideoStudio.getState();
  const target = store.elements.find((t) => t.id === el.targetId);
  return target?.position;
}

export default function StudioTopView() {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const rotateRef = useRef<string | null>(null);

  const {
    room,
    elements,
    selectedId,
    activeCameraId,
    showGrid,
    showDistances,
    showBeams,
    snapToGrid,
    gridSizeCm,
    select,
    updateElement,
  } = useVideoStudio();

  const floorColor = useColorModeValue("#F7FAFC", "#1A202C");
  const wallColor = useColorModeValue("#4A5568", "#A0AEC0");
  const textColor = useColorModeValue("#2D3748", "#E2E8F0");
  const gridMinor = useColorModeValue("#E2E8F0", "#2D3748");
  const gridMajor = useColorModeValue("#CBD5E0", "#4A5568");

  const margin = 55;
  const vbW = room.widthCm + margin * 2;
  const vbH = room.lengthCm + margin * 2;

  function clientToSvg(e: React.PointerEvent) {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    // Converte do espaço raiz do SVG (y para baixo) para o espaço de
    // dados do estúdio (origem = canto inferior esquerdo, y para cima).
    return { x: p.x, y: room.lengthCm - p.y };
  }

  function onElementPointerDown(
    e: React.PointerEvent,
    el: StudioElement
  ) {
    e.stopPropagation();
    select(el.id);
    if (el.locked || !el.visible) return;
    const p = clientToSvg(e);
    dragRef.current = {
      id: el.id,
      dx: p.x - el.position.x,
      dy: p.y - el.position.y,
    };
    svgRef.current?.setPointerCapture(e.pointerId);
  }

  function onRotatePointerDown(e: React.PointerEvent, el: StudioElement) {
    e.stopPropagation();
    select(el.id);
    if (el.locked || !el.visible) return;
    rotateRef.current = el.id;
    svgRef.current?.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    // rotação 360° pela alça azul
    const rotatingId = rotateRef.current;
    if (rotatingId) {
      const el = elements.find((t) => t.id === rotatingId);
      if (el) {
        const p = clientToSvg(e);
        const dx = p.x - el.position.x;
        const dy = p.y - el.position.y;
        if (Math.hypot(dx, dy) > 5) {
          const headingDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
          let rotation = (90 - headingDeg) % 360;
          if (rotation < 0) rotation += 360;
          if (snapToGrid) rotation = Math.round(rotation / 5) * 5;
          // girar assume direção manual: solta o alvo (câmera/luz/boom)
          const patch: Record<string, unknown> = { rotation };
          if ("targetId" in el && el.targetId) patch.targetId = null;
          updateElement(el.id, patch);
        }
      }
      return;
    }

    const drag = dragRef.current;
    if (!drag) return;
    const p = clientToSvg(e);
    let x = p.x - drag.dx;
    let y = p.y - drag.dy;
    if (snapToGrid) {
      x = Math.round(x / gridSizeCm) * gridSizeCm;
      y = Math.round(y / gridSizeCm) * gridSizeCm;
    }
    // Clamp aos limites da sala
    x = Math.min(Math.max(x, 0), room.widthCm);
    y = Math.min(Math.max(y, 0), room.lengthCm);

    // Verificar colisão com outros elementos (exceto o próprio)
    const movingEl = elements.find((el) => el.id === drag.id);
    if (movingEl) {
      const proposedEl = { ...movingEl, position: { x, y } };
      const hasCollision = elements.some(
        (other) => other.id !== drag.id && elementsCollide(proposedEl, other, 5)
      );
      if (hasCollision) {
        // Não move se colidir — apenas ignora este frame
        return;
      }
    }

    updateElement(drag.id, { position: { x, y } });
  }

  function onPointerUp(e: React.PointerEvent) {
    dragRef.current = null;
    rotateRef.current = null;
    svgRef.current?.releasePointerCapture?.(e.pointerId);
  }

  const majors: number[] = [];
  for (let m = 0; m * 100 <= room.widthCm; m++) majors.push(m * 100);

  const majorsY: number[] = [];
  for (let m = 0; m * 100 <= room.lengthCm; m++) majorsY.push(m * 100);

  const lights = elements.filter(
    (el): el is LightElement => el.type === "light"
  );
  const cameras = elements.filter(
    (el): el is CameraElement => el.type === "camera"
  );

  const lightColorOf = (light: LightElement) => {
    const alpha = (light.intensity / 100) * 0.35;
    const hue =
      light.kind === "pratica"
        ? "255, 214, 120"
        : light.colorTemp < 4000
        ? "255, 190, 110"
        : "255, 236, 170";
    return `rgba(${hue}, ${alpha})`;
  };

  return (
    <svg
      ref={svgRef}
      id="studio-topo-svg"
      viewBox={`${-margin} ${-margin} ${vbW} ${vbH}`}
      style={{ width: "100%", height: "100%", touchAction: "none" }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerDown={() => select(null)}
      role="img"
      aria-label="Planta baixa do estúdio"
    >
      <defs>
        <clipPath id="room-clip">
          <rect x={0} y={0} width={room.widthCm} height={room.lengthCm} />
        </clipPath>
      </defs>

      {/* grupo com eixo Y invertido (origem = canto inferior esquerdo) */}
      <g transform={`translate(0 ${room.lengthCm}) scale(1 -1)`}>
        <rect
          x={0}
          y={0}
          width={room.widthCm}
          height={room.lengthCm}
          fill={floorColor}
          stroke={wallColor}
          strokeWidth={6}
        />

        {showGrid && (
          <g>
            {Array.from(
              { length: Math.floor(room.widthCm / gridSizeCm) + 1 },
              (_, i) => i * gridSizeCm
            ).map((x) => (
              <line
                key={`vx-${x}`}
                x1={x}
                y1={0}
                x2={x}
                y2={room.lengthCm}
                stroke={x % 100 === 0 ? gridMajor : gridMinor}
                strokeWidth={x % 100 === 0 ? 1.5 : 0.8}
              />
            ))}
            {Array.from(
              { length: Math.floor(room.lengthCm / gridSizeCm) + 1 },
              (_, i) => i * gridSizeCm
            ).map((y) => (
              <line
                key={`hz-${y}`}
                x1={0}
                y1={y}
                x2={room.widthCm}
                y2={y}
                stroke={y % 100 === 0 ? gridMajor : gridMinor}
                strokeWidth={y % 100 === 0 ? 1.5 : 0.8}
              />
            ))}
          </g>
        )}

        <g clipPath="url(#room-clip)">
          {/* raios de luz */}
          {showBeams &&
            lights.map((light) => {
              const target = targetPositionOf(light);
              const dir = headingOf(light, target);
              const half = (light.beamAngle / 2) * DEG;
              const range = 1400;
              const p1 = {
                x: light.position.x + Math.cos(dir - half) * range,
                y: light.position.y + Math.sin(dir - half) * range,
              };
              const p2 = {
                x: light.position.x + Math.cos(dir + half) * range,
                y: light.position.y + Math.sin(dir + half) * range,
              };
              return (
                <path
                  key={`beam-${light.id}`}
                  d={`M ${light.position.x} ${light.position.y} L ${p1.x} ${p1.y} L ${p2.x} ${p2.y} Z`}
                  fill={lightColorOf(light)}
                  pointerEvents="none"
                />
              );
            })}

          {/* frustum das câmeras */}
          {cameras.map((cam) => {
            const target = targetPositionOf(cam);
            const dir = headingOf(cam, target);
            const half = (horizontalFovDeg(cam) / 2) * DEG;
            const range = 2000;
            const p1 = {
              x: cam.position.x + Math.cos(dir - half) * range,
              y: cam.position.y + Math.sin(dir - half) * range,
            };
            const p2 = {
              x: cam.position.x + Math.cos(dir + half) * range,
              y: cam.position.y + Math.sin(dir + half) * range,
            };
            const active = cam.id === activeCameraId;
            return (
              <path
                key={`frustum-${cam.id}`}
                d={`M ${cam.position.x} ${cam.position.y} L ${p1.x} ${p1.y} L ${p2.x} ${p2.y} Z`}
                fill={active ? "rgba(221, 107, 32, 0.12)" : "rgba(49, 130, 206, 0.10)"}
                stroke={active ? "#DD6B20" : "#3182CE"}
                strokeWidth={1.5}
                strokeDasharray="8 6"
                pointerEvents="none"
              />
            );
          })}

          {/* linhas de distância em metros */}
          {showDistances &&
            [...cameras, ...lights].map((el) => {
              const target = targetPositionOf(el as CameraElement);
              if (!target) return null;
              const dist = distanceCm(el.position, target);
              const mx = (el.position.x + target.x) / 2;
              const my = (el.position.y + target.y) / 2;
              return (
                <g key={`dist-${el.id}`} pointerEvents="none">
                  <line
                    x1={el.position.x}
                    y1={el.position.y}
                    x2={target.x}
                    y2={target.y}
                    stroke="#E53E3E"
                    strokeWidth={2}
                    strokeDasharray="10 8"
                    opacity={0.8}
                  />
                  <FlippedLabel
                    x={mx}
                    y={my + 14}
                    fill="#E53E3E"
                    fontSize={16}
                  >
                    {formatMeters(dist, 2)}
                  </FlippedLabel>
                </g>
              );
            })}
        </g>

        {/* elementos */}
        {elements.map((el) => {
          if (!el.visible) return null;
          return (
            <g
              key={el.id}
              onPointerDown={(e) => onElementPointerDown(e, el)}
              style={{ cursor: el.locked ? "not-allowed" : "grab" }}
            >
              <ElementShape
                el={el}
                selected={el.id === selectedId}
                activeCamera={el.id === activeCameraId}
              />
            </g>
          );
        })}

        {/* rótulos acima das formas (nunca cobertos por retângulos/mesas) */}
        {elements.map((el) => {
          if (!el.visible) return null;
          const selected = el.id === selectedId;
          const active = el.id === activeCameraId;
          return (
            <g
              key={`label-${el.id}`}
              onPointerDown={(e) => onElementPointerDown(e, el)}
              style={{ cursor: el.locked ? "not-allowed" : "grab" }}
            >
              <FlippedLabel
                x={el.position.x}
                y={el.position.y + labelOffsetFor(el)}
                fill={selected ? "#3182CE" : active ? "#DD6B20" : textColor}
                fontSize={13}
              >
                {el.name}
                {el.type === "subject"
                  ? ` · ${formatMeters(el.heightCm, 2)}`
                  : ""}
              </FlippedLabel>
            </g>
          );
        })}

        {/* alça de rotação 360° do elemento selecionado */}
        {(() => {
          const el = elements.find((t) => t.id === selectedId);
          if (!el || el.locked || !el.visible) return null;
          // direção da mira: alvo quando existe, senão a rotação
          const dir = headingOf(
            el,
            "targetId" in el ? targetPositionOf(el as CameraElement) : undefined
          );
          const r =
            el.type === "table"
              ? Math.max(el.widthCm, el.depthCm) / 2 + 30
              : el.type === "acoustic_panel"
              ? el.widthCm / 2 + 30
              : 52;
          const hx = el.position.x + Math.cos(dir) * r;
          const hy = el.position.y + Math.sin(dir) * r;
          return (
            <g>
              <line
                x1={el.position.x}
                y1={el.position.y}
                x2={hx}
                y2={hy}
                stroke="#3182CE"
                strokeWidth={2}
                strokeDasharray="6 5"
                pointerEvents="none"
              />
              <circle
                cx={hx}
                cy={hy}
                r={10}
                fill="#3182CE"
                stroke="#FFFFFF"
                strokeWidth={2.5}
                style={{ cursor: "grab" }}
                onPointerDown={(e) => onRotatePointerDown(e, el)}
              />
            </g>
          );
        })()}

        {/* réguas em metros (fora da sala) */}
        <g pointerEvents="none">
          {majors.map((x) => (
            <FlippedLabel
              key={`mx-${x}`}
              x={x}
              y={-14}
              fill={textColor}
              fontSize={15}
              weight={500}
            >
              {x / 100} m
            </FlippedLabel>
          ))}
          {majorsY.map((y) => (
            <FlippedLabel
              key={`my-${y}`}
              x={-14}
              y={y}
              fill={textColor}
              fontSize={15}
              anchor="end"
              weight={500}
            >
              {y / 100} m
            </FlippedLabel>
          ))}
        </g>
      </g>
    </svg>
  );
}
