import { useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

export default function PartyBackground() {
  const { scene } = useThree();
  const texture = useTexture("/assets/Background.png");

  useEffect(() => {
    scene.background = texture;
  }, [texture, scene]);

  return null;
}
