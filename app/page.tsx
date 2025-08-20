"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { MoodTracker } from "@/components/mood-tracker"
import { MedicationTracker } from "@/components/medication-tracker"
import { SleepTracker } from "@/components/sleep-tracker"
import { CalendarTracker } from "@/components/calendar-tracker"
import { TodoTracker } from "@/components/todo-tracker"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
  const [stats, setStats] = useState({
    goodDays: 0,
    medsTaken: 0,
    avgSleep: 0,
    tasksDone: 0
  })

  useEffect(() => {
    const loadStats = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get this week's data
      const startOfWeek = new Date()
      startOfWeek.setDate(startOfWeek.getDate() - 7)
      
      // Load todos completed this week
      const { data: todos } = await supabase
        .from("todos")
        .select("completed_at")
        .eq("user_id", user.id)
        .gte("completed_at", startOfWeek.toISOString())
        .eq("status", "completed")
      
      // Load mood entries this week (good days = mood score >= 4)
      const { data: moods } = await supabase
        .from("mood_entries")
        .select("score")
        .eq("user_id", user.id)
        .gte("created_at", startOfWeek.toISOString())
        .gte("score", 4)
      
      // Load medication logs this week
      const { data: medLogs } = await supabase
        .from("medication_logs")
        .select("taken_at")
        .eq("user_id", user.id)
        .gte("taken_at", startOfWeek.toISOString())
        .not("taken_at", "is", null)
      
      // Load sleep entries this week
      const { data: sleepEntries } = await supabase
        .from("sleep_entries")
        .select("duration")
        .eq("user_id", user.id)
        .gte("created_at", startOfWeek.toISOString())
      
      // Calculate stats
      const tasksDone = todos?.length || 0
      const goodDays = moods?.length || 0
      const medsTaken = medLogs?.length || 0
      
      // Calculate average sleep
      let avgSleep = 0
      if (sleepEntries && sleepEntries.length > 0) {
        const totalSleep = sleepEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0)
        avgSleep = Math.round((totalSleep / sleepEntries.length) * 10) / 10
      }
      
      // Calculate medication adherence - show count instead of percentage for simplicity
      const medsTakenCount = medLogs?.length || 0
      
      // Debug logging
      console.log('Dashboard Stats Debug:', {
        tasksDone,
        goodDays,
        medsTakenCount,
        avgSleep,
        todosData: todos,
        moodsData: moods,
        medLogsData: medLogs,
        sleepData: sleepEntries
      })
      
      setStats({
        goodDays,
        medsTaken: medsTakenCount,
        avgSleep,
        tasksDone
      })
    }
    
    loadStats()
  }, [])



  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-6 border border-primary/20">
        <h2 className="text-2xl font-bold mb-2">Good morning! 🌅</h2>
        <p className="text-muted-foreground">Welcome to your wellness garden. Here's how you're doing today.</p>
      </div>

      {/* Dashboard Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Today's Mood - Featured Card */}
        <MoodTracker />

        {/* Medications */}
        <MedicationTracker />

        {/* Sleep */}
        <SleepTracker />

        {/* Calendar */}
        <CalendarTracker />

        {/* To-Do */}
        <TodoTracker />

        {/* Quick Stats */}
        <Card className="md:col-span-2 lg:col-span-1 bg-gradient-to-br from-accent/10 to-primary/10 border-accent/20">
          <CardHeader>
            <CardTitle>This Week's Garden</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{stats.goodDays}</div>
                <div className="text-xs text-muted-foreground">Good days</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent">{stats.medsTaken}</div>
                <div className="text-xs text-muted-foreground">Meds taken</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-500">{stats.avgSleep}h</div>
                <div className="text-xs text-muted-foreground">Avg sleep</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-500">{stats.tasksDone}</div>
                <div className="text-xs text-muted-foreground">Tasks done</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


    </div>
  )
}
