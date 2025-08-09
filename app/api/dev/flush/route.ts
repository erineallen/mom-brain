// app/api/dev/flush/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: "This endpoint is only available in development" },
      { status: 403 }
    );
  }

  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get user's household
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { household: true }
    });

    if (!user?.household) {
      return NextResponse.json({ error: "No household found" }, { status: 404 });
    }

    // Delete all tasks for this household
    const deletedTasks = await prisma.suggestedTask.deleteMany({
      where: { householdId: user.household.id }
    });

    // Delete all analyzed events for this household
    const deletedEvents = await prisma.analyzedEvent.deleteMany({
      where: { householdId: user.household.id }
    });

    console.log(`🗑️ Flushed cache for household ${user.household.id}:`, {
      deletedTasks: deletedTasks.count,
      deletedEvents: deletedEvents.count
    });

    return NextResponse.json({
      success: true,
      deleted: {
        tasks: deletedTasks.count,
        events: deletedEvents.count
      }
    });
  } catch (error) {
    console.error("Error flushing cache:", error);
    return NextResponse.json(
      { error: "Failed to flush cache" },
      { status: 500 }
    );
  }
}