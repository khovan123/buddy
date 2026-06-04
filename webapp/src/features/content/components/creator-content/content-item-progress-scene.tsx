"use client"

import { useEffect, useMemo, useRef } from "react"

import * as THREE from "three"

import { cn } from "@/lib/utils"

type ContentItemProgressSceneProps = {
  status: string
  moderationStatus?: string | null
  verified?: boolean
  className?: string
}

type ProgressState = {
  color: number
  progress: number
  speed: number
}

const normalizeStatus = (value?: string | null) =>
  value?.trim().replace(/[\s-]+/g, "_").toUpperCase() ?? ""

const getProgressState = ({
  status,
  moderationStatus,
  verified,
}: Pick<
  ContentItemProgressSceneProps,
  "status" | "moderationStatus" | "verified"
>): ProgressState => {
  const contentStatus = normalizeStatus(status)
  const moderation = normalizeStatus(moderationStatus)

  if (
    contentStatus === "BANNED" ||
    contentStatus === "FAILED" ||
    contentStatus === "DELETED" ||
    moderation === "REJECTED" ||
    moderation === "ERROR"
  ) {
    return { color: 0xef4444, progress: 0.28, speed: 0.002 }
  }

  if (moderation === "NEEDS_REVIEW") {
    return { color: 0xf59e0b, progress: 0.58, speed: 0.005 }
  }

  if (
    verified ||
    contentStatus === "AVAILABLE" ||
    moderation === "APPROVED" ||
    contentStatus === "ACTIVE"
  ) {
    return { color: 0x10b981, progress: 1, speed: 0.0012 }
  }

  if (contentStatus === "PROCESSING" || moderation === "PENDING") {
    return { color: 0x0ea5e9, progress: 0.72, speed: 0.006 }
  }

  return { color: 0xf59e0b, progress: 0.42, speed: 0.004 }
}

export function ContentItemProgressScene({
  status,
  moderationStatus,
  verified,
  className,
}: ContentItemProgressSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const progressState = useMemo(
    () => getProgressState({ status, moderationStatus, verified }),
    [moderationStatus, status, verified]
  )

  useEffect(() => {
    const mount = mountRef.current

    if (!mount) {
      return
    }

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: process.env.NODE_ENV === "development",
    })
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio, 2))
    renderer.domElement.setAttribute("aria-hidden", "true")
    renderer.domElement.dataset.contentProgressCanvas = "true"
    renderer.domElement.style.pointerEvents = "none"
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
    camera.position.set(0, 0, 5.2)
    camera.lookAt(0, 0, 0)

    const group = new THREE.Group()
    scene.add(group)

    scene.add(new THREE.AmbientLight(0xffffff, 0.72))
    const light = new THREE.DirectionalLight(0xffffff, 1.5)
    light.position.set(1.8, 2.8, 3.2)
    scene.add(light)

    const track = new THREE.Mesh(
      new THREE.TorusGeometry(0.72, 0.045, 8, 48),
      new THREE.MeshStandardMaterial({
        color: 0xd1d5db,
        metalness: 0.08,
        opacity: 0.42,
        roughness: 0.58,
        transparent: true,
      })
    )
    group.add(track)

    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(
        0.72,
        0.06,
        8,
        48,
        Math.max(progressState.progress, 0.08) * Math.PI * 2
      ),
      new THREE.MeshStandardMaterial({
        color: progressState.color,
        metalness: 0.18,
        roughness: 0.38,
      })
    )
    arc.rotation.z = -Math.PI / 2
    group.add(arc)

    const core = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.32, 0.32),
      new THREE.MeshStandardMaterial({
        color: progressState.color,
        metalness: 0.22,
        roughness: 0.42,
      })
    )
    group.add(core)

    const setSize = () => {
      const width = mount.clientWidth
      const height = mount.clientHeight

      renderer.setSize(width, height, false)
      camera.aspect = width / Math.max(height, 1)
      camera.updateProjectionMatrix()
    }

    const resizeObserver = new ResizeObserver(setSize)
    resizeObserver.observe(mount)
    setSize()

    let frameId = 0
    const animate = (time: number) => {
      group.rotation.z = time * progressState.speed
      core.rotation.x = time * 0.0013
      core.rotation.y = time * 0.001
      renderer.render(scene, camera)
      frameId = globalThis.requestAnimationFrame(animate)
    }
    frameId = globalThis.requestAnimationFrame(animate)

    return () => {
      globalThis.cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      mount.removeChild(renderer.domElement)
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) {
          return
        }

        object.geometry.dispose()

        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose())
        } else {
          object.material.dispose()
        }
      })
      renderer.dispose()
    }
  }, [progressState])

  return (
    <div
      ref={mountRef}
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded bg-muted/20",
        className
      )}
    />
  )
}
