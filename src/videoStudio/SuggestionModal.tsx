import { useState } from "react";
import {
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Textarea,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import {
  SUGGESTION_CATEGORIES,
  submitSuggestion,
  type SuggestionCategory,
} from "./suggestions";

/**
 * Botão "💡 Sugerir melhoria" + modal (Item 18).
 * Envia para `/api/suggest` (Resend via serverless); sem backend, guarda
 * localmente — o toast informa em qual modo a sugestão foi registrada.
 */
export function SuggestionButton() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const [category, setCategory] = useState<SuggestionCategory>("Estúdio");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [contact, setContact] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit() {
    setSending(true);
    try {
      const { mode } = await submitSuggestion({
        category,
        title,
        body,
        contact: contact || undefined,
      });
      toast({
        title: "Sugestão registrada!",
        description:
          mode === "api"
            ? "Enviada para a equipe — obrigado!"
            : "Guardada localmente (sem backend configurado).",
        status: "success",
        duration: 4000,
        isClosable: true,
      });
      setTitle("");
      setBody("");
      setContact("");
      onClose();
    } catch (err) {
      toast({
        title: "Não foi possível enviar",
        description: err instanceof Error ? err.message : String(err),
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={onOpen}>
        💡 Sugerir melhoria
      </Button>

      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Sugerir melhoria</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={3}>
              <FormLabel>Categoria</FormLabel>
              <Select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as SuggestionCategory)
                }
              >
                {SUGGESTION_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl mb={3}>
              <FormLabel>Título</FormLabel>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Preset de entrevista com 2 luzes"
                maxLength={120}
              />
            </FormControl>

            <FormControl mb={3}>
              <FormLabel>Descrição</FormLabel>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Descreva o problema ou a ideia (mín. 10 caracteres)"
                rows={5}
                maxLength={2000}
              />
            </FormControl>

            <FormControl mb={2}>
              <FormLabel>Contato (opcional)</FormLabel>
              <Input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="email para recebermos a resposta"
                maxLength={120}
              />
              <FormHelperText>
                Sem backend configurado a sugestão fica no seu navegador.
              </FormHelperText>
            </FormControl>
          </ModalBody>

          <ModalFooter gap={2}>
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSubmit}
              isLoading={sending}
              isDisabled={title.trim().length < 5 || body.trim().length < 10}
            >
              Enviar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
