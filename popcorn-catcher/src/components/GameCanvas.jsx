// components/GameCanvas.jsx
import React from "react"
import { useFrame } from "@react-three/fiber"
import PopcornBucket from "./PopcornBucket"
import FallingItem from "./FallingItem"
import useGameLogic from "../hooks/useGameLogic"
import PartyBackground from "./PartyBackground"

export default function GameCanvas() {
  const { items, bucketRef, score, update } = useGameLogic()

  useFrame(() => update())

  return (
    <>
      {/* Background */}
      {/* <color attach="background" args={["#87CEEB"]} /> */}
      <PartyBackground/>

      {/* Falling items */}
      {items.map((item, index) => (
        <FallingItem key={index} position={item.position} type={item.type} />
      ))}

      {/* Bucket */}
      <PopcornBucket ref={bucketRef} />
    </>
  )
}
