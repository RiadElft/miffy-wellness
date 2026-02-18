"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/** Demo mode: redirect to dashboard */
export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/")
  }, [router])

  return null
}
