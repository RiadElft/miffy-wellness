"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Pill, Plus, CheckCircle2, Circle, Edit, Trash2 } from "lucide-react"

interface Medication {
  id: string
  name: string
  dosage: string
  frequency: string
  times: string[]
  color: string
  notes?: string
  createdAt: Date
}

interface MedicationLog {
  id: string
  medicationId: string
  scheduledTime: string
  takenAt?: Date
  skipped?: boolean
  notes?: string
}

const medicationColors = [
  { name: "Pink", value: "bg-pink-400", ring: "ring-pink-400" },
  { name: "Blue", value: "bg-blue-400", ring: "ring-blue-400" },
  { name: "Green", value: "bg-green-400", ring: "ring-green-400" },
  { name: "Purple", value: "bg-purple-400", ring: "ring-purple-400" },
  { name: "Orange", value: "bg-orange-400", ring: "ring-orange-400" },
  { name: "Yellow", value: "bg-yellow-400", ring: "ring-yellow-400" },
]

export function MedicationTracker() {
  const [medications, setMedications] = useState<Medication[]>([])

  const [medicationLogs, setMedicationLogs] = useState<MedicationLog[]>([])
  const [dbMedicationIdMap, setDbMedicationIdMap] = useState<Record<string, string>>({})
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null)

  // Get today's medication schedule
  const getTodaysSchedule = () => {
    const today = new Date().toDateString()
    const schedule: Array<{
      medication: Medication
      time: string
      log?: MedicationLog
    }> = []

    medications.forEach((med) => {
      med.times.forEach((time) => {
        const logKey = `${med.id}-${time}-${today}`
        const log = medicationLogs.find((l) => l.id === logKey)
        schedule.push({
          medication: med,
          time,
          log,
        })
      })
    })

    return schedule.sort((a, b) => a.time.localeCompare(b.time))
  }

  const handleTakeMedication = async (medication: Medication, time: string) => {
    const today = new Date().toDateString()
    const logKey = `${medication.id}-${time}-${today}`

    const newLog: MedicationLog = {
      id: logKey,
      medicationId: medication.id,
      scheduledTime: time,
      takenAt: new Date(),
    }

    setMedicationLogs([...medicationLogs.filter((l) => l.id !== logKey), newLog])
    try {
      const coupleId = typeof window !== "undefined" ? localStorage.getItem("couple_id") : null
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({ title: "Cloud sync skipped", description: "Sign in to sync to cloud." })
        return
      }
      const dbMedId = dbMedicationIdMap[medication.id]
      if (!dbMedId) return
      const todayIso = new Date().toISOString().slice(0,10)
      const { error } = await supabase.from("medication_logs").insert({
        couple_id: coupleId ?? null,
        user_id: user.id,
        medication_id: dbMedId,
        scheduled_time: time,
        scheduled_date: todayIso,
        taken_at: new Date().toISOString(),
        skipped: false,
      })
      if (!error) {
        toast({ title: "Saved to cloud", description: "Medication mark synced." })
      } else {
        toast({ title: "Cloud sync failed", description: error.message, variant: "destructive" })
      }
    } catch {}
  }

  const handleSkipMedication = async (medication: Medication, time: string) => {
    const today = new Date().toDateString()
    const logKey = `${medication.id}-${time}-${today}`

    const newLog: MedicationLog = {
      id: logKey,
      medicationId: medication.id,
      scheduledTime: time,
      skipped: true,
    }

    setMedicationLogs([...medicationLogs.filter((l) => l.id !== logKey), newLog])
    try {
      const coupleId = typeof window !== "undefined" ? localStorage.getItem("couple_id") : null
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({ title: "Cloud sync skipped", description: "Sign in to sync to cloud." })
        return
      }
      const dbMedId = dbMedicationIdMap[medication.id]
      if (!dbMedId) return
      const todayIso = new Date().toISOString().slice(0,10)
      const { error } = await supabase.from("medication_logs").insert({
        couple_id: coupleId ?? null,
        user_id: user.id,
        medication_id: dbMedId,
        scheduled_time: time,
        scheduled_date: todayIso,
        skipped: true,
      })
      if (!error) {
        toast({ title: "Saved to cloud", description: "Medication skip synced." })
      } else {
        toast({ title: "Cloud sync failed", description: error.message, variant: "destructive" })
      }
    } catch {}
  }

  const handleAddMedication = async (medication: Omit<Medication, "id" | "createdAt">) => {
    const newMed: Medication = {
      ...medication,
      id: Date.now().toString(),
      createdAt: new Date(),
    }
    setMedications([...medications, newMed])
    setIsAddDialogOpen(false)
    // Cloud persist (store DB id separately ideally)
    try {
      const coupleId = typeof window !== "undefined" ? localStorage.getItem("couple_id") : null
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase
        .from("medications")
        .insert({
          couple_id: coupleId ?? null,
          user_id: user.id,
          name: newMed.name,
          dosage: newMed.dosage,
          frequency: (newMed.frequency as any),
          times: newMed.times,
          color: newMed.color,
          notes: newMed.notes ?? null,
        })
        .select("id")
        .single()
      if (!error && data?.id) {
        setDbMedicationIdMap((m) => ({ ...m, [newMed.id]: data.id }))
        toast({ title: "Saved to cloud", description: "Medication saved." })
      }
    } catch {}
  }

  const handleEditMedication = (medication: Medication | Omit<Medication, "id" | "createdAt">) => {
    if ((medication as Medication).id) {
      const typed = medication as Medication
      setMedications(medications.map((m) => (m.id === typed.id ? typed : m)))
    }
    setEditingMedication(null)
  }

  const handleDeleteMedication = (id: string) => {
    setMedications(medications.filter((m) => m.id !== id))
    setMedicationLogs(medicationLogs.filter((l) => l.medicationId !== id))
  }

  // Load medications and today's logs from Supabase
  useEffect(() => {
    const loadMeds = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase
        .from("medications")
        .select("id, name, dosage, frequency, times, color, notes, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100)
      if (!error && data) {
        const mapped = data.map((row: any) => ({
          id: row.id,
          name: row.name,
          dosage: row.dosage,
          frequency: row.frequency,
          times: row.times || [],
          color: row.color,
          notes: row.notes || "",
          createdAt: new Date(row.created_at),
        })) as unknown as Medication[]
        setMedications(mapped)
        // Map UI ids to DB ids 1:1 since we use DB ids as ids when loaded
        const idMap: Record<string, string> = {}
        mapped.forEach((m) => { idMap[m.id] = m.id })
        setDbMedicationIdMap(idMap)
      }

      const todayIso = new Date().toISOString().slice(0,10)
      const { data: logs, error: logErr } = await supabase
        .from("medication_logs")
        .select("id, medication_id, scheduled_time, scheduled_date, taken_at, skipped, notes")
        .eq("user_id", user.id)
        .eq("scheduled_date", todayIso)
        .limit(500)
      if (!logErr && logs) {
        const mappedLogs: MedicationLog[] = logs.map((row: any) => ({
          id: `${row.medication_id}-${row.scheduled_time}-${todayIso}`,
          medicationId: row.medication_id,
          scheduledTime: row.scheduled_time,
          takenAt: row.taken_at ? new Date(row.taken_at) : undefined,
          skipped: !!row.skipped,
          notes: row.notes || "",
        }))
        setMedicationLogs(mappedLogs)
      }
    }
    loadMeds()
  }, [])

  const todaysSchedule = getTodaysSchedule()
  const completedToday = todaysSchedule.filter((s) => s.log?.takenAt).length
  const totalToday = todaysSchedule.length

  return (
    <>
      {/* Main Medication Card */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-accent" />
              Little Helpers
            </div>
            <Badge variant="secondary" className="text-xs">
              {completedToday}/{totalToday} today
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {todaysSchedule.slice(0, 3).map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full transition-all duration-300 ${
                    item.log?.takenAt
                      ? `${item.medication.color} ring-2 ring-offset-1 ${
                          medicationColors.find((c) => c.value === item.medication.color)?.ring
                        }`
                      : item.log?.skipped
                        ? "bg-gray-300"
                        : "bg-muted border-2 border-dashed border-muted-foreground"
                  }`}
                />
                <div>
                  <span className="text-sm font-medium">{item.medication.name}</span>
                  <div className="text-xs text-muted-foreground">
                    {item.time} • {item.medication.dosage}
                  </div>
                </div>
              </div>
              {!item.log && (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleTakeMedication(item.medication, item.time)}
                    className="h-6 px-2 text-xs"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleSkipMedication(item.medication, item.time)}
                    className="h-6 px-2 text-xs"
                  >
                    <Circle className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full mt-4 bg-transparent">
                View All Helpers
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Your Little Helpers</span>
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2">
                        <Plus className="w-4 h-4" />
                        Add Helper
                      </Button>
                    </DialogTrigger>
                    <MedicationDialog onSave={handleAddMedication} />
                  </Dialog>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Today's Schedule */}
                <div>
                  <h3 className="font-semibold mb-3">Today's Schedule</h3>
                  <div className="grid gap-3">
                    {todaysSchedule.map((item, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border transition-all ${
                          item.log?.takenAt
                            ? "bg-green-50 border-green-200"
                            : item.log?.skipped
                              ? "bg-gray-50 border-gray-200"
                              : "bg-card border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-6 h-6 rounded-full ${item.medication.color} flex items-center justify-center`}
                            >
                              <Pill className="w-3 h-3 text-white" />
                            </div>
                            <div>
                              <div className="font-medium">{item.medication.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {item.time} • {item.medication.dosage}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.log?.takenAt && (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                Taken at{" "}
                                {item.log.takenAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </Badge>
                            )}
                            {item.log?.skipped && (
                              <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-800">
                                Skipped
                              </Badge>
                            )}
                            {!item.log && (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  onClick={() => handleTakeMedication(item.medication, item.time)}
                                  className="h-8 px-3 text-xs"
                                >
                                  Take Now
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSkipMedication(item.medication, item.time)}
                                  className="h-8 px-3 text-xs"
                                >
                                  Skip
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* All Medications */}
                <div>
                  <h3 className="font-semibold mb-3">All Your Helpers</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {medications.map((med) => (
                      <Card key={med.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-full ${med.color} flex items-center justify-center`}>
                              <Pill className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <div className="font-medium">{med.name}</div>
                              <div className="text-sm text-muted-foreground">{med.dosage}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {med.frequency} at {med.times.join(", ")}
                              </div>
                              {med.notes && (
                                <div className="text-xs text-muted-foreground mt-1 italic">"{med.notes}"</div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingMedication(med)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteMedication(med.id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Edit Medication Dialog */}
      {editingMedication && (
        <Dialog open={!!editingMedication} onOpenChange={() => setEditingMedication(null)}>
          <MedicationDialog medication={editingMedication} onSave={handleEditMedication} />
        </Dialog>
      )}
    </>
  )
}

function MedicationDialog({
  medication,
  onSave,
}: {
  medication?: Medication
  onSave: (medication: Medication | Omit<Medication, "id" | "createdAt">) => void
}) {
  const [formData, setFormData] = useState({
    name: medication?.name || "",
    dosage: medication?.dosage || "",
    // Map to enum values expected by DB: 'daily' | 'weekly' | 'as_needed'
    frequency: (medication?.frequency as any) || "daily",
    times: medication?.times || ["08:00"],
    color: medication?.color || "bg-pink-400",
    notes: medication?.notes || "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (medication) {
      onSave({ ...medication, ...formData })
    } else {
      onSave(formData)
    }
  }

  const addTime = () => {
    setFormData({ ...formData, times: [...formData.times, "12:00"] })
  }

  const removeTime = (index: number) => {
    setFormData({ ...formData, times: formData.times.filter((_, i) => i !== index) })
  }

  const updateTime = (index: number, time: string) => {
    const newTimes = [...formData.times]
    newTimes[index] = time
    setFormData({ ...formData, times: newTimes })
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>{medication ? "Edit Helper" : "Add New Helper"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Medication Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Morning Vitamin"
            required
          />
        </div>

        <div>
          <Label htmlFor="dosage">Dosage</Label>
          <Input
            id="dosage"
            value={formData.dosage}
            onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
            placeholder="e.g., 1 tablet, 2 capsules"
            required
          />
        </div>

        <div>
          <Label htmlFor="frequency">Frequency</Label>
          <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="as_needed">As needed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Times</Label>
          <div className="space-y-2">
            {formData.times.map((time, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => updateTime(index, e.target.value)}
                  className="flex-1"
                />
                {formData.times.length > 1 && (
                  <Button type="button" variant="outline" size="sm" onClick={() => removeTime(index)}>
                    Remove
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addTime} className="w-full bg-transparent">
              <Plus className="w-4 h-4 mr-2" />
              Add Time
            </Button>
          </div>
        </div>

        <div>
          <Label>Color</Label>
          <div className="flex gap-2 mt-2">
            {medicationColors.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => setFormData({ ...formData, color: color.value })}
                className={`w-8 h-8 rounded-full ${color.value} ${
                  formData.color === color.value ? `ring-2 ring-offset-2 ${color.ring}` : ""
                }`}
              />
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Any special instructions or reminders..."
            rows={2}
          />
        </div>

        <Button type="submit" className="w-full">
          {medication ? "Update Helper" : "Add Helper"}
        </Button>
      </form>
    </DialogContent>
  )
}
