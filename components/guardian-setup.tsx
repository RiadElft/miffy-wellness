"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function GuardianSetup() {
  const [email, setEmail] = useState("")
  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem("couple_id")
    if (saved) setCoupleId(saved)
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null))
  }, [])

  const sendMagicLink = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
      if (error) throw error
      alert("Magic link sent. Check your email.")
    } catch (e: any) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  const createCouple = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Sign in first from the magic link")
      const { data, error } = await supabase
        .from("couples")
        .insert({ created_by: user.id })
        .select("id")
        .single()
      if (error) throw error
      const cid = data!.id as string
      const { error: mErr } = await supabase
        .from("couple_members")
        .insert({ couple_id: cid, user_id: user.id, role: "owner" })
      if (mErr) throw mErr
      localStorage.setItem("couple_id", cid)
      setCoupleId(cid)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  const joinAsGuardian = async (cid: string) => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Sign in first from the magic link")
      const { error } = await supabase
        .from("couple_members")
        .insert({ couple_id: cid, user_id: user.id, role: "guardian" })
      if (error) throw error
      localStorage.setItem("couple_id", cid)
      setCoupleId(cid)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="text-sm font-medium">Link accounts</div>
      {userEmail ? (
        <div className="text-xs text-muted-foreground">Signed in as {userEmail}</div>
      ) : (
        <div className="text-xs text-destructive">Not signed in</div>
      )}
      <div className="flex gap-2">
        <Input placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button onClick={sendMagicLink} disabled={loading || !email}>Send magic link</Button>
      </div>
      {!coupleId ? (
        <div className="flex flex-col gap-2">
          <Button onClick={createCouple} disabled={loading}>I am the owner (create couple)</Button>
          <div className="flex gap-2">
            <Input id="cid" placeholder="Enter couple ID" />
            <Button onClick={() => {
              const cid = (document.getElementById("cid") as HTMLInputElement)?.value.trim()
              if (cid) joinAsGuardian(cid)
            }} disabled={loading}>Join as guardian</Button>
          </div>
        </div>
      ) : (
        <div className="text-xs">Linked to couple: <code>{coupleId}</code></div>
      )}
    </Card>
  )
}


