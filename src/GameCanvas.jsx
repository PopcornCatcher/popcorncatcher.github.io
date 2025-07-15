// import { useEffect, useRef } from "react"
// import { Game } from "./Game"

// const GameCanvas = () => {
//   const containerRef = useRef(null)
//   const gameRef = useRef(null)

//   useEffect(() => {
//     if (containerRef.current) {
//       gameRef.current = new Game(containerRef.current)
//     }

//     return () => {
//       if (gameRef.current) {
//         gameRef.current.dispose()
//       }
//     }
//   }, [])

//   return (
//     <div
//       ref={containerRef}
//       className="webgl"
//       style={{ width: "100vw", height: "100vh", overflow: "hidden" }}
//     />
//   )
// }

// export default GameCanvas
import { useEffect, useRef } from "react"
import { Game } from "./Game"

const GameCanvas = () => {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext("webgl2", { alpha: false, antialias: true })
    if (!gl) {
      console.error("WebGL not supported")
      return
    }

    gameRef.current = new Game(canvas, gl)

    return () => {
      if (gameRef.current) gameRef.current.dispose()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="webgl"
      width={window.innerWidth}
      height={window.innerHeight}
      style={{ display: "block" }}
    />
  )
}

export default GameCanvas
