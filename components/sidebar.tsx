"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { MiffyIcon } from "@/components/miffy-icon"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Home, Heart, Pill, Moon, Calendar, CheckSquare, Menu, X, ChevronLeft, ChevronRight, Users, LogOut } from "lucide-react"
import { useAuth } from "@/components/auth-provider"

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: Home,
    description: "Your wellness overview",
  },
  {
    name: "Mood Garden",
    href: "/mood",
    icon: Heart,
    description: "Track your daily feelings",
  },
  {
    name: "Little Helpers",
    href: "/medications",
    icon: Pill,
    description: "Manage your medications",
  },
  {
    name: "Rest & Dreams",
    href: "/sleep",
    icon: Moon,
    description: "Monitor your sleep",
  },
  {
    name: "Gentle Guide",
    href: "/calendar",
    icon: Calendar,
    description: "Plan your appointments",
  },
  {
    name: "Small Steps",
    href: "/todos",
    icon: CheckSquare,
    description: "Organize your tasks",
  },
  {
    name: "Together Time",
    href: "/couples",
    icon: Users,
    description: "Shared activities & lists",
  },
]

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true) // Added state for desktop expand/collapse
  const pathname = usePathname()
  const { signOut } = useAuth()

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="sm"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Desktop toggle button */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "fixed top-4 z-50 hidden md:flex transition-all duration-300",
          isExpanded ? "left-[260px]" : "left-4",
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-full bg-card/95 backdrop-blur-sm border-r transition-all duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          isExpanded ? "w-72" : "w-16 md:w-16",
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={cn("p-6 border-b", !isExpanded && "md:p-3")}>
            <div className="flex items-center gap-3">
              <MiffyIcon className={cn("w-10 h-10", !isExpanded && "md:w-8 md:h-8")} />
              <div className={cn("transition-opacity duration-200", !isExpanded && "md:hidden")}>
                <h2 className="font-bold text-xl">Miffy's Garden</h2>
                <p className="text-sm text-muted-foreground">Wellness companion</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className={cn("flex-1 p-6", !isExpanded && "md:p-3")}>
            <ul className="space-y-3">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center gap-4 px-4 py-4 rounded-xl text-base font-medium transition-all duration-200 hover:scale-[1.02]",
                        !isExpanded && "md:px-2 md:py-3 md:justify-center",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-lg"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                      )}
                      title={!isExpanded ? item.name : undefined}
                    >
                      <div className="flex-shrink-0">
                        <item.icon className="h-6 w-6" />
                      </div>
                      <div className={cn("flex-1 transition-opacity duration-200", !isExpanded && "md:hidden")}>
                        <div className="font-semibold">{item.name}</div>
                        <div className="text-xs opacity-75 mt-0.5">{item.description}</div>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className={cn("p-6 border-t", !isExpanded && "md:p-3")}>
            <div
              className={cn(
                "text-sm text-muted-foreground text-center leading-relaxed transition-opacity duration-200",
                !isExpanded && "md:hidden",
              )}
            >
              Take care of yourself,
              <br />
              one step at a time 🌱
            </div>
            <div className={cn("hidden text-center", !isExpanded && "md:block")}>
              <div className="text-lg">🌱</div>
            </div>

            <Button
              variant="ghost"
              onClick={signOut}
              className={cn(
                "mt-4 w-full justify-start gap-3",
                !isExpanded && "md:w-full md:justify-center",
              )}
              title={!isExpanded ? "Sign out" : undefined}
            >
              <LogOut className="h-5 w-5" />
              <span className={cn(!isExpanded && "md:hidden")}>Sign out</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && <div className="fixed inset-0 z-30 bg-black/20 md:hidden" onClick={() => setIsOpen(false)} />}
    </>
  )
}
