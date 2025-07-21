import * as THREE from "three"
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js"

import { Pane } from "tweakpane"
import * as CANNON from "cannon-es"
import { FontLoader } from "three/examples/jsm/loaders/FontLoader"
// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

export class Game {
  renderer = null
  scene = null
  camera = null
  bucket = null
  scoreMesh = null
  popcorn = []
  fallingItems = []
  clock = new THREE.Clock()
  spawnTimer = 0
  canvas = null
  loader = null
  raycaster = null
  panel = null
  params = {
    cameraX: 0,
    cameraY: 0,
    cameraZ: 5,
  }
  textures = {
    bucket: null,
    popcorn: null,
    burntPopcorn: null,
    background: null,
    goldPopcorn: null,
  }

  // score
  isStartGame = null
  score = 0

  constructor(canvas, gl) {
    this.canvas = canvas

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      context: gl,
      antialias: false, // Disable for pixel-perfect 2D
      alpha: true,
    })

    // Disable lighting calculations for 2D
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.NoToneMapping
    this.renderer.toneMappingExposure = 1.0

    this.width = canvas.width
    this.height = canvas.height
    this.renderer.setSize(canvas.width, canvas.height)
    this.scene = new THREE.Scene()

    // Use orthographic camera for 2D game
    const aspect = this.width / this.height
    const frustumHeight = 8
    const frustumWidth = frustumHeight * aspect

    this.camera = new THREE.OrthographicCamera(
      -frustumWidth / 2, // left
      frustumWidth / 2, // right
      frustumHeight / 2, // top
      -frustumHeight / 2, // bottom
      0.1, // near
      1000 // far
    )
    this.camera.position.z = 5

    // loader
    this.loader = new THREE.TextureLoader()
    this.pane = new Pane()
    this.fontLoader = new FontLoader()

    // Load font once
    this.fontLoader.load(
      "https://threejs.org/examples/fonts/helvetiker_bold.typeface.json",
      (font) => {
        this.font = font
        this.createScore() // Safe to call now
      },
      undefined,
      (err) => console.error("Font load error:", err)
    )

    // const controls = new OrbitControls(this.camera, this.renderer.domElement)

    this.init()
  }

  loadTexture(path) {
    return new Promise((resolve, reject) => {
      this.loader.load(path, resolve, undefined, reject)
    })
  }

  async preloadTextures() {
    const assets = {
      bucket: "/assets/Bucket.png",
      popcorn: "/assets/Popcorn.png",
      burntPopcorn: "/assets/BurntPopcorn.png",
      background: "/assets/Background.png",
      goldPopcorn: "/assets/GoldPopcorn.png",
      one: "/assets/1.png",
      two: "/assets/2.png",
      three: "/assets/3.png",
      go: "/assets/go.png",
    }

    const promises = Object.entries(assets).map(([key, path]) => {
      return new Promise((resolve, reject) => {
        this.loader.load(
          path,
          (texture) => {
            // Configure texture for 2D pixel-perfect rendering
            texture.minFilter = THREE.NearestFilter
            texture.magFilter = THREE.NearestFilter
            texture.generateMipmaps = false
            texture.wrapS = THREE.ClampToEdgeWrapping
            texture.wrapT = THREE.ClampToEdgeWrapping
            texture.colorSpace = THREE.SRGBColorSpace

            this.textures[key] = texture
            resolve({ key, texture })
          },
          undefined,
          reject
        )
      })
    })

    return await Promise.all(promises)
  }

  addBackground() {
    if (!this.textures.background) {
      console.warn("Background texture not loaded")
      return
    }

    const texture = this.textures.background

    // Create background plane that fills the camera view
    const geometry = new THREE.PlaneGeometry(this.camera.right - this.camera.left, this.camera.top - this.camera.bottom)

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: false,
      depthTest: false,
      depthWrite: false,
    })

    const backgroundMesh = new THREE.Mesh(geometry, material)
    backgroundMesh.position.z = -10 // Push behind all objects
    backgroundMesh.renderOrder = -1 // Render first
    // this.scene.add(backgroundMesh)

    this.scene.background = texture
  }

  addLight() {
    // LIGHTS

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.4)
    dirLight.position.set(0, 0, 1).normalize()
    this.scene.add(dirLight)

    const pointLight = new THREE.PointLight(0xffffff, 4.5, 0, 0)
    pointLight.color.setHSL(Math.random(), 1, 0.5)
    pointLight.position.set(0, 100, 90)
    this.scene.add(pointLight)
  }

  createScore() {
    if (!this.font) return

    // Dispose old mesh if exists
    if (this.scoreMesh) {
      this.scene.remove(this.scoreMesh)
      this.scoreMesh.geometry.dispose()
      this.scoreMesh.material.dispose()
    }

    const geometry = new TextGeometry(this.score.toString(), {
      font: this.font,
      size: 0.3,
      depth: 0.01,
      bevelEnabled: false,
    })

    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 })
    this.scoreMesh = new THREE.Mesh(geometry, material)
    this.scoreMesh.position.set(0, 3, 0)
    this.scene.add(this.scoreMesh)
  }

  // Call this method when score updates
  updateScore(value) {
    this.score = value
    this.createScore()
  }

  goStartGame() {
    const countdownData = [
      { texture: this.textures.three, geometry: new THREE.PlaneGeometry(0.669, 1) },
      { texture: this.textures.two, geometry: new THREE.PlaneGeometry(0.712, 1) },
      { texture: this.textures.one, geometry: new THREE.PlaneGeometry(0.42, 1) },
      { texture: this.textures.go, geometry: new THREE.PlaneGeometry(1.914, 1) },
    ]

    let index = 0
    let currentMesh = null

    const showCountdownStep = () => {
      // Remove and dispose previous mesh
      if (currentMesh) {
        this.scene.remove(currentMesh)
        currentMesh.geometry.dispose()
        currentMesh.material.dispose()
      }

      // If finished, start the game
      if (index >= countdownData.length) {
        this.onStartGame()
        return
      }

      // Create and display current countdown mesh
      const { texture, geometry } = countdownData[index]
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
      })

      currentMesh = new THREE.Mesh(geometry, material)
      currentMesh.position.set(0, 0, 0) // Center
      this.scene.add(currentMesh)

      index++
      setTimeout(showCountdownStep, 1000) // Auto move to next after 1s
    }

    showCountdownStep() // Start countdown
  }

  addBucket() {
    if (!this.textures.bucket) {
      console.warn("Bucket texture not loaded")
      return
    }

    const bucketTexture = this.textures.bucket

    // Use MeshBasicMaterial for unlit 2D sprites
    const material = new THREE.MeshBasicMaterial({
      map: bucketTexture,
      transparent: true,
      alphaTest: 0.1, // Discard pixels below this alpha threshold
      side: THREE.DoubleSide,
    })

    const geometry = new THREE.PlaneGeometry(1.5, 1.5) // Adjust size as needed
    this.bucket = new THREE.Mesh(geometry, material)
    this.bucket.position.y = -3.2
    this.bucket.position.z = 0
    this.scene.add(this.bucket)

    // Physics body for bucket (shallow box for catching)
    const bucketShape = new CANNON.Box(new CANNON.Vec3(0.75, 0.1, 0.1))
    this.bucketBody = new CANNON.Body({
      mass: 0, // Static body
      shape: bucketShape,
      position: new CANNON.Vec3(0, -3, 0),
      material: this.bucketMaterial,
    })
    this.world.addBody(this.bucketBody)

    const bucket = this.pane.addFolder({
      title: "Bucket",
      expanded: true,
    })

    bucket.addBinding(this.bucket.position, "x", { min: -5, max: 5, step: 0.01 })
    bucket.addBinding(this.bucket.position, "y", { min: -5, max: 5, step: 0.01 })
  }

  addGround() {
    // Visual ground
    const groundGeometry = new THREE.PlaneGeometry(20, 2)
    const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x4a4a4a })
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial)
    this.ground.rotation.x = -Math.PI / 2
    this.ground.position.y = -4.5
    this.ground.receiveShadow = true
    this.scene.add(this.ground)

    // Physics body for ground
    const groundShape = new CANNON.Plane()
    const groundBody = new CANNON.Body({
      mass: 0,
      shape: groundShape,
      position: new CANNON.Vec3(0, -4.5, 0),
      material: this.groundMaterial,
    })
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2)
    this.world.addBody(groundBody)
  }

  async init() {
    try {
      const textures = await this.preloadTextures()
      console.log("Textures loaded:", Object.keys(this.textures))

      this.addBackground()
      this.setupPhysics()
      // this.setupPhysics()
      this.addLight()
      this.createScore()

      this.goStartGame()
      this.addBucket()
      this.addGround()
      this.setUpEventListeners()
      this.setupCollisionEvents()

      this.addPanel()

      // Start animation
      this.animate = this.animate.bind(this)
      this.animate()
    } catch (error) {
      console.error("Failed to initialize game:", error)
    }
  }

  setupPhysics() {
    // Initialize physics world
    this.world = new CANNON.World()
    this.world.gravity.set(0, -9.82, 0)
    this.world.broadphase = new CANNON.NaiveBroadphase()
    this.world.solver.iterations = 10

    // Create materials
    this.defaultMaterial = new CANNON.Material("default")
    this.bucketMaterial = new CANNON.Material("bucket")
    this.popcornMaterial = new CANNON.Material("popcorn")
    this.groundMaterial = new CANNON.Material("ground")

    // Contact materials
    const bucketPopcornContact = new CANNON.ContactMaterial(this.bucketMaterial, this.popcornMaterial, {
      friction: 0.3,
      restitution: 0.8,
      contactEquationStiffness: 1e8,
      contactEquationRelaxation: 3,
    })

    const groundPopcornContact = new CANNON.ContactMaterial(this.groundMaterial, this.popcornMaterial, {
      friction: 0.7,
      restitution: 0.3,
      contactEquationStiffness: 1e8,
      contactEquationRelaxation: 3,
    })

    this.world.addContactMaterial(bucketPopcornContact)
    this.world.addContactMaterial(groundPopcornContact)
  }

  setupCollisionEvents() {
    this.world.addEventListener("beginContact", (event) => {
      const { bodyA, bodyB, contact } = event

      // Find which body is the popcorn
      let popcornBody = null
      let otherBody = null
      let popcornIndex = -1

      for (let i = 0; i < this.fallingBodies.length; i++) {
        if (this.fallingBodies[i] === bodyA) {
          popcornBody = bodyA
          otherBody = bodyB
          popcornIndex = i
          break
        } else if (this.fallingBodies[i] === bodyB) {
          popcornBody = bodyB
          otherBody = bodyA
          popcornIndex = i
          break
        }
      }

      if (popcornBody && popcornIndex !== -1) {
        const popcornMesh = this.fallingItems[popcornIndex]

        // Check collision with bucket
        if (otherBody === this.bucketBody) {
          this.handleBucketCollision(popcornMesh, popcornBody, popcornIndex)
        }
        // Check collision with walls
        else if (otherBody === this.leftWall || otherBody === this.rightWall) {
          this.handleWallCollision(popcornMesh, popcornBody)
        }
        // Check collision with ground
        else if (otherBody.material === this.groundMaterial) {
          this.handleGroundCollision(popcornMesh, popcornBody)
        }
      }
    })
  }

  addPanel() {
    const camera = this.pane.addFolder({
      title: "Camera",
      expanded: true,
    })

    camera.addBinding(this.camera.position, "x", { min: -8, max: 8, step: 0.01, label: "Camera X" })
    camera.addBinding(this.camera.position, "y", { min: -8, max: 8, step: 0.01, label: "Camera Y" })
    camera.addBinding(this.camera.position, "z", { min: -8, max: 8, step: 0.01, label: "Camera Z" })

    this.scorePanel = this.pane.addFolder({
      title: "Score",
      expanded: true,
    })
    this.scorePanel.addBinding(this, "score", { label: "Score" })
  }

  onStartGame() {
    if (this.isStartGame) {
      return
    }

    this.isStartGame = true
    this.spawnTimer = 0
    // this.scene.remove(this.onStartGame)
    // Game logic starts after countdown now
  }

  setUpEventListeners() {
    this.onWindowResize = this.onWindowResize.bind(this)
    window.addEventListener("resize", this.onWindowResize)
    this.onWindowResize()

    // Mouse/Touch events for dragging
    this.isDragging = false
    this.dragOffset = { x: 0, y: 0 }

    // Mouse events
    this.onMouseDown = this.onMouseDown.bind(this)
    this.onMouseMove = this.onMouseMove.bind(this)
    this.onMouseUp = this.onMouseUp.bind(this)

    this.canvas.addEventListener("click", this.onStartGame)
    this.canvas.addEventListener("mousedown", this.onMouseDown)
    this.canvas.addEventListener("mousemove", this.onMouseMove)
    this.canvas.addEventListener("mouseup", this.onMouseUp)
    this.canvas.addEventListener("mouseleave", this.onMouseUp) // Stop dragging when mouse leaves canvas

    // Touch events for mobile
    this.onTouchStart = this.onTouchStart.bind(this)
    this.onTouchMove = this.onTouchMove.bind(this)
    this.onTouchEnd = this.onTouchEnd.bind(this)

    this.canvas.addEventListener("touchstart", this.onTouchStart)
    this.canvas.addEventListener("touchmove", this.onTouchMove)
    this.canvas.addEventListener("touchend", this.onTouchEnd)
    this.canvas.addEventListener("touchcancel", this.onTouchEnd)
  }

  screenToWorldCoords(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * 2 - 1
    const y = -((clientY - rect.top) / rect.height) * 2 + 1

    // Convert normalized coordinates to world coordinates
    const worldX = (x * (this.camera.right - this.camera.left)) / 2
    const worldY = (y * (this.camera.top - this.camera.bottom)) / 2

    return { x: worldX, y: worldY }
  }

  isPointInBucket(worldX, worldY) {
    const bucketHalfWidth = 0.75
    const bucketHalfHeight = 0.75

    const dx = Math.abs(worldX - this.bucket.position.x)
    const dy = Math.abs(worldY - this.bucket.position.y)

    return dx <= bucketHalfWidth && dy <= bucketHalfHeight
  }

  onMouseDown(event) {
    event.preventDefault()

    const worldCoords = this.screenToWorldCoords(event.clientX, event.clientY)

    if (this.isPointInBucket(worldCoords.x, worldCoords.y)) {
      this.isDragging = true
      // this.dragOffset.x = worldCoords.x - this.bucket.position.x
      this.dragOffset.y = worldCoords.y - this.bucket.position.y
      this.canvas.style.cursor = "grabbing"
    }
  }

  onMouseMove(event) {
    if (!this.isDragging) {
      // Check if hovering over bucket for cursor feedback
      const worldCoords = this.screenToWorldCoords(event.clientX, event.clientY)
      if (this.isPointInBucket(worldCoords.x, worldCoords.y)) {
        this.canvas.style.cursor = "grab"
      } else {
        this.canvas.style.cursor = "default"
      }
      return
    }

    event.preventDefault()
    const worldCoords = this.screenToWorldCoords(event.clientX, event.clientY)

    // Apply drag offset
    let newX = worldCoords.x - this.dragOffset.x
    // let newY = worldCoords.y - this.dragOffset.y

    // Constrain bucket movement within camera bounds
    const maxX = this.camera.right - 0.75 // Half bucket width
    const minX = this.camera.left + 0.75
    // const maxY = this.camera.top - 0.75 // Half bucket height
    // const minY = this.camera.bottom + 0.75

    this.bucket.position.x = THREE.MathUtils.clamp(newX, minX, maxX)
    // this.bucket.position.y = THREE.MathUtils.clamp(newY, minY, maxY)
  }

  onMouseUp(event) {
    if (this.isDragging) {
      this.isDragging = false
      this.canvas.style.cursor = "default"
    }
  }

  onTouchStart(event) {
    event.preventDefault()
    if (event.touches.length === 1) {
      const touch = event.touches[0]
      const worldCoords = this.screenToWorldCoords(touch.clientX, touch.clientY)

      if (this.isPointInBucket(worldCoords.x, worldCoords.y)) {
        this.isDragging = true
        this.dragOffset.x = worldCoords.x - this.bucket.position.x
        this.dragOffset.y = worldCoords.y - this.bucket.position.y
      }
    }
  }

  onTouchMove(event) {
    if (!this.isDragging) return

    event.preventDefault()
    if (event.touches.length === 1) {
      const touch = event.touches[0]
      const worldCoords = this.screenToWorldCoords(touch.clientX, touch.clientY)

      // Apply drag offset
      let newX = worldCoords.x - this.dragOffset.x
      let newY = worldCoords.y - this.dragOffset.y

      // Constrain bucket movement within camera bounds
      const maxX = this.camera.right - 0.75 // Half bucket width
      const minX = this.camera.left + 0.75
      const maxY = this.camera.top - 0.75 // Half bucket height
      const minY = this.camera.bottom + 0.75

      this.bucket.position.x = THREE.MathUtils.clamp(newX, minX, maxX)
      this.bucket.position.y = THREE.MathUtils.clamp(newY, minY, maxY)
    }
  }

  onTouchEnd(event) {
    if (this.isDragging) {
      this.isDragging = false
    }
  }

  spawnItem() {
    const isPopcorn = Math.random() > 0.6 // 60% chance for normal popcorn
    const isGold = Math.random() > 0.95 // 5% chance for gold popcorn

    let texture
    if (isGold) {
      texture = this.textures.goldPopcorn
    } else {
      texture = isPopcorn ? this.textures.popcorn : this.textures.burntPopcorn
    }

    if (!texture) {
      console.warn("Item texture not loaded")
      return
    }

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.1,
      side: THREE.DoubleSide,
    })

    const geometry = new THREE.PlaneGeometry(0.4, 0.4)
    const mesh = new THREE.Mesh(geometry, material)

    // Spawn within camera bounds
    // Random spawn position
    const spawnX = THREE.MathUtils.randFloat(this.camera.left + 0.2, this.camera.right - 0.2)

    mesh.position.x = spawnX
    mesh.position.y = this.camera.top + 0.5
    mesh.position.z = 0
    mesh.rotation.z = Math.random() * Math.PI * 2

    // Store item type for scoring
    mesh.userData = {
      isPopcorn,
      isGold,
      rotationSpeed: (Math.random() - 0.5) * 0.1,
    }

    // Create physics body
    const shape = new CANNON.Sphere(0.15)
    const body = new CANNON.Body({
      mass: 0.1,
      shape: shape,
      position: new CANNON.Vec3(spawnX, 4, 0),
      material: this.popcornMaterial,
    })

    // Add initial velocity
    body.velocity.set((Math.random() - 0.5) * 3, Math.random() * -2 - 1, 0)

    // Add angular velocity for spinning
    body.angularVelocity.set((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4)

    // this.world.addBody(body)
    // this.fallingBodies.push(body)

    this.scene.add(mesh)
    this.fallingItems.push(mesh)
  }

  updateItems() {
    const speed = 0.025
    for (let i = this.fallingItems.length - 1; i >= 0; i--) {
      const item = this.fallingItems[i]
      item.position.y -= speed

      // Add rotation animation
      item.rotation.z += item.userData.rotationSpeed

      // Check collision with bucket
      const dx = item.position.x - this.bucket.position.x
      const dy = item.position.y - this.bucket.position.y

      if (Math.abs(dx) < 0.6 && Math.abs(dy) < 0.6) {
        // Item caught!
        this.scene.remove(item)
        this.fallingItems.splice(i, 1)

        // Add scoring logic here
        if (item.userData.isGold) {
          this.score += 10
          this.updateScore(this.score)
          // this.scoreMesh.
          console.log("Gold popcorn caught! +10 points")
        } else if (item.userData.isPopcorn) {
          this.score += 1
          this.updateScore(this.score)
          console.log("Popcorn caught! +1 point")
        } else {
          this.score -= 1
          this.updateScore(this.score)
          console.log("Burnt popcorn caught! -1 point")
        }
        continue
      }

      // Remove items that fall off screen
      if (item.position.y < this.camera.bottom - 0.5) {
        this.scene.remove(item)
        this.fallingItems.splice(i, 1)
      }
    }
  }

  animate() {
    this.world.step(1 / 60)
    requestAnimationFrame(this.animate)
    // console.log("this.isStartGame", this.isStartGame)
    if (this.isStartGame != null && this.isStartGame) {
      const delta = this.clock.getDelta()
      this.spawnTimer += delta

      // Spawn items every 0.8 seconds
      if (this.spawnTimer > 0.8) {
        this.spawnItem()
        this.spawnTimer = 0
      }

      this.updateItems()
    }
    this.renderer.render(this.scene, this.camera)
  }

  onWindowResize() {
    // Maintain aspect ratio for mobile game
    this.height = window.innerHeight
    this.aspectRatio = 750 / 1334
    this.width = this.height * this.aspectRatio

    // Update orthographic camera
    const aspect = this.width / this.height
    const frustumHeight = 8
    const frustumWidth = frustumHeight * aspect

    this.camera.left = -frustumWidth / 2
    this.camera.right = frustumWidth / 2
    this.camera.top = frustumHeight / 2
    this.camera.bottom = -frustumHeight / 2
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(this.width, this.height)
  }

  dispose() {
    // Remove mouse event listeners
    this.canvas.removeEventListener("mousedown", this.onMouseDown)
    this.canvas.removeEventListener("mousemove", this.onMouseMove)
    this.canvas.removeEventListener("mouseup", this.onMouseUp)
    this.canvas.removeEventListener("mouseleave", this.onMouseUp)

    // Remove touch event listeners
    this.canvas.removeEventListener("touchstart", this.onTouchStart)
    this.canvas.removeEventListener("touchmove", this.onTouchMove)
    this.canvas.removeEventListener("touchend", this.onTouchEnd)
    this.canvas.removeEventListener("touchcancel", this.onTouchEnd)

    window.removeEventListener("resize", this.onWindowResize)

    // Clean up textures
    Object.values(this.textures).forEach((texture) => {
      if (texture) texture.dispose()
    })

    // Clean up geometries and materials
    this.scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose()
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose())
        } else {
          object.material.dispose()
        }
      }
    })

    this.renderer.dispose()
  }
}
