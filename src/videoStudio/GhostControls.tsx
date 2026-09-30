import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { useVideoStudio } from "../store/videoStudioStore";

/**
 * Controles WASD + mouse para o modo "fantasma" (free-fly).
 * Atualiza o estado ghost no store e a câmera do three.js em tempo real.
 */
export function GhostControls() {
  const {
    ghost,
    moveGhost,
    setGhostRotation,
    setGhostPointerLock,
    setGhostSpeed,
  } = useVideoStudio();

  const { camera, gl } = useThree();
  const keysRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number>();

  // Sincronizar câmera three.js com estado ghost
  useEffect(() => {
    if (!ghost.enabled) return;
    
    camera.position.set(
      ghost.position[0],
      ghost.position[1],
      ghost.position[2]
    );
    camera.rotation.set(ghost.pitch, ghost.yaw, 0, "YXZ");
  }, [ghost.position, ghost.yaw, ghost.pitch, ghost.enabled, camera]);

  // Loop de movimento contínuo (WASD)
  useEffect(() => {
    if (!ghost.enabled) return;

    const move = () => {
      const { speed } = ghost;
      const keys = keysRef.current;
      
      let dx = 0, dy = 0, dz = 0;
      if (keys.has("KeyW")) dz -= 1;
      if (keys.has("KeyS")) dz += 1;
      if (keys.has("KeyA")) dx -= 1;
      if (keys.has("KeyD")) dx += 1;
      if (keys.has("Space")) dy += 1;
      if (keys.has("ShiftLeft") || keys.has("ShiftRight")) dy -= 1;

      if (dx !== 0 || dy !== 0 || dz !== 0) {
        moveGhost(dx * speed, dy * speed, dz * speed);
      }
      rafRef.current = requestAnimationFrame(move);
    };

    rafRef.current = requestAnimationFrame(move);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [ghost.enabled, ghost.speed, ghost, moveGhost]);

  // Eventos de teclado
  useEffect(() => {
    if (!ghost.enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!ghost.enabled) return;
      keysRef.current.add(e.code);
      
      // Speed modifiers
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
        setGhostSpeed(ghost.speed * 2.5);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
        setGhostSpeed(80);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [ghost.enabled, ghost.speed, setGhostSpeed]);

  // Eventos de mouse (pointer lock)
  useEffect(() => {
    if (!ghost.enabled) return;

    const canvas = gl.domElement;
    const onMouseMove = (e: MouseEvent) => {
      if (!ghost.pointerLocked) return;
      const sensitivity = 0.0025;
      const newYaw = ghost.yaw - e.movementX * sensitivity;
      const newPitch = Math.max(
        -Math.PI / 2 + 0.01,
        Math.min(Math.PI / 2 - 0.01, ghost.pitch - e.movementY * sensitivity)
      );
      setGhostRotation(newYaw, newPitch);
    };

    const onClick = async () => {
      if (!ghost.pointerLocked) {
        try {
          await canvas.requestPointerLock();
          setGhostPointerLock(true);
        } catch (_err) {
          // Ignore pointer lock errors
        }
      }
    };

    const onPointerLockChange = () => {
      const locked = document.pointerLockElement === canvas;
      setGhostPointerLock(locked);
      if (!locked) setGhostSpeed(80);
    };

    canvas.addEventListener("click", onClick);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("pointerlockchange", onPointerLockChange);

    return () => {
      canvas.removeEventListener("click", onClick);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      if (document.pointerLockElement === canvas) {
        document.exitPointerLock();
      }
    };
  }, [ghost.enabled, ghost.pointerLocked, ghost.yaw, ghost.pitch, gl.domElement, setGhostRotation, setGhostPointerLock, setGhostSpeed]);

  // ESC para sair do pointer lock
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ghost.pointerLocked) {
        document.exitPointerLock();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [ghost.pointerLocked]);

  return null;
}