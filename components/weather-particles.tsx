"use client"

import { useEffect, useMemo, useState } from "react"
import Particles, { initParticlesEngine } from "@tsparticles/react"
import { loadSlim } from "@tsparticles/slim"

interface WeatherParticlesProps {
  mood?: string | null
  className?: string
}

export default function WeatherParticles({ mood, className }: WeatherParticlesProps) {
  const [init, setInit] = useState(false)

  // Initialize the tsParticles engine ONCE per application lifecycle
  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine)
    }).then(() => {
      setInit(true)
    })
  }, [])

  // Define particle options using useMemo for performance
  const particleOptions = useMemo(() => {
    const baseOptions = {
      fullScreen: { enable: false },
      fpsLimit: 60,
      detectRetina: true,
    }

    if (!mood) {
      return {
        ...baseOptions,
        particles: { number: { value: 0 } },
      }
    }

    const moodConfigs = {
      sunny: {
        particles: {
          number: { value: 30 },
          color: { value: ["#fcd34d", "#fdba74"] },
          shape: { type: "circle" },
          opacity: { value: { min: 0.4, max: 0.8 } },
          size: { value: { min: 2, max: 4 } },
          move: { enable: true, speed: 1, direction: "top" as const, outModes: { default: "out" as const } },
        },
      },
      "partly-cloudy": {
        particles: {
          number: { value: 20 },
          color: { value: "#ffffff" },
          shape: { type: "circle" },
          opacity: { value: 0.3 },
          size: { value: { min: 20, max: 60 } },
          move: { enable: true, speed: 0.2, direction: "right" as const, outModes: { default: "out" as const } },
        },
      },
      cloudy: {
        particles: {
          number: { value: 25 },
          color: { value: "#ffffff" },
          shape: { type: "circle" },
          opacity: { value: 0.25 },
          size: { value: { min: 30, max: 80 } },
          move: { enable: true, speed: 0.15, direction: "right" as const, outModes: { default: "out" as const } },
        },
      },
      rainy: {
        particles: {
          number: { value: 120 },
          color: { value: "#60a5fa" },
          shape: { type: "line" },
          opacity: { value: 0.6 },
          size: { value: { min: 15, max: 25 } },
          move: { enable: true, speed: 10, direction: "bottom" as const, outModes: { default: "out" as const } },
        },
      },
      stormy: {
        particles: {
          number: { value: 160 },
          color: { value: "#93c5fd" },
          shape: { type: "line" },
          opacity: { value: 0.7 },
          size: { value: { min: 20, max: 30 } },
          move: { enable: true, speed: 12, direction: "bottom" as const, outModes: { default: "out" as const } },
        },
      },
      rainbow: {
        particles: {
          number: { value: 40 },
          color: { value: ["#f87171", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa"] },
          shape: { type: "circle" },
          opacity: { value: 0.6 },
          size: { value: { min: 3, max: 5 } },
          move: { enable: true, speed: 1, direction: "top" as const, outModes: { default: "out" as const } },
        },
      },
      starry: {
        particles: {
          number: { value: 60 },
          color: { value: "#fff9c4" },
          shape: { type: "star" },
          opacity: { value: { min: 0.3, max: 0.9 } },
          size: { value: { min: 1, max: 3 } },
          move: { enable: true, speed: 0.1, direction: "none" as const, outModes: { default: "out" as const } },
        },
      },
    }

    return {
      ...baseOptions,
      ...moodConfigs[mood as keyof typeof moodConfigs],
    }
  }, [mood])

  // Render the Particles component once the engine is initialized
  if (init) {
    return (
      <Particles
        id="weatherParticles"
        options={particleOptions}
        className={className ?? "absolute inset-0"}
      />
    )
  }

  return <></> // Loading state while initializing
}
