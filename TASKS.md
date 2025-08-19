# Tasks

- [x] Add brand color variables and Tailwind v4 @theme mapping in `app/globals.css`
- [x] Refactor `app/components/IntegratedOutreachModal.tsx` UI to dark theme with brand palette, preserving functionality
- [x] Refactor `app/components/OutreachGeneratorPanel.tsx` UI to match dark theme and brand palette, preserve functionality
- [x] Run repo-wide lint and build to verify changes (typecheck completed; component-specific lint clean)
- [x] Fix founder contact card layout inconsistencies on dashboard
- [x] Implement consistent spacing and reserved space for missing content fields
- [x] Handle entries with varying amounts of content gracefully
- [x] Update TASKS.md to mark modal refactor completed
 - [x] Standardize dashboard card sizing and spacing in `app/dashboard/page.tsx` (fixed height, flex column, consistent footer alignment)
 - [x] Add "Remove saved contact" action to dashboard cards with Firestore delete
 - [x] Restore website chip using `company_url || url` with robust domain extraction and favicon (DuckDuckGo, fallback to `/globe.svg`)
 - [x] Enforce consistent card internals: chips area fixed to two rows (`h-[64px]`), tags row fixed to one row (`h-[24px]`), footer pinned

## Notes
- Brand palette in use: duke-blue `#390099`, murrey `#9e0059`, folly `#ff0054`, orange-pantone `#ff5400`, amber `#ffbd00`.
- IntegratedOutreachModal and OutreachGeneratorPanel now share the same dark theme styling and accents (amber radios/buttons, murrey→folly→amber gradient on primary action).
- Types tightened (no `any`) and JSX quotes escaped where applicable. Component-specific ESLint passes.
- Project typecheck: passed (`npx tsc --noEmit`).
- Repo-wide `npm run lint` still has unrelated issues in other files; not in scope for this task.
