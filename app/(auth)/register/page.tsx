"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/** Demo mode: redirect to dashboard */
export default function RegisterPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/")
  }, [router])

  return null
}
