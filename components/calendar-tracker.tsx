"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Calendar, Plus, Clock, MapPin, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { CalendarDialog } from "@/components/calendar-dialog"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"

interface CalendarEvent {
  id: string
  title: string
  date: string
  time: string
  type: "appointment" | "therapy" | "social" | "self-care" | "other"
  location?: string
  notes?: string
  createdAt: Date
}

const eventTypes = [
  { value: "appointment", label: "Medical", color: "bg-red-100 text-red-800", dot: "bg-red-400" },
  { value: "therapy", label: "Therapy", color: "bg-purple-100 text-purple-800", dot: "bg-purple-400" },
  { value: "social", label: "Social", color: "bg-green-100 text-green-800", dot: "bg-green-400" },
  { value: "self-care", label: "Self-Care", color: "bg-blue-100 text-blue-800", dot: "bg-blue-400" },
  { value: "other", label: "Other", color: "bg-gray-100 text-gray-800", dot: "bg-gray-400" },
]

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate()
}

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay()
}

export function CalendarTracker() {
  const [events, setEvents] = useState<CalendarEvent[]>([])

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<"month" | "year">("month")

  const handleSaveEvent = async (eventData: Omit<CalendarEvent, "id" | "createdAt">) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to save calendar events.", variant: "destructive" })
      return
    }
    // Build start_time from date + time
    const start = new Date(`${eventData.date} ${eventData.time}`)
    const coupleId = typeof window !== "undefined" ? localStorage.getItem("couple_id") : null

    if (editingEvent) {
      // Update existing event
      const { error } = await supabase
        .from("calendar_events")
        .update({
          title: eventData.title,
          description: eventData.notes || null,
          start_time: start.toISOString(),
          end_time: null,
          location: eventData.location || null,
          event_type: eventData.type,
          couple_id: coupleId ?? null,
        })
        .eq("id", editingEvent.id)
        .eq("user_id", user.id)
      if (error) {
        toast({ title: "Update failed", description: error.message, variant: "destructive" })
        return
      }
      setEvents(events.map((e) => (e.id === editingEvent.id ? { ...editingEvent, ...eventData } : e)))
      setEditingEvent(null)
      toast({ title: "Event updated", description: "Your event was updated." })
    } else {
      // Insert new event
      const { data, error } = await supabase
        .from("calendar_events")
        .insert({
          title: eventData.title,
          description: eventData.notes || null,
          start_time: start.toISOString(),
          end_time: null,
          location: eventData.location || null,
          event_type: eventData.type,
          is_all_day: false,
          couple_id: coupleId ?? null,
          user_id: user.id,
        })
        .select("id, created_at")
        .single()
      if (error || !data) {
        toast({ title: "Save failed", description: error?.message || "Unknown error", variant: "destructive" })
        return
      }
      const newEvent: CalendarEvent = {
        ...eventData,
        id: data.id,
        createdAt: new Date(data.created_at),
      }
      setEvents([...events, newEvent])
      setIsDialogOpen(false)
      toast({ title: "Event added", description: "Your event was saved to cloud." })
    }
  }

  const handleDeleteEvent = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from("calendar_events").delete().eq("id", id).eq("user_id", user.id)
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" })
      return
    }
    setEvents(events.filter((e) => e.id !== id))
    toast({ title: "Event deleted", description: "The event was removed." })
  }

  // Helpers for month range
  const getMonthRange = (date: Date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1)
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
    return { start, end }
  }

  // Load events for the current month and user
  useEffect(() => {
    const loadEvents = async () => {
      const { start, end } = getMonthRange(currentDate)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load events for current month (for calendar view)
      const { data: monthData, error: monthError } = await supabase
        .from("calendar_events")
        .select("id, title, description, start_time, end_time, location, event_type, created_at")
        .eq("user_id", user.id)
        .gte("start_time", start.toISOString())
        .lte("start_time", end.toISOString())
        .order("start_time", { ascending: true })

      // Load upcoming events (for dashboard display)
      const now = new Date()
      const { data: upcomingData, error: upcomingError } = await supabase
        .from("calendar_events")
        .select("id, title, description, start_time, end_time, location, event_type, created_at")
        .eq("user_id", user.id)
        .gte("start_time", now.toISOString())
        .order("start_time", { ascending: true })
        .limit(10)

      if (monthError || upcomingError) return

      // Combine and deduplicate events
      const allEvents = [...(monthData || []), ...(upcomingData || [])]
      const uniqueEvents = allEvents.filter((event, index, self) => 
        index === self.findIndex(e => e.id === event.id)
      )

      const mapped: CalendarEvent[] = uniqueEvents.map((row: any) => {
        const startDt = new Date(row.start_time)
        const time = startDt
          .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
          .slice(0, 5)
        return {
          id: row.id,
          title: row.title,
          date: startDt.toDateString(),
          time,
          type: (row.event_type as CalendarEvent["type"]) || "other",
          location: row.location || "",
          notes: row.description || "",
          createdAt: new Date(row.created_at),
        }
      })
      
      console.log('Calendar Tracker - Loaded events:', mapped.length, 'Upcoming events:', getUpcomingEvents().length)
      setEvents(mapped)
    }
    loadEvents()
  }, [currentDate])

  const getUpcomingEvents = () => {
    const now = new Date()
    return events
      .filter((event) => new Date(event.date + " " + event.time) >= now)
      .sort((a, b) => new Date(a.date + " " + a.time).getTime() - new Date(b.date + " " + b.time).getTime())
      .slice(0, 3)
  }

  const getEventsForDate = (date: Date) => {
    const dateString = date.toDateString()
    return events.filter((event) => event.date === dateString)
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const navigateYear = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setFullYear(prev.getFullYear() - 1)
      } else {
        newDate.setFullYear(prev.getFullYear() + 1)
      }
      return newDate
    })
  }

  const renderCalendarGrid = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = getFirstDayOfMonth(year, month)

    const days = []
    const today = new Date()

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 p-1"></div>)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dayEvents = getEventsForDate(date)
      const isToday = date.toDateString() === today.toDateString()

      days.push(
        <div
          key={day}
          className={cn(
            "h-24 p-1 border border-border/50 rounded-lg hover:bg-accent/30 transition-colors",
            isToday && "bg-primary/10 border-primary/30",
          )}
        >
          <div className={cn("text-sm font-medium mb-1", isToday && "text-primary font-bold")}>{day}</div>
          <div className="space-y-1">
            {dayEvents.slice(0, 2).map((event) => {
              const eventType = eventTypes.find((t) => t.value === event.type)
              return (
                <div
                  key={event.id}
                  className={cn("text-xs px-1 py-0.5 rounded truncate", eventType?.color)}
                  title={`${event.title} at ${event.time}`}
                >
                  {event.title}
                </div>
              )
            })}
            {dayEvents.length > 2 && <div className="text-xs text-muted-foreground">+{dayEvents.length - 2} more</div>}
          </div>
        </div>,
      )
    }

    return days
  }

  const upcomingEvents = getUpcomingEvents()

  return (
    <>
      {/* Main Calendar Card */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-500" />
            Gentle Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcomingEvents.length > 0 ? (
            upcomingEvents.map((event) => {
              const eventType = eventTypes.find((t) => t.value === event.type)
              const isToday = event.date === new Date().toDateString()
              const isTomorrow = event.date === new Date(Date.now() + 86400000).toDateString()

              return (
                <div key={event.id} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${eventType?.dot}`} />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{event.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {isToday ? "Today" : isTomorrow ? "Tomorrow" : new Date(event.date).toLocaleDateString()} at{" "}
                      {new Date("2000-01-01 " + event.time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">No upcoming events</p>
          )}

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full mt-3 bg-transparent">
                View Full Calendar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Your Gentle Guide</span>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2">
                        <Plus className="w-4 h-4" />
                        Add Event
                      </Button>
                    </DialogTrigger>
                    <CalendarDialog onSave={handleSaveEvent} />
                  </Dialog>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Calendar Navigation */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => (viewMode === "month" ? navigateMonth("prev") : navigateYear("prev"))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setViewMode(viewMode === "month" ? "year" : "month")}
                      className="text-lg font-semibold min-w-[200px]"
                    >
                      {viewMode === "month"
                        ? `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                        : currentDate.getFullYear()}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => (viewMode === "month" ? navigateMonth("next") : navigateYear("next"))}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                    Today
                  </Button>
                </div>

                {/* Calendar Grid */}
                {viewMode === "month" && (
                  <div className="space-y-2">
                    {/* Day headers */}
                    <div className="grid grid-cols-7 gap-1">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                        <div
                          key={day}
                          className="h-8 flex items-center justify-center text-sm font-medium text-muted-foreground"
                        >
                          {day}
                        </div>
                      ))}
                    </div>
                    {/* Calendar days */}
                    <div className="grid grid-cols-7 gap-1">{renderCalendarGrid()}</div>
                  </div>
                )}

                {/* Year view */}
                {viewMode === "year" && (
                  <div className="grid grid-cols-3 gap-4">
                    {monthNames.map((monthName, index) => (
                      <Button
                        key={monthName}
                        variant="outline"
                        className="h-20 flex flex-col items-center justify-center bg-transparent"
                        onClick={() => {
                          setCurrentDate(new Date(currentDate.getFullYear(), index, 1))
                          setViewMode("month")
                        }}
                      >
                        <div className="font-semibold">{monthName}</div>
                        <div className="text-xs text-muted-foreground">
                          {
                            events.filter((event) => {
                              const eventDate = new Date(event.date)
                              return (
                                eventDate.getFullYear() === currentDate.getFullYear() && eventDate.getMonth() === index
                              )
                            }).length
                          }{" "}
                          events
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Edit Event Dialog */}
      {editingEvent && (
        <Dialog open={!!editingEvent} onOpenChange={() => setEditingEvent(null)}>
          <CalendarDialog event={editingEvent} onSave={handleSaveEvent} />
        </Dialog>
      )}
    </>
  )
}

function EventCard({
  event,
  onEdit,
  onDelete,
}: {
  event: CalendarEvent
  onEdit: (event: CalendarEvent) => void
  onDelete: (id: string) => void
}) {
  const eventType = eventTypes.find((t) => t.value === event.type)

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`w-4 h-4 rounded-full ${eventType?.dot} mt-1`} />
          <div>
            <div className="font-medium">{event.title}</div>
            <div className="text-sm text-muted-foreground flex items-center gap-4 mt-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(event.date).toLocaleDateString()} at{" "}
                {new Date("2000-01-01 " + event.time).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {event.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {event.location}
                </span>
              )}
            </div>
            <Badge variant="secondary" className={`text-xs mt-2 ${eventType?.color}`}>
              {eventType?.label}
            </Badge>
            {event.notes && <p className="text-xs text-muted-foreground mt-2 italic">"{event.notes}"</p>}
          </div>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => onEdit(event)} className="h-8 w-8 p-0">
            <Edit className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(event.id)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
