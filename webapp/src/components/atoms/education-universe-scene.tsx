"use client"

import { useEffect, useRef, useState } from "react"

import * as THREE from "three"

import { cn } from "@/lib/utils"

type EducationUniverseSceneProps = {
  className?: string
  variant?: "hero" | "ambient" | "auth"
}

function seededPosition(index: number, offset: number) {
  const value = Math.sin(index * 12.9898 + offset) * 43758.5453
  return value - Math.floor(value)
}

function createBook(materials: {
  cover: THREE.Material
  paper: THREE.Material
  accent: THREE.Material
}) {
  const book = new THREE.Group()
  const coverGeometry = new THREE.BoxGeometry(1.55, 0.12, 1.05)
  const pageGeometry = new THREE.BoxGeometry(1.42, 0.2, 0.94)
  const spineGeometry = new THREE.BoxGeometry(0.12, 0.28, 1.08)

  const lowerCover = new THREE.Mesh(coverGeometry, materials.cover)
  const pages = new THREE.Mesh(pageGeometry, materials.paper)
  const upperCover = new THREE.Mesh(coverGeometry, materials.cover)
  const spine = new THREE.Mesh(spineGeometry, materials.accent)

  lowerCover.position.y = -0.16
  upperCover.position.y = 0.16
  spine.position.x = -0.76
  book.add(lowerCover, pages, upperCover, spine)
  return book
}

function createAtom(material: THREE.Material, coreMaterial: THREE.Material) {
  const atom = new THREE.Group()
  const ringGeometry = new THREE.TorusGeometry(0.92, 0.018, 8, 72)
  const coreGeometry = new THREE.SphereGeometry(0.18, 16, 16)

  const firstRing = new THREE.Mesh(ringGeometry, material)
  const secondRing = new THREE.Mesh(ringGeometry, material)
  const thirdRing = new THREE.Mesh(ringGeometry, material)
  secondRing.rotation.x = Math.PI / 2
  thirdRing.rotation.y = Math.PI / 2

  atom.add(firstRing, secondRing, thirdRing, new THREE.Mesh(coreGeometry, coreMaterial))
  return atom
}

function EducationUniverseFallback() {
  return (
    <div className="learning-grid absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_70%_35%,rgba(41,193,167,0.16),transparent_34%),radial-gradient(circle_at_28%_76%,rgba(245,190,75,0.11),transparent_30%)]">
      <div className="absolute top-[18%] right-[15%] size-32 rounded-full border border-primary/30 bg-primary/5 shadow-[0_0_80px_rgba(41,193,167,0.13)]" />
      <div className="absolute right-[38%] bottom-[20%] h-20 w-28 rotate-[-12deg] rounded-md border border-accent/30 bg-accent/8" />
    </div>
  )
}

export default function EducationUniverseScene({
  className,
  variant = "hero",
}: EducationUniverseSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hasWebGl, setHasWebGl] = useState(true)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) {
      return
    }
    const sceneContainer = container

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      })
    } catch {
      queueMicrotask(() => setHasWebGl(false))
      return
    }

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 100)
    camera.position.set(0, 0.15, variant === "ambient" ? 10.5 : 8.3)

    const palette = {
      teal: new THREE.MeshStandardMaterial({
        color: 0x2ecab2,
        metalness: 0.48,
        roughness: 0.35,
      }),
      tealSoft: new THREE.MeshStandardMaterial({
        color: 0x167d76,
        metalness: 0.35,
        roughness: 0.5,
      }),
      gold: new THREE.MeshStandardMaterial({
        color: 0xf3b958,
        metalness: 0.42,
        roughness: 0.32,
      }),
      coral: new THREE.MeshStandardMaterial({
        color: 0xf07f70,
        metalness: 0.3,
        roughness: 0.4,
      }),
      paper: new THREE.MeshStandardMaterial({
        color: 0xe6eee7,
        metalness: 0.08,
        roughness: 0.8,
      }),
    }

    scene.add(new THREE.AmbientLight(0xbfe6e2, 1.1))
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8)
    keyLight.position.set(4, 5, 7)
    scene.add(keyLight)
    const rimLight = new THREE.PointLight(0xf3b958, 18, 16)
    rimLight.position.set(-4, -2, 4)
    scene.add(rimLight)

    const universe = new THREE.Group()
    scene.add(universe)

    const planetGeometry = new THREE.SphereGeometry(1.05, 28, 28)
    const smallPlanetGeometry = new THREE.SphereGeometry(0.44, 20, 20)
    const ringGeometry = new THREE.TorusGeometry(1.45, 0.035, 10, 96)
    const blockGeometry = new THREE.BoxGeometry(1.65, 0.96, 0.18)

    const planet = new THREE.Mesh(planetGeometry, palette.tealSoft)
    const planetRing = new THREE.Mesh(ringGeometry, palette.gold)
    planetRing.rotation.x = 1.05
    planetRing.rotation.y = -0.3
    const planetGroup = new THREE.Group()
    planetGroup.add(planet, planetRing)
    planetGroup.position.set(2.45, 0.65, 0)

    const book = createBook({
      cover: palette.coral,
      paper: palette.paper,
      accent: palette.gold,
    })
    book.position.set(-2.55, 0.85, -0.1)
    book.rotation.set(-0.28, 0.58, -0.14)

    const atom = createAtom(palette.teal, palette.gold)
    atom.position.set(-1.05, -1.65, 0.35)
    atom.rotation.set(0.3, -0.25, 0.15)

    const codeBlock = new THREE.Mesh(blockGeometry, palette.teal)
    codeBlock.position.set(2.3, -1.65, -0.2)
    codeBlock.rotation.set(-0.12, -0.45, 0.12)

    const moon = new THREE.Mesh(smallPlanetGeometry, palette.gold)
    moon.position.set(0.35, 1.8, -0.45)

    universe.add(planetGroup, book, atom, codeBlock, moon)

    const particleCount = globalThis.window.innerWidth < 768 ? 260 : 560
    const positions = new Float32Array(particleCount * 3)
    for (let index = 0; index < particleCount; index += 1) {
      positions[index * 3] = (seededPosition(index, 0.1) - 0.5) * 15
      positions[index * 3 + 1] = (seededPosition(index, 1.7) - 0.5) * 10
      positions[index * 3 + 2] = (seededPosition(index, 4.2) - 0.5) * 7 - 1
    }
    const particleGeometry = new THREE.BufferGeometry()
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xa9fff2,
      opacity: variant === "ambient" ? 0.18 : 0.42,
      size: 0.025,
      transparent: true,
      sizeAttenuation: true,
    })
    const particles = new THREE.Points(particleGeometry, particleMaterial)
    scene.add(particles)

    const pointer = new THREE.Vector2()
    const prefersReducedMotion = globalThis.window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    let visible = !document.hidden

    function resize() {
      const width = sceneContainer.clientWidth
      const height = sceneContainer.clientHeight
      camera.aspect = width / Math.max(height, 1)
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
      renderer.setPixelRatio(Math.min(globalThis.window.devicePixelRatio, 1.5))
    }

    function handlePointerMove(event: PointerEvent) {
      pointer.x = (event.clientX / globalThis.window.innerWidth - 0.5) * 2
      pointer.y = (event.clientY / globalThis.window.innerHeight - 0.5) * 2
    }

    function handleVisibilityChange() {
      visible = !document.hidden
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(sceneContainer)
    globalThis.window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    })
    document.addEventListener("visibilitychange", handleVisibilityChange)
    resize()

    const startedAt = performance.now()
    renderer.setAnimationLoop(() => {
      if (!visible) {
        return
      }
      const elapsed = (performance.now() - startedAt) / 1000
      const motionScale = prefersReducedMotion ? 0 : 1

      universe.rotation.y += (pointer.x * 0.16 - universe.rotation.y) * 0.025
      universe.rotation.x += (-pointer.y * 0.1 - universe.rotation.x) * 0.025
      planetGroup.rotation.y = elapsed * 0.14 * motionScale
      book.rotation.y = 0.58 + Math.sin(elapsed * 0.45) * 0.16 * motionScale
      book.position.y = 0.85 + Math.sin(elapsed * 0.62) * 0.14 * motionScale
      atom.rotation.z = elapsed * 0.18 * motionScale
      codeBlock.position.y =
        -1.65 + Math.cos(elapsed * 0.54) * 0.12 * motionScale
      codeBlock.rotation.y = -0.45 + Math.sin(elapsed * 0.3) * 0.15 * motionScale
      moon.position.x = 0.35 + Math.cos(elapsed * 0.42) * 0.24 * motionScale
      particles.rotation.y = elapsed * 0.008 * motionScale
      camera.position.x += (pointer.x * 0.24 - camera.position.x) * 0.018
      camera.position.y +=
        (0.15 - pointer.y * 0.16 - camera.position.y) * 0.018
      camera.lookAt(0, 0, 0)
      renderer.render(scene, camera)
    })

    return () => {
      resizeObserver.disconnect()
      globalThis.window.removeEventListener("pointermove", handlePointerMove)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      renderer.setAnimationLoop(null)
      scene.traverse((object: THREE.Object3D) => {
        if (!(object instanceof THREE.Mesh)) {
          return
        }
        object.geometry.dispose()
      })
      particleGeometry.dispose()
      particleMaterial.dispose()
      Object.values(palette).forEach((material) => material.dispose())
      renderer.dispose()
    }
  }, [variant])

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={cn("absolute inset-0 overflow-hidden", className)}
    >
      {hasWebGl ? <canvas ref={canvasRef} className="size-full" /> : null}
      {!hasWebGl ? <EducationUniverseFallback /> : null}
    </div>
  )
}
