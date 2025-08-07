# Life Planner

A smart personal assistant that analyzes your Google Calendar events and generates actionable tasks using AI.

## Features

- 🔐 **Google OAuth Integration** - Secure authentication with Google Calendar
- 📅 **Multi-Calendar Support** - Works with all your Google Calendars
- 🤖 **AI-Powered Analysis** - Uses Claude AI to analyze events and generate tasks
- 📋 **Smart Task Management** - Organizes tasks by priority and due date
- 🎨 **Modern UI** - Clean, responsive interface with Tailwind CSS
- ⚡ **Real-time Updates** - Instant task generation and status updates

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Authentication**: NextAuth.js with Google OAuth
- **Database**: Prisma with SQLite
- **AI**: Anthropic Claude API
- **Calendar**: Google Calendar API

## Getting Started

### Prerequisites

- Node.js 18+ 
- Google Cloud Project with Calendar API enabled
- Anthropic API key

### Environment Variables

Create a `.env.local` file with:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Anthropic AI
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## How It Works

1. **Authentication**: Users sign in with their Google account
2. **Calendar Sync**: The app fetches events from all accessible Google Calendars
3. **AI Analysis**: Each event is analyzed by Claude AI to identify potential tasks
4. **Task Generation**: Tasks are categorized by priority and timeline
5. **Task Management**: Users can complete or dismiss tasks as needed

## Project Structure

```
life-planner/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── auth/          # NextAuth configuration
│   │   ├── calendar/      # Calendar API endpoints
│   │   └── tasks/         # Task management endpoints
│   ├── login/             # Login page
│   └── page.tsx           # Main dashboard
├── components/            # React components
├── lib/                   # Utility functions
│   ├── ai/               # AI analysis logic
│   ├── auth.ts           # Auth configuration
│   └── db/               # Database operations
├── prisma/               # Database schema
└── types/                # TypeScript type definitions
```

## API Endpoints

- `GET /api/calendar/list` - Fetch user's calendars
- `GET /api/calendar/events` - Fetch calendar events
- `POST /api/calendar/analyze` - Analyze events and generate tasks
- `POST /api/tasks/[id]/complete` - Mark task as complete
- `POST /api/tasks/[id]/dismiss` - Dismiss a task

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details
