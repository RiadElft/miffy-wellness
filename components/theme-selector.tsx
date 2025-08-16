"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Palette } from "lucide-react"

const themes = [
  { name: "Miffy Yellow", class: "", color: "bg-yellow-300" },
  { name: "Soft Pink", class: "theme-pink", color: "bg-pink-300" },
  { name: "Sky Blue", class: "theme-blue", color: "bg-blue-300" },
  { name: "Warm Orange", class: "theme-orange", color: "bg-orange-300" },
  { name: "Cozy Teal", class: "theme-teal", color: "bg-teal-500" },
]

export function ThemeSelector() {
  const [currentTheme, setCurrentTheme] = useState("")
  const [isOpen, setIsOpen] = useState(false)

  const handleThemeChange = (themeClass: string) => {
    // Remove existing theme classes
    document.documentElement.className = document.documentElement.className.replace(/theme-\w+/g, "").trim()

    // Add new theme class if not default
    if (themeClass) {
      document.documentElement.classList.add(themeClass)
    }

    setCurrentTheme(themeClass)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setIsOpen(!isOpen)} className="gap-2">
        <Palette className="h-4 w-4" />
        Theme
      </Button>

      {isOpen && (
        <Card className="absolute right-0 top-12 z-50 p-4 w-48">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm mb-3">Choose your colors</h3>
            {themes.map((theme) => (
              <Button
                key={theme.name}
                variant={currentTheme === theme.class ? "default" : "ghost"}
                size="sm"
                onClick={() => handleThemeChange(theme.class)}
                className="w-full justify-start gap-3"
              >
                <div className={`w-4 h-4 rounded-full ${theme.color}`} />
                {theme.name}
              </Button>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
