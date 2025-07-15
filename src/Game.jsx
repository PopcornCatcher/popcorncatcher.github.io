import * as THREE from "three"

export class Game {
  constructor(canvas, gl) {
    this.canvas = canvas

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      context: gl,
    })


    // this.scene = new THREE.Scene()
    // this.camera = new THREE.OrthographicCamera(-this.width / 200, this.width / 200, this.height / 200, -this.height / 200, 0.1, 1000)
    // this.camera.position.z = 10

    // this.renderer = new THREE.WebGLRenderer({ antialias: true })
    // this.renderer.setSize(this.width, this.height)
    // // this.container.appendChild(this.renderer.domElement)

    this.bucket = null
    this.fallingItems = []
    this.clock = new THREE.Clock()
    this.spawnTimer = 0

    // this.init()

    this.renderer.setSize(canvas.width, canvas.height)
    this.scene = new THREE.Scene()

    this.camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000)
    this.camera.position.z = 5
    // this.camera = new THREE.OrthographicCamera(-this.width / 200, this.width / 200, this.height / 200, -this.height / 200, 0.1, 1000)
    // this.camera.position.z = 10

    this.init()
  }

  init() {
    // Background
    new THREE.TextureLoader().load("/assets/Background.png", (texture) => {
      this.scene.background = texture
    })

    // Light
    const light = new THREE.AmbientLight(0xffffff, 1)
    this.scene.add(light)

    // Bucket
    this.bucket = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.2), new THREE.MeshStandardMaterial({ color: "red" }))
    this.bucket.position.y = -1.8
    this.scene.add(this.bucket)

    // Mouse move
    this.onMouseMove = this.onMouseMove.bind(this)
    window.addEventListener("mousemove", this.onMouseMove)

    // Start animation
    this.animate = this.animate.bind(this)
    this.animate()
  }

  onMouseMove(event) {
    const x = (event.clientX / this.width) * 2 - 1
    this.bucket.position.x = x * (this.width / this.height)
  }

  spawnItem() {
    const geo = new THREE.SphereGeometry(0.05, 16, 16)
    const color = Math.random() > 0.5 ? "yellow" : "brown"
    const mat = new THREE.MeshStandardMaterial({ color })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.x = THREE.MathUtils.randFloat(-1.5, 1.5)
    mesh.position.y = 2
    this.scene.add(mesh)
    this.fallingItems.push(mesh)
  }

  updateItems() {
    const speed = 0.02
    for (let i = this.fallingItems.length - 1; i >= 0; i--) {
      const item = this.fallingItems[i]
      item.position.y -= speed

      const dx = item.position.x - this.bucket.position.x
      const dy = item.position.y - this.bucket.position.y
      if (Math.abs(dx) < 0.3 && Math.abs(dy) < 0.3) {
        this.scene.remove(item)
        this.fallingItems.splice(i, 1)
        continue
      }

      if (item.position.y < -3) {
        this.scene.remove(item)
        this.fallingItems.splice(i, 1)
      }
    }
  }

  // animate() {
  //   this.frameId = requestAnimationFrame(this.animate)
  //   this.renderer.render(this.scene, this.camera)
  // }

  animate() {
    requestAnimationFrame(this.animate)
    const delta = this.clock.getDelta()
    this.spawnTimer += delta

    if (this.spawnTimer > 0.5) {
      this.spawnItem()
      this.spawnTimer = 0
    }

    this.updateItems()
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    // cancelAnimationFrame(this.frameId)
    this.renderer.dispose()
    window.removeEventListener("mousemove", this.onMouseMove)
  }
}
