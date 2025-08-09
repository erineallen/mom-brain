// lib/ai/event-analyzer.ts - Enhanced version with settings
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface CalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
}

interface HouseholdSettings {
  familyMembers?: Array<{
    name: string;
    relationship: string;
    age?: number;
  }>;
  homeCity?: string;
  homeState?: string;
  customContext?: string;
  sitterStartTime?: number;
  bookFlightsDaysAhead?: number;
  bookSitterDaysAhead?: number;
  drivingRadiusMiles?: number;
  sitterExceptions?: string[];
}

interface KnowledgeBaseItem {
  key: string;
  value: Record<string, unknown>;
}

export async function analyzeCalendarEvent(
  event: CalendarEvent,
  settings?: HouseholdSettings,
  knowledgeBase?: KnowledgeBaseItem[]
): Promise<EventAnalysis> {
  const startDate = new Date(event.start.dateTime || event.start.date || '');
  const endDate = new Date(event.end.dateTime || event.end.date || '');
  const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  
  // Build context from settings
  const familyContext = settings?.familyMembers 
    ? `Family members: ${settings.familyMembers.map((m: { name: string; relationship: string; age?: number }) => 
        `${m.name} (${m.relationship}${m.age ? `, age ${m.age}` : ''})`
      ).join(', ')}`
    : '';
  
  const locationContext = settings?.homeCity 
    ? `Home location: ${settings.homeCity}, ${settings.homeState}` 
    : '';
  
  const knowledgeContext = knowledgeBase?.length 
    ? `Known patterns:\n${knowledgeBase.map(k => 
        `- "${k.key}" means ${JSON.stringify(k.value)}`
      ).join('\n')}`
    : '';

  const prompt = `You are a personal assistant analyzing a calendar event for a family household.

${locationContext}
${familyContext}
${settings?.customContext || ''}
${knowledgeContext}

Event Details:
- Title: ${event.summary || 'Untitled'}
- Date/Time: ${startDate.toLocaleString()}
- Location: ${event.location || 'No location specified'}
- Description: ${event.description || 'No description'}
- Duration: ${duration.toFixed(1)} hours

User Preferences:
- Babysitter usually needed for events after ${settings?.sitterStartTime || 18}:00
- Book flights ${settings?.bookFlightsDaysAhead || 60} days in advance
- Book babysitter ${settings?.bookSitterDaysAhead || 14} days in advance
- Driving radius: ${settings?.drivingRadiusMiles || 50} miles (beyond this, suggest flights)
${settings?.sitterExceptions?.length ? `- Events that don't need sitter: ${settings.sitterExceptions.join(', ')}` : ''}

Analyze this event considering:
1. Is this a family event where kids are welcome, or adults-only?
2. If location is > ${settings?.drivingRadiusMiles || 50} miles from home, suggest travel arrangements
3. Check if any family members are mentioned in the event
4. Use the known patterns to understand special locations or recurring events
5. Consider work-from-home schedule if mentioned in custom context

Return ONLY a JSON object with this exact structure:
{
  "eventType": "work|social|travel|appointment|family|other",
  "requiresSitter": boolean,
  "requiresTravel": boolean,
  "requiresFormalAttire": boolean,
  "tasks": [
    {
      "title": "Task description",
      "description": "Optional detailed description",
      "type": "booking|shopping|preparation|reminder",
      "priority": "high|medium|low", 
      "dueDate": "ISO date string (when this task should be completed)"
    }
  ],
  "reasoning": "Brief explanation of your analysis",
  "confidence": 0.8
}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }]
    });
    
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }
    
    // Try to parse JSON from the response
    let analysisText = content.text;
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      analysisText = jsonMatch[0];
    }
    
    const analysis = JSON.parse(analysisText);
    
    return {
      eventType: analysis.eventType || 'other',
      requiresSitter: analysis.requiresSitter || false,
      requiresTravel: analysis.requiresTravel || false,
      requiresFormalAttire: analysis.requiresFormalAttire || false,
      tasks: analysis.tasks || [],
      reasoning: analysis.reasoning || '',
      confidence: analysis.confidence || 0.8
    };
    
  } catch (error) {
    console.error('Error analyzing event:', error);
    
    // Return default analysis if AI fails
    return {
      eventType: 'other',
      requiresSitter: false,
      requiresTravel: false,
      requiresFormalAttire: false,
      tasks: [],
      reasoning: 'Analysis failed - using defaults',
      confidence: 0.1
    };
  }
}

export interface EventAnalysis {
  eventType: string;
  requiresSitter: boolean;
  requiresTravel: boolean;
  requiresFormalAttire: boolean;
  tasks: Array<{
    title: string;
    description?: string;
    type: string;
    priority: string;
    dueDate: string;
  }>;
  reasoning: string;
  confidence: number;
}

export async function analyzeBatchEvents(
  events: CalendarEvent[],
  settings?: HouseholdSettings,
  knowledgeBase?: KnowledgeBaseItem[]
): Promise<Map<string, EventAnalysis>> {
  const results = new Map<string, EventAnalysis>();
  
  // Process events one at a time to avoid rate limiting
  // With 50 requests/minute limit, we need at least 1.2 seconds between requests
  const delayBetweenRequests = 1500; // 1.5 seconds to be safe
  
  console.log(`Processing ${events.length} events with ${delayBetweenRequests}ms delay between requests...`);
  
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    
    try {
      console.log(`Analyzing event ${i + 1}/${events.length}: ${event.summary || 'Untitled'}`);
      const analysis = await analyzeCalendarEvent(event, settings, knowledgeBase);
      results.set(event.id, analysis);
      
      // Add delay between requests to respect rate limits
      if (i < events.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
      }
      
    } catch (error) {
      console.error(`Failed to analyze event ${event.id}:`, error);
      
      // If it's a rate limit error, wait longer
      if (error instanceof Error && error.message.includes('429')) {
        console.log('Rate limited - waiting 60 seconds before continuing...');
        await new Promise(resolve => setTimeout(resolve, 60000));
        // Retry this event
        i--;
        continue;
      }
      
      // For other errors, use default analysis
      results.set(event.id, {
        eventType: 'other',
        requiresSitter: false,
        requiresTravel: false,
        requiresFormalAttire: false,
        tasks: [],
        reasoning: 'Analysis failed due to error',
        confidence: 0.1
      });
    }
  }
  
  return results;
}