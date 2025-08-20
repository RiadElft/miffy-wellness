"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Heart, Calendar } from "lucide-react"

const moodOptions: Array<{
  id: string
  name: string
  icon: string
  description: string
  color: string
  value: number
}> = [
  {
    id: "sunny",
    name: "Sunny & Bright",
    icon: "☀️",
    description: "Feeling wonderful and energetic",
    color: "from-yellow-200 to-orange-200",
    value: 5,
  },
  {
    id: "partly-cloudy",
    name: "Partly Cloudy",
    description: "Good with some mixed feelings",
    icon: "⛅",
    color: "from-blue-100 to-yellow-100",
    value: 4,
  },
  {
    id: "cloudy",
    name: "Cloudy",
    description: "Feeling okay, a bit neutral",
    icon: "☁️",
    color: "from-gray-100 to-blue-100",
    value: 3,
  },
  {
    id: "rainy",
    name: "Rainy",
    description: "Feeling down or sad",
    icon: "🌧️",
    color: "from-blue-200 to-gray-200",
    value: 2,
  },
  {
    id: "stormy",
    name: "Stormy",
    description: "Struggling or very difficult",
    icon: "⛈️",
    color: "from-gray-300 to-blue-300",
    value: 1,
  },
  {
    id: "rainbow",
    name: "Rainbow",
    description: "Mixed but hopeful",
    icon: "🌈",
    color: "from-pink-200 to-purple-200",
    value: 4,
  },
  {
    id: "starry",
    name: "Starry Night",
    description: "Peaceful and reflective",
    icon: "🌌",
    color: "from-indigo-200 to-purple-200",
    value: 3,
  },
]

interface MoodEntry {
  id: string
  mood: (typeof moodOptions)[0]
  note: string
  timestamp: Date
}

export function MoodTracker() {
  const [selectedMood, setSelectedMood] = useState<(typeof moodOptions)[0] | null>(null)
  const [note, setNote] = useState("")
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Load recent moods from Supabase
  useEffect(() => {
    const loadMoods = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("mood_entries")
        .select("id, mood_id, note, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20)
      if (error || !data) {
        if (error) console.error('Mood Tracker - Error loading moods:', error)
        return
      }
      const mapped: MoodEntry[] = data.map((row) => {
        const opt = moodOptions.find((m) => m.id === (row as any).mood_id) || moodOptions[0]
        return {
          id: (row as any).id,
          mood: opt,
          note: (row as any).note || "",
          timestamp: new Date((row as any).created_at),
        }
      })
      console.log('Mood Tracker - Loaded moods:', mapped.length, mapped)
      setMoodHistory(mapped)
    }
    loadMoods()
  }, [])

  const handleMoodSelect = (mood: (typeof moodOptions)[0]) => {
    setSelectedMood(mood)
  }

  const handleSaveMood = async () => {
    if (!selectedMood) return

    const newEntry: MoodEntry = {
      id: Date.now().toString(),
      mood: selectedMood,
      note,
      timestamp: new Date(),
    }

    setMoodHistory([newEntry, ...moodHistory])

    // Cloud persist if linked and authenticated
    try {
      const coupleId = typeof window !== "undefined" ? localStorage.getItem("couple_id") : null
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({ title: "Cloud sync skipped", description: "Sign in to sync to cloud." })
        throw new Error("missing_user")
      }
      const { error } = await supabase.from("mood_entries").insert({
        couple_id: coupleId ?? null,
        user_id: user.id,
        score: selectedMood.value,
        mood_id: selectedMood.id,
        note,
      })
      if (!error) {
        toast({ title: "Saved to cloud", description: "Mood entry synced." })
      } else {
        toast({ title: "Cloud sync failed", description: error.message, variant: "destructive" })
      }
    } catch (err) {
      // ignore cloud errors for now; local UI remains responsive
    }
    setNote("")
    setSelectedMood(null)
    setIsDialogOpen(false)
  }

  const todaysMood = moodHistory.find((entry) => entry.timestamp.toDateString() === new Date().toDateString())

  return (
    <>
      {/* Main Mood Card */}
      <Card className="md:col-span-2 lg:col-span-1 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20 hover:shadow-lg transition-all duration-300">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Heart className="w-5 h-5 text-primary" />
            How's your sky today?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {todaysMood ? (
            <>
              <div className="text-6xl animate-bounce-gentle">{todaysMood.mood.icon}</div>
              <div>
                <p className="font-medium text-primary">{todaysMood.mood.name}</p>
                <p className="text-sm text-muted-foreground">{todaysMood.mood.description}</p>
                {todaysMood.note && <p className="text-xs text-muted-foreground mt-2 italic">"{todaysMood.note}"</p>}
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full bg-transparent">
                    Update Mood
                  </Button>
                </DialogTrigger>
                <MoodDialog
                  moodOptions={moodOptions}
                  selectedMood={selectedMood}
                  note={note}
                  onMoodSelect={handleMoodSelect}
                  onNoteChange={setNote}
                  onSave={handleSaveMood}
                />
              </Dialog>
            </>
          ) : (
            <>
              <div className="text-6xl opacity-50">☁️</div>
              <p className="text-muted-foreground">Ready to check in with yourself?</p>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">Log Your Mood</Button>
                </DialogTrigger>
                <MoodDialog
                  moodOptions={moodOptions}
                  selectedMood={selectedMood}
                  note={note}
                  onMoodSelect={handleMoodSelect}
                  onNoteChange={setNote}
                  onSave={handleSaveMood}
                />
              </Dialog>
            </>
          )}
        </CardContent>
      </Card>

      {/* Mood History Card */}
      {moodHistory.length > 0 && (
        <Card className="md:col-span-2 lg:col-span-3 hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent" />
              Your Mood Garden
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {moodHistory.slice(0, 6).map((entry) => (
                <div
                  key={entry.id}
                  className={`p-3 rounded-lg bg-gradient-to-r ${entry.mood.color} border border-white/50`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{entry.mood.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{entry.mood.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.timestamp.toLocaleDateString()} at{" "}
                        {entry.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {entry.note && <p className="text-xs mt-1 italic">"{entry.note}"</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {moodHistory.length > 6 && (
              <Button variant="outline" className="w-full mt-4 bg-transparent">
                View All Entries ({moodHistory.length})
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </>
  )
}

function MoodDialog({
  moodOptions,
  selectedMood,
  note,
  onMoodSelect,
  onNoteChange,
  onSave,
}: {
  moodOptions: Array<{
    id: string
    name: string
    icon: string
    description: string
    color: string
    value: number
  }>
  selectedMood: {
    id: string
    name: string
    icon: string
    description: string
    color: string
    value: number
  } | null
  note: string
  onMoodSelect: (mood: {
    id: string
    name: string
    icon: string
    description: string
    color: string
    value: number
  }) => void
  onNoteChange: (note: string) => void
  onSave: () => void
}) {
  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="text-center">How's your sky feeling right now?</DialogTitle>
      </DialogHeader>
      <div className="space-y-6">
        {/* Mood Selection Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {moodOptions.map((mood) => (
            <button
              key={mood.id}
              onClick={() => onMoodSelect(mood)}
              className={`p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                selectedMood?.id === mood.id
                  ? "border-primary bg-primary/10 shadow-lg"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="text-3xl mb-2">{mood.icon}</div>
              <div className="text-sm font-medium">{mood.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{mood.description}</div>
            </button>
          ))}
        </div>

        {/* Selected Mood Preview */}
        {selectedMood && (
          <div className={`p-4 rounded-lg bg-gradient-to-r ${selectedMood.color} border border-white/50`}>
            <div className="flex items-center gap-3">
              <span className="text-4xl">{selectedMood.icon}</span>
              <div>
                <p className="font-semibold">{selectedMood.name}</p>
                <p className="text-sm text-muted-foreground">{selectedMood.description}</p>
              </div>
            </div>
          </div>
        )}

        {/* Note Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Want to share what's on your mind? (optional)</label>
          <Textarea
            placeholder="Today I'm feeling this way because..."
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            className="resize-none"
            rows={3}
          />
        </div>

        {/* Save Button */}
        <Button onClick={onSave} disabled={!selectedMood} className="w-full" size="lg">
          Save My Mood
        </Button>
      </div>
    </DialogContent>
  )
}
