// lib/db/tasks.ts
import { PrismaClient } from '@prisma/client';
import { EventAnalysis } from '../ai/event-analyzer';

interface CalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

const prisma = new PrismaClient();

export async function saveAnalyzedEvent(
  householdId: string,
  event: CalendarEvent,
  analysis: EventAnalysis
) {
  const startDate = new Date(event.start.dateTime || event.start.date || new Date());
  const endDate = new Date(event.end.dateTime || event.end.date || new Date());

  // First, check if we already analyzed this event
  const existing = await prisma.analyzedEvent.findUnique({
    where: { eventId: event.id },
    include: { tasks: true }
  });

  // If event exists and we're not forcing a re-analysis, skip
  // (This prevents unnecessary re-analysis on every load)
  if (existing && !analysis.forceReanalysis) {
    return existing;
  }

  // Create or update the analyzed event
  const analyzedEvent = await prisma.analyzedEvent.upsert({
    where: { eventId: event.id },
    update: {
      eventTitle: event.summary || 'Untitled',
      eventStart: startDate,
      eventEnd: endDate,
      eventData: JSON.stringify(event),  // Stringify for SQLite
      eventType: analysis.eventType,
      requiresSitter: analysis.requiresSitter,
      requiresTravel: analysis.requiresTravel,
      requiresFormalAttire: analysis.requiresFormalAttire,
      analysisData: JSON.stringify(analysis),  // Stringify for SQLite
      analyzedAt: new Date(),
    },
    create: {
      eventId: event.id,
      householdId,
      eventTitle: event.summary || 'Untitled',
      eventStart: startDate,
      eventEnd: endDate,
      eventData: JSON.stringify(event),  // Stringify for SQLite
      eventType: analysis.eventType,
      requiresSitter: analysis.requiresSitter,
      requiresTravel: analysis.requiresTravel,
      requiresFormalAttire: analysis.requiresFormalAttire,
      analysisData: JSON.stringify(analysis),  // Stringify for SQLite
    },
  });

  // Delete old tasks for this event (in case of re-analysis)
  await prisma.suggestedTask.deleteMany({
    where: { analyzedEventId: analyzedEvent.id }
  });

  // Create new suggested tasks
  const tasks = await Promise.all(
    analysis.suggestedTasks.map(task => {
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() - task.daysBeforeEvent);

      return prisma.suggestedTask.create({
        data: {
          analyzedEventId: analyzedEvent.id,
          householdId,
          title: task.title,
          description: task.description,
          type: task.type,
          priority: task.priority,
          dueDate,
          status: 'pending',
        },
      });
    })
  );

  return { ...analyzedEvent, tasks };
}

export async function getUpcomingTasks(
  householdId: string,
  options: {
    daysAhead?: number;
    includeCompleted?: boolean;
  } = {}
) {
  const { daysAhead = 30, includeCompleted = false } = options;
  
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + daysAhead);

  const statusFilter = includeCompleted 
    ? {} 
    : { status: { in: ['pending'] } };

  const tasks = await prisma.suggestedTask.findMany({
    where: {
      householdId,
      ...statusFilter,
      dueDate: {
        lte: endDate,
        gte: new Date(), // Don't show past-due tasks by default
      },
    },
    include: {
      analyzedEvent: true,
    },
    orderBy: [
      { dueDate: 'asc' },
      { priority: 'desc' },
    ],
  });

  // Group tasks by time period
  const today = new Date();
  const thisWeek = new Date();
  thisWeek.setDate(thisWeek.getDate() + 7);
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 14);

  return {
    overdue: tasks.filter(t => t.dueDate < today),
    thisWeek: tasks.filter(t => t.dueDate >= today && t.dueDate < thisWeek),
    nextWeek: tasks.filter(t => t.dueDate >= thisWeek && t.dueDate < nextWeek),
    later: tasks.filter(t => t.dueDate >= nextWeek),
    all: tasks,
  };
}

export async function updateTaskStatus(
  taskId: string,
  status: 'completed' | 'dismissed'
) {
  const updateData = status === 'completed' 
    ? { status, completedAt: new Date() }
    : { status, dismissedAt: new Date() };

  return prisma.suggestedTask.update({
    where: { id: taskId },
    data: updateData,
  });
}

export async function getOrCreateHousehold(userId: string) {
  // First check if user has a household
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { household: true }
  });

  if (user?.household) {
    return user.household;
  }

  // Create a new household for the user
  const household = await prisma.household.create({
    data: {
      name: `${user?.name || 'My'} Household`,
      users: {
        connect: { id: userId }
      }
    }
  });

  return household;
}