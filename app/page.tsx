// app/page.tsx - Complete working dashboard with AI tasks
"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { TaskList } from "@/components/TaskList"

interface Task {
  id: string;
  title: string;
  description?: string;
  type: string;
  priority: string;
  dueDate: string;
  status: string;
  analyzedEvent: {
    eventTitle: string;
    eventStart: string;
  };
}

interface TaskGroups {
  overdue: Task[];
  thisWeek: Task[];
  nextWeek: Task[];
  later: Task[];
}

interface Calendar {
  id: string
  summary: string
  backgroundColor?: string
  primary?: boolean
  hidden?: boolean
  selected?: boolean
  accessRole?: string
}

interface CalendarEvent {
  id: string
  summary?: string
  description?: string
  start: {
    dateTime?: string
    date?: string
  }
  end: {
    dateTime?: string
    date?: string
  }
  location?: string
  calendarId?: string
  calendarSummary?: string
  calendarColor?: string
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [calendars, setCalendars] = useState<Calendar[]>([])
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>(["primary"])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCalendarSelect, setShowCalendarSelect] = useState(false)
  const [tasks, setTasks] = useState<TaskGroups | null>(null)
  const [lastAnalyzed, setLastAnalyzed] = useState<Date | null>(null)

  const fetchCalendars = useCallback(async () => {
    try {
      const response = await fetch("/api/calendar/list")
      if (response.ok) {
        const data = await response.json()
        setCalendars(data.calendars || [])
        
        // Auto-select all non-hidden calendars
        const visibleCalendars = data.calendars
          ?.filter((cal: Calendar) => !cal.hidden)
          ?.map((cal: Calendar) => cal.id) || ["primary"]
        
        console.log("Available calendars:", data.calendars)
        console.log("Selected calendars:", visibleCalendars)
        
        setSelectedCalendars(visibleCalendars)
      }
    } catch (err) {
      console.error("Error fetching calendars:", err)
    }
  }, [])

  const fetchCalendarEvents = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const calendarParam = selectedCalendars.map(id => encodeURIComponent(id)).join(",")
      console.log("Fetching events for calendars:", calendarParam)
      
      const response = await fetch(
        `/api/calendar/events?calendars=${calendarParam}&days=14`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch events")
      }
      
      setEvents(data.events || [])
      
      if (data.errors && data.errors.length > 0) {
        console.warn("Some calendars had errors:", data.errors)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }, [selectedCalendars])

  const fetchExistingTasks = useCallback(async () => {
    try {
      const response = await fetch("/api/calendar/analyze")
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks)
      }
    } catch (err) {
      console.error("Error fetching tasks:", err)
    }
  }, [])

  const analyzeEvents = useCallback(async () => {
    if (events.length === 0) return
    
    setAnalyzing(true)
    try {
      console.log(`Starting analysis of ${events.length} events...`)
      
      const response = await fetch("/api/calendar/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ events })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setTasks(data.tasks)
        setLastAnalyzed(new Date())
        console.log("Analysis completed successfully")
      } else {
        throw new Error(data.error || "Analysis failed")
      }
    } catch (err) {
      console.error("Analysis error:", err)
      setError(err instanceof Error ? err.message : "Analysis failed")
    } finally {
      setAnalyzing(false)
    }
  }, [events])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  useEffect(() => {
    if (session?.accessToken) {
      fetchCalendars()
      fetchExistingTasks() // Get any previously analyzed tasks
    }
  }, [session, fetchCalendars, fetchExistingTasks])

  // Fetch events after calendars are loaded
  useEffect(() => {
    if (calendars.length > 0 && selectedCalendars.length > 0) {
      fetchCalendarEvents()
    }
  }, [calendars, selectedCalendars, fetchCalendarEvents])

  // Auto-analyze when events are loaded
  useEffect(() => {
    if (events.length > 0 && !analyzing && !lastAnalyzed) {
      analyzeEvents()
    }
  }, [events, analyzing, lastAnalyzed, analyzeEvents])

  const handleTaskComplete = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
      })
      if (response.ok) {
        // Refresh tasks
        fetchExistingTasks()
      }
    } catch (err) {
      console.error("Error completing task:", err)
    }
  }

  const handleTaskDismiss = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/dismiss`, {
        method: "POST",
      })
      if (response.ok) {
        // Refresh tasks
        fetchExistingTasks()
      }
    } catch (err) {
      console.error("Error dismissing task:", err)
    }
  }

  const toggleCalendar = (calendarId: string) => {
    setSelectedCalendars(prev => {
      if (prev.includes(calendarId)) {
        return prev.filter(id => id !== calendarId)
      } else {
        return [...prev, calendarId]
      }
    })
  }

  const formatEventDate = (event: CalendarEvent) => {
    const startDate = event.start.dateTime || event.start.date
    if (!startDate) return "No date"
    
    const date = new Date(startDate)
    const isAllDay = !event.start.dateTime
    
    if (isAllDay) {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      })
    }
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  if (status === "loading") {
    return <div className="p-8">Loading...</div>
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Welcome, {session.user?.name}</h1>
            <p className="text-gray-600">
              Your personal assistant dashboard
              {lastAnalyzed && (
                <span className="ml-2 text-sm">
                  (Analyzed {lastAnalyzed.toLocaleTimeString()})
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => signOut()}
            className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition"
          >
            Sign Out
          </button>
        </div>

        {/* AI Tasks Section - PRIMARY FOCUS */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">📋 Your Action Items</h2>
            {analyzing && (
              <span className="text-blue-600 text-sm animate-pulse">
                🤖 Analyzing your calendar...
              </span>
            )}
            {!analyzing && events.length > 0 && (
              <button
                onClick={analyzeEvents}
                className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
              >
                Re-analyze Events
              </button>
            )}
          </div>
          
          {tasks ? (
            <TaskList 
              tasks={tasks}
              onTaskComplete={handleTaskComplete}
              onTaskDismiss={handleTaskDismiss}
            />
          ) : (
            <div className="text-center py-8 text-gray-500">
              {analyzing ? (
                <div>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p>Analyzing your calendar events...</p>
                  <p className="text-sm mt-2">This may take a moment on first load</p>
                </div>
              ) : (
                <p>Loading tasks...</p>
              )}
            </div>
          )}
        </div>

        {/* Calendar Selection - Collapsed by default */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Calendar Sources</h2>
            <button
              onClick={() => setShowCalendarSelect(!showCalendarSelect)}
              className="text-blue-600 hover:text-blue-700"
            >
              {showCalendarSelect ? "Hide" : "Show"} ({selectedCalendars.length} selected)
            </button>
          </div>
          
          {showCalendarSelect && (
            <div className="space-y-2 mb-4">
              {calendars.map((calendar) => (
                <label
                  key={calendar.id}
                  className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedCalendars.includes(calendar.id)}
                    onChange={() => toggleCalendar(calendar.id)}
                    className="rounded border-gray-300"
                  />
                  <div className="flex items-center space-x-2 flex-1">
                    {calendar.backgroundColor && (
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: calendar.backgroundColor }}
                      />
                    )}
                    <span className={calendar.primary ? "font-semibold" : ""}>
                      {calendar.summary}
                    </span>
                    {calendar.primary && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        Primary
                      </span>
                    )}
                  </div>
                </label>
              ))}
              
              <button
                onClick={() => {
                  fetchCalendarEvents()
                  setLastAnalyzed(null) // Force re-analysis
                }}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              >
                Update & Re-analyze
              </button>
            </div>
          )}
        </div>

        {/* Events List - Secondary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            Calendar Events (Next 14 Days)
          </h2>
          
          {loading && <p>Loading calendar events...</p>}
          
          {error && (
            <div className="text-red-600 bg-red-50 p-3 rounded">
              Error: {error}
            </div>
          )}
          
          {!loading && !error && events.length === 0 && (
            <p className="text-gray-500">
              No upcoming events found in selected calendars
            </p>
          )}
          
          {!loading && !error && events.length > 0 && (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="border-l-4 pl-4 py-2 hover:bg-gray-50 rounded"
                  style={{
                    borderLeftColor: event.calendarColor || "#4285F4"
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium text-sm">
                        {event.summary || "Untitled Event"}
                      </h3>
                      <p className="text-xs text-gray-600">
                        {formatEventDate(event)}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 ml-2">
                      {event.calendarSummary}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}