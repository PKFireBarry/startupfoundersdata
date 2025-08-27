# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev --turbopack` - Start development server with Turbopack (faster than standard Next.js dev)
- `npm run build` - Build the application for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint to check code quality

## Project Architecture

This is a Next.js 15 application with App Router for a startup founders outreach platform. Key architectural components:

### Authentication & Authorization
- **Clerk** for authentication with protected routes via middleware
- Protected routes: `/dashboard/*`, `/opportunities/*`, `/billing/*`, `/outreach/*`, `/admin/*`
- Public routes: landing page (`/`) only
- Middleware configuration in `middleware.ts`

### Database & Storage
- **Firebase Firestore** for data persistence
- **Firebase Storage** for file uploads (PDFs, documents)
- Client and server Firebase configurations in `lib/firebase/`
- Singleton pattern to prevent multiple app instances

### AI Integration
- **Google Gemini AI** for content generation and PDF processing
- Used for outreach message generation and document analysis
- API route: `POST /api/generate-outreach`
- Supports PDF resume analysis and web scraping for enriched context

### PDF Processing
- **PDF.js** (pdfjs-dist) for client-side PDF parsing and text extraction
- Custom webpack configuration to handle PDF.js worker files
- PDF worker files served from `/public/js/pdf.worker.min.js`
- Webpack fallbacks for server-side compatibility

### Core Features
- **Outreach Generation**: AI-powered personalized outreach messages
- **Outreach Tracking**: Full CRM-style tracking with kanban boards for email and LinkedIn outreach
- **PDF Document Processing**: Extract and analyze founder information from PDFs
- **Contact Management**: Save and organize founder contacts
- **User Profiles**: Customizable user profiles for outreach personalization
- **Billing Integration**: Stripe integration for Pro subscriptions

### Key File Structure
- `app/api/` - API routes for PDF processing, AI generation, user profiles, Stripe
- `app/components/` - Reusable React components (Navigation, Toast, Outreach tools)
- `app/dashboard/` - Protected dashboard for saved contacts with outreach status
- `app/opportunities/` - Main directory browsing interface
- `app/outreach/` - Kanban-style outreach management with drag-and-drop
- `lib/firebase/` - Firebase client and server configurations
- `middleware.ts` - Clerk authentication middleware

### Environment Variables Required
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
GEMINI_API_KEY=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```

### Styling
- **Tailwind CSS v4** for styling
- Custom font configuration with Inter and Geist fonts
- Responsive design with mobile-first approach
- Dark theme with custom CSS variables

### Data Model (Firestore Collections)
Based on @TASK.md specifications:
- `users/{userId}` - User profiles and settings
- `saved_jobs/{jobId}` - Saved founder contacts from directory browsing
- `outreach_records/{recordId}` - Generated outreach messages with tracking
  - Links to saved_jobs via contactId
  - Tracks messageType (email/linkedin), outreachType (job/collaboration/friendship)
  - Includes stage tracking for kanban board progression
  - Supports manual notes for conversation history
- `user_profiles/{userId}` - User resume and profile data for AI generation
- `entry/{entryId}` - Directory of startup founders and companies

### Outreach Tracking System
- **Auto-saving**: All AI-generated messages automatically saved to database
- **Kanban Boards**: Separate boards for Email and LinkedIn with predefined stages
- **Email Stages**: sent → responded → in_talks → interviewing → rejected
- **LinkedIn Stages**: sent → responded → connected → ghosted
- **Drag & Drop**: Built with @dnd-kit for intuitive stage management
- **Notes**: Manual note-taking for conversations outside the app
- **Integration**: Dashboard shows current outreach status for each saved contact
- **History Archive**: Complete searchable archive of all generated messages with full context

### API Routes Overview

Key API routes include:
- `POST /api/generate-outreach` - AI-powered outreach message generation with Gemini
- `POST /api/save-outreach` - Save outreach records to Firestore  
- `GET/POST /api/user-profile` - User profile management with PDF resume support
- `POST /api/stripe/*` - Stripe integration for billing and subscriptions
- `GET /api/subscription` - Check user subscription status
- `POST /api/admin/clear-entries` - Admin functionality for data management

### TypeScript Configuration
- Strict mode enabled
- Path aliases: `@/*` maps to project root
- ES2017 target with modern module resolution
- Special webpack configuration for PDF.js compatibility

## Development Notes

- The application uses Turbopack for faster development builds  
- PDF processing requires special webpack configuration for browser compatibility
- All routes are protected by Clerk middleware except public pages
- Firebase client initialization follows singleton pattern to prevent multiple app instances

## Testing & Quality

- Always run linting after changes: `npm run lint`
- Use Turbopack for faster development: `npm run dev --turbopack` 
- Build and test before deployment: `npm run build`
- When implementing new features, follow existing patterns in components and API routes