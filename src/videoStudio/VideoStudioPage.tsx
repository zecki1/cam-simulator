import {
  Box,
  Button,
  Flex,
  Text,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import StudioTopView from "./StudioTopView";
import CameraViewSimulator from "./CameraViewSimulator";
import ConfigPanel from "./ConfigPanel";
import { useVideoStudio, type ToggleFlag } from "../store/videoStudioStore";
import { exportCameraViewPng, exportTopViewPng } from "./exportImage";

const TOGGLES: { flag: ToggleFlag; label: string }[] = [
  { flag: "showGrid", label: "Grade" },
  { flag: "showDistances", label: "Distâncias (m)" },
  { flag: "showBeams", label: "Feixes de luz" },
  { flag: "snapToGrid", label: "Encaixe na grade" },
];

export default function VideoStudioPage() {
  const { view, setView, toggle, showGrid, showDistances, showBeams, snapToGrid } =
    useVideoStudio();

  const borderColor = useColorModeValue("gray.200", "gray.600");
  const muted = useColorModeValue("gray.500", "gray.400");
  const barBg = useColorModeValue("white", "gray.800");
  const toast = useToast();

  async function handleExportPng() {
    try {
      if (view === "topo") {
        await exportTopViewPng();
      } else {
        await exportCameraViewPng();
      }
    } catch (err) {
      toast({
        title: "Falha ao exportar PNG",
        description: err instanceof Error ? err.message : String(err),
        status: "error",
        duration: 4000,
      });
    }
  }

  const flagValue: Record<ToggleFlag, boolean> = {
    showGrid,
    showDistances,
    showBeams,
    snapToGrid,
  };

  return (
    <Flex direction="column" h="calc(100vh - 41px)" minH="520px">
      {/* Barra de ferramentas */}
      <Flex
        gap={2}
        align="center"
        flexWrap="wrap"
        px={4}
        py={2}
        borderBottom="1px"
        borderColor={borderColor}
        bg={barBg}
      >
        <Text fontWeight="bold" fontSize="sm" mr={2}>
          Estúdio de vídeo
        </Text>

        <Button
          size="sm"
          variant={view === "topo" ? "solid" : "outline"}
          colorScheme="blue"
          onClick={() => setView("topo")}
        >
          Planta baixa
        </Button>
        <Button
          size="sm"
          variant={view === "camera" ? "solid" : "outline"}
          colorScheme="blue"
          onClick={() => setView("camera")}
        >
          Visão da câmera
        </Button>

        <Box w="1px" h="6" bg={borderColor} mx={1} />

        {TOGGLES.map((t) => (
          <Button
            key={t.flag}
            size="sm"
            variant="ghost"
            colorScheme={flagValue[t.flag] ? "teal" : "gray"}
            isActive={flagValue[t.flag]}
            onClick={() => toggle(t.flag)}
          >
            {t.label}
          </Button>
        ))}

        <Text fontSize="xs" color={muted} ml="auto">
          Distâncias em metros · alturas em centímetros/metros
        </Text>

        <Button
          size="sm"
          variant="outline"
          colorScheme="orange"
          onClick={handleExportPng}
          aria-label="Exportar PNG"
        >
          Exportar PNG
        </Button>
      </Flex>

      {/* Área principal */}
      <Flex flex="1" minH={0} direction={{ base: "column", md: "row" }}>
        <Box
          flex="1"
          minH={{ base: "300px", md: 0 }}
          p={2}
          overflow="auto"
          display="flex"
          flexDirection="column"
        >
          {view === "topo" ? (
            <Box flex="1" minH="300px">
              <StudioTopView />
            </Box>
          ) : (
            <CameraViewSimulator />
          )}
        </Box>

        <Box
          w={{ base: "100%", md: "350px" }}
          flexShrink={0}
          borderLeft={{ base: "none", md: "1px" }}
          borderTop={{ base: "1px", md: "none" }}
          borderColor={borderColor}
          p={3}
          overflowY="auto"
        >
          <ConfigPanel />
        </Box>
      </Flex>
    </Flex>
  );
}
