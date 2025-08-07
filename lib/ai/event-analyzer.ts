// lib/ai/event-analyzer.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface EventAnalysis {
  eventType: 'work' | 'social' | 'travel' | 'appointment' | 'family' | 'other';
  requiresSitter: boolean;
  requiresTravel: boolean;
  requiresFormalAttire: boolean;
  suggestedTasks: {
    title: string;
    type: 'booking' | 'shopping' | 'preparation' | 'reminder';
    daysBeforeEvent: number;
    priority: 'high' | 'medium' | 'low';
    description?: string;
  }[];
  preparations: string[];
  notes: string;
}

export async function analyzeCalendarEvent(event: {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}): Promise<EventAnalysis> {
  const startDate = new Date(event.start.dateTime || event.start.date || '');
  const endDate = new Date(event.end.dateTime || event.end.date || '');
  const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60); // hours
  
  const dayOfWeek = startDate.toLocaleDateString('en-US', { weekday: 'long' });
  const timeOfDay = startDate.getHours() >= 17 ? 'evening' : 
                   startDate.getHours() >= 12 ? 'afternoon' : 'morning';
  
  const prompt = `You are a personal assistant analyzing a calendar event to identify required preparations and tasks.

Event Details:
- Title: ${event.summary || 'Untitled'}
- Date/Time: ${startDate.toLocaleString()}
- Location: ${event.location || 'No location specified'}
- Description: ${event.description || 'No description'}
- Duration: ${duration.toFixed(1)} hours
- Day of Week: ${dayOfWeek}
- Time of Day: ${timeOfDay}

Analyze this event and determine:
1. What type of event this is (work, social, travel, appointment, family, or other)
2. Whether childcare is needed (true for evening events that aren't family-friendly)
3. Whether travel arrangements are needed
4. What preparations are required
5. What tasks should be created with appropriate lead times

Timing guidelines to follow:
- Babysitters: Book 7-14 days in advance
- Flights: Book 60-90 days in advance for trips
- Hotels: Book 30-60 days in advance
- Restaurant reservations: 7 days in advance
- Gift shopping: 7 days before birthdays/parties
- Formal attire preparation: 3 days before
- Regular appointments (doctor, dentist): Confirm 2 days before

Return ONLY a JSON object with this exact structure (no other text):
{
  "eventType": "work|social|travel|appointment|family|other",
  "requiresSitter": true/false,
  "requiresTravel": true/false,
  "requiresFormalAttire": true/false,
  "suggestedTasks": [
    {
      "title": "string",
      "type": "booking|shopping|preparation|reminder",
      "daysBeforeEvent": number,
      "priority": "high|medium|low",
      "description": "optional string or null"
    }
  ],
  "preparations": ["string"],
  "notes": "string"
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307', // Using Haiku for speed/cost efficiency
      max_tokens: 1000,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Extract JSON from the response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const analysis = JSON.parse(jsonMatch[0]) as EventAnalysis;
    
    // Validate the response has required fields
    if (!analysis.eventType || !Array.isArray(analysis.suggestedTasks)) {
      throw new Error('Invalid analysis structure');
    }

    return analysis;
  } catch (error) {
    console.error('Error analyzing event:', error);
    // Return a safe default if analysis fails
    return {
      eventType: 'other',
      requiresSitter: false,
      requiresTravel: false,
      requiresFormalAttire: false,
      suggestedTasks: [],
      preparations: [],
      notes: 'Analysis failed - manual review recommended'
    };
  }
}

export async function analyzeBatchEvents(
  events: any[],
  options: { maxConcurrent?: number } = {}
): Promise<Map<string, EventAnalysis>> {
  const { maxConcurrent = 3 } = options; // Process 3 at a time to avoid rate limits
  const results = new Map<string, EventAnalysis>();
  
  // Process in batches
  for (let i = 0; i < events.length; i += maxConcurrent) {
    const batch = events.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map(async (event) => {
        try {
          const analysis = await analyzeCalendarEvent(event);
          return { eventId: event.id, analysis };
        } catch (error) {
          console.error(`Failed to analyze event ${event.id}:`, error);
          return null;
        }
      })
    );
    
    // Store results
    batchResults.forEach(result => {
      if (result) {
        results.set(result.eventId, result.analysis);
      }
    });
  }
  
  return results;
}