import { TodoTracker } from "@/components/todo-tracker"

export default function TodosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Small Steps</h1>
        <p className="text-muted-foreground">Break down your goals into manageable, gentle steps forward.</p>
      </div>

      <TodoTracker />
    </div>
  )
}
