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

  return <canvas ref={canvasRef} className="webgl" style={{ width: "100vw", height: "100vh", margin: "0 auto", display: "block" }} />
}

export default GameCanvas
