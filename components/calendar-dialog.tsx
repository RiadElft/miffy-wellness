"use client"

import type React from "react"
import { useState } from "react"
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

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

interface CalendarDialogProps {
  event?: CalendarEvent
  onSave: (eventData: Omit<CalendarEvent, "id" | "createdAt">) => void
}

export function CalendarDialog({ event, onSave }: CalendarDialogProps) {
  const [formData, setFormData] = useState({
    title: event?.title || "",
    date: event?.date ? new Date(event.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    time: event?.time || "12:00",
    type: (event?.type as CalendarEvent["type"]) || "other",
    location: event?.location || "",
    notes: event?.notes || "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...formData,
      date: new Date(formData.date).toDateString(),
    })
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>{event ? "Edit Event" : "Add New Event"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="title">Event Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Doctor appointment"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="time">Time</Label>
            <Input
              id="time"
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="type">Type</Label>
          <Select
            value={formData.type}
            onValueChange={(value: CalendarEvent["type"]) => setFormData({ ...formData, type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {eventTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="location">Location (optional)</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="e.g., Health Center, Home"
          />
        </div>

        <div>
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Any additional details or reminders..."
            rows={2}
          />
        </div>

        <Button type="submit" className="w-full">
          {event ? "Update Event" : "Add Event"}
        </Button>
      </form>
    </DialogContent>
  )
}
