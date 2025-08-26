"use client"

import { useEffect, useRef, useState } from "react"

interface WeatherOverlayProps {
  mood?: string | null
  className?: string
}

export default function WeatherOverlay({ mood, className }: WeatherOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | undefined>(undefined)
  const [lightningVisible, setLightningVisible] = useState(false)
  const lastLightningRef = useRef(0)

  // Lightning effect for stormy
  useEffect(() => {
    if (mood !== "stormy") return

    const lightningInterval = setInterval(() => {
      if (Date.now() - lastLightningRef.current > 3000 + Math.random() * 4000) {
        setLightningVisible(true)
        lastLightningRef.current = Date.now()
        setTimeout(() => setLightningVisible(false), 150)
      }
    }, 100)

    return () => clearInterval(lightningInterval)
  }, [mood])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !mood) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Weather state
    let time = 0
    let raindrops: Array<{ x: number; y: number; speed: number; size: number; splash: number }> = []
    let clouds: Array<{ x: number; y: number; size: number; opacity: number; speed: number; type: string }> = []
    let heatWaves: Array<{ x: number; y: number; intensity: number; phase: number }> = []
    let gardenElements: Array<{ x: number; y: number; type: string; size: number; sway: number }> = []

    // Initialize weather based on mood
    const initWeather = () => {
      raindrops = []
      clouds = []
      heatWaves = []
      gardenElements = []

      // Initialize garden elements (trees, flowers, etc.)
      const initGarden = () => {
        // Trees
        for (let i = 0; i < 3; i++) {
          gardenElements.push({
            x: 50 + i * 200 + Math.random() * 100,
            y: canvas.height - 150,
            type: "tree",
            size: 80 + Math.random() * 40,
            sway: Math.random() * Math.PI * 2
          })
        }

        // Flowers
        for (let i = 0; i < 15; i++) {
          gardenElements.push({
            x: 30 + Math.random() * (canvas.width - 60),
            y: canvas.height - 80 + Math.random() * 40,
            type: "flower",
            size: 8 + Math.random() * 6,
            sway: Math.random() * Math.PI * 2
          })
        }

        // Bushes
        for (let i = 0; i < 5; i++) {
          gardenElements.push({
            x: 100 + Math.random() * (canvas.width - 200),
            y: canvas.height - 100,
            type: "bush",
            size: 30 + Math.random() * 20,
            sway: Math.random() * Math.PI * 2
          })
        }
      }

      initGarden()

      if (mood === "rainy" || mood === "stormy") {
        const count = mood === "stormy" ? 200 : 150
        for (let i = 0; i < count; i++) {
          raindrops.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            speed: 8 + Math.random() * 4 + (mood === "stormy" ? 3 : 0),
            size: 1 + Math.random() * 2,
            splash: 0
          })
        }

        // Add rain clouds
        const cloudCount = mood === "stormy" ? 6 : 4
        for (let i = 0; i < cloudCount; i++) {
          clouds.push({
            x: Math.random() * canvas.width,
            y: 30 + Math.random() * 80,
            size: 120 + Math.random() * 80,
            opacity: 0.4 + Math.random() * 0.3,
            speed: 0.1 + Math.random() * 0.2,
            type: "rain"
          })
        }
      }

      if (mood === "cloudy" || mood === "partly-cloudy") {
        const count = mood === "cloudy" ? 8 : 5
        for (let i = 0; i < count; i++) {
          clouds.push({
            x: Math.random() * canvas.width,
            y: 50 + Math.random() * 200,
            size: 80 + Math.random() * 120,
            opacity: 0.3 + Math.random() * 0.4,
            speed: 0.2 + Math.random() * 0.3,
            type: "normal"
          })
        }
      }

      if (mood === "sunny") {
        for (let i = 0; i < 15; i++) {
          heatWaves.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            intensity: 0.3 + Math.random() * 0.7,
            phase: Math.random() * Math.PI * 2
          })
        }
      }
    }

    initWeather()

    const drawTree = (x: number, y: number, size: number, sway: number) => {
      // Tree trunk
      ctx.fillStyle = "#8B4513"
      ctx.fillRect(x - 8, y - size * 0.6, 16, size * 0.6)

      // Tree foliage
      const swayOffset = Math.sin(time + sway) * 3
      ctx.fillStyle = "#228B22"
      ctx.beginPath()
      ctx.arc(x + swayOffset, y - size * 0.8, size * 0.4, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x + swayOffset - 15, y - size * 0.6, size * 0.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x + swayOffset + 15, y - size * 0.6, size * 0.3, 0, Math.PI * 2)
      ctx.fill()
    }

    const drawFlower = (x: number, y: number, size: number, sway: number) => {
      const swayOffset = Math.sin(time * 2 + sway) * 2
      
      // Flower petals
      const colors = ["#FF69B4", "#FFB6C1", "#FFC0CB", "#FF1493", "#FF69B4"]
      const color = colors[Math.floor(Math.random() * colors.length)]
      
      ctx.fillStyle = color
      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5
        const petalX = x + swayOffset + Math.cos(angle) * size
        const petalY = y + Math.sin(angle) * size
        ctx.beginPath()
        ctx.arc(petalX, petalY, size * 0.6, 0, Math.PI * 2)
        ctx.fill()
      }
      
      // Flower center
      ctx.fillStyle = "#FFD700"
      ctx.beginPath()
      ctx.arc(x + swayOffset, y, size * 0.3, 0, Math.PI * 2)
      ctx.fill()
    }

    const drawBush = (x: number, y: number, size: number, sway: number) => {
      const swayOffset = Math.sin(time * 1.5 + sway) * 2
      ctx.fillStyle = "#228B22"
      ctx.beginPath()
      ctx.arc(x + swayOffset, y, size, 0, Math.PI * 2)
      ctx.fill()
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      time += 0.016

      // Draw garden elements
      gardenElements.forEach((element) => {
        switch (element.type) {
          case "tree":
            drawTree(element.x, element.y, element.size, element.sway)
            break
          case "flower":
            drawFlower(element.x, element.y, element.size, element.sway)
            break
          case "bush":
            drawBush(element.x, element.y, element.size, element.sway)
            break
        }
      })

      // Draw clouds
      clouds.forEach((cloud) => {
        // Create cloud gradient
        const gradient = ctx.createRadialGradient(
          cloud.x, cloud.y, cloud.size * 0.3,
          cloud.x, cloud.y, cloud.size
        )
        
        if (cloud.type === "rain") {
          gradient.addColorStop(0, `rgba(100, 100, 100, ${cloud.opacity})`)
          gradient.addColorStop(1, "rgba(100, 100, 100, 0)")
        } else {
          gradient.addColorStop(0, `rgba(255, 255, 255, ${cloud.opacity})`)
          gradient.addColorStop(1, "rgba(255, 255, 255, 0)")
        }

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2)
        ctx.fill()

        // Move cloud
        cloud.x += cloud.speed
        if (cloud.x - cloud.size > canvas.width) {
          cloud.x = -cloud.size
          cloud.y = cloud.type === "rain" ? 30 + Math.random() * 80 : 50 + Math.random() * 200
        }
      })

      // Draw rain
      if (mood === "rainy" || mood === "stormy") {
        ctx.strokeStyle = mood === "stormy" ? "#93c5fd" : "#60a5fa"
        ctx.lineWidth = 1

        raindrops.forEach((drop, index) => {
          // Draw raindrop
          if (drop.splash === 0) {
            ctx.globalAlpha = 0.7
            ctx.beginPath()
            ctx.moveTo(drop.x, drop.y)
            ctx.lineTo(drop.x, drop.y + 15)
            ctx.stroke()

            // Move raindrop
            drop.y += drop.speed

            // Check if hit ground
            if (drop.y > canvas.height - 100) {
              drop.splash = 1
              drop.y = canvas.height - 100
            }
          } else {
            // Draw splash effect
            const splashSize = drop.splash * 20
            ctx.globalAlpha = (1 - drop.splash) * 0.6
            ctx.beginPath()
            ctx.arc(drop.x, drop.y, splashSize, 0, Math.PI * 2)
            ctx.fill()

            drop.splash += 0.05
            if (drop.splash > 1) {
              // Reset raindrop
              drop.x = Math.random() * canvas.width
              drop.y = -20
              drop.splash = 0
            }
          }
        })
      }

      // Draw heat distortion for sunny
      if (mood === "sunny") {
        ctx.globalAlpha = 0.1
        heatWaves.forEach((wave) => {
          const distortion = Math.sin(time * 2 + wave.phase) * wave.intensity * 10
          ctx.fillStyle = "rgba(255, 255, 255, 0.3)"
          ctx.fillRect(wave.x + distortion, wave.y, 2, 100)
          wave.phase += 0.02
        })
      }

      // Lightning flash
      if (lightningVisible) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      // Rainbow effect
      if (mood === "rainbow") {
        const rainbowY = canvas.height * 0.4
        const radius = Math.min(canvas.width, canvas.height) * 0.6
        const colors = ["#ff6b6b", "#feca57", "#48dbfb", "#ff9ff3", "#54a0ff"]
        
        colors.forEach((color, i) => {
          ctx.strokeStyle = color
          ctx.globalAlpha = 0.4
          ctx.lineWidth = 8
          ctx.beginPath()
          ctx.arc(canvas.width * 0.5, rainbowY, radius - i * 12, Math.PI, 2 * Math.PI)
          ctx.stroke()
        })
      }

      // Starry night effect
      if (mood === "starry") {
        for (let i = 0; i < 50; i++) {
          const x = (i * 137.5) % canvas.width
          const y = (i * 97.3) % (canvas.height * 0.7)
          const twinkle = Math.sin(time * 2 + i) * 0.5 + 0.5
          
          ctx.fillStyle = `rgba(255, 255, 255, ${twinkle * 0.8})`
          ctx.fillRect(x, y, 1, 1)
        }
      }

      ctx.globalAlpha = 1
      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [mood, lightningVisible])

  if (!mood) return null

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-10 ${className || ""}`}
      style={{ mixBlendMode: "overlay" }}
    />
  )
}
