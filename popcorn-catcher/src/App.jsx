// App.jsx
import React from "react"
import { Canvas } from "@react-three/fiber"
import GameCanvas from "./components/GameCanvas"
import "./App.css"

export default function App() {
  return (
    <div className="App">
      <Canvas orthographic camera={{ zoom: 80, position: [0, 0, 100] }}>
        <GameCanvas />
      </Canvas>
    </div>
  )
}
