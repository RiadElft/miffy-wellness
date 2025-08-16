import { MedicationTracker } from "@/components/medication-tracker"

export default function MedicationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Little Helpers</h1>
        <p className="text-muted-foreground">Manage your medications with gentle reminders and tracking.</p>
      </div>

      <MedicationTracker />
    </div>
  )
}
