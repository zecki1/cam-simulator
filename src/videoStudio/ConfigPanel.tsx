import { useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Input,
  Select,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Switch,
  Text,
  useColorModeValue,
  useDisclosure,
} from "@chakra-ui/react";
import { findDependents, useVideoStudio } from "../store/videoStudioStore";
import {
  LIGHT_KIND_LABELS,
  SUBJECT_ROLE_LABELS,
  TRIPOD_LABELS,
  type AcousticPanelElement,
  type BoomMicElement,
  type CameraElement,
  type ChromaKeyElement,
  type ComputerElement,
  type LightElement,
  type LightKind,
  type StudioElement,
  type StudioElementType,
  type SubjectElement,
  type TableElement,
} from "../types/videoStudio";
import { buildNativeSelectStyles } from "../selectStyles";
import CameraAnatomy from "./CameraAnatomy";
import { glbOptionsFor } from "./glbModels";
import {
  applyCameraModel,
  apertureOptionsFor,
  cameraModelById,
  cameraModelOptions,
} from "./cameraModels";
import { exposureInfo, exposureStatusColor } from "./exposure";
import { distanceCm, formatMeters } from "./format";
import { normalizeDeg, rotationToward } from "./cameraMath";

const SENSORS = [
  { name: "35mm (full frame)", width: 36, height: 24, cropFactor: 1, coc: 0.029 },
  { name: "APS-C", width: 23.6, height: 15.6, cropFactor: 1.5, coc: 0.019 },
  { name: "Micro Four Thirds", width: 17.3, height: 13, cropFactor: 2, coc: 0.015 },
  { name: '1"', width: 13.2, height: 8.8, cropFactor: 2.7, coc: 0.011 },
];

const FOCAL_OPTIONS = [8, 14, 18, 24, 28, 35, 50, 85, 105, 135, 200, 300];
const ISO_OPTIONS = [100, 200, 400, 800, 1600, 3200];
const FPS_OPTIONS = [24, 25, 30, 60];
const SHUTTER_OPTIONS = [24, 30, 50, 60, 125];
const MONITOR_OPTIONS = [22, 24, 27, 32];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Flex gap={2} align="center" mb={2}>
      <Text fontSize="sm" w="44%" flexShrink={0} color="inherit">
        {label}
      </Text>
      <Box flexGrow={1}>{children}</Box>
    </Flex>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <Box mb={2}>
      <Flex justify="space-between" align="baseline" mb={1}>
        <Text fontSize="sm">{label}</Text>
        <Text fontSize="sm" fontWeight="bold">
          {display(value)}
        </Text>
      </Flex>
      <Slider
        aria-label={label}
        colorScheme="blue"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
      >
        <SliderTrack>
          <SliderFilledTrack />
        </SliderTrack>
        <SliderThumb />
      </Slider>
    </Box>
  );
}

function SelectField({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: string | number;
  options: { value: string | number; label: string }[];
  onChange: (v: string) => void;
  ariaLabel: string;
}) {
  const colorMode = useColorModeValue("light", "dark");
  const s = buildNativeSelectStyles(colorMode);
  return (
    <Select
      size="sm"
      aria-label={ariaLabel}
      bg={s.bg}
      color={s.color}
      borderColor={s.borderColor}
      iconColor={s.iconColor}
      _hover={s._hover}
      _focus={s._focus}
      _active={s._active}
      sx={s.sx}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}

function NumberMeters({
  valueCm,
  onChange,
  label,
}: {
  valueCm: number;
  onChange: (cm: number) => void;
  label: string;
}) {
  return (
    <Field label={label}>
      <Flex gap={1} align="center">
        <input
          type="number"
          aria-label={label}
          step={0.25}
          value={Number((valueCm / 100).toFixed(2))}
          onChange={(e) => onChange(Number(e.target.value) * 100)}
          style={{
            width: 90,
            padding: "3px 6px",
            borderRadius: 6,
            border: "1px solid var(--chakra-colors-gray-300)",
            background: "transparent",
            color: "inherit",
          }}
        />
        <Text fontSize="sm">m</Text>
      </Flex>
    </Field>
  );
}

const PALETTE: { type: StudioElementType; label: string; kind?: LightKind }[] = [
  { type: "camera", label: "📷 Câmera" },
  { type: "light", label: "💡 Spot", kind: "spot" },
  { type: "light", label: "🔆 Luminária", kind: "luminaria" },
  { type: "light", label: "🎯 Luminária focal", kind: "luminaria_focal" },
  { type: "light", label: "⬜ Softbox", kind: "softbox" },
  { type: "subject", label: "🧑 Participante" },
  { type: "table", label: "🪑 Mesa" },
  { type: "computer", label: "💻 Computador" },
  { type: "acoustic_panel", label: "🔇 Painel acústico" },
  { type: "chromakey", label: "🟩 Chroma key (fundo verde)" },
  { type: "boom_mic", label: "🎙 Boom" },
];

export default function ConfigPanel() {
  const {
    elements,
    selectedId,
    select,
    updateElement,
    removeElement,
    removeElementCascade,
    addElement,
    loadLearningPreset,
    clearAll,
    customPresets,
    saveCustomPreset,
    deleteCustomPreset,
    loadCustomPreset,
    activeCameraId,
    setActiveCamera,
    room,
    setRoom,
    shadowsEnabled,
    shadowsDefaultOn,
    shadowMapSize,
    shadowBudget,
    setShadowsEnabled,
    setShadowsDefaultOn,
    setShadowMapSize,
    setShadowBudget,
  } = useVideoStudio();

  const [presetName, setPresetName] = useState("");
  const [anatomyOpen, setAnatomyOpen] = useState(false);

  function handleSavePreset() {
    saveCustomPreset(presetName);
    setPresetName("");
  }

  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [pendingRemove, setPendingRemove] = useState<{
    id: string;
    name: string;
    deps: string[];
  } | null>(null);

  function handleRemove(el: StudioElement) {
    const deps = findDependents(elements, el.id);
    if (deps.length === 0) {
      removeElement(el.id);
      return;
    }
    setPendingRemove({
      id: el.id,
      name: el.name,
      deps: deps.map((d) => d.name),
    });
    onOpen();
  }

  function confirmRemove() {
    if (pendingRemove) removeElementCascade(pendingRemove.id);
    setPendingRemove(null);
    onClose();
  }

  function cancelRemove() {
    setPendingRemove(null);
    onClose();
  }

  const muted = useColorModeValue("gray.500", "gray.400");
  const sectionBg = useColorModeValue("gray.50", "gray.600");

  const selected = elements.find((el) => el.id === selectedId) ?? null;
  const subjects = elements.filter(
    (el): el is SubjectElement => el.type === "subject"
  );

  function add(type: StudioElementType, kind?: LightKind) {
    addElement(type);
    const id = useVideoStudio.getState().selectedId;
    if (id && type === "light" && kind) {
      updateElement(id, { kind });
    }
  }

  function targetOptions() {
    return subjects.map((s) => ({ value: s.id, label: s.name }));
  }

  /**
   * Rotação exibida no slider: quando o elemento mira num alvo, mostra a
   * rotação equivalente à direção atual da mira (passo de 5°). Assim a
   * primeira tecla pressionada parte do ângulo certo e assume controle
   * manual sem o feixe/frustum pular de direção.
   */
  function displayRotation(el: StudioElement): number {
    if ("targetId" in el && el.targetId) {
      const t = elements.find((x) => x.id === el.targetId);
      if (t) {
        const aim = rotationToward(el.position, t.position);
        return normalizeDeg(Math.round(aim / 5) * 5);
      }
    }
    return el.rotation;
  }

  const elementOptions = elements.map((el) => ({
    value: el.id,
    label: `${el.name} (${el.type})`,
  }));

  function renderEditor(el: StudioElement) {
    const common = (
      <>
        <Field label="Nome">
          <input
            type="text"
            aria-label="Nome"
            value={el.name}
            onChange={(e) => updateElement(el.id, { name: e.target.value })}
            style={{
              width: "100%",
              padding: "4px 8px",
              borderRadius: 6,
              border: "1px solid var(--chakra-colors-gray-300)",
              background: "transparent",
              color: "inherit",
            }}
          />
        </Field>
        <NumberMeters
          label="Posição X"
          valueCm={el.position.x}
          onChange={(x) => updateElement(el.id, { position: { ...el.position, x } })}
        />
        <NumberMeters
          label="Posição Y"
          valueCm={el.position.y}
          onChange={(y) => updateElement(el.id, { position: { ...el.position, y } })}
        />
        <SliderField
          label="Rotação"
          value={displayRotation(el)}
          min={0}
          max={360}
          step={5}
          display={(v) => `${Math.round(v)}°`}
          onChange={(rotation) =>
            updateElement(el.id, {
              rotation,
              // girar assume direção manual: solta o alvo
              ...("targetId" in el && el.targetId ? { targetId: null } : {}),
            })
          }
        />
        {"targetId" in el && el.targetId ? (
          <Text fontSize="xs" color={muted} mt={-1} mb={2}>
            Mirando em alvo — ao girar, a câmera/feixe assume direção manual.
          </Text>
        ) : null}
        <Field label="Modelo 3D">
          <SelectField
            ariaLabel="Modelo 3D (GLB)"
            value={el.glbModelId ?? ""}
            options={[
              { value: "", label: "Procedural (padrão)" },
              ...glbOptionsFor(),
            ]}
            onChange={(glbModelId) =>
              updateElement(el.id, { glbModelId: glbModelId || undefined })
            }
          />
        </Field>
      </>
    );

    switch (el.type) {
      case "subject": {
        const s = el as SubjectElement;
        return (
          <>
            {common}
            <Field label="Função">
              <SelectField
                ariaLabel="Função do participante"
                value={s.role}
                options={Object.entries(SUBJECT_ROLE_LABELS).map(([v, label]) => ({
                  value: v,
                  label,
                }))}
                onChange={(role) =>
                  updateElement(s.id, { role: role as SubjectElement["role"] })
                }
              />
            </Field>
            <Field label="Pose">
              <SelectField
                ariaLabel="Pose do participante"
                value={s.pose ?? "em_pe"}
                options={[
                  { value: "em_pe", label: "Em pé" },
                  { value: "sentado", label: "Sentado" },
                  { value: "andando", label: "Andando" },
                ]}
                onChange={(pose) => updateElement(s.id, { pose: pose as SubjectElement["pose"] })}
              />
            </Field>
            <Field label="Biotipo">
              <SelectField
                ariaLabel="Biotipo do participante"
                value={s.bodyType ?? "normal"}
                options={[
                  { value: "magro", label: "Magro" },
                  { value: "normal", label: "Normal" },
                  { value: "gordo", label: "Gordo" },
                ]}
                onChange={(bodyType) => updateElement(s.id, { bodyType: bodyType as SubjectElement["bodyType"] })}
              />
            </Field>
            <Field label="Cor da camisa">
              <input
                type="color"
                value={s.shirtColor ?? "#2B6CB0"}
                onChange={(e) => updateElement(s.id, { shirtColor: e.target.value })}
                style={{ width: "100%", height: "36px", border: "none", borderRadius: "4px", cursor: "pointer" }}
              />
            </Field>
            <Field label="Expressão">
              <SelectField
                ariaLabel="Expressão facial"
                value={s.expression ?? "neutro"}
                options={[
                  { value: "neutro", label: "Neutro" },
                  { value: "sorrindo", label: "Sorrindo" },
                  { value: "serio", label: "Sério" },
                ]}
                onChange={(expression) => updateElement(s.id, { expression: expression as SubjectElement["expression"] })}
              />
            </Field>
            <Field label="Óculos">
              <SelectField
                ariaLabel="Usa óculos"
                value={s.glasses ? "true" : "false"}
                options={[
                  { value: "false", label: "Não" },
                  { value: "true", label: "Sim" },
                ]}
                onChange={(v) => updateElement(s.id, { glasses: v === "true" })}
              />
            </Field>
            <Field label="Acessórios">
              <Flex flexWrap="wrap" gap={2}>
                <label>
                  <input
                    type="checkbox"
                    checked={s.accessories?.earrings ?? false}
                    onChange={(e) => updateElement(s.id, { accessories: { ...s.accessories, earrings: e.target.checked } })}
                  />
                  <Text ml={1} fontSize="sm">Brincos</Text>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={s.accessories?.watch ?? false}
                    onChange={(e) => updateElement(s.id, { accessories: { ...s.accessories, watch: e.target.checked } })}
                  />
                  <Text ml={1} fontSize="sm">Relógio</Text>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={s.accessories?.necklace ?? false}
                    onChange={(e) => updateElement(s.id, { accessories: { ...s.accessories, necklace: e.target.checked } })}
                  />
                  <Text ml={1} fontSize="sm">Colar</Text>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={s.accessories?.tie ?? false}
                    onChange={(e) => updateElement(s.id, { accessories: { ...s.accessories, tie: e.target.checked } })}
                  />
                  <Text ml={1} fontSize="sm">Gravata</Text>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={s.accessories?.badge ?? false}
                    onChange={(e) => updateElement(s.id, { accessories: { ...s.accessories, badge: e.target.checked } })}
                  />
                  <Text ml={1} fontSize="sm">Crachá</Text>
                </label>
              </Flex>
            </Field>
            <SliderField
              label="Altura do participante"
              value={s.heightCm}
              min={100}
              max={220}
              step={1}
              display={(v) => formatMeters(v, 2)}
              onChange={(heightCm) => updateElement(s.id, { heightCm })}
            />
            <Text fontSize="xs" color={muted}>
              A altura alimenta a simulação de enquadramento e a régua de
              medição na visão da câmera.
            </Text>
          </>
        );
      }

      case "camera": {
        const c = el as CameraElement;
        const target = c.targetId
          ? elements.find((t) => t.id === c.targetId)
          : null;
        const model = cameraModelById(c.modelId);
        const activeLens = model
          ? model.lenses.find((l) => l.label === c.lens.model) ??
            model.lenses[0]
          : null;
        const isoOptions = model ? model.isoOptions : ISO_OPTIONS;
        const fpsOptions = model ? model.fpsOptions : FPS_OPTIONS;
        const apertureOptions = apertureOptionsFor(activeLens);
        const fmt1 = (n: number) => n.toFixed(1).replace(".", ",");
        const expo = exposureInfo(c);
        return (
          <>
            {common}
            <Button
              size="sm"
              variant="outline"
              colorScheme="blue"
              mb={3}
              w="100%"
              onClick={() => setAnatomyOpen(true)}
            >
              🩺 Anatomia da câmera (o que é cada parte)
            </Button>
            <CameraAnatomy
              isOpen={anatomyOpen}
              onClose={() => setAnatomyOpen(false)}
            />
            <Field label="Modelo">
              <SelectField
                ariaLabel="Modelo da câmera"
                value={c.modelId ?? ""}
                options={cameraModelOptions}
                onChange={(modelId) => {
                  const m = cameraModelById(modelId || null);
                  if (!m) {
                    updateElement(c.id, { modelId: undefined });
                    return;
                  }
                  updateElement(c.id, applyCameraModel(c, m));
                }}
              />
            </Field>
            {model && (
              <Text fontSize="xs" color={muted} mt={-1} mb={2}>
                Sensor {model.sensor.name} · {fmt1(model.sensor.width)}×
                {fmt1(model.sensor.height)} mm · crop ×{fmt1(model.sensor.cropFactor)} ·
                CoC {model.sensor.coc} mm
                <br />
                {model.resolution} · {model.codec} · ISO {model.isoOptions[0]}–
                {model.isoOptions[model.isoOptions.length - 1]}
                <br />
                {model.notes}
              </Text>
            )}
            <Field label="Suporte">
              <SelectField
                ariaLabel="Tipo de suporte"
                value={c.tripod}
                options={Object.entries(TRIPOD_LABELS).map(([v, label]) => ({
                  value: v,
                  label,
                }))}
                onChange={(tripod) =>
                  updateElement(c.id, { tripod: tripod as CameraElement["tripod"] })
                }
              />
            </Field>
            <SliderField
              label="Altura do tripé"
              value={c.heightCm}
              min={40}
              max={300}
              step={5}
              display={(v) => formatMeters(v, 2)}
              onChange={(heightCm) => updateElement(c.id, { heightCm })}
            />
            {model && activeLens ? (
              <>
                <Field label="Objetiva">
                  <SelectField
                    ariaLabel="Objetiva"
                    value={activeLens.label}
                    options={model.lenses.map((l) => ({
                      value: l.label,
                      label: l.label,
                    }))}
                    onChange={(label) =>
                      updateElement(c.id, applyCameraModel(c, model, label))
                    }
                  />
                </Field>
                {activeLens.focalMax > activeLens.focalMin ? (
                  <SliderField
                    label="Zoom (focal)"
                    value={Math.min(
                      Math.max(c.lens.focalLength, activeLens.focalMin),
                      activeLens.focalMax
                    )}
                    min={activeLens.focalMin}
                    max={activeLens.focalMax}
                    step={0.5}
                    display={(v) => `${v} mm`}
                    onChange={(focalLength) =>
                      updateElement(c.id, { lens: { ...c.lens, focalLength } })
                    }
                  />
                ) : (
                  <Field label="Focal">
                    <Text fontSize="sm">{c.lens.focalLength} mm (focal fixa)</Text>
                  </Field>
                )}
              </>
            ) : (
              <Field label="Lente (focal)">
                <SelectField
                  ariaLabel="Distância focal"
                  value={c.lens.focalLength}
                  options={FOCAL_OPTIONS.map((f) => ({
                    value: f,
                    label: `${f} mm`,
                  }))}
                  onChange={(f) =>
                    updateElement(c.id, {
                      lens: { ...c.lens, focalLength: Number(f) },
                    })
                  }
                />
              </Field>
            )}
            <Field label="Abertura">
              <SelectField
                ariaLabel="Abertura"
                value={c.lens.currentAperture}
                options={apertureOptions.map((a) => ({
                  value: a,
                  label: `f/${a}`,
                }))}
                onChange={(a) =>
                  updateElement(c.id, {
                    lens: { ...c.lens, currentAperture: Number(a) },
                  })
                }
              />
            </Field>
            {!model && (
              <Field label="Sensor">
                <SelectField
                  ariaLabel="Sensor"
                  value={c.sensor.name}
                  options={SENSORS.map((s) => ({ value: s.name, label: s.name }))}
                  onChange={(name) => {
                    const sensor = SENSORS.find((s) => s.name === name);
                    if (sensor) updateElement(c.id, { sensor });
                  }}
                />
              </Field>
            )}
            <Field label="ISO">
              <SelectField
                ariaLabel="ISO"
                value={c.settings.iso}
                options={isoOptions.map((i) => ({ value: i, label: String(i) }))}
                onChange={(iso) =>
                  updateElement(c.id, {
                    settings: { ...c.settings, iso: Number(iso) },
                  })
                }
              />
            </Field>
            <Field label="Velocidade de obturador">
              <SelectField
                ariaLabel="Velocidade de obturador"
                value={c.settings.shutterSpeed}
                options={SHUTTER_OPTIONS.map((s) => ({
                  value: s,
                  label: `1/${s}`,
                }))}
                onChange={(s) =>
                  updateElement(c.id, {
                    settings: { ...c.settings, shutterSpeed: Number(s) },
                  })
                }
              />
            </Field>
            <Field label="Frame rate">
              <SelectField
                ariaLabel="Frame rate"
                value={c.settings.frameRate ?? 30}
                options={fpsOptions.map((f) => ({ value: f, label: `${f} fps` }))}
                onChange={(f) =>
                  updateElement(c.id, {
                    settings: { ...c.settings, frameRate: Number(f) },
                  })
                }
              />
            </Field>
            <SliderField
              label="Balanço de branco"
              value={c.settings.whiteBalance}
              min={2800}
              max={7500}
              step={100}
              display={(v) => `${v} K`}
              onChange={(whiteBalance) =>
                updateElement(c.id, { settings: { ...c.settings, whiteBalance } })
              }
            />
            <Field label="Filtro ND">
              <SelectField
                ariaLabel="Filtro ND"
                value={c.settings.ndFilter ?? 0}
                options={[
                  { value: 0, label: "— sem ND —" },
                  { value: 1, label: "ND 1 stop" },
                  { value: 2, label: "ND 2 stops" },
                  { value: 3, label: "ND 3 stops" },
                  { value: 4, label: "ND 4 stops" },
                ]}
                onChange={(nd) =>
                  updateElement(c.id, {
                    settings: { ...c.settings, ndFilter: Number(nd) },
                  })
                }
              />
            </Field>
            <Text fontSize="xs" mb={2} color={exposureStatusColor(expo.status)}>
              Exposição: <b>{expo.evLabel}</b> — {expo.description}
            </Text>
            <Field label="Mirar em">
              <SelectField
                ariaLabel="Alvo da câmera"
                value={c.targetId ?? ""}
                options={[{ value: "", label: "— sem alvo —" }, ...targetOptions()]}
                onChange={(targetId) =>
                  updateElement(c.id, { targetId: targetId || null })
                }
              />
            </Field>
            {target && (
              <Text fontSize="sm" color={muted} mb={2}>
                Distância até o alvo:{" "}
                <b>{formatMeters(distanceCm(c.position, target.position), 2)}</b>
              </Text>
            )}
            {c.id !== activeCameraId && (
              <Button size="sm" colorScheme="orange" variant="outline" mb={2} onClick={() => setActiveCamera(c.id)}>
                Usar como câmera da simulação
              </Button>
            )}
          </>
        );
      }

      case "light": {
        const l = el as LightElement;
        const target = l.targetId
          ? elements.find((t) => t.id === l.targetId)
          : null;
        const isDirectional = l.kind === "spot" || l.kind === "luminaria_focal";
        return (
          <>
            {common}
            <Field label="Tipo">
              <SelectField
                ariaLabel="Tipo de luz"
                value={l.kind}
                options={Object.entries(LIGHT_KIND_LABELS).map(([v, label]) => ({
                  value: v,
                  label,
                }))}
                onChange={(kind) =>
                  updateElement(l.id, { kind: kind as LightKind })
                }
              />
            </Field>
            <SliderField
              label="Altura do suporte"
              value={l.heightCm}
              min={50}
              max={300}
              step={5}
              display={(v) => formatMeters(v, 2)}
              onChange={(heightCm) => updateElement(l.id, { heightCm })}
            />
            <SliderField
              label="Intensidade"
              value={l.intensity}
              min={0}
              max={100}
              step={1}
              display={(v) => `${v}%`}
              onChange={(intensity) => updateElement(l.id, { intensity })}
            />
            <SliderField
              label="Potência"
              value={l.powerW}
              min={20}
              max={1000}
              step={10}
              display={(v) => `${v} W`}
              onChange={(powerW) => updateElement(l.id, { powerW })}
            />
            <SliderField
              label="Temperatura de cor"
              value={l.colorTemp}
              min={2700}
              max={6500}
              step={100}
              display={(v) => `${v} K`}
              onChange={(colorTemp) => updateElement(l.id, { colorTemp })}
            />
            {isDirectional && (
              <SliderField
                label="Ângulo do facho"
                value={l.beamAngle}
                min={5}
                max={90}
                step={1}
                display={(v) => `${v}°`}
                onChange={(beamAngle) => updateElement(l.id, { beamAngle })}
              />
            )}
            <Field label="Modificador">
              <SelectField
                ariaLabel="Modificador"
                value={l.modifier}
                options={["nenhum", "softbox", "refletor", "snoot", "barn_doors", "grade", "difusor"].map(
                  (m) => ({ value: m, label: m.replace("_", " ") })
                )}
                onChange={(modifier) =>
                  updateElement(l.id, { modifier: modifier as LightElement["modifier"] })
                }
              />
            </Field>
            <Field label="Iluminar">
              <SelectField
                ariaLabel="Alvo da luz"
                value={l.targetId ?? ""}
                options={[{ value: "", label: "— direção livre —" }, ...targetOptions()]}
                onChange={(targetId) => updateElement(l.id, { targetId: targetId || null })}
              />
            </Field>
            <Flex align="center" gap={2} mb={2}>
              <Switch
                size="sm"
                isChecked={l.castShadow}
                onChange={(e) => updateElement(l.id, { castShadow: e.target.checked })}
              />
              <Text fontSize="sm">Gerar sombras</Text>
            </Flex>
            <Flex align="center" gap={2} mb={2}>
              <Switch
                size="sm"
                isChecked={l.physicalFalloff ?? false}
                onChange={(e) => updateElement(l.id, { physicalFalloff: e.target.checked })}
              />
              <Text fontSize="sm">Queda realista (inverse square)</Text>
            </Flex>
            {target && (
              <Text fontSize="sm" color={muted} mb={2}>
                Distância até o alvo:{" "}
                <b>{formatMeters(distanceCm(l.position, target.position), 2)}</b>
              </Text>
            )}
          </>
        );
      }

      case "table": {
        const t = el as TableElement;
        return (
          <>
            {common}
            <NumberMeters
              label="Largura"
              valueCm={t.widthCm}
              onChange={(widthCm) => updateElement(t.id, { widthCm })}
            />
            <NumberMeters
              label="Profundidade"
              valueCm={t.depthCm}
              onChange={(depthCm) => updateElement(t.id, { depthCm })}
            />
            <SliderField
              label="Altura da mesa"
              value={t.heightCm}
              min={60}
              max={110}
              step={1}
              display={(v) => formatMeters(v, 2)}
              onChange={(heightCm) => updateElement(t.id, { heightCm })}
            />
          </>
        );
      }

      case "computer": {
        const pc = el as ComputerElement;
        return (
          <>
            {common}
            <Field label="Tamanho do monitor">
              <SelectField
                ariaLabel="Tamanho do monitor"
                value={pc.monitorSizeIn}
                options={MONITOR_OPTIONS.map((m) => ({
                  value: m,
                  label: `${m}"`,
                }))}
                onChange={(m) => updateElement(pc.id, { monitorSizeIn: Number(m) })}
              />
            </Field>
          </>
        );
      }

      case "acoustic_panel": {
        const p = el as AcousticPanelElement;
        return (
          <>
            {common}
            <NumberMeters
              label="Largura"
              valueCm={p.widthCm}
              onChange={(widthCm) => updateElement(p.id, { widthCm })}
            />
            <SliderField
              label="Altura do painel"
              value={p.heightCm}
              min={30}
              max={150}
              step={5}
              display={(v) => formatMeters(v, 2)}
              onChange={(heightCm) => updateElement(p.id, { heightCm })}
            />
            <SliderField
              label="Absorção (NRC)"
              value={p.nrc}
              min={0.3}
              max={1}
              step={0.05}
              display={(v) => v.toFixed(2).replace(".", ",")}
              onChange={(nrc) => updateElement(p.id, { nrc })}
            />
          </>
        );
      }

      case "boom_mic": {
        const b = el as BoomMicElement;
        return (
          <>
            {common}
            <SliderField
              label="Altura da haste"
              value={b.heightCm}
              min={100}
              max={300}
              step={5}
              display={(v) => formatMeters(v, 2)}
              onChange={(heightCm) => updateElement(b.id, { heightCm })}
            />
            <SliderField
              label="Alcance do boom"
              value={b.reachCm}
              min={30}
              max={250}
              step={5}
              display={(v) => formatMeters(v, 2)}
              onChange={(reachCm) => updateElement(b.id, { reachCm })}
            />
            <Field label="Apontar para">
              <SelectField
                ariaLabel="Alvo do boom"
                value={b.targetId ?? ""}
                options={[{ value: "", label: "— sem alvo —" }, ...targetOptions()]}
                onChange={(targetId) => updateElement(b.id, { targetId: targetId || null })}
              />
            </Field>
          </>
        );
      }

      case "chromakey": {
        const c = el as ChromaKeyElement;
        return (
          <>
            {common}
            <NumberMeters
              label="Largura"
              valueCm={c.widthCm}
              onChange={(widthCm) => updateElement(c.id, { widthCm })}
            />
            <SliderField
              label="Altura do fundo"
              value={c.heightCm}
              min={120}
              max={400}
              step={5}
              display={(v) => formatMeters(v, 2)}
              onChange={(heightCm) => updateElement(c.id, { heightCm })}
            />
            <Flex align="center" gap={2} mb={2}>
              <Switch
                size="sm"
                isChecked={c.receiveShadows}
                onChange={(e) =>
                  updateElement(c.id, { receiveShadows: e.target.checked })
                }
              />
              <Text fontSize="sm">Receber sombras</Text>
            </Flex>
            <Text fontSize="xs" color={muted}>
              Verde chroma <b>{c.color}</b>. A sombra das luzes suja o fundo
              e atrapalha o key — desligue "Receber sombras" ou ajuste as
              luzes para um fundo limpo.
            </Text>
          </>
        );
      }
    }
  }

  return (
    <Flex direction="column" gap={3} h="100%" overflowY="auto">
      {/* Seletor de elemento da planta (sempre visível) */}
      <Box>
        <Text
          fontSize="xs"
          fontWeight="semibold"
          color={muted}
          textTransform="uppercase"
          letterSpacing="wider"
          mb={2}
        >
          Elemento da planta
        </Text>
        <SelectField
          ariaLabel="Elemento da planta"
          value={selectedId ?? ""}
          options={[
            { value: "", label: "— Selecionar elemento —" },
            ...elementOptions,
          ]}
          onChange={(id) => select(id || null)}
        />
      </Box>

      <Divider />

      {/* Tamanho da sala (planta editável) */}
      <Box>
        <Text
          fontSize="xs"
          fontWeight="semibold"
          color={muted}
          textTransform="uppercase"
          letterSpacing="wider"
          mb={2}
        >
          Sala (planta)
        </Text>
        <Flex direction="column" gap={0}>
          <NumberMeters
            label="Largura"
            valueCm={room.widthCm}
            onChange={(widthCm) => setRoom({ widthCm })}
          />
          <NumberMeters
            label="Profundidade"
            valueCm={room.lengthCm}
            onChange={(lengthCm) => setRoom({ lengthCm })}
          />
          <NumberMeters
            label="Altura"
            valueCm={room.heightCm}
            onChange={(heightCm) => setRoom({ heightCm })}
          />
        </Flex>
        <Text fontSize="xs" color={muted} mt={-1} mb={1}>
          Padrão 7 × 5 m — digite qualquer tamanho (ex.: 2 × 3 m).
        </Text>
      </Box>


      <Divider />

      {/* Configurações de Sombra */}
      <Box>
        <Text
          fontSize="xs"
          fontWeight="semibold"
          color={muted}
          textTransform="uppercase"
          letterSpacing="wider"
          mb={2}
        >
          Sombras
        </Text>
        <Flex direction="column" gap={2}>
          <Flex align="center" gap={2} mb={1}>
            <Switch
              size="sm"
              isChecked={shadowsEnabled}
              onChange={(e) => setShadowsEnabled(e.target.checked)}
            />
            <Text fontSize="sm">Sombras ativadas (global)</Text>
          </Flex>
          <Flex align="center" gap={2} mb={1}>
            <Switch
              size="sm"
              isChecked={shadowsDefaultOn}
              onChange={(e) => setShadowsDefaultOn(e.target.checked)}
            />
            <Text fontSize="sm">Novas luzes com sombra por padrão</Text>
          </Flex>
          <Field label="Resolução do Shadow Map">
            <SelectField
              ariaLabel="Resolução do Shadow Map"
              value={shadowMapSize}
              options={[
                { value: 1024, label: "1024 (mais rápido)" },
                { value: 2048, label: "2048 (padrão, ≤3 luzes)" },
                { value: 4096, label: "4096 (máxima qualidade)" },
              ]}
              onChange={(v) => setShadowMapSize(Number(v))}
            />
          </Field>
          <Field label="Budget de sombras">
            <SelectField
              ariaLabel="Budget de sombras"
              value={shadowBudget}
              options={[
                { value: 4, label: "4 luzes (legado)" },
                { value: 8, label: "8 luzes (padrão)" },
                { value: 12, label: "12 luzes" },
                { value: 16, label: "16 luzes" },
              ]}
              onChange={(v) => setShadowBudget(Number(v))}
            />
          </Field>
        </Flex>
      </Box>

      <Divider />

      {/* Paleta */}
      <Box>
        <Text
          fontSize="xs"
          fontWeight="semibold"
          color={muted}
          textTransform="uppercase"
          letterSpacing="wider"
          mb={2}
        >
          Adicionar ao estúdio
        </Text>
        <Flex wrap="wrap" gap={1.5}>
          {PALETTE.map((item) => (
            <Button
              key={`${item.type}-${item.kind ?? "base"}`}
              size="xs"
              variant="outline"
              colorScheme="blue"
              onClick={() => add(item.type, item.kind)}
            >
              {item.label}
            </Button>
          ))}
        </Flex>
        <Flex gap={1.5} mt={2}>
          <Button size="xs" colorScheme="green" variant="outline" onClick={loadLearningPreset}>
            Preset: estúdio de aprendizagem
          </Button>
          <Button size="xs" colorScheme="red" variant="ghost" onClick={clearAll}>
            Limpar
          </Button>
        </Flex>

        {/* Presets customizados (localStorage) */}
        <Flex gap={1.5} mt={2} align="center">
          <Input
            size="xs"
            placeholder="Nome do preset"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            maxW="150px"
            aria-label="Nome do preset"
          />
          <Button
            size="xs"
            colorScheme="purple"
            variant="outline"
            onClick={handleSavePreset}
            isDisabled={elements.length === 0}
          >
            Salvar preset
          </Button>
        </Flex>
        {customPresets.length > 0 && (
          <Flex direction="column" gap={1} mt={2}>
            {customPresets.map((p) => (
              <Flex key={p.id} gap={1} align="center">
                <Button
                  size="xs"
                  variant="ghost"
                  colorScheme="purple"
                  flex="1"
                  justifyContent="flex-start"
                  onClick={() => loadCustomPreset(p.id)}
                >
                  {p.name}
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  colorScheme="red"
                  aria-label={`Excluir preset ${p.name}`}
                  onClick={() => deleteCustomPreset(p.id)}
                >
                  ✕
                </Button>
              </Flex>
            ))}
          </Flex>
        )}
      </Box>

      <Divider />

      {/* Editor */}
      {selected ? (
        <Box bg={sectionBg} rounded="md" p={3}>
          <Flex justify="space-between" align="center" mb={2}>
            <Badge colorScheme="blue">{selected.type}</Badge>
            <Button
              size="xs"
              colorScheme="red"
              variant="ghost"
              onClick={() => handleRemove(selected)}
            >
              Remover
            </Button>
          </Flex>
          {renderEditor(selected)}
        </Box>
      ) : (
        <Box>
          <Text fontSize="xs" fontWeight="semibold" color={muted} textTransform="uppercase" letterSpacing="wider" mb={2}>
            Elementos ({elements.length})
          </Text>
          <Flex direction="column" gap={1}>
            {elements.map((el) => (
              <Button
                key={el.id}
                size="xs"
                variant="ghost"
                justifyContent="flex-start"
                onClick={() => select(el.id)}
              >
                {el.name}
                {el.type === "subject" && ` · ${formatMeters(el.heightCm, 2)}`}
                {el.type === "camera" && el.id === activeCameraId && " · ativa"}
              </Button>
            ))}
          </Flex>
          <Text fontSize="sm" color={muted} mt={3}>
            Selecione um elemento na planta baixa para editá-lo.
          </Text>
        </Box>
      )}

      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={cancelRemove}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="md" fontWeight="bold">
              Remover “{pendingRemove?.name}”?
            </AlertDialogHeader>
            <AlertDialogBody>
              Este item tem {pendingRemove?.deps.length} dependente(s):{" "}
              <b>{pendingRemove?.deps.join(", ")}</b>. Eles serão removidos
              junto. Câmeras e luzes que miravam nele ficarão sem alvo.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={cancelRemove}>
                Cancelar
              </Button>
              <Button colorScheme="red" onClick={confirmRemove} ml={3}>
                Remover tudo
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Flex>
  );
}
