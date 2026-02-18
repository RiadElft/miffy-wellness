"use client"

interface AuthGuardProps {
  children: React.ReactNode
}

/** Demo mode: no login required, all routes accessible */
export function AuthGuard({ children }: AuthGuardProps) {
  return <>{children}</>
}
