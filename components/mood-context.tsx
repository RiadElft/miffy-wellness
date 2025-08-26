"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

// Mood options from mood-tracker.tsx
const moodOptions = [
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

type MoodOption = typeof moodOptions[0]

interface MoodContextType {
  currentMood: MoodOption | null
  setCurrentMood: (mood: MoodOption | null) => void
  isLoading: boolean
}

const MoodContext = createContext<MoodContextType | undefined>(undefined)

export function MoodProvider({ children }: { children: React.ReactNode }) {
  const [currentMood, setCurrentMood] = useState<MoodOption | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadCurrentMood = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setIsLoading(false)
          return
        }

        const { data, error } = await supabase
          .from("mood_entries")
          .select("mood_id, created_at")
          .eq("user_id", user.id)
          .gte("created_at", new Date().toISOString().split('T')[0])
          .order("created_at", { ascending: false })
          .limit(1)

        if (error) {
          console.error('Error loading current mood:', error)
        } else if (data && data.length > 0) {
          const moodOption = moodOptions.find(m => m.id === data[0].mood_id)
          if (moodOption) {
            setCurrentMood(moodOption)
          }
        }
      } catch (error) {
        console.error('Error in loadCurrentMood:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadCurrentMood()
  }, [])

  return (
    <MoodContext.Provider value={{ currentMood, setCurrentMood, isLoading }}>
      {children}
    </MoodContext.Provider>
  )
}

export function useMood() {
  const context = useContext(MoodContext)
  if (context === undefined) {
    throw new Error('useMood must be used within a MoodProvider')
  }
  return context
}
