# Startup Founders Outreach — Product & Engineering Task Plan

This document captures the product scope, technical approach, milestones, and open questions for the MVP and near‑term roadmap.

## Vision
- Build a personal-but-shareable CRM-lite focused on founders from posts/newsletters, enabling fast discovery and high-quality outreach, with clear follow-ups and lightweight analytics.

## Core User Flows
- Discover contacts from posts (parsed or imported), skim list, open details.
- Reach out via email or LinkedIn, log the attempt automatically.
- Track status (Interested, Pending, Replied, No Response) and notes.
- Get reminders for follow-ups; see a dashboard of what’s due.

## MVP Scope (V1)
- [ ] Contacts: create/read/update (name, LinkedIn, email, company, tags, notes)
- [ ] Stages: Interested, Pending, Replied, No Response (+ customizable)
- [ ] Notes with timestamps; lastContactedAt auto-update
- [ ] Tagging & simple filters (by tag, stage, has email/LinkedIn)
- [ ] Email via Gmail SMTP (App Password) using NodeMailer; LinkedIn open in new tab
- [ ] Outreach templates (job ask, intro, friendly outreach)
- [ ] Reminders: manual “follow up in X days” with due date
- [ ] Dashboard: Recent contacts, Unreplied, Follow-ups due
- [ ] Import: LinkedIn CSV (connections) + paste structured JSON/CSV; later paste raw blog text
- [ ] Multi-tenant: per-user data isolation
- [ ] Auth + basic billing placeholder (freemium lock on contact count)

## Near-Term Enhancements
- [ ] Search across name/company/notes; saved filters
- [ ] Email sequences (2–3 steps) with automatic scheduling
- [ ] Stats: outreach sent, reply %, follow-up completion
- [ ] AI: draft email from profile + post text; extract contacts from pasted article text
- [ ] Browser helper: bookmarklet or lightweight extension to capture a LinkedIn/profile into the CRM

## Monetization (initial strawman)
- Free: up to 20 contacts, no sequences, manual reminders only
- Pro ($5–10/mo): unlimited contacts, email sending, reminders, basic stats
- Future add-ons: per-post list generation, curated lists marketplace

## Product Surfaces (App)
- Dashboard (/dashboard): recent, unreplied, follow-ups due
- Directory (/entry): parsed founder directory (read-only source of truth)
- Contacts (/contacts): main CRM list (filters, tags, stages)
- Contact Detail (/contacts/:id): profile, history, notes, reminders, actions
- Outreach (/outreach): templates, one-off compose, send logs
- Settings (/settings): auth, email setup, API keys, billing

## Data Model (Firestore-first)
Collections and key fields (per user unless noted):
- users/{userId}
  - plan: "free" | "pro"
  - emailSettings: { smtpUser, smtpHost, fromName }
- contacts/{contactId}
  - ownerUserId
  - name, email, linkedinUrl, company, companyUrl
  - tags: string[]
  - stage: "interested" | "pending" | "replied" | "no_response" | string
  - lastContactedAt, nextFollowUpAt
  - createdAt, updatedAt, source: { type: "entry" | "csv" | "manual", refId? }
- notes/{noteId}
  - contactId, ownerUserId, body, createdAt
- outreachTemplates/{templateId}
  - ownerUserId, name, body, variables: string[], createdAt
- interactions/{interactionId}
  - contactId, ownerUserId, type: "email" | "linkedin" | "note"
  - subject?, body?, url?, at: timestamp, direction: "outbound" | "inbound"
- reminders/{reminderId}
  - contactId, ownerUserId, dueAt, status: "open" | "done", createdAt

Security rules: enforce ownerUserId === auth.uid; aggregate stats via queries; per-plan limits.

## Integrations
- Email: NodeMailer via Gmail SMTP + App Password (MVP). OAuth 2.0 later.
- LinkedIn: no automation; open profile in new tab; log interaction.
- AI (later): Google Gemini for drafting + extraction (paste text to parse).

## Filtering & Sorting (Clients)
- Filters: by tag(s), stage, has email/LinkedIn, date added/last contacted.
- Sort: newest/oldest, company A–Z, last contacted.

## UI/UX Notes
- Three-pane layout: left filters, center list, right detail.
- Keyboard navigation for list; quick actions (L to open LinkedIn, E to email, N to note).
- Non-destructive editing; optimistic updates; toasts for sends.

## API/Server Routes (Next.js)
- POST /api/email/send — send via NodeMailer
- POST /api/contacts — create
- PATCH /api/contacts/:id — update
- POST /api/contacts/:id/notes — add note
- POST /api/contacts/:id/interactions — log interaction
- POST /api/reminders — create; PATCH /api/reminders/:id — complete
- POST /api/import/linkedin — CSV upload parse (server)

## Billing (Placeholder)
- Stripe later; feature gates client-side + server-side checks on plan.

## Non‑Goals (MVP)
- No LinkedIn automation
- No email open/click tracking initially
- No team sharing/collab yet

## Milestones
1) Foundation (auth, Firestore, UI shell)
- [ ] Auth with Clerk
- [ ] Firestore rules + client SDK
- [ ] Base layout (sidebar, list, detail panel)

2) Contacts + Outreach basics
- [ ] Contacts CRUD + tags + stages
- [ ] NodeMailer SMTP send + send log
- [ ] Templates CRUD and insert-variables

3) Dashboard + Reminders
- [ ] Dashboard widgets (recent, unreplied, due)
- [ ] Reminders create/complete + notifications (email or in-app)

4) Imports + Quality of Life
- [ ] LinkedIn CSV import
- [ ] Entry directory to Contacts import flow
- [ ] Search, saved filters, keyboard shortcuts

5) Monetization Readiness
- [ ] Free vs Pro gates
- [ ] Settings + Billing scaffolding

## Environment/Secrets
- .env: FIREBASE_*, SMTP_USER, SMTP_PASS, SMTP_HOST, CLERK_*, GEMINI_* (future), STRIPE_* (future)

## Definition of Done (MVP)
- Authenticated user can import 20+ contacts, send an email, set a reminder, and see a dashboard of due follow-ups. All data isolated per user; free plan limits enforced.

## Open Questions
- Auth: Confirm Clerk vs alternatives (Clerk was integrated in plan). Any social login requirements?
- Data store: Stick with Firestore (current code + memory) or pivot to Supabase? If Supabase, what features drive the switch (SQL, RLS, analytics)?
- Email: Is Gmail SMTP with App Password acceptable for v1, or push to OAuth 2.0 now?
- Limits: Free contact cap (20?) and Pro price ($5/$10?) — what’s your target?
- Tags: Fixed starter set or fully free-form? Need tag colors?
- Stages: Keep 4 defaults; allow custom? Any auto-advance rules?
- Reminders: Delivery channel (in-app only vs email reminders)? Default snooze durations?
- Imports: Primary sources (LinkedIn CSV, Entry page, manual). Any other sources to support early?
- AI: Which features first — email drafting or contact extraction? Model preference (Gemini vs others)?
- Privacy/Compliance: Any PII retention constraints, data export/delete needs?
- Branding: Name/domain, palette, logo — any constraints?

## Progress Log
- [x] Dashboard context settings typing and lint cleanup
  - ProfileEditor wired to `/api/user-profile`; PDF→base64 upload, resume text, and goals verified
  - Fixed `Timestamp` sort comparator; removed unused vars; ESLint + `tsc` clean for touched files
  - Verified `/api/generate-outreach` consumes `resumePdfBase64`/`resumeText`/`goals`

---

Add comments inline or tell me edits, and I’ll update this plan.
