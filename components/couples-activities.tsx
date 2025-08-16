"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Film, Gamepad2, Heart, Star, Clock, Check } from "lucide-react"

interface Activity {
  id: string
  title: string
  type: "movie" | "game" | "date" | "other"
  description?: string
  priority: "low" | "medium" | "high"
  status: "wishlist" | "planned" | "completed"
  addedBy: "you" | "partner"
  dateAdded: Date
  completedDate?: Date
}

const mockActivities: Activity[] = [
  {
    id: "1",
    title: "The Princess Bride",
    type: "movie",
    description: "Classic romantic adventure",
    priority: "high",
    status: "wishlist",
    addedBy: "you",
    dateAdded: new Date("2024-01-15"),
  },
  {
    id: "2",
    title: "It Takes Two",
    type: "game",
    description: "Co-op adventure game",
    priority: "medium",
    status: "planned",
    addedBy: "partner",
    dateAdded: new Date("2024-01-10"),
  },
  {
    id: "3",
    title: "Cooking Class",
    type: "date",
    description: "Learn to make pasta together",
    priority: "high",
    status: "completed",
    addedBy: "you",
    dateAdded: new Date("2024-01-05"),
    completedDate: new Date("2024-01-20"),
  },
]

export function CouplesActivities() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [isAddingActivity, setIsAddingActivity] = useState(false)
  const [newActivity, setNewActivity] = useState({
    title: "",
    type: "movie" as Activity["type"],
    description: "",
    priority: "medium" as Activity["priority"],
  })

  const handleAddActivity = () => {
    if (!newActivity.title.trim()) return

    const activity: Activity = {
      id: Date.now().toString(),
      title: newActivity.title,
      type: newActivity.type,
      description: newActivity.description,
      priority: newActivity.priority,
      status: "wishlist",
      addedBy: "you",
      dateAdded: new Date(),
    }

    setActivities([activity, ...activities])
    setNewActivity({ title: "", type: "movie", description: "", priority: "medium" })
    setIsAddingActivity(false)
  }

  const updateActivityStatus = (id: string, status: Activity["status"]) => {
    setActivities(
      activities.map((activity) =>
        activity.id === id
          ? {
              ...activity,
              status,
              completedDate: status === "completed" ? new Date() : undefined,
            }
          : activity,
      ),
    )
  }

  const getTypeIcon = (type: Activity["type"]) => {
    switch (type) {
      case "movie":
        return <Film className="h-4 w-4" />
      case "game":
        return <Gamepad2 className="h-4 w-4" />
      case "date":
        return <Heart className="h-4 w-4" />
      default:
        return <Star className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: Activity["priority"]) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-green-100 text-green-800"
    }
  }

  const getStatusColor = (status: Activity["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "planned":
        return "bg-blue-100 text-blue-800"
      case "wishlist":
        return "bg-gray-100 text-gray-800"
    }
  }

  const filterActivities = (status: Activity["status"]) => activities.filter((activity) => activity.status === status)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Together Time</h1>
          <p className="text-muted-foreground">Shared activities and adventures</p>
        </div>
        <Dialog open={isAddingActivity} onOpenChange={setIsAddingActivity}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Activity
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Activity</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Activity Title</Label>
                <Input
                  id="title"
                  value={newActivity.title}
                  onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                  placeholder="What would you like to do together?"
                />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={newActivity.type}
                  onValueChange={(value: Activity["type"]) => setNewActivity({ ...newActivity, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="movie">Movie</SelectItem>
                    <SelectItem value="game">Game</SelectItem>
                    <SelectItem value="date">Date Idea</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={newActivity.description}
                  onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                  placeholder="Any additional details..."
                />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={newActivity.priority}
                  onValueChange={(value: Activity["priority"]) => setNewActivity({ ...newActivity, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddActivity} className="w-full">
                Add Activity
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Activity Lists */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Wishlist */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Wishlist
            </CardTitle>
            <CardDescription>Things we want to try</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {filterActivities("wishlist").map((activity) => (
              <div key={activity.id} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(activity.type)}
                    <span className="font-medium">{activity.title}</span>
                  </div>
                  <Badge className={getPriorityColor(activity.priority)}>{activity.priority}</Badge>
                </div>
                {activity.description && <p className="text-sm text-muted-foreground">{activity.description}</p>}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Added by {activity.addedBy}</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => updateActivityStatus(activity.id, "planned")}>
                      <Clock className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateActivityStatus(activity.id, "completed")}>
                      <Check className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Planned */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Planned
            </CardTitle>
            <CardDescription>Ready to do soon</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {filterActivities("planned").map((activity) => (
              <div key={activity.id} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(activity.type)}
                    <span className="font-medium">{activity.title}</span>
                  </div>
                  <Badge className={getPriorityColor(activity.priority)}>{activity.priority}</Badge>
                </div>
                {activity.description && <p className="text-sm text-muted-foreground">{activity.description}</p>}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Added by {activity.addedBy}</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => updateActivityStatus(activity.id, "wishlist")}>
                      <Star className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateActivityStatus(activity.id, "completed")}>
                      <Check className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Completed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              Completed
            </CardTitle>
            <CardDescription>Great memories made</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {filterActivities("completed").map((activity) => (
              <div key={activity.id} className="p-3 border rounded-lg space-y-2 opacity-75">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(activity.type)}
                    <span className="font-medium">{activity.title}</span>
                  </div>
                  <Badge className={getStatusColor(activity.status)}>Done!</Badge>
                </div>
                {activity.description && <p className="text-sm text-muted-foreground">{activity.description}</p>}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Completed {activity.completedDate?.toLocaleDateString()}</span>
                  <Button size="sm" variant="outline" onClick={() => updateActivityStatus(activity.id, "wishlist")}>
                    <Star className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
