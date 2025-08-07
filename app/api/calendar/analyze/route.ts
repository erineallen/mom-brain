// app/api/calendar/analyze/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { analyzeBatchEvents } from "@/lib/ai/event-analyzer";
import { saveAnalyzedEvent, getUpcomingTasks, getOrCreateHousehold } from "@/lib/db/tasks";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { events } = await request.json();
    
    if (!events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: "Invalid request: events array required" },
        { status: 400 }
      );
    }

    // Get or create household for the user
    const household = await getOrCreateHousehold(session.user.id);

    // Filter to only analyze future events and events from the last week
    // (recent past events might still need tasks)
    const relevantEvents = events.filter(event => {
      const eventDate = new Date(event.start?.dateTime || event.start?.date || '');
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return eventDate >= weekAgo;
    });

    console.log(`Analyzing ${relevantEvents.length} relevant events...`);

    // Analyze events with AI
    const analysisResults = await analyzeBatchEvents(relevantEvents);
    
    // Save to database
    const savedEvents = [];
    for (const event of relevantEvents) {
      const analysis = analysisResults.get(event.id);
      if (analysis) {
        const saved = await saveAnalyzedEvent(household.id, event, analysis);
        savedEvents.push(saved);
      }
    }

    // Get all upcoming tasks for the dashboard
    const upcomingTasks = await getUpcomingTasks(household.id);

    return NextResponse.json({
      analyzed: savedEvents.length,
      tasks: upcomingTasks,
      summary: {
        totalAnalyzed: savedEvents.length,
        tasksThisWeek: upcomingTasks.thisWeek.length,
        tasksNextWeek: upcomingTasks.nextWeek.length,
        highPriorityTasks: upcomingTasks.all.filter((t: { priority: string }) => t.priority === 'high').length,
      }
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze events", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to just fetch existing tasks without re-analyzing
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const household = await getOrCreateHousehold(session.user.id);
    const upcomingTasks = await getUpcomingTasks(household.id);

    return NextResponse.json({
      tasks: upcomingTasks,
      summary: {
        tasksThisWeek: upcomingTasks.thisWeek.length,
        tasksNextWeek: upcomingTasks.nextWeek.length,
        overdue: upcomingTasks.overdue.length,
      }
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}