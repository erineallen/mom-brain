// app/api/tasks/[taskId]/complete/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { updateTaskStatus } from "@/lib/db/tasks";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { taskId } = await params;
    const task = await updateTaskStatus(taskId, 'completed');
    
    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error("Error completing task:", error);
    return NextResponse.json(
      { error: "Failed to complete task" },
      { status: 500 }
    );
  }
}