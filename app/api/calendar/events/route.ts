// app/api/calendar/events/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"

interface CalendarEvent {
  id: string
  summary: string
  start: {
    dateTime?: string
    date?: string
  }
  end: {
    dateTime?: string
    date?: string
  }
  calendarName?: string
  calendarId?: string
  calendarColor?: string
}

interface GoogleCalendarItem {
  id: string
  summary: string
  backgroundColor?: string
  primary?: boolean
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const calendarsParam = searchParams.get('calendars')
    const daysParam = searchParams.get('days') || '14'
    
    const selectedCalendars = calendarsParam ? calendarsParam.split(',') : ['primary']
    const days = parseInt(daysParam)
    
    console.log("Raw calendars param:", calendarsParam)
    console.log("Requested calendars:", selectedCalendars)

    // Calculate time range
    const timeMin = new Date().toISOString()
    const timeMax = new Date()
    timeMax.setDate(timeMax.getDate() + days)
    
    // First, get all calendars to get their details
    const calendarsResponse = await fetch(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList",
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    )

    if (!calendarsResponse.ok) {
      console.error("Failed to fetch calendars:", await calendarsResponse.text())
      return NextResponse.json(
        { error: "Failed to fetch calendars" },
        { status: calendarsResponse.status }
      )
    }

    const calendarsData = await calendarsResponse.json()
    const calendars = calendarsData.items || []
    
    console.log("Available calendars:", calendars.map((c: GoogleCalendarItem) => ({ id: c.id, summary: c.summary })))
    
    // Create a map of calendar details
    const calendarMap = new Map()
    calendars.forEach((cal: GoogleCalendarItem) => {
      calendarMap.set(cal.id, {
        summary: cal.summary,
        backgroundColor: cal.backgroundColor || '#4285F4',
        primary: cal.primary || false
      })
    })

    // Fetch events from selected calendars
    const allEvents: CalendarEvent[] = []
    const errors: string[] = []
    
    for (const calendarId of selectedCalendars) {
      try {
        console.log(`Fetching events for calendar: "${calendarId}"`)
        const encodedId = encodeURIComponent(calendarId)
        console.log(`Encoded calendar ID: "${encodedId}"`)
        
        const eventsResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodedId}/events?` +
          `timeMin=${timeMin}&` +
          `timeMax=${timeMax.toISOString()}&` +
          `maxResults=50&` +
          `orderBy=startTime&` +
          `singleEvents=true`,
          {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          }
        )

        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json()
          const events = eventsData.items || []
          
          // Get calendar details
          const calendarDetails = calendarMap.get(calendarId) || {
            summary: calendarId === 'primary' ? 'Primary Calendar' : calendarId,
            backgroundColor: '#4285F4'
          }
          
          // Add calendar info to each event
          const eventsWithCalendar = events.map((event: CalendarEvent) => ({
            ...event,
            calendarSummary: calendarDetails.summary,
            calendarId: calendarId,
            calendarColor: calendarDetails.backgroundColor
          }))
          
          allEvents.push(...eventsWithCalendar)
        } else {
          errors.push(`Failed to fetch events from ${calendarId}: ${eventsResponse.status}`)
        }
      } catch (error) {
        console.error(`Error fetching events from calendar ${calendarId}:`, error)
        errors.push(`Error fetching events from ${calendarId}`)
      }
    }

    // Sort all events by start time
    allEvents.sort((a, b) => {
      const aStart = a.start.dateTime || a.start.date
      const bStart = b.start.dateTime || b.start.date
      
      if (!aStart || !bStart) return 0
      
      return new Date(aStart).getTime() - new Date(bStart).getTime()
    })
    
    return NextResponse.json({ 
      events: allEvents,
      total: allEvents.length,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    console.error("Calendar API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}