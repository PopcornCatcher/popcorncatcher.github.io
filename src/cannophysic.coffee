import * as THREE from "three"
import * as CANNON from "cannon-es"
import { Pane } from "tweakpane"


export class Game {
  constructor(canvas, gl) {
    this.renderer = null
    this.scene = null
    this.camera = null
    this.world = null
    this.bucket = null
    this.bucketBody = null
    this.leftWall = null
    this.rightWall = null
    this.ground = null
    this.fallingItems = []
    this.fallingBodies = []
    this.particles = []
    this.clock = new THREE.Clock()
    this.spawnTimer = 0
    this.score = 0
    this.itemsCaught = 0

    // Input handling
    this.isDragging = false
    this.dragOffset = { x: 0, y: 0 }

    // Materials
    this.defaultMaterial = null
    this.bucketMaterial = null
    this.popcornMaterial = null
    this.groundMaterial = null

    this.canvas = canvas
    this.gl = gl

    this.init()
  }

  init() {
    this.setupRenderer()
    this.setupCamera()
    this.setupScene()
    this.setupPhysics()
    this.createBucket()
    this.createGround()
    this.createWalls()
    this.setupEventListeners()
    this.setupCollisionEvents()
    this.animate()
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      context: this.gl,
      antialias: false, // Disable for pixel-perfect 2D
      alpha: true
    })
    this.renderer.setSize(800, 600)
    this.renderer.setClearColor(0x87ceeb, 1) // Sky blue background
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
  }

  setupCamera() {
    const aspect = 800 / 600
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
  }

  setupScene() {
    this.scene = new THREE.Scene()

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
    this.scene.add(ambientLight)

    // Add directional light for shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
    directionalLight.position.set(5, 10, 5)
    directionalLight.castShadow = true
    this.scene.add(directionalLight)
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

  createBucket() {
    // Visual bucket
    const bucketGeometry = new THREE.BoxGeometry(1.5, 0.8, 0.2)
    const bucketMaterial = new THREE.MeshPhongMaterial({
      color: 0x8b4513,
      transparent: true,
      opacity: 0.8,
    })
    this.bucket = new THREE.Mesh(bucketGeometry, bucketMaterial)
    this.bucket.position.y = -3
    this.bucket.castShadow = true
    this.bucket.receiveShadow = true
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
  }

  createGround() {
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

  createWalls() {
    const wallShape = new CANNON.Box(new CANNON.Vec3(0.05, 0.5, 0.1))

    // Left wall
    this.leftWall = new CANNON.Body({
      mass: 0,
      shape: wallShape,
      position: new CANNON.Vec3(-0.7, -2.5, 0),
      material: this.bucketMaterial,
    })
    this.world.addBody(this.leftWall)

    // Right wall
    this.rightWall = new CANNON.Body({
      mass: 0,
      shape: wallShape,
      position: new CANNON.Vec3(0.7, -2.5, 0),
      material: this.bucketMaterial,
    })
    this.world.addBody(this.rightWall)
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

  handleBucketCollision(mesh, body, index) {
    // Check if popcorn is actually inside the bucket
    const bucketPos = this.bucket.position
    const popcornPos = mesh.position

    const dx = Math.abs(popcornPos.x - bucketPos.x)
    const dy = Math.abs(popcornPos.y - bucketPos.y)

    if (dx < 0.6 && dy < 0.3) {
      // Caught in bucket - remove and score
      this.catchPopcorn(mesh, body, index)
    } else {
      // Hit bucket edge - bounce with extra force
      this.bounceOffBucket(mesh, body)
    }
  }

  catchPopcorn(mesh, body, index) {
    const { isPopcorn, isGold } = mesh.userData

    // Calculate score
    let points = 0
    if (isGold) {
      points = 5
    } else if (isPopcorn) {
      points = 1
    } else {
      points = -1
    }

    this.score += points
    this.itemsCaught++

    // Update UI
    document.getElementById("score").textContent = this.score
    document.getElementById("caught").textContent = this.itemsCaught

    // Show score popup
    this.showScorePopup(mesh.position, points, isGold)

    // Create celebration effect
    this.createCelebrationEffect(mesh.position, isGold)

    // Remove popcorn
    this.removePopcorn(mesh, body, index)
  }

  bounceOffBucket(mesh, body) {
    // Create collision effect
    this.createCollisionEffect(mesh.position)

    // Apply extra bounce force
    const bounceForce = new CANNON.Vec3((Math.random() - 0.5) * 8, Math.random() * 5 + 3, 0)
    body.applyImpulse(bounceForce, body.position)

    // Increase bounce count
    mesh.userData.bounceCount++
  }

  handleWallCollision(mesh, body) {
    // Create collision effect
    this.createCollisionEffect(mesh.position)

    // Apply outward bounce force
    const direction = body.position.x > 0 ? 1 : -1
    const bounceForce = new CANNON.Vec3(direction * 3, Math.random() * 2 + 1, 0)
    body.applyImpulse(bounceForce, body.position)

    mesh.userData.bounceCount++
  }

  handleGroundCollision(mesh, body) {
    // Create small collision effect
    this.createCollisionEffect(mesh.position, 0.5)

    // Reduce velocity for settling
    body.velocity.scale(0.3, body.velocity)
    body.angularVelocity.scale(0.5, body.angularVelocity)

    mesh.userData.bounceCount++
  }

  spawnPopcorn() {
    // Determine popcorn type
    const rand = Math.random()
    let isPopcorn = true
    let isGold = false
    let color = 0xfffacd // Normal popcorn color

    if (rand < 0.1) {
      // 10% chance for gold
      isGold = true
      color = 0xffd700
    } else if (rand < 0.3) {
      // 20% chance for burnt
      isPopcorn = false
      color = 0x2f1b14
    }

    // Create visual mesh
    const geometry = new THREE.SphereGeometry(0.15, 8, 8)
    const material = new THREE.MeshPhongMaterial({
      color: color,
      transparent: true,
      opacity: 0.9,
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true

    // Random spawn position
    const spawnX = THREE.MathUtils.randFloat(-4, 4)
    mesh.position.set(spawnX, 4, 0)

    // Store metadata
    mesh.userData = {
      isPopcorn,
      isGold,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      bounceCount: 0,
    }

    this.scene.add(mesh)
    this.fallingItems.push(mesh)

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

    this.world.addBody(body)
    this.fallingBodies.push(body)
  }

  createCollisionEffect(position, scale = 1) {
    const particleCount = Math.floor(8 * scale)

    for (let i = 0; i < particleCount; i++) {
      const geometry = new THREE.SphereGeometry(0.02, 4, 4)
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(Math.random() * 0.1 + 0.1, 0.8, 0.6),
        transparent: true,
        opacity: 0.8,
      })

      const particle = new THREE.Mesh(geometry, material)
      particle.position.copy(position)
      particle.position.add(new THREE.Vector3((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, 0))

      particle.userData = {
        velocity: new THREE.Vector3((Math.random() - 0.5) * 0.15, Math.random() * 0.1 + 0.05, 0),
        life: 1.0,
        decay: 0.02,
      }

      this.scene.add(particle)
      this.particles.push(particle)
    }
  }

  createCelebrationEffect(position, isGold) {
    const particleCount = isGold ? 20 : 12
    const colors = isGold ? [0xffd700, 0xffa500, 0xffff00] : [0xfffacd, 0xffe4b5, 0xdda0dd]

    for (let i = 0; i < particleCount; i++) {
      const geometry = new THREE.SphereGeometry(0.03, 6, 6)
      const material = new THREE.MeshBasicMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        transparent: true,
        opacity: 0.9,
      })

      const particle = new THREE.Mesh(geometry, material)
      particle.position.copy(position)

      const angle = (i / particleCount) * Math.PI * 2
      const speed = isGold ? 0.2 : 0.15

      particle.userData = {
        velocity: new THREE.Vector3(Math.cos(angle) * speed, Math.sin(angle) * speed + 0.1, 0),
        life: 1.0,
        decay: 0.015,
      }

      this.scene.add(particle)
      this.particles.push(particle)
    }
  }

  showScorePopup(position, points, isGold) {
    const popup = document.createElement("div")
    popup.className = "score-popup"
    popup.textContent = (points > 0 ? "+" : "") + points

    if (isGold) {
      popup.classList.add("gold")
    } else if (points > 0) {
      popup.classList.add("positive")
    } else {
      popup.classList.add("negative")
    }

    // Convert world position to screen position
    const vector = position.clone()
    vector.project(this.camera)

    const x = (vector.x * 0.5 + 0.5) * this.canvas.width
    const y = (vector.y * -0.5 + 0.5) * this.canvas.height

    popup.style.left = x + "px"
    popup.style.top = y + "px"

    document.body.appendChild(popup)

    // Animate popup
    let opacity = 1
    let yOffset = 0

    const animate = () => {
      opacity -= 0.02
      yOffset -= 1

      popup.style.opacity = opacity
      popup.style.transform = `translateY(${yOffset}px)`

      if (opacity > 0) {
        requestAnimationFrame(animate)
      } else {
        document.body.removeChild(popup)
      }
    }

    animate()
  }

  removePopcorn(mesh, body, index) {
    this.scene.remove(mesh)
    this.world.removeBody(body)
    this.fallingItems.splice(index, 1)
    this.fallingBodies.splice(index, 1)

    // Dispose of geometry and material
    mesh.geometry.dispose()
    mesh.material.dispose()
  }

  updateParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i]
      const userData = particle.userData

      // Update position
      particle.position.add(userData.velocity)

      // Apply gravity
      userData.velocity.y -= 0.005

      // Update life
      userData.life -= userData.decay
      particle.material.opacity = userData.life

      // Remove if dead
      if (userData.life <= 0) {
        this.scene.remove(particle)
        particle.geometry.dispose()
        particle.material.dispose()
        this.particles.splice(i, 1)
      }
    }
  }

  updateItems() {
    // Step physics
    this.world.step(1 / 60)

    // Update visual objects
    for (let i = this.fallingItems.length - 1; i >= 0; i--) {
      const item = this.fallingItems[i]
      const body = this.fallingBodies[i]

      // Sync position and rotation
      item.position.copy(body.position)
      item.quaternion.copy(body.quaternion)

      // Add visual rotation
      item.rotation.z += item.userData.rotationSpeed

      // Remove items that fall too far
      if (body.position.y < -6) {
        this.removePopcorn(item, body, i)
      }
    }

    // Update particles
    this.updateParticles()
  }

  setupEventListeners() {
    // Mouse events
    this.canvas.addEventListener("mousedown", (e) => this.onMouseDown(e))
    this.canvas.addEventListener("mousemove", (e) => this.onMouseMove(e))
    this.canvas.addEventListener("mouseup", (e) => this.onMouseUp(e))
    this.canvas.addEventListener("mouseleave", (e) => this.onMouseUp(e))

    // Touch events
    this.canvas.addEventListener("touchstart", (e) => this.onTouchStart(e))
    this.canvas.addEventListener("touchmove", (e) => this.onTouchMove(e))
    this.canvas.addEventListener("touchend", (e) => this.onTouchEnd(e))

    // Resize
    window.addEventListener("resize", () => this.onWindowResize())
  }

  screenToWorldCoords(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * 2 - 1
    const y = -((clientY - rect.top) / rect.height) * 2 + 1

    const worldX = (x * (this.camera.right - this.camera.left)) / 2
    const worldY = (y * (this.camera.top - this.camera.bottom)) / 2

    return { x: worldX, y: worldY }
  }

  isPointInBucket(worldX, worldY) {
    const bucketHalfWidth = 0.75
    const bucketHalfHeight = 0.4

    const dx = Math.abs(worldX - this.bucket.position.x)
    const dy = Math.abs(worldY - this.bucket.position.y)

    return dx <= bucketHalfWidth && dy <= bucketHalfHeight
  }

  onMouseDown(event) {
    event.preventDefault()
    const worldCoords = this.screenToWorldCoords(event.clientX, event.clientY)

    if (this.isPointInBucket(worldCoords.x, worldCoords.y)) {
      this.isDragging = true
      this.dragOffset.x = worldCoords.x - this.bucket.position.x
      this.dragOffset.y = worldCoords.y - this.bucket.position.y
      this.canvas.style.cursor = "grabbing"
    }
  }

  onMouseMove(event) {
    if (!this.isDragging) {
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

    let newX = worldCoords.x - this.dragOffset.x
    let newY = worldCoords.y - this.dragOffset.y

    // Constrain movement
    const maxX = this.camera.right - 0.75
    const minX = this.camera.left + 0.75
    const maxY = this.camera.top - 0.4
    const minY = this.camera.bottom + 0.4

    this.bucket.position.x = THREE.MathUtils.clamp(newX, minX, maxX)
    this.bucket.position.y = THREE.MathUtils.clamp(newY, minY, maxY)

    // Update physics bodies
    this.bucketBody.position.x = this.bucket.position.x
    this.bucketBody.position.y = this.bucket.position.y
    this.leftWall.position.x = this.bucket.position.x - 0.7
    this.rightWall.position.x = this.bucket.position.x + 0.7
    this.leftWall.position.y = this.bucket.position.y + 0.5
    this.rightWall.position.y = this.bucket.position.y + 0.5
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

      let newX = worldCoords.x - this.dragOffset.x
      let newY = worldCoords.y - this.dragOffset.y

      // Constrain movement
      const maxX = this.camera.right - 0.75
      const minX = this.camera.left + 0.75
      const maxY = this.camera.top - 0.4
      const minY = this.camera.bottom + 0.4

      this.bucket.position.x = THREE.MathUtils.clamp(newX, minX, maxX)
      this.bucket.position.y = THREE.MathUtils.clamp(newY, minY, maxY)

      // Update physics bodies
      this.bucketBody.position.x = this.bucket.position.x
      this.bucketBody.position.y = this.bucket.position.y
      this.leftWall.position.x = this.bucket.position.x - 0.7
      this.rightWall.position.x = this.bucket.position.x + 0.7
      this.leftWall.position.y = this.bucket.position.y + 0.5
      this.rightWall.position.y = this.bucket.position.y + 0.5
    }
  }

  onTouchEnd(event) {
    if (this.isDragging) {
      this.isDragging = false
    }
  }

  onWindowResize() {
    const width = window.innerWidth
    const height = window.innerHeight

    this.canvas.width = Math.min(width, 800)
    this.canvas.height = Math.min(height, 600)

    this.renderer.setSize(this.canvas.width, this.canvas.height)

    const aspect = this.canvas.width / this.canvas.height
    const frustumHeight = 8
    const frustumWidth = frustumHeight * aspect

    this.camera.left = -frustumWidth / 2
    this.camera.right = frustumWidth / 2
    this.camera.top = frustumHeight / 2
    this.camera.bottom = -frustumHeight / 2
    this.camera.updateProjectionMatrix()
  }

  animate() {
    requestAnimationFrame(() => this.animate())

    const delta = this.clock.getDelta()
    this.spawnTimer += delta

    // Spawn popcorn every 1-2 seconds
    if (this.spawnTimer > 1.2) {
      this.spawnPopcorn()
      this.spawnTimer = 0
    }

    this.updateItems()
    this.renderer.render(this.scene, this.camera)
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
    Object.values(this.textures).forEach(texture => {
      if (texture) texture.dispose()
    })
    
    // Clean up geometries and materials
    this.scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose()
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose())
        } else {
          object.material.dispose()
        }
      }
    })
    
    this.renderer.dispose()
  }
}
