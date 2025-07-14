// App.jsx
import React from "react"
import { Canvas } from "@react-three/fiber"
import GameCanvas from "./components/GameCanvas"
import "./App.css"

export default function App() {
  return (
    // <div className="App">
      <Canvas className="webgl" styles={{width:"750px", height:"1334px"}} orthographic camera={{ zoom: 80, position: [0, 0, 100] }}>
        <GameCanvas />
      </Canvas>
    // </div>
  )
}
