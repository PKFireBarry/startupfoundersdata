# Startup Founders Outreach Platform

A specialized outreach and CRM platform for developers, job seekers, and builders who want to connect with startup founders and early-stage companies. Discover founders, generate AI-powered personalized outreach messages, and track relationships through a comprehensive CRM system.

![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.2-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)
![Firebase](https://img.shields.io/badge/Firebase-12.1-orange?style=flat-square&logo=firebase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?style=flat-square&logo=tailwind-css)

---

## About

This platform solves a critical problem for technical professionals: **finding and connecting with startup founders is fragmented and inefficient.** Developers waste time bouncing between scattered communities (Slack groups, email lists, forums) trying to discover interesting startups, and most people don't know how to craft professional outreach messages that get responses.

**Our Solution:**
- **Centralized Discovery**: Browse hundreds of verified startup founders in one place
- **AI-Powered Outreach**: Generate personalized, high-converting messages using Google Gemini AI
- **Systematic Tracking**: Full CRM tools to manage outreach pipelines across email and LinkedIn

---

## Key Features

### 🔍 Founder Directory
- **Advanced Filtering**: Filter by contact availability (Apply Link, LinkedIn, Email)
- **Smart Search**: Search across company names, founder names, and descriptions
- **Flexible Display**: Sort by newest, oldest, or alphabetically with 8/25/50 items per page
- **Rich Information**: Company details, founder roles, tech stack, hiring needs, contact info

### 🤖 AI Outreach Generation
- **Context-Aware**: Powered by Google Gemini 2.5 Flash with PDF resume analysis
- **Multiple Formats**: Email (formal) or LinkedIn (casual) message styles
- **Three Outreach Types**: Job opportunities, collaboration, or networking
- **Enriched Data**: Automatically scrapes company websites and LinkedIn for context
- **Auto-Save**: All generated messages saved for tracking and history

### 📊 CRM Dashboard
- **Contact Management**: Save and organize founder contacts
- **Outreach Tracking**: See current status of all conversations
- **Search & Filter**: Find contacts by company, name, or keywords
- **Profile Setup**: Upload resume (PDF or text) and set personalization goals
- **Complete Archive**: Searchable history of all generated messages

### 📋 Kanban Outreach Boards
- **Dual Pipelines**: Separate boards for Email and LinkedIn tracking
- **Email Stages**: Sent → Responded → In Talks → Interviewing → Rejected
- **LinkedIn Stages**: Sent → Responded → Connected → Ghosted
- **Drag & Drop**: Smooth @dnd-kit powered card movement
- **Auto-Sync**: Real-time updates every 30 seconds
- **Notes Support**: Add manual notes for offline conversations

### 📄 PDF Resume Processing
- **Client-Side Parsing**: Extract text from PDFs using PDF.js
- **Multimodal AI**: Gemini can directly read and analyze PDF resumes
- **Automatic Context**: Resume data automatically enriches AI-generated messages

### 🔐 Contact Information Gating
- **Tiered Access**: Free users can browse, Pro users access contact details
- **Smart Paywall**: LinkedIn profiles and email addresses behind subscription
- **Subscription Management**: Stripe integration for seamless payments

---

## Use Cases

### 1. Job Seeker Finding Startup Opportunities
1. **Discover**: Browse `/opportunities` to find early-stage startups hiring
2. **Filter**: Use filters to find companies with specific skills or apply links
3. **Save**: Click "Save" to add interesting founders to dashboard
4. **Profile Setup**: Upload resume and set job search goals
5. **Generate**: Create personalized outreach emails with AI
6. **Send**: Copy message and send via email or LinkedIn
7. **Track**: Drag contact through Kanban stages as conversation progresses
8. **Follow-up**: Reference Archive for previous messages

### 2. Builder Seeking Collaboration
1. **Browse**: Find founders working on complementary technologies
2. **Save**: Add interesting builders to dashboard
3. **Context**: Add projects and collaboration interests to profile
4. **Generate**: Create collaboration-focused outreach messages
5. **Connect**: Send via LinkedIn for casual peer-to-peer tone
6. **Track**: Monitor responses on LinkedIn board
7. **Note**: Add manual notes about offline conversations

### 3. Developer Networking
1. **Discover**: Find builders in similar tech spaces
2. **Save**: Build network of interesting people
3. **Generate**: Create friendly networking messages
4. **Connect**: Send casual LinkedIn DMs
5. **Maintain**: Keep relationships organized in Connected stage
6. **Engage**: Use Archive to remember previous conversations

---

## Technical Architecture

### Tech Stack

**Frontend:**
- Next.js 16 (App Router with Turbopack)
- React 19.2
- TypeScript 5
- Tailwind CSS v4
- Framer Motion (animations)
- @dnd-kit (drag & drop)

**Backend & Services:**
- Firebase Firestore (database)
- Firebase Storage (file uploads)
- Clerk (authentication)
- Google Gemini 2.5 Flash (AI)
- Stripe (payments)
- PDF.js (document processing)

**Development:**
- ESLint (code quality)
- Next.js Turbopack (3x faster builds)
- Custom webpack config for PDF.js compatibility

### Architecture Highlights

**App Router with RSC**: Leverages Next.js 15+ App Router with React Server Components for optimal performance and SEO.

**Route Protection**: Clerk middleware protects routes (`/dashboard/*`, `/opportunities/*`, `/billing/*`, `/outreach/*`, `/admin/*`) while keeping landing page public.

**Hybrid Rendering**: Strategic mix of server-side rendering and client components for best UX.

**Real-time Sync**: Firestore enables real-time updates across dashboard and outreach boards with 30-second auto-refresh.

**Singleton Pattern**: Firebase client uses singleton pattern to prevent multiple app instances.

**Turbopack Default**: Next.js 16 uses Turbopack by default for significantly faster development builds.

### Data Model (Firestore Collections)

**`entry`** - Directory of startup founders
- `company`, `name`, `role`, `company_info`
- `linkedinurl`, `email`, `company_url`, `apply_url`
- `published` (timestamp), `looking_for` (tags)

**`saved_jobs`** - User's saved contacts
- `userId`, `jobId` (reference to entry)
- `savedAt`, duplicated job fields for offline access

**`outreach_records`** - Generated messages & tracking
- `ownerUserId`, `contactId`, `founderName`, `company`
- `messageType` (email/linkedin), `outreachType` (job/collaboration/friendship)
- `generatedMessage`, `stage`, `createdAt`, `updatedAt`
- `linkedinUrl`, `email` for reference

**`user_profiles`** - User context for AI generation
- `resumeText`, `resumePdfBase64`, `resumeFilename`
- `goals`, `name`, `title`, `skills`, `experience`, `projects`
- `updatedAt`

**`users`** - Stripe subscription data
- `stripeCustomerId`, `subscriptionId`, `subscriptionStatus`
- `plan` (monthly/yearly), `expiresAt`

---

## Project Structure

```
startupfoundersdata/
├── app/
│   ├── api/                      # API routes
│   │   ├── generate-outreach/    # AI message generation endpoint
│   │   ├── save-outreach/        # Outreach record persistence
│   │   ├── user-profile/         # Profile management with PDF support
│   │   ├── stripe/               # Payment integration
│   │   │   ├── create-checkout-session/
│   │   │   ├── create-portal-session/
│   │   │   ├── refresh-subscription/
│   │   │   └── webhooks/
│   │   ├── subscription/         # Check subscription status
│   │   └── admin/                # Admin functionality
│   ├── dashboard/                # Saved contacts CRM
│   ├── opportunities/            # Founder directory browser
│   ├── outreach/                 # Kanban boards for tracking
│   ├── billing/                  # Subscription management
│   ├── admin/                    # Admin tools
│   ├── components/               # Shared React components
│   │   ├── Navigation.tsx
│   │   ├── Toast.tsx
│   │   └── [outreach components]
│   ├── layout.tsx                # Root layout with auth
│   ├── page.tsx                  # Landing page
│   └── globals.css               # Global styles
├── lib/
│   ├── firebase/
│   │   ├── clientApp.ts          # Firebase client config
│   │   └── serverApp.ts          # Firebase server config
│   └── utils.ts                  # Utility functions
├── public/
│   └── js/
│       └── pdf.worker.min.js     # PDF.js worker files
├── middleware.ts                 # Clerk authentication middleware
├── next.config.ts                # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
├── CLAUDE.md                     # Detailed project documentation
└── package.json
```

---

## Setup & Installation

### Prerequisites

- **Node.js 18+** and npm
- **Firebase project** (Firestore + Storage enabled)
- **Clerk account** for authentication
- **Google AI API key** (Gemini 2.5)
- **Stripe account** (test mode for development)

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Google AI (Gemini)
GEMINI_API_KEY=...

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Installation Steps

```bash
# Clone the repository
git clone <your-repo-url>
cd startupfoundersdata

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run development server with Turbopack (recommended)
npm run dev --turbopack

# Or run standard dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

The development server will start at `http://localhost:3000`

---

## Development Guide

### Key Commands

- `npm run dev --turbopack` - Start development server with Turbopack (3x faster)
- `npm run build` - Build the application for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint to check code quality

### Working with Firebase

**Firestore Schema**: Documented in `CLAUDE.md` - refer to Data Model section above for collection structures.

**Client vs Server**:
- Use `lib/firebase/clientApp.ts` for browser code
- Use `lib/firebase/serverApp.ts` for API routes and server components
- Singleton pattern prevents multiple Firebase app instances

**Security Rules**: Ensure Firestore security rules allow:
- Users to read/write their own data
- Public read access to `entry` collection
- Write access to `saved_jobs` and `outreach_records` for authenticated users

### AI Integration

**Gemini API**: Located in `/app/api/generate-outreach/route.ts`

**Features:**
- Multimodal input (can read PDF resumes directly)
- Web scraping via jina.ai reader for company context enrichment
- Three prompt variations for different outreach types
- Configurable tone (formal email vs casual LinkedIn)

**Context Building:**
1. User's resume (PDF or text)
2. User's goals/interests
3. Founder's company website (scraped)
4. Founder's LinkedIn profile data (scraped)
5. Job listing details

### PDF Processing

**Custom Configuration**: Next.js 16 requires special Turbopack config for PDF.js

**Worker Files**: PDF.js worker files must be in `/public/js/pdf.worker.min.js`

**Usage**:
- Client-side text extraction from uploaded resumes
- Base64 encoding for Firestore storage
- Gemini can read PDFs directly for multimodal analysis

**Webpack Config**: See `next.config.ts` for canvas aliasing and fallback configuration needed for PDF.js browser compatibility.

### Authentication & Authorization

**Clerk Setup**:
- Middleware in `middleware.ts` protects routes
- Protected: `/dashboard/*`, `/opportunities/*`, `/billing/*`, `/outreach/*`, `/admin/*`
- Public: Landing page (`/`)

**Subscription Checking**:
- Use `useSubscription()` hook in client components
- Check `subscriptionStatus === 'active'` for Pro features
- Stripe webhook updates subscription status in Firestore

### Styling

**Tailwind CSS v4**:
- Uses new `@tailwindcss/postcss` plugin
- CSS variables for theming in `globals.css`
- Dark theme by default

**Animations**:
- Framer Motion for page transitions and interactive elements
- Custom animations in `tw-animate-css`

---

## Key Design Decisions

### Why Turbopack?
Next.js 16 uses Turbopack by default, providing up to 3x faster builds compared to webpack in development mode.

### Why Firestore?
Real-time synchronization capabilities are essential for CRM features. Firestore's NoSQL structure perfectly fits the flexible contact and outreach data model.

### Why Gemini?
Multimodal capabilities allow the AI to directly read PDF resumes, eliminating text extraction errors. Gemini 2.5 Flash offers excellent quality at low cost.

### Why Clerk?
Best-in-class authentication with minimal setup. Provides pre-built UI components and comprehensive middleware for route protection.

### Why Desktop-only Kanban?
Drag-and-drop UX requires significant screen real estate. Mobile users can still view and update records, but the Kanban board is optimized for desktop workflow.

### Why Manual Stage Tracking?
Users manage email and LinkedIn conversations in separate applications. Manual stage updates match the actual workflow better than attempting automated tracking.

---

## Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Code Style
- Follow existing TypeScript and React patterns
- Use Tailwind CSS for styling (no inline styles)
- Add comments for complex logic
- Run `npm run lint` before committing

### Reporting Issues
- Use GitHub Issues to report bugs
- Include reproduction steps and environment details
- Check existing issues before creating new ones

---

## Documentation

- **CLAUDE.md**: Comprehensive project documentation with architectural details
- **API Routes**: Each API route has inline documentation
- **Components**: Key components have JSDoc comments

---

## License

[Add your license here]

---

## Acknowledgments

Built with:
- [Next.js](https://nextjs.org) - React framework
- [Firebase](https://firebase.google.com) - Backend services
- [Clerk](https://clerk.com) - Authentication
- [Google AI](https://ai.google.dev) - Gemini API
- [Stripe](https://stripe.com) - Payment processing
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [Framer Motion](https://www.framer.com/motion) - Animations

---

For detailed technical documentation, see [CLAUDE.md](./CLAUDE.md)
