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
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Moon, Star, Clock } from "lucide-react"

interface SleepEntry {
  id: string
  date: string
  bedtime: string
  wakeTime: string
  quality: number
  duration: number
  notes?: string
  createdAt: Date
}

const sleepQualityOptions = [
  { value: 1, label: "Restless", icon: "😴", description: "Tossed and turned" },
  { value: 2, label: "Light", icon: "🌙", description: "Some interruptions" },
  { value: 3, label: "Good", icon: "⭐", description: "Mostly peaceful" },
  { value: 4, label: "Deep", icon: "✨", description: "Very restful" },
  { value: 5, label: "Perfect", icon: "🌟", description: "Like a dream" },
]

const getMoonPhase = (quality: number) => {
  switch (quality) {
    case 1:
      return "🌑" // New moon for poor sleep
    case 2:
      return "🌒" // Waxing crescent
    case 3:
      return "🌓" // First quarter
    case 4:
      return "🌔" // Waxing gibbous
    case 5:
      return "🌕" // Full moon for perfect sleep
    default:
      return "🌙"
  }
}

export function SleepTracker() {
  const [sleepEntries, setSleepEntries] = useState<SleepEntry[]>([])

  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Helper function to remove duplicates
  const removeDuplicates = (entries: SleepEntry[]): SleepEntry[] => {
    const seen = new Set()
    return entries.filter(entry => {
      if (seen.has(entry.id)) {
        console.warn('Duplicate sleep entry found:', entry.id)
        return false
      }
      seen.add(entry.id)
      return true
    })
  }

  // Load recent sleep entries from Supabase
  useEffect(() => {
    const loadSleeps = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("sleep_entries")
        .select("id, date, bedtime, wake_time, quality, duration, notes, created_at")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(20)
      if (error || !data) return
      const mapped: SleepEntry[] = data.map((row: any) => ({
        id: row.id,
        date: new Date(row.date).toDateString(),
        bedtime: row.bedtime,
        wakeTime: row.wake_time,
        quality: row.quality,
        duration: Number(row.duration),
        notes: row.notes || "",
        createdAt: new Date(row.created_at),
      }))
      
      // Remove any duplicates by ID (failsafe)
      const uniqueEntries = mapped.filter((entry, index, self) => 
        index === self.findIndex(e => e.id === entry.id)
      )
      
      console.log('Sleep Tracker - Loaded entries:', uniqueEntries.length, uniqueEntries)
      setSleepEntries(uniqueEntries)
    }
    loadSleeps()
  }, [])

  const calculateDuration = (bedtime: string, wakeTime: string) => {
    const [bedHour, bedMin] = bedtime.split(":").map(Number)
    const [wakeHour, wakeMin] = wakeTime.split(":").map(Number)

    const bedMinutes = bedHour * 60 + bedMin
    let wakeMinutes = wakeHour * 60 + wakeMin

    // Handle overnight sleep
    if (wakeMinutes < bedMinutes) {
      wakeMinutes += 24 * 60
    }

    const durationMinutes = wakeMinutes - bedMinutes
    return Math.round((durationMinutes / 60) * 10) / 10
  }

  const handleSaveSleep = async (sleepData: Omit<SleepEntry, "id" | "createdAt" | "duration">) => {
    const duration = calculateDuration(sleepData.bedtime, sleepData.wakeTime)
    const sleepDate = new Date(sleepData.date).toISOString().slice(0, 10)
    
    // Cloud persist first to get the actual ID
    try {
      const coupleId = typeof window !== "undefined" ? localStorage.getItem("couple_id") : null
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({ title: "Cloud sync skipped", description: "Sign in to sync to cloud." })
        return
      }

      // Check if entry exists for this date
      const { data: existing } = await supabase
        .from("sleep_entries")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", sleepDate)
        .single()

      let result
      if (existing) {
        // Update existing entry
        result = await supabase
          .from("sleep_entries")
          .update({
            bedtime: sleepData.bedtime,
            wake_time: sleepData.wakeTime,
            quality: sleepData.quality,
            duration,
            notes: sleepData.notes ?? null,
          })
          .eq("id", existing.id)
          .select("id, created_at")
          .single()
      } else {
        // Insert new entry
        result = await supabase
          .from("sleep_entries")
          .insert({
            couple_id: coupleId ?? null,
            user_id: user.id,
            date: sleepDate,
            bedtime: sleepData.bedtime,
            wake_time: sleepData.wakeTime,
            quality: sleepData.quality,
            duration,
            notes: sleepData.notes ?? null,
          })
          .select("id, created_at")
          .single()
      }

      if (!result.error && result.data) {
        // Update local state
        const newEntry: SleepEntry = {
          ...sleepData,
          id: result.data.id,
          duration,
          createdAt: new Date(result.data.created_at),
        }

        // Update local state properly - remove duplicates by ID and date
        setSleepEntries(prevEntries => {
          // Remove any existing entry with the same ID or date
          const filtered = prevEntries.filter(entry => 
            entry.id !== result.data.id && 
            new Date(entry.date).toDateString() !== new Date(sleepData.date).toDateString()
          )
          const newEntries = [newEntry, ...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          return removeDuplicates(newEntries)
        })
        
        toast({ title: "Saved to cloud", description: existing ? "Sleep entry updated." : "Sleep entry synced." })
      } else {
        toast({ title: "Cloud sync failed", description: result.error?.message || "Unknown error", variant: "destructive" })
      }
    } catch (err) {
      toast({ title: "Cloud sync failed", description: "Please try again.", variant: "destructive" })
    }
    setIsDialogOpen(false)
  }

  const todaysSleep = sleepEntries.find((entry) => entry.date === new Date().toDateString())
  const averageDuration =
    sleepEntries.length > 0 ? sleepEntries.reduce((sum, entry) => sum + entry.duration, 0) / sleepEntries.length : 0
  const averageQuality =
    sleepEntries.length > 0 ? sleepEntries.reduce((sum, entry) => sum + entry.quality, 0) / sleepEntries.length : 0

  return (
    <>
      {/* Main Sleep Card */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="w-5 h-5 text-blue-500" />
            Rest & Dreams
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todaysSleep ? (
            <div className="text-center space-y-3">
              <div className="text-4xl">{getMoonPhase(todaysSleep.quality)}</div>
              <div>
                <p className="font-medium text-primary">{todaysSleep.duration}h of rest</p>
                <p className="text-sm text-muted-foreground">
                  {sleepQualityOptions.find((q) => q.value === todaysSleep.quality)?.label} sleep
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                {todaysSleep.bedtime} → {todaysSleep.wakeTime}
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full bg-transparent">
                    Update Sleep
                  </Button>
                </DialogTrigger>
                <SleepDialog onSave={handleSaveSleep} existingEntry={todaysSleep} />
              </Dialog>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <div className="text-4xl opacity-50">🌙</div>
              <p className="text-muted-foreground">Ready to log your rest?</p>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="w-full">
                    Log Sleep
                  </Button>
                </DialogTrigger>
                <SleepDialog onSave={handleSaveSleep} />
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sleep History & Stats Card */}
      {sleepEntries.length > 0 && (
        <Card className="md:col-span-2 lg:col-span-3 hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-purple-500" />
              Your Sleep Garden
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Sleep Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 rounded-lg bg-blue-50 border border-blue-100">
                <div className="text-2xl font-bold text-blue-600">{averageDuration.toFixed(1)}h</div>
                <div className="text-xs text-muted-foreground">Avg Duration</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-purple-50 border border-purple-100">
                <div className="text-2xl font-bold text-purple-600">{averageQuality.toFixed(1)}/5</div>
                <div className="text-xs text-muted-foreground">Avg Quality</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-50 border border-green-100">
                <div className="text-2xl font-bold text-green-600">{sleepEntries.length}</div>
                <div className="text-xs text-muted-foreground">Nights Logged</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-yellow-50 border border-yellow-100">
                <div className="text-2xl font-bold text-yellow-600">
                  {sleepEntries.filter((e) => e.quality >= 4).length}
                </div>
                <div className="text-xs text-muted-foreground">Great Nights</div>
              </div>
            </div>

            {/* Recent Sleep Entries */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Recent Rest
              </h3>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {sleepEntries.slice(0, 6).map((entry, index) => (
                  <div
                    key={`${entry.id}-${entry.date}-${index}`}
                    className="p-4 rounded-lg border bg-gradient-to-br from-blue-50/50 to-purple-50/50 border-blue-100"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-3xl">{getMoonPhase(entry.quality)}</span>
                      <Badge variant="secondary" className="text-xs">
                        {entry.duration}h
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-sm">
                        {sleepQualityOptions.find((q) => q.value === entry.quality)?.label} Sleep
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.date).toLocaleDateString()} • {entry.bedtime} → {entry.wakeTime}
                      </p>
                      {entry.notes && <p className="text-xs italic text-muted-foreground">"{entry.notes}"</p>}
                    </div>
                  </div>
                ))}
              </div>
              {sleepEntries.length > 6 && (
                <Button variant="outline" className="w-full mt-4 bg-transparent">
                  View All Sleep Entries ({sleepEntries.length})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}

function SleepDialog({ 
  onSave, 
  existingEntry 
}: { 
  onSave: (sleepData: Omit<SleepEntry, "id" | "createdAt" | "duration">) => void
  existingEntry?: SleepEntry
}) {
  const [formData, setFormData] = useState({
    date: existingEntry?.date || new Date().toDateString(),
    bedtime: existingEntry?.bedtime || "22:00",
    wakeTime: existingEntry?.wakeTime || "07:00",
    quality: existingEntry?.quality || 3,
    notes: existingEntry?.notes || "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const duration = formData.bedtime && formData.wakeTime ? calculateDuration(formData.bedtime, formData.wakeTime) : 0

  function calculateDuration(bedtime: string, wakeTime: string) {
    const [bedHour, bedMin] = bedtime.split(":").map(Number)
    const [wakeHour, wakeMin] = wakeTime.split(":").map(Number)

    const bedMinutes = bedHour * 60 + bedMin
    let wakeMinutes = wakeHour * 60 + wakeMin

    if (wakeMinutes < bedMinutes) {
      wakeMinutes += 24 * 60
    }

    const durationMinutes = wakeMinutes - bedMinutes
    return Math.round((durationMinutes / 60) * 10) / 10
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="text-center">
          {existingEntry ? "Update Your Sleep" : "How did you rest?"}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date */}
        <div>
          <Label htmlFor="date">Sleep Date</Label>
          <Input
            id="date"
            type="date"
            value={new Date(formData.date).toISOString().split("T")[0]}
            onChange={(e) => setFormData({ ...formData, date: new Date(e.target.value).toDateString() })}
            required
          />
        </div>

        {/* Sleep Times */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="bedtime">Bedtime</Label>
            <Input
              id="bedtime"
              type="time"
              value={formData.bedtime}
              onChange={(e) => setFormData({ ...formData, bedtime: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="wakeTime">Wake Time</Label>
            <Input
              id="wakeTime"
              type="time"
              value={formData.wakeTime}
              onChange={(e) => setFormData({ ...formData, wakeTime: e.target.value })}
              required
            />
          </div>
        </div>

        {/* Duration Display */}
        {duration > 0 && (
          <div className="text-center p-3 rounded-lg bg-blue-50 border border-blue-100">
            <div className="text-lg font-semibold text-blue-600">{duration} hours of rest</div>
            <div className="text-sm text-muted-foreground">
              {duration >= 7 && duration <= 9
                ? "Perfect amount!"
                : duration < 7
                  ? "Consider more rest"
                  : "Lots of sleep!"}
            </div>
          </div>
        )}

        {/* Sleep Quality */}
        <div>
          <Label>How was your sleep quality?</Label>
          <div className="grid grid-cols-5 gap-2 mt-2">
            {sleepQualityOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFormData({ ...formData, quality: option.value })}
                className={`p-3 rounded-lg border-2 transition-all text-center ${
                  formData.quality === option.value
                    ? "border-primary bg-primary/10 shadow-lg"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="text-2xl mb-1">{option.icon}</div>
                <div className="text-xs font-medium">{option.label}</div>
              </button>
            ))}
          </div>
          {formData.quality && (
            <p className="text-sm text-muted-foreground mt-2 text-center">
              {sleepQualityOptions.find((q) => q.value === formData.quality)?.description}
            </p>
          )}
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes">Sleep Notes (optional)</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="How did you feel? Any dreams or thoughts about your rest..."
            rows={3}
          />
        </div>

        {/* Save Button */}
        <Button type="submit" className="w-full" size="lg">
          {existingEntry ? "Update Sleep Entry" : "Save My Rest"}
        </Button>
      </form>
    </DialogContent>
  )
}
