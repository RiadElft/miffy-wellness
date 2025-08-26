"use client"

import type React from "react"

import { useEffect, useState, useMemo } from "react"
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
  const [isLoading, setIsLoading] = useState(true)

  // Get today's medication schedule - OPTIMIZED with memoization
  const todaysSchedule = useMemo(() => {
    const todayIso = new Date().toISOString().slice(0,10)
    const normalizeTimeToDb = (t: string) => (t.length === 5 ? `${t}:00` : t)
    const schedule: Array<{
      medication: Medication
      time: string
      log?: MedicationLog
    }> = []

    medications.forEach((med) => {
      med.times.forEach((t) => {
        const time = normalizeTimeToDb(t)
        // Use database ID for log lookup since logs are stored with DB IDs
        const dbMedId = dbMedicationIdMap[med.id] || med.id
        const logKey = `${dbMedId}-${time}-${todayIso}`
        const log = medicationLogs.find((l) => l.id === logKey)
        
        console.log(`Schedule lookup: med=${med.name}, time=${time}, logKey=${logKey}, found=${!!log}`)
        if (log) {
          console.log(`Found log:`, log)
        }
        
        schedule.push({
          medication: med,
          time,
          log,
        })
      })
    })

    return schedule.sort((a, b) => a.time.localeCompare(b.time))
  }, [medications, medicationLogs, dbMedicationIdMap])

  const completedToday = useMemo(() => 
    todaysSchedule.filter((s) => s.log?.takenAt).length, 
    [todaysSchedule]
  )
  
  const totalToday = useMemo(() => 
    todaysSchedule.length, 
    [todaysSchedule]
  )

  const handleTakeMedication = async (medication: Medication, time: string) => {
    const todayIso = new Date().toISOString().slice(0,10)
    const dbTime = time.length === 5 ? `${time}:00` : time
    const dbMedId = dbMedicationIdMap[medication.id] || medication.id
    const logKey = `${dbMedId}-${dbTime}-${todayIso}`

    const newLog: MedicationLog = {
      id: logKey,
      medicationId: medication.id,
      scheduledTime: time,
      takenAt: new Date(),
    }

    // Update local state first for immediate UI feedback
    setMedicationLogs(prev => [...prev.filter((l) => l.id !== logKey), newLog])
    
    try {
      const coupleId = typeof window !== "undefined" ? localStorage.getItem("couple_id") : null
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({ title: "Cloud sync skipped", description: "Sign in to sync to cloud." })
        return
      }
      
      if (!dbMedId) {
        toast({ title: "Error", description: "Medication not found in database", variant: "destructive" })
        return
      }
      
      // Try inserting first, then update if it fails
      const { error: insertError } = await supabase
        .from("medication_logs")
        .insert({
          couple_id: coupleId ?? null,
          user_id: user.id,
          medication_id: dbMedId,
          scheduled_time: dbTime,
          scheduled_date: todayIso,
          taken_at: new Date().toISOString(),
          skipped: false,
        })
      
      if (insertError) {
        console.log('Insert failed, trying update:', insertError.message)
        console.log('Update query conditions:', {
          medication_id: dbMedId,
          scheduled_time: dbTime,
          scheduled_date: todayIso,
          user_id: user.id
        })
        
        // First, let's check if the record exists
        const { data: existingRecords } = await supabase
          .from("medication_logs")
          .select("*")
          .eq("medication_id", dbMedId)
          .eq("scheduled_time", dbTime)
          .eq("scheduled_date", todayIso)
          .eq("user_id", user.id)
        
        console.log('Existing records found:', existingRecords)
        
        if (existingRecords && existingRecords.length > 0) {
          console.log('Current record state:', {
            taken_at: existingRecords[0].taken_at,
            skipped: existingRecords[0].skipped,
            attempting_to_set: {
              taken_at: new Date().toISOString(),
              skipped: false
            }
          })
        }
        
        // If insert fails (likely duplicate), try updating
        const { error: updateError, count } = await supabase
          .from("medication_logs")
          .update({
            taken_at: new Date().toISOString(),
            skipped: false,
          })
          .eq("medication_id", dbMedId)
          .eq("scheduled_time", dbTime)
          .eq("scheduled_date", todayIso)
          .eq("user_id", user.id)
        
        if (updateError) {
          console.error('Update failed:', updateError.message)
          toast({ title: "Cloud sync failed", description: updateError.message, variant: "destructive" })
          return
        }
        
        console.log('Update successful, count:', count)
        // Consider it successful if there's no error, even if count is null
      }
      
      toast({ title: "✅ Taken", description: "Medication marked as taken" })
    } catch (error) {
      console.error('Error saving medication log:', error)
      toast({ title: "Cloud sync failed", description: "An error occurred", variant: "destructive" })
    }
  }

  const handleSkipMedication = async (medication: Medication, time: string) => {
    const todayIso = new Date().toISOString().slice(0,10)
    const dbTime = time.length === 5 ? `${time}:00` : time
    const dbMedId = dbMedicationIdMap[medication.id] || medication.id
    const logKey = `${dbMedId}-${dbTime}-${todayIso}`

    const newLog: MedicationLog = {
      id: logKey,
      medicationId: medication.id,
      scheduledTime: time,
      skipped: true,
    }

    // Update local state first for immediate UI feedback
    setMedicationLogs(prev => [...prev.filter((l) => l.id !== logKey), newLog])
    
    try {
      const coupleId = typeof window !== "undefined" ? localStorage.getItem("couple_id") : null
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({ title: "Cloud sync skipped", description: "Sign in to sync to cloud." })
        return
      }
      
      if (!dbMedId) {
        toast({ title: "Error", description: "Medication not found in database", variant: "destructive" })
        return
      }
      
      // Try inserting first, then update if it fails
      const { error: insertError } = await supabase
        .from("medication_logs")
        .insert({
          couple_id: coupleId ?? null,
          user_id: user.id,
          medication_id: dbMedId,
          scheduled_time: dbTime,
          scheduled_date: todayIso,
          taken_at: null,
          skipped: true,
        })
      
      if (insertError) {
        console.log('Insert failed, trying update:', insertError.message)
        console.log('Update query conditions:', {
          medication_id: dbMedId,
          scheduled_time: dbTime,
          scheduled_date: todayIso,
          user_id: user.id
        })
        
        // First, let's check if the record exists
        const { data: existingRecords } = await supabase
          .from("medication_logs")
          .select("*")
          .eq("medication_id", dbMedId)
          .eq("scheduled_time", dbTime)
          .eq("scheduled_date", todayIso)
          .eq("user_id", user.id)
        
        console.log('Existing records found:', existingRecords)
        
        // If insert fails (likely duplicate), try updating
        const { error: updateError, count } = await supabase
          .from("medication_logs")
          .update({
            taken_at: null,
            skipped: true,
          })
          .eq("medication_id", dbMedId)
          .eq("scheduled_time", dbTime)
          .eq("scheduled_date", todayIso)
          .eq("user_id", user.id)
        
        if (updateError) {
          console.error('Update failed:', updateError.message)
          toast({ title: "Cloud sync failed", description: updateError.message, variant: "destructive" })
          return
        }
        
        console.log('Update successful, count:', count)
        // Consider it successful if there's no error, even if count is null
      }
      
      toast({ title: "⏭️ Skipped", description: "Medication marked as skipped" })
    } catch (error) {
      console.error('Error saving medication log:', error)
      toast({ title: "Cloud sync failed", description: "An error occurred", variant: "destructive" })
    }
  }

  const handleEditMedicationLog = async (medication: Medication, time: string, action: 'take' | 'skip' | 'clear') => {
    const todayIso = new Date().toISOString().slice(0,10)
    const dbTime = time.length === 5 ? `${time}:00` : time
    const dbMedId = dbMedicationIdMap[medication.id] || medication.id
    const logKey = `${dbMedId}-${dbTime}-${todayIso}`

    let newLog: MedicationLog | null = null
    
    if (action === 'take') {
      newLog = {
        id: logKey,
        medicationId: medication.id,
        scheduledTime: time,
        takenAt: new Date(),
        skipped: false,
      }
    } else if (action === 'skip') {
      newLog = {
        id: logKey,
        medicationId: medication.id,
        scheduledTime: time,
        skipped: true,
      }
    } else if (action === 'clear') {
      newLog = {
        id: logKey,
        medicationId: medication.id,
        scheduledTime: time,
        takenAt: undefined,
        skipped: false,
      }
    }

    if (newLog) {
      setMedicationLogs([...medicationLogs.filter((l) => l.id !== logKey), newLog])
    }

    try {
      const coupleId = typeof window !== "undefined" ? localStorage.getItem("couple_id") : null
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({ title: "Cloud sync skipped", description: "Sign in to sync to cloud." })
        return
      }
      if (!dbMedId) return
      const todayIso = new Date().toISOString().slice(0,10)
      
      if (action === 'clear') {
        // Update the log to have no status (neither taken nor skipped)
        const { error } = await supabase
          .from("medication_logs")
          .update({
            taken_at: null,
            skipped: false,
          })
          .eq("medication_id", dbMedId)
          .eq("scheduled_time", dbTime)
          .eq("scheduled_date", todayIso)
          .eq("user_id", user.id)
        
        if (!error) {
          toast({ title: "Saved to cloud", description: "Medication status cleared." })
        } else {
          toast({ title: "Cloud sync failed", description: error.message, variant: "destructive" })
        }
      } else {
        // Update or insert the log
        const { error: updateError } = await supabase
          .from("medication_logs")
          .upsert({
            couple_id: coupleId ?? null,
            user_id: user.id,
            medication_id: dbMedId,
            scheduled_time: dbTime,
            scheduled_date: todayIso,
            taken_at: action === 'take' ? new Date().toISOString() : null,
            skipped: action === 'skip',
          }, {
            onConflict: 'medication_id,scheduled_time,scheduled_date,user_id'
          })

        if (!updateError) {
          toast({ title: "Saved to cloud", description: `Medication marked as ${action === 'take' ? 'taken' : 'skipped'}.` })
        } else {
          toast({ title: "Cloud sync failed", description: updateError.message, variant: "destructive" })
        }
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

  const handleEditMedication = async (medication: Medication | Omit<Medication, "id" | "createdAt">) => {
    if ((medication as Medication).id) {
      const typed = medication as Medication
      setMedications(medications.map((m) => (m.id === typed.id ? typed : m)))
      
      // Update in database
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        
        const dbMedId = dbMedicationIdMap[typed.id]
        if (dbMedId) {
          const { error } = await supabase
            .from("medications")
            .update({
              name: typed.name,
              dosage: typed.dosage,
              frequency: typed.frequency as any,
              times: typed.times,
              color: typed.color,
              notes: typed.notes ?? null,
            })
            .eq("id", dbMedId)
            .eq("user_id", user.id)
          
          if (!error) {
            toast({ title: "Updated in cloud", description: "Medication updated." })
          } else {
            toast({ title: "Cloud sync failed", description: error.message, variant: "destructive" })
          }
        }
      } catch {}
    }
    setEditingMedication(null)
  }

  const handleDeleteMedication = async (id: string) => {
    setMedications(medications.filter((m) => m.id !== id))
    setMedicationLogs(medicationLogs.filter((l) => l.medicationId !== id))
    
    // Delete from database
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const dbMedId = dbMedicationIdMap[id]
      if (dbMedId) {
        // Delete medication logs first
        await supabase
          .from("medication_logs")
          .delete()
          .eq("medication_id", dbMedId)
          .eq("user_id", user.id)
        
        // Then delete the medication
        const { error } = await supabase
          .from("medications")
          .delete()
          .eq("id", dbMedId)
          .eq("user_id", user.id)
        
        if (!error) {
          toast({ title: "Deleted from cloud", description: "Medication removed." })
        } else {
          toast({ title: "Cloud sync failed", description: error.message, variant: "destructive" })
        }
      }
    } catch {}
  }

  // Load medications and today's logs from Supabase - OPTIMIZED
  useEffect(() => {
    const loadMeds = async () => {
      setIsLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setIsLoading(false)
        return
      }

      const todayIso = new Date().toISOString().slice(0,10)
      
      // Load both medications and today's logs in parallel
      const [medsResult, logsResult] = await Promise.all([
        supabase
          .from("medications")
          .select("id, name, dosage, frequency, times, color, notes, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50), // Reduced limit for faster loading
        supabase
          .from("medication_logs")
          .select("id, medication_id, scheduled_time, scheduled_date, taken_at, skipped, notes")
          .eq("user_id", user.id)
          .eq("scheduled_date", todayIso)
          .limit(100) // Reduced limit
      ])

      if (!medsResult.error && medsResult.data) {
        const mapped = medsResult.data.map((row: any) => ({
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
        
        // Since medications from DB already have their database IDs, 
        // we don't need a separate mapping
        const idMap: Record<string, string> = {}
        mapped.forEach((m) => { idMap[m.id] = m.id })
        setDbMedicationIdMap(idMap)
      }

      if (!logsResult.error && logsResult.data) {
        const mappedLogs: MedicationLog[] = logsResult.data.map((row: any) => ({
          id: `${row.medication_id}-${row.scheduled_time}-${todayIso}`,
          medicationId: row.medication_id,
          scheduledTime: row.scheduled_time,
          takenAt: row.taken_at ? new Date(row.taken_at) : undefined,
          skipped: !!row.skipped,
          notes: row.notes || "",
        }))
        setMedicationLogs(mappedLogs)
      }
      
      setIsLoading(false)
    }
    loadMeds()
  }, [])



  return (
    <>
      {/* Main Medication Card */}
      <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50/50 to-purple-50/50 border-blue-100">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <Pill className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-xl font-semibold">Little Helpers</div>
                <div className="text-sm text-muted-foreground">Your daily medication schedule</div>
              </div>
            </div>
            <div className="text-right">
              <Badge variant="secondary" className="text-sm px-3 py-1">
                {completedToday}/{totalToday} completed
              </Badge>
              <div className="text-xs text-muted-foreground mt-1">
                {totalToday > 0 ? `${Math.round((completedToday / totalToday) * 100)}% done` : 'No meds today'}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <p className="text-muted-foreground">Loading your medications...</p>
            </div>
          ) : todaysSchedule.length > 0 ? (
            <>
              {/* Today's Medications */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Today's Schedule</h4>
                {todaysSchedule.slice(0, 4).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-white/50 hover:bg-white/70 transition-colors">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-8 h-8 rounded-full transition-all duration-300 flex items-center justify-center ${
                          item.log?.takenAt
                            ? `${item.medication.color} ring-2 ring-offset-1 ${
                                medicationColors.find((c) => c.value === item.medication.color)?.ring
                              }`
                            : item.log?.skipped
                              ? "bg-gray-300"
                              : "bg-muted border-2 border-dashed border-muted-foreground"
                        }`}
                      >
                        {item.log?.takenAt ? (
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        ) : item.log?.skipped ? (
                          <Circle className="w-4 h-4 text-gray-600" />
                        ) : (
                          <Pill className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{item.medication.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.time} • {item.medication.dosage}
                        </div>
                      </div>
                    </div>
                    {(!item.log || (!item.log.takenAt && !item.log.skipped)) && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleTakeMedication(item.medication, item.time)}
                          className="h-8 px-3 text-sm"
                          title="Take medication"
                        >
                          Take
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSkipMedication(item.medication, item.time)}
                          className="h-8 px-3 text-sm"
                          title="Skip medication"
                        >
                          Skip
                        </Button>
                      </div>
                    )}
                    {(item.log?.takenAt || item.log?.skipped) && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditMedicationLog(item.medication, item.time, item.log?.takenAt ? 'skip' : 'take')}
                          className="h-8 w-8 p-0"
                          title={item.log?.takenAt ? "Mark as skipped" : "Mark as taken"}
                        >
                          {item.log?.takenAt ? <Circle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditMedicationLog(item.medication, item.time, 'clear')}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          title="Clear status"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                <div className="text-center">
                  <div className="text-lg font-bold text-primary">{completedToday}</div>
                  <div className="text-sm font-semibold text-muted-foreground">Taken</div>
                </div>
                                 <div className="text-center">
                   <div className="text-lg font-bold text-muted-foreground">{todaysSchedule.filter(s => s.log?.skipped).length}</div>
                   <div className="text-sm font-semibold text-muted-foreground">Skipped</div>
                 </div>
                 <div className="text-center">
                   <div className="text-lg font-bold text-accent-foreground">{totalToday - completedToday - todaysSchedule.filter(s => s.log?.skipped).length}</div>
                   <div className="text-sm font-semibold text-muted-foreground">Pending</div>
                 </div>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full bg-white/50 hover:bg-white/70">
                    View Full Schedule
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
                      <div className="grid gap-2">
                        {todaysSchedule.slice(0, 3).map((item, index) => (
                          <div
                            key={index}
                            className={`p-2 rounded-lg border transition-all ${
                              item.log?.takenAt
                                ? "bg-green-50 border-green-200"
                                : item.log?.skipped
                                  ? "bg-gray-50 border-gray-200"
                                  : "bg-card border-border"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-5 h-5 rounded-full ${item.medication.color} flex items-center justify-center`}
                                >
                                  <Pill className="w-2.5 h-2.5 text-white" />
                                </div>
                                <div>
                                  <div className="text-sm font-semibold">{item.medication.name}</div>
                                  <div className="text-xs text-muted-foreground font-medium">
                                    {item.time} • {item.medication.dosage}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {item.log?.takenAt && (
                                  <>
                                    <Badge variant="secondary" className="text-xs font-semibold bg-primary/10 text-primary">
                                      Taken
                                    </Badge>
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleEditMedicationLog(item.medication, item.time, 'skip')}
                                        className="h-5 px-1 text-xs"
                                        title="Mark as skipped"
                                      >
                                        <Circle className="w-2.5 h-2.5" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleEditMedicationLog(item.medication, item.time, 'clear')}
                                        className="h-5 px-1 text-xs text-destructive hover:text-destructive"
                                        title="Clear status"
                                      >
                                        <Trash2 className="w-2.5 h-2.5" />
                                      </Button>
                                    </div>
                                  </>
                                )}
                                {item.log?.skipped && (
                                  <>
                                    <Badge variant="secondary" className="text-xs font-semibold bg-muted text-muted-foreground">
                                      Skipped
                                    </Badge>
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleEditMedicationLog(item.medication, item.time, 'take')}
                                        className="h-5 px-1 text-xs"
                                        title="Mark as taken"
                                      >
                                        <CheckCircle2 className="w-2.5 h-2.5" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleEditMedicationLog(item.medication, item.time, 'clear')}
                                        className="h-5 px-1 text-xs text-destructive hover:text-destructive"
                                        title="Clear status"
                                      >
                                        <Trash2 className="w-2.5 h-2.5" />
                                      </Button>
                                    </div>
                                  </>
                                )}
                                {(!item.log || (!item.log.takenAt && !item.log.skipped)) && (
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      onClick={() => handleTakeMedication(item.medication, item.time)}
                                      className="h-6 px-2 text-xs"
                                    >
                                      Take
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleSkipMedication(item.medication, item.time)}
                                      className="h-6 px-2 text-xs"
                                    >
                                      Skip
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {todaysSchedule.length > 3 && (
                          <div className="text-center text-xs text-muted-foreground">
                            +{todaysSchedule.length - 3} more medications
                          </div>
                        )}
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
            </>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">💊</div>
              <p className="text-muted-foreground mb-4">No medications scheduled for today</p>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Your First Medication
                  </Button>
                </DialogTrigger>
                <MedicationDialog onSave={handleAddMedication} />
              </Dialog>
            </div>
          )}
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
