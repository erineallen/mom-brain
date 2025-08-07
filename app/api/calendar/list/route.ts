// app/api/calendar/list/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../lib/auth"

interface Calendar {
  id: string
  summary: string
  backgroundColor?: string
  primary?: boolean
  hidden?: boolean
  selected?: boolean
  accessRole?: string
}

interface GoogleCalendarItem {
  id: string
  summary: string
  backgroundColor?: string
  primary?: boolean
  hidden?: boolean
  selected?: boolean
  accessRole?: string
}

interface GoogleCalendarResponse {
  items: GoogleCalendarItem[]
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Fetch calendars from Google Calendar API
    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList",
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    )

    if (!response.ok) {
      console.error("Failed to fetch calendars:", await response.text())
      return NextResponse.json(
        { error: "Failed to fetch calendars" },
        { status: response.status }
      )
    }

    const data = await response.json() as GoogleCalendarResponse
    const calendars: Calendar[] = (data.items || []).map((cal: GoogleCalendarItem) => ({
      id: cal.id,
      summary: cal.summary,
      backgroundColor: cal.backgroundColor,
      primary: cal.primary || false,
      hidden: cal.hidden || false,
      selected: cal.selected || false,
      accessRole: cal.accessRole
    }))

    return NextResponse.json({ 
      calendars,
      total: calendars.length
    })
  } catch (error) {
    console.error("Calendar list API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 