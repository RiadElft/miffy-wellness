import { SleepTracker } from "@/components/sleep-tracker"

export default function SleepPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Rest & Dreams</h1>
        <p className="text-muted-foreground">Track your sleep patterns and create healthy bedtime routines.</p>
      </div>

      <SleepTracker />
    </div>
  )
}
