// App.jsx
import React from "react"
import "./App.css"
import GameCanvas from "./GameCanvas"
// import

export default function App() {
  //  camera={{ zoom: 80, position: [0, 0, 100] }}
  // return (
  //   // <div className="App">
  //   // <canvas className="webgl" style={{ width: "750px", height: "1334px" }} />
  //   <GameCanvas />
  //   // <Canvas className="webgl" styles={{width:"750px", height:"1334px"}} orthographic camera={{ zoom: 80, position: [0, 0, 100] }}>
  //   //   <GameCanvas />
  //   // </Canvas>
  //   // </div>
  // )
  return (
    // <div className="webgl" style={{ width: "750px", height: "1334" }}>
      <GameCanvas />
    // </div>
  )
}
