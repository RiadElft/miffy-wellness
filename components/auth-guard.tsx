"use client"

import { useAuth } from "./auth-provider"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { usePathname } from "next/navigation"

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
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

  // Allow public routes to render even when not authenticated
  if (!user && isPublicRoute) return <>{children}</>

  if (!user) return null

  return <>{children}</>
}
