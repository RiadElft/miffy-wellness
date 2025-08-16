import { CalendarTracker } from "@/components/calendar-tracker"

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Gentle Guide</h1>
        <p className="text-muted-foreground">Organize your appointments and important dates with care.</p>
      </div>

      <CalendarTracker />
    </div>
  )
}
