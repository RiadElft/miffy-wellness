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
  return (
    <div className="relative min-h-screen">
      {/* Dashboard Content */}
      <div className="relative z-10 space-y-6">
        {/* Simple Welcome */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Good morning! 🌅</h1>
          <p className="text-muted-foreground">How are you feeling today?</p>
        </div>

        {/* Balanced Grid Layout */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-6">
            <MoodTracker isDashboard={true} />
            <SleepTracker isDashboard={true} />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <MedicationTracker />
            <CalendarTracker />
            <TodoTracker />
                       </div>
           </div>
         </div>
         

       </div>
     )
}
