import { CouplesActivities } from "@/components/couples-activities"
import { GuardianSetup } from "@/components/guardian-setup"
import { GuardianMonitor } from "@/components/guardian-monitor"

export default function CouplesPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <GuardianSetup />
      </div>
      <div className="mb-6">
        <GuardianMonitor />
      </div>
      <CouplesActivities />
    </div>
  )
}
