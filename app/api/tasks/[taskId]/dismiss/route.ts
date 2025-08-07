// app/api/tasks/[taskId]/dismiss/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { updateTaskStatus } from "@/lib/db/tasks";

export async function POST(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const task = await updateTaskStatus(params.taskId, 'dismissed');
    
    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error("Error dismissing task:", error);
    return NextResponse.json(
      { error: "Failed to dismiss task" },
      { status: 500 }
    );
  }
}