import { useState } from "react";
import {
  Box,
  Flex,
  Select,
  SimpleGrid,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { useVideoStudio, selectCameras, selectSubjects } from "../store/videoStudioStore";
import {
  computeDof,
  computeFraming,
  horizontalFovDeg,
  makeProjector,
  perspectiveLabel,
  relativeBearingDeg,
  verticalFovDeg,
} from "./cameraMath";
import { buildNativeSelectStyles } from "../selectStyles";
import { formatCm, formatMeters, formatMmAsMeters, formatNumber } from "./format";
import StudioScene3D from "./StudioScene3D";

const FRAME_W = 1600;
const FRAME_H = 900;

function Metric({ label, value }: { label: string; value: string }) {
  const cardBg = useColorModeValue("white", "gray.700");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const muted = useColorModeValue("gray.500", "gray.400");
  return (
    <Box
      bg={cardBg}
      border="1px"
      borderColor={borderColor}
      rounded="lg"
      px={3}
      py={2}
      textAlign="center"
    >
      <Text fontSize="xs" color={muted} textTransform="uppercase" letterSpacing="wide">
        {label}
      </Text>
      <Text fontSize="md" fontWeight="bold" mt={0.5}>
        {value}
      </Text>
    </Box>
  );
}

export default function CameraViewSimulator() {
  const {
    elements,
    activeCameraId,
    setActiveCamera,
    room,
    selectedId,
    select,
  } = useVideoStudio();
  const [subjectId, setSubjectId] = useState<string | null>(null);

  const nativeSelectStyles = useColorModeValue("light", "dark");
  const selectStyles = buildNativeSelectStyles(nativeSelectStyles);

  const cameras = selectCameras(elements);
  const subjects = selectSubjects(elements);

  const wallBg = useColorModeValue("#E2E8F0", "#0F1419");
  const floorBg = useColorModeValue("#CBD5E0", "#1A202C");
  const lineColor = useColorModeValue("#718096", "#A0AEC0");
  const textColor = useColorModeValue("#2D3748", "#E2E8F0");
  const emptyColor = useColorModeValue("gray.500", "gray.400");
  const frameBorderColor = useColorModeValue("gray.200", "gray.600");

  const camera =
    cameras.find((c) => c.id === activeCameraId) ?? cameras[0] ?? null;
  const subject =
    subjects.find((s) => s.id === (subjectId ?? camera?.targetId)) ??
    subjects[0] ??
    null;

  if (!camera || !subject) {
    return (
      <Box p={8} textAlign="center" color={emptyColor}>
        <Text fontWeight="bold" fontSize="lg">
          Simulação da visão da câmera
        </Text>
        <Text mt={2}>
          Adicione ao menos uma câmera e um participante na vista superior
          para ver o enquadramento.
        </Text>
      </Box>
    );
  }

  const framing = computeFraming(camera, subject);
  const projector = makeProjector(camera, subject);
  const bearing = relativeBearingDeg(subject, camera);

  const feetY = projector.yPixOf(0, FRAME_H);
  const headY = projector.yPixOf(subject.heightCm, FRAME_H);
  const horizonY =
    (FRAME_H / 2) *
    (1 +
      Math.tan(projector.aimAngle) /
        Math.tan(projector.vFovRad / 2));

  const personHeightPx = feetY - headY;
  const personCenterX = FRAME_W / 2;

  const slantMm =
    Math.hypot(
      framing.distanceCm,
      Math.abs(subject.heightCm * 0.65 - camera.heightCm)
    ) * 10;
  const dof = computeDof(
    camera.lens.focalLength,
    camera.lens.currentAperture,
    camera.sensor.coc,
    slantMm
  );

  const rulerTicks: number[] = [];
  for (let h = 0; h <= subject.heightCm; h += 25) rulerTicks.push(h);
  if (rulerTicks[rulerTicks.length - 1] !== subject.heightCm) {
    rulerTicks.push(subject.heightCm);
  }

  const inFrame = (y: number) => y > -80 && y < FRAME_H + 80;
  const rulerX = personCenterX - 0.32 * Math.max(personHeightPx, 1);

  return (
    <Flex direction="column" gap={3} h="100%">
      <Flex gap={2} align="center" flexWrap="wrap">
        <Text fontSize="sm" fontWeight="semibold" minW="fit-content">
          Câmera:
        </Text>
        <Select
          size="sm"
          maxW="260px"
          bg={selectStyles.bg}
          color={selectStyles.color}
          borderColor={selectStyles.borderColor}
          iconColor={selectStyles.iconColor}
          _hover={selectStyles._hover}
          _focus={selectStyles._focus}
          _active={selectStyles._active}
          sx={selectStyles.sx}
          value={camera.id}
          onChange={(e) => setActiveCamera(e.target.value)}
        >
          {cameras.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        <Text fontSize="sm" fontWeight="semibold" minW="fit-content">
          Participante:
        </Text>
        <Select
          size="sm"
          maxW="260px"
          bg={selectStyles.bg}
          color={selectStyles.color}
          borderColor={selectStyles.borderColor}
          iconColor={selectStyles.iconColor}
          _hover={selectStyles._hover}
          _focus={selectStyles._focus}
          _active={selectStyles._active}
          sx={selectStyles.sx}
          value={subject.id}
          onChange={(e) => setSubjectId(e.target.value)}
        >
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({formatCm(s.heightCm)})
            </option>
          ))}
        </Select>

        <Text fontSize="sm" fontWeight="semibold" minW="fit-content">
          Objeto:
        </Text>
        <Select
          size="sm"
          maxW="260px"
          aria-label="Objeto"
          bg={selectStyles.bg}
          color={selectStyles.color}
          borderColor={selectStyles.borderColor}
          iconColor={selectStyles.iconColor}
          _hover={selectStyles._hover}
          _focus={selectStyles._focus}
          _active={selectStyles._active}
          sx={selectStyles.sx}
          value={selectedId ?? ""}
          onChange={(e) => select(e.target.value || null)}
        >
          <option value="">— Nenhum —</option>
          {elements.map((el) => (
            <option key={el.id} value={el.id}>
              {el.name}
            </option>
          ))}
        </Select>
      </Flex>

      <Box
        id="studio-camera-view"
        border="1px"
        borderColor={frameBorderColor}
        rounded="lg"
        overflow="hidden"
        position="relative"
        role="img"
        aria-label={`Visão da ${camera.name} — ${framing.framingLabel}, vista ${perspectiveLabel(bearing)}`}
      >
        {/* ── camada de fundo: parede, chão, linha do olho e guias ── */}
        <svg
          id="studio-cam-base"
          viewBox={`0 0 ${FRAME_W} ${FRAME_H}`}
          style={{ width: "100%", height: "auto", display: "block" }}
        >
          <defs>
            <linearGradient id="wallGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={wallBg} />
              <stop offset="100%" stopColor={floorBg} />
            </linearGradient>
          </defs>

          <rect x={0} y={0} width={FRAME_W} height={FRAME_H} fill="url(#wallGrad)" />
          <rect
            x={0}
            y={Math.max(horizonY, 0)}
            width={FRAME_W}
            height={FRAME_H - Math.max(horizonY, 0)}
            fill={floorBg}
            opacity={0.9}
          />

          {/* regra dos terços + área segura */}
          {[1 / 3, 2 / 3].map((f) => (
            <g key={f} stroke={lineColor} strokeWidth={1.5} opacity={0.45}>
              <line x1={FRAME_W * f} y1={0} x2={FRAME_W * f} y2={FRAME_H} />
              <line x1={0} y1={FRAME_H * f} x2={FRAME_W} y2={FRAME_H * f} />
            </g>
          ))}
          <rect
            x={FRAME_W * 0.05}
            y={FRAME_H * 0.05}
            width={FRAME_W * 0.9}
            height={FRAME_H * 0.9}
            fill="none"
            stroke={lineColor}
            strokeWidth={2}
            strokeDasharray="6 8"
            opacity={0.5}
          />
        </svg>

        {/* ── camada 3D: cena completa vista pela câmera ── */}
        <StudioScene3D
          camera={camera}
          aimSubject={subject}
          aimHeightCm={projector.aimHeightCm}
          elements={elements}
          room={room}
        />

        {/* ── camada de overlay: medições e rótulos (sem contorno) ── */}
        <svg
          id="studio-cam-overlay"
          viewBox={`0 0 ${FRAME_W} ${FRAME_H}`}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
          pointerEvents="none"
        >
          {/* linha do olho / nível da câmera */}
          {horizonY > 0 && horizonY < FRAME_H && (
            <g>
              <line
                x1={0}
                y1={horizonY}
                x2={FRAME_W}
                y2={horizonY}
                stroke={lineColor}
                strokeWidth={2}
                strokeDasharray="14 10"
                opacity={0.7}
              />
              <text
                x={FRAME_W - 20}
                y={horizonY - 12}
                textAnchor="end"
                fontSize={24}
                fill={textColor}
              >
                nível da câmera · {formatMeters(camera.heightCm, 2)}
              </text>
            </g>
          )}

          {/* marcadores de altura do participante */}
          {[
            { y: feetY, label: "Pés · 0,00 m" },
            {
              y: headY,
              label: `Topo da cabeça · ${formatMeters(subject.heightCm, 2)}`,
            },
          ].map((m) =>
            inFrame(m.y) ? (
              <g key={m.label}>
                <line
                  x1={0}
                  y1={m.y}
                  x2={FRAME_W}
                  y2={m.y}
                  stroke="#E53E3E"
                  strokeWidth={2}
                  strokeDasharray="10 8"
                  opacity={0.75}
                />
                <text x={24} y={m.y - 12} fontSize={26} fontWeight={700} fill="#E53E3E">
                  {m.label}
                </text>
              </g>
            ) : null
          )}

          {/* régua de altura ao lado do participante */}
          {inFrame(feetY) &&
            inFrame(headY) &&
            (() => {
              const top = Math.max(headY, 0);
              const bottom = Math.min(feetY, FRAME_H);
              return (
                <g>
                  <line
                    x1={rulerX}
                    y1={top}
                    x2={rulerX}
                    y2={bottom}
                    stroke={lineColor}
                    strokeWidth={3}
                  />
                  {rulerTicks.map((h) => {
                    const y = projector.yPixOf(h, FRAME_H);
                    if (y < top - 2 || y > bottom + 2) return null;
                    const isMajor = h % 50 === 0;
                    return (
                      <g key={h}>
                        <line
                          x1={rulerX - (isMajor ? 16 : 8)}
                          y1={y}
                          x2={rulerX}
                          y2={y}
                          stroke={lineColor}
                          strokeWidth={2}
                        />
                        {isMajor && (
                          <text
                            x={rulerX - 24}
                            y={y + 8}
                            textAnchor="end"
                            fontSize={22}
                            fill={textColor}
                          >
                            {formatMeters(h, 2)}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              );
            })()}

          {/* rótulos do enquadramento (texto cru) */}
          <g>
            <text x={24} y={48} fontSize={32} fontWeight={700} fill={textColor}>
              {framing.framingLabel}
            </text>
            <text x={24} y={88} fontSize={24} fontWeight={600} fill={textColor}>
              vista {perspectiveLabel(bearing)} · {formatNumber(bearing, 0, "°")}
            </text>
            <text
              x={FRAME_W - 24}
              y={48}
              fontSize={28}
              fontWeight={600}
              textAnchor="end"
              fill={textColor}
            >
              {camera.lens.focalLength}mm f/{camera.lens.currentAperture}
            </text>
          </g>
        </svg>
      </Box>

      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={2}>
        <Metric label="Distância" value={formatMeters(framing.distanceCm, 2)} />
        <Metric label="Altura do participante" value={formatMeters(subject.heightCm, 2)} />
        <Metric label="Altura da câmera (tripé)" value={formatMeters(camera.heightCm, 2)} />
        <Metric
          label="Altura do quadro"
          value={formatMeters(framing.frameHeightAtSubjectCm, 2)}
        />
        <Metric label="FOV vertical" value={formatNumber(verticalFovDeg(camera), 1, "°")} />
        <Metric label="FOV horizontal" value={formatNumber(horizontalFovDeg(camera), 1, "°")} />
        <Metric
          label="Profundidade de campo"
          value={`${formatMmAsMeters(dof.nearMm)} – ${formatMmAsMeters(dof.farMm)}`}
        />
        <Metric label="Hiperfocal" value={formatMmAsMeters(dof.hyperfocalMm)} />
      </SimpleGrid>
    </Flex>
  );
}
