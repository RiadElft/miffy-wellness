"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, Palette } from "lucide-react"
import { cn } from "@/lib/utils"

const themes = [
  { name: "Yasmine Yellow", class: "theme-default", color: "bg-yellow-300" },
  { name: "Soft Pink", class: "theme-pink", color: "bg-pink-300" },
  { name: "Sky Blue", class: "theme-blue", color: "bg-blue-300" },
  { name: "Mint Green", class: "theme-green", color: "bg-green-300" },
  { name: "Lavender", class: "theme-purple", color: "bg-purple-300" },
  { name: "Coral", class: "theme-orange", color: "bg-orange-300" },
]

export function ThemeSelector() {
  const [currentTheme, setCurrentTheme] = useState("theme-default")

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "theme-default"
    setCurrentTheme(savedTheme)
    applyTheme(savedTheme)
  }, [])

  const applyTheme = (themeClass: string) => {
    const root = document.documentElement
    // Remove all theme classes
    themes.forEach((theme) => {
      if (theme.class && theme.class.trim() !== "") {
        root.classList.remove(theme.class)
      }
    })
    // Add the selected theme class
    if (themeClass && themeClass.trim() !== "") {
      root.classList.add(themeClass)
    }
  }

  const handleThemeChange = (themeClass: string) => {
    setCurrentTheme(themeClass)
    applyTheme(themeClass)
    localStorage.setItem("theme", themeClass)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
          <Palette className="h-4 w-4" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48" align="end">
        <div className="grid grid-cols-2 gap-2">
          {themes.map((theme) => (
            <Button
              key={theme.name}
              variant="ghost"
              size="sm"
              className={cn(
                "h-auto p-3 flex flex-col items-center gap-2",
                currentTheme === theme.class && "bg-accent"
              )}
              onClick={() => handleThemeChange(theme.class)}
            >
              <div className={cn("w-4 h-4 rounded-full", theme.color)} />
              <span className="text-xs">{theme.name}</span>
              {currentTheme === theme.class && <Check className="h-3 w-3" />}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
