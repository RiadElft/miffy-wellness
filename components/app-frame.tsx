"use client"

import React from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
import { Sidebar } from "@/components/sidebar"
import { ThemeSelector } from "@/components/theme-selector"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

interface AppFrameProps {
  children: React.ReactNode
}

export function AppFrame({ children }: AppFrameProps) {
  const { user, loading } = useAuth()
  const pathname = usePathname()

  const publicRoutes = ["/login", "/register", "/auth/callback"]
  const isPublicRoute = publicRoutes.includes(pathname)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render auth pages without the app chrome
  if (!user && isPublicRoute) {
    return <>{children}</>
  }

  // For all other cases (authenticated), render the full app shell
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


