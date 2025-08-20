"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { CheckSquare, Plus, Circle, CheckCircle2, Edit, Trash2 } from "lucide-react"

interface TodoItem {
  id: string
  title: string
  description?: string
  category: "wellness" | "daily" | "social" | "work" | "other"
  priority: "low" | "medium" | "high"
  completed: boolean
  dueDate?: string
  createdAt: Date
  completedAt?: Date
}

const todoCategories = [
  { value: "wellness", label: "Wellness", color: "bg-green-100 text-green-800", dot: "bg-green-400" },
  { value: "daily", label: "Daily Care", color: "bg-blue-100 text-blue-800", dot: "bg-blue-400" },
  { value: "social", label: "Social", color: "bg-purple-100 text-purple-800", dot: "bg-purple-400" },
  { value: "work", label: "Work", color: "bg-orange-100 text-orange-800", dot: "bg-orange-400" },
  { value: "other", label: "Other", color: "bg-gray-100 text-gray-800", dot: "bg-gray-400" },
]

const priorityColors = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-red-100 text-red-700",
}

export function TodoTracker() {
  const [todos, setTodos] = useState<TodoItem[]>([])

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null)

  // Load todos from Supabase on component mount
  useEffect(() => {
    const loadTodos = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("todos")
        .select("id, title, description, category, priority, status, due_date, created_at, completed_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100)

      if (!error && data) {
        const mapped: TodoItem[] = data.map((row: any) => ({
          id: row.id,
          title: row.title,
          description: row.description || "",
          category: row.category || "other",
          priority: row.priority,
          completed: row.status === 'completed',
          dueDate: row.due_date || undefined,
          createdAt: new Date(row.created_at),
          completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
        }))
        console.log('Todo Tracker - Loaded todos:', mapped.length, mapped)
        setTodos(mapped)
      } else if (error) {
        console.error('Todo Tracker - Error loading todos:', error)
      }
    }
    loadTodos()
  }, [])

  const handleToggleTodo = async (id: string) => {
    const todo = todos.find(t => t.id === id)
    if (!todo) return

    const newCompleted = !todo.completed
    const newCompletedAt = newCompleted ? new Date() : undefined

    // Update local state immediately
    setTodos(
      todos.map((todo) =>
        todo.id === id
          ? {
              ...todo,
              completed: newCompleted,
              completedAt: newCompletedAt,
            }
          : todo,
      ),
    )

    // Persist to Supabase
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({ title: "Cloud sync skipped", description: "Sign in to sync to cloud." })
        return
      }

      const { error } = await supabase
        .from("todos")
        .update({
          status: newCompleted ? 'completed' : 'pending',
          completed_at: newCompletedAt?.toISOString() || null,
        })
        .eq("id", id)
        .eq("user_id", user.id)

      if (!error) {
        toast({ title: "Saved to cloud", description: "Todo status synced." })
      } else {
        toast({ title: "Cloud sync failed", description: error.message, variant: "destructive" })
      }
    } catch (err) {
      toast({ title: "Cloud sync skipped", description: "Sign in to sync to cloud." })
    }
  }

  const handleSaveTodo = async (todoData: Omit<TodoItem, "id" | "createdAt" | "completed" | "completedAt">) => {
    try {
      const coupleId = typeof window !== "undefined" ? localStorage.getItem("couple_id") : null
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({ title: "Sign in required", description: "Please sign in to save todos.", variant: "destructive" })
        return
      }

      if (editingTodo) {
        // Update existing todo
        const { error } = await supabase
          .from("todos")
          .update({
            title: todoData.title,
            description: todoData.description || null,
            category: todoData.category,
            priority: todoData.priority,
            due_date: todoData.dueDate ? new Date(todoData.dueDate).toISOString().slice(0, 10) : null,
          })
          .eq("id", editingTodo.id)

        if (error) {
          toast({ title: "Update failed", description: error.message, variant: "destructive" })
          return
        }

        // Update local state
        setTodos(todos.map((todo) => (todo.id === editingTodo.id ? { ...todo, ...todoData } : todo)))
        setEditingTodo(null)
        toast({ title: "Todo updated", description: "Changes saved to cloud." })
      } else {
        // Create new todo
        const { data, error } = await supabase
          .from("todos")
          .insert({
            couple_id: coupleId ?? null,
            user_id: user.id,
            title: todoData.title,
            description: todoData.description || null,
            category: todoData.category,
            priority: todoData.priority,
            due_date: todoData.dueDate ? new Date(todoData.dueDate).toISOString().slice(0, 10) : null,
            status: 'pending',
          })
          .select("id, created_at")
          .single()

        if (error || !data) {
          toast({ title: "Save failed", description: error?.message || "Unknown error", variant: "destructive" })
          return
        }

        // Add to local state with database ID
        const newTodo: TodoItem = {
          ...todoData,
          id: data.id,
          completed: false,
          createdAt: new Date(data.created_at),
        }
        setTodos([...todos, newTodo])
        setIsDialogOpen(false)
        toast({ title: "Todo added", description: "Task saved to cloud." })
      }
    } catch (err) {
      toast({ title: "Cloud sync failed", description: "Sign in to sync to cloud.", variant: "destructive" })
    }
  }

  const handleDeleteTodo = async (id: string) => {
    // Remove from local state immediately
    setTodos(todos.filter((todo) => todo.id !== id))

    // Remove from Supabase
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({ title: "Cloud sync skipped", description: "Sign in to sync to cloud." })
        return
      }

      const { error } = await supabase
        .from("todos")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)

      if (!error) {
        toast({ title: "Todo deleted", description: "Task removed from cloud." })
      } else {
        toast({ title: "Cloud sync failed", description: error.message, variant: "destructive" })
      }
    } catch (err) {
      toast({ title: "Cloud sync skipped", description: "Sign in to sync to cloud." })
    }
  }

  const activeTodos = todos.filter((todo) => !todo.completed)
  const completedTodos = todos.filter((todo) => todo.completed)
  const todaysTodos = activeTodos.slice(0, 3)

  return (
    <>
      {/* Main Todo Card */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-purple-500" />
              Small Steps
            </div>
            <Badge variant="secondary" className="text-xs">
              {completedTodos.length}/{todos.length} completed
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Active Todos */}
          {todaysTodos.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Active Steps</h4>
              {todaysTodos.map((todo) => {
                const category = todoCategories.find((c) => c.value === todo.category)
                return (
                  <div key={todo.id} className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleTodo(todo.id)}
                      className="flex-shrink-0 transition-colors hover:scale-110"
                    >
                      {todo.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground hover:text-primary" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div
                        className={`text-sm font-medium ${todo.completed ? "line-through text-muted-foreground" : ""}`}
                      >
                        {todo.title}
                      </div>
                      {todo.description && <div className="text-xs text-muted-foreground">{todo.description}</div>}
                    </div>
                    <div className={`w-3 h-3 rounded-full ${category?.dot}`} />
                  </div>
                )
              })}
            </div>
          )}

          {/* Completed Todos */}
          {completedTodos.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Completed Today</h4>
              {completedTodos.slice(0, 2).map((todo) => {
                const category = todoCategories.find((c) => c.value === todo.category)
                return (
                  <div key={todo.id} className="flex items-center gap-3 opacity-75">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm font-medium line-through text-muted-foreground">
                        {todo.title}
                      </div>
                      {todo.description && <div className="text-xs text-muted-foreground">{todo.description}</div>}
                    </div>
                    <div className={`w-3 h-3 rounded-full ${category?.dot}`} />
                  </div>
                )
              })}
              {completedTodos.length > 2 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  +{completedTodos.length - 2} more completed
                </p>
              )}
            </div>
          )}

          {/* No todos message */}
          {todos.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">No tasks yet. Add your first step!</p>
          )}

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full mt-3 bg-transparent">
                View All Tasks
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Your Small Steps</span>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2">
                        <Plus className="w-4 h-4" />
                        Add Task
                      </Button>
                    </DialogTrigger>
                    <TodoDialog onSave={handleSaveTodo} />
                  </Dialog>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Active Tasks */}
                {activeTodos.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Today's Steps ({activeTodos.length})</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {activeTodos.map((todo) => (
                        <TodoCard
                          key={todo.id}
                          todo={todo}
                          onToggle={handleToggleTodo}
                          onEdit={setEditingTodo}
                          onDelete={handleDeleteTodo}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed Tasks */}
                {completedTodos.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Completed Steps ({completedTodos.length})</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {completedTodos.slice(0, 6).map((todo) => (
                        <TodoCard
                          key={todo.id}
                          todo={todo}
                          onToggle={handleToggleTodo}
                          onEdit={setEditingTodo}
                          onDelete={handleDeleteTodo}
                        />
                      ))}
                    </div>
                    {completedTodos.length > 6 && (
                      <p className="text-sm text-muted-foreground text-center mt-3">
                        And {completedTodos.length - 6} more completed tasks!
                      </p>
                    )}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Edit Todo Dialog */}
      {editingTodo && (
        <Dialog open={!!editingTodo} onOpenChange={() => setEditingTodo(null)}>
          <TodoDialog todo={editingTodo} onSave={handleSaveTodo} />
        </Dialog>
      )}
    </>
  )
}

function TodoCard({
  todo,
  onToggle,
  onEdit,
  onDelete,
}: {
  todo: TodoItem
  onToggle: (id: string) => void
  onEdit: (todo: TodoItem) => void
  onDelete: (id: string) => void
}) {
  const category = todoCategories.find((c) => c.value === todo.category)
  const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date() && !todo.completed

  return (
    <Card
      className={`p-4 transition-all ${todo.completed ? "bg-green-50 border-green-200" : ""} ${isOverdue ? "border-red-200 bg-red-50" : ""}`}
    >
      <div className="flex items-start gap-3">
        <button onClick={() => onToggle(todo.id)} className="flex-shrink-0 mt-1 transition-colors hover:scale-110">
          {todo.completed ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <Circle className="w-5 h-5 text-muted-foreground hover:text-primary" />
          )}
        </button>
        <div className="flex-1">
          <div className={`font-medium ${todo.completed ? "line-through text-muted-foreground" : ""}`}>
            {todo.title}
          </div>
          {todo.description && (
            <p className={`text-sm mt-1 ${todo.completed ? "text-muted-foreground" : "text-muted-foreground"}`}>
              {todo.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className={`text-xs ${category?.color}`}>
              {category?.label}
            </Badge>
            <Badge variant="secondary" className={`text-xs ${priorityColors[todo.priority]}`}>
              {todo.priority}
            </Badge>
            {todo.dueDate && (
              <Badge variant="secondary" className={`text-xs ${isOverdue ? "bg-red-100 text-red-700" : ""}`}>
                Due {new Date(todo.dueDate).toLocaleDateString()}
              </Badge>
            )}
          </div>
          {todo.completedAt && (
            <p className="text-xs text-green-600 mt-1">Completed {todo.completedAt.toLocaleDateString()}</p>
          )}
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => onEdit(todo)} className="h-8 w-8 p-0">
            <Edit className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(todo.id)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </Card>
  )
}

function TodoDialog({
  todo,
  onSave,
}: {
  todo?: TodoItem
  onSave: (todoData: Omit<TodoItem, "id" | "createdAt" | "completed" | "completedAt">) => void
}) {
  const [formData, setFormData] = useState({
    title: todo?.title || "",
    description: todo?.description || "",
    category: (todo?.category as TodoItem["category"]) || "daily",
    priority: (todo?.priority as TodoItem["priority"]) || "medium",
    dueDate: todo?.dueDate ? new Date(todo.dueDate).toISOString().split("T")[0] : "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...formData,
      dueDate: formData.dueDate ? new Date(formData.dueDate).toDateString() : undefined,
    })
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>{todo ? "Edit Task" : "Add New Task"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="title">Task Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Take a gentle walk"
            required
          />
        </div>

        <div>
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Any additional details..."
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value: TodoItem["category"]) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {todoCategories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value: TodoItem["priority"]) => setFormData({ ...formData, priority: value })}
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
        </div>

        <div>
          <Label htmlFor="dueDate">Due Date (optional)</Label>
          <Input
            id="dueDate"
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
          />
        </div>

        <Button type="submit" className="w-full">
          {todo ? "Update Task" : "Add Task"}
        </Button>
      </form>
    </DialogContent>
  )
}
