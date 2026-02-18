"use client"

import React from "react"
import { Sidebar } from "@/components/sidebar"
import { ThemeSelector } from "@/components/theme-selector"

interface AppFrameProps {
  children: React.ReactNode
}

/** Demo mode: always show full app shell with sidebar */
export function AppFrame({ children }: AppFrameProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10">
      <Sidebar />

      {/* Main Content */}
      <div className="transition-all duration-300 md:ml-72 [&:has(~aside.w-16)]:md:ml-16">
        {/* Header */}
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-20">
          <div className="px-4 py-4 flex items-center justify-between">
            <div className="md:hidden" />
            <div className="hidden md:block">
              <h1 className="text-xl font-bold">Yasmine's Garden</h1>
              <p className="text-sm text-muted-foreground">Your gentle garden companion</p>
            </div>
            <ThemeSelector />
          </div>
        </header>

        {/* Page Content */}
        <main className="container mx-auto px-4 py-8">{children}</main>
      </div>
    </div>
  )
}


