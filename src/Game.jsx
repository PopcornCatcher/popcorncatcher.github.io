import * as THREE from "three"

export class Game {
  renderer = null
  scene = null
  camera = null
  bucket = null
  fallingItems = []
  clock = null
  spawnTimer = 0
  canvas = null

  constructor(canvas, gl) {
    this.canvas = canvas

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      context: gl,
    })
    // Desired size
    this.width = 750
    this.height = window.innerHeight

    this.renderer.setSize(this.width, this.height)

    // this.width = canvas.width
    // this.height = canvas.height width={750} height={1334}

    // Set canvas DOM size
    // this.canvas.width = width;
    // this.canvas.height = height;
    // this.canvas.style.width = width + 'px';
    // this.canvas.style.height = height + 'px';

    // this.scene = new THREE.Scene()
    // this.camera = new THREE.OrthographicCamera(-this.width / 200, this.width / 200, this.height / 200, -this.height / 200, 0.1, 1000)
    // this.camera.position.z = 10

    // this.renderer = new THREE.WebGLRenderer({ antialias: true })
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

    window.addEventListener("resize", this.onWindowResize)
    this.onWindowResize() // Call once at start
  }

  init() {
    // Background
    new THREE.TextureLoader().load("/assets/Background.png", (texture) => {
      this.scene.background = texture
    })

    // Light
    const light = new THREE.AmbientLight(0xffffff, 1)
    this.scene.add(light)

    // loader
    const loader = new THREE.TextureLoader()

    // Bucket
    loader.load("/assets/Bucket.png", (texture) => {
      const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true })
      const geometry = new THREE.PlaneGeometry(0.8, 0.8) // Adjust size as needed
      this.bucket = new THREE.Mesh(geometry, material)
      this.bucket.position.y = -3.3
      this.scene.add(this.bucket)
    })

    // Mouse move
    this.onMouseMove = this.onMouseMove.bind(this)
    this.canvas.addEventListener("mousemove", this.onMouseMove)

    // Start animation
    this.animate = this.animate.bind(this)
    this.animate()
  }

  onMouseMove(event) {
    const x = (event.clientX / this.width) * 2 - 1
    // console.log("object position x:", this.bucket)
    console.log("width", this.width, "height", this.height)
    this.bucket.position.x = x * (this.width / this.height)
  }

  spawnItem() {
    const loader = new THREE.TextureLoader()
    const isPopcorn = Math.random() > 0.5
    const texturePath = isPopcorn ? "/assets/Popcorn.png" : "/assets/BurntPopcorn.png"

    loader.load(texturePath, (texture) => {
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
      })
      const geometry = new THREE.PlaneGeometry(0.2, 0.2) // Adjust size if needed
      const mesh = new THREE.Mesh(geometry, material)

      mesh.position.x = THREE.MathUtils.randFloat(-1.5, 1.5)
      mesh.position.y = 2
      mesh.rotation.z = Math.random() * Math.PI * 2 // Optional: random rotation

      this.scene.add(mesh)
      this.fallingItems.push(mesh)
    })
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

  onWindowResize() {
    const height = window.innerHeight
    const width = 750

    // Update camera
    // this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()

    // Update renderer
    this.renderer.setSize(width, height)
  }

  dispose() {
    // cancelAnimationFrame(this.frameId)
    this.renderer.dispose()
    this.canvas.removeEventListener("mousemove", this.onMouseMove)
  }
}
