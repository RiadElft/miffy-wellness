import { MoodTracker } from "@/components/mood-tracker"

export default function MoodPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Mood Garden</h1>
        <p className="text-muted-foreground">Track your emotional weather and tend to your inner garden.</p>
      </div>

      <MoodTracker />
    </div>
  )
}
