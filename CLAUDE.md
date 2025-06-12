# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Korean legal regulation monitoring system called "lip_service" that automatically tracks legal amendments and provides AI-powered analysis for different departments. The system scrapes legal data from the Korean National Legal Information Center and provides departmental insights.

The main application is located in the `LearnKoreanQuest/` directory and consists of:
- **Frontend**: React with Vite, TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Express.js with TypeScript 
- **Database**: PostgreSQL with Drizzle ORM
- **AI Integration**: OpenAI for legal analysis and summarization

## Development Commands

### Primary Development
```bash
# Start development server (both frontend and backend)
npm run dev

# Build the application
npm run build

# Start production server
npm run start

# Type checking
npm run check

# Database schema push
npm run db:push
```

### Working Directory
All development commands should be run from the `LearnKoreanQuest/` directory.

## Architecture

### Full-Stack Structure
- **Client**: Located in `client/` with React SPA using Wouter for routing
- **Server**: Located in `server/` with Express.js API
- **Shared**: Common schemas and types in `shared/schema.ts`
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations

### Key Components
- **Database Schema**: Comprehensive schema with users, departments, regulations, policies, analyses, and notifications
- **API Routes**: RESTful endpoints for all data operations
- **UI Components**: Consistent design system using shadcn/ui and Radix UI
- **AI Integration**: OpenAI integration for legal document analysis

### Data Flow
1. Legal data is scraped from external sources
2. AI processes and analyzes the content
3. Department-specific insights are generated
4. Results are displayed through the dashboard interface
5. Email notifications are sent to relevant departments

## Database

The system uses PostgreSQL with Drizzle ORM. Key tables include:
- `users` - System users
- `departments` - Organizational departments
- `regulations` - Legal regulations and amendments  
- `policies` - Internal company policies
- `analyses` - AI analysis results linking regulations to departments
- `notifications` - System notifications

Schema is defined in `shared/schema.ts` with full TypeScript types.

## AI Features

The system integrates OpenAI for:
- Legal document summarization
- Department-specific impact analysis
- Regulatory change recommendations
- Automated compliance insights

## Development Notes

- The project uses TypeScript throughout with strict type checking
- Path aliases are configured: `@/` for client source, `@shared/` for shared modules
- The development server supports hot reloading for both frontend and backend
- Database schema changes require running `npm run db:push`
- Environment variables needed: `DATABASE_URL`, OpenAI API keys