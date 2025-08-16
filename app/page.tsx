"use client"
import { MoodTracker } from "@/components/mood-tracker"
import { MedicationTracker } from "@/components/medication-tracker"
import { SleepTracker } from "@/components/sleep-tracker"
import { CalendarTracker } from "@/components/calendar-tracker"
import { TodoTracker } from "@/components/todo-tracker"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
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
                <div className="text-2xl font-bold text-primary">5</div>
                <div className="text-xs text-muted-foreground">Good days</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent">98%</div>
                <div className="text-xs text-muted-foreground">Meds taken</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-500">7.2h</div>
                <div className="text-xs text-muted-foreground">Avg sleep</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-500">12</div>
                <div className="text-xs text-muted-foreground">Tasks done</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
