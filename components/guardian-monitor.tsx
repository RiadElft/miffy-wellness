"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"

type MoodRow = { created_at: string; score: number; mood_id: string; note: string | null }

export function GuardianMonitor() {
  const [moods, setMoods] = useState<MoodRow[]>([])

  useEffect(() => {
    const coupleId = typeof window !== "undefined" ? localStorage.getItem("couple_id") : null
    if (!coupleId) return

    const load = async () => {
      const { data } = await supabase
        .from("mood_entries")
        .select("created_at, score, mood_id, note")
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: false })
        .limit(20)
      setMoods((data as MoodRow[]) ?? [])
    }
    load()

    const channel = supabase
      .channel("mood-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mood_entries", filter: `couple_id=eq.${coupleId}` },
        (payload) => setMoods((prev) => [payload.new as MoodRow, ...prev])
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <Card className="p-4">
      <div className="font-semibold mb-2">Recent Moods</div>
      <ul className="space-y-2 text-sm">
        {moods.map((m, idx) => (
          <li key={idx}>
            {new Date(m.created_at).toLocaleString()} • {m.mood_id} ({m.score}){m.note ? ` — ${m.note}` : ""}
          </li>
        ))}
      </ul>
    </Card>
  )
}



