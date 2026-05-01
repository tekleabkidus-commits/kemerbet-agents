# Phase G3 — Activity Timeline Redesign

## Context

You are redesigning the admin Activity page from a **table view** to a **timeline view** to match the locked HTML mockup at `docs/mockups/admin-activity.html`.

**This is a UI-only redesign. Do NOT modify the backend.**

The page exists, the data fetching works, the filters work, pagination works. The only problem is the rendering layer — current React renders a table, mockup specifies a timeline. The drift was documented in commit `e13c755`: *"admin-activity.html (840 lines) — MAJOR drift: mockup uses timeline, React uses table. Phase G."*

## What already exists (do NOT recreate or modify)

**Backend (untouched):**
- ✅ Route `GET /api/admin/activity` at `routes/api.php:34`
- ✅ `App\Http\Controllers\Admin\ActivityController` — handles index() with filters + pagination
- ✅ Backend test `tests/Feature/Admin/ActivityTest.php` — tests JSON shape, MUST stay green

**Frontend (preserve the logic, replace the rendering):**
- ✅ `resources/js/admin/pages/ActivityPage.tsx` — 383 lines

The current file contains:
- TypeScript types: `AgentEmbed`, `AdminEmbed`, `ActivityEvent`, `Meta`
- Constants: `EVENT_TYPE_OPTIONS`, `BADGE_LABELS`, `BADGE_CLASS`
- Helpers: `formatTimeAgo()`, `agentLabel()`, `formatDescription()`
- State: `useSearchParams` for URL-state filters + page, fetch via `api.get`
- UI: filter dropdowns + table rendering + pagination controls

**KEEP** all types, constants, helpers, state management, fetching, filter logic, URL state, and pagination logic. **REPLACE ONLY** the rendering output (currently a table, becomes a timeline).

## What you are building

Sub-tasks G3.1 → G3.2 below (just two gates). **STOP after each sub-task and await explicit approval before proceeding.**

---

## G3.1 — Read mockup, port timeline rendering

### Required reading first

**BEFORE writing any React, read the entire mockup:**

```bash
cat docs/mockups/admin-activity.html
```

The mockup is 840 lines. Pay special attention to:
- The `.timeline` CSS class definition (around line 491)
- Both `<ul class="timeline">` instances (around lines 660 and 782) — these likely show grouped-by-day sections
- All event row classes, icon styling, badge colors, hover states
- Filter UI at the top
- Pagination UI at the bottom

### File to modify

`resources/js/admin/pages/ActivityPage.tsx` — keep all logic above the rendering output, replace only the JSX that produces the visible page output.

### Page structure to build

Based on the mockup pattern:

- **Page header:** title "Activity Log" + subtitle (preserve current copy if good, match mockup if different)
- **Filter bar:** preserve current filter UI (event type dropdown, date range, agent selector — whatever currently exists). Restyle to match mockup's filter chip/segmented-control aesthetic if different.
- **Timeline container:** vertical timeline with events grouped by day
- **Day groups:** events grouped by `created_at` date, with a sticky/highlighted day header (e.g. "Today", "Yesterday", "Mar 14, 2026")
- **Each event row:**
  - Left: timeline rail (vertical line + dot/icon for the event type)
  - Right: event card with badge, description, timestamp (relative + absolute), metadata (IP, duration if present)
  - Use existing `BADGE_LABELS` and `BADGE_CLASS` for event type styling
  - Use existing `formatDescription()` and `formatTimeAgo()` helpers
  - Show "🗑 Deleted agent" indicator if `event.agent?.deleted_at` is set (already detected by `formatDescription`)
- **Pagination:** preserve current pagination controls, restyle to match mockup if visual contract differs
- **Empty state:** when no events match filters, show clean empty state matching mockup pattern (icon + heading + sub-text). Do not invent — copy mockup's empty state exactly if shown.

### Day grouping logic

You'll need a small helper to group events by date. Suggested signature:

```ts
function groupByDay(events: ActivityEvent[]): Array<{ label: string; events: ActivityEvent[] }>
```

Where `label` is "Today", "Yesterday", or formatted date like "Mar 14, 2026". Use `formatTimeAgo`'s precedent for date-aware logic.

Place this helper alongside the existing helpers in the same file. Do not extract to a new file — keeps the change atomic.

### Event icon mapping

The mockup likely uses different icons per event type. Add a helper:

```ts
const EVENT_ICONS: Record<string, string> = {
    went_online: '🟢',  // or whatever the mockup uses
    went_offline: '⚫',
    // ... match mockup exactly
};
```

If the mockup uses Lucide icons (the codebase already uses `lucide-react`), use those instead — match the mockup's icon choices precisely.

### CSS additions

Timeline CSS will need new classes. Add them to `resources/css/admin.css` under a clearly labeled section:

```css
/* ============= ACTIVITY TIMELINE ============= */
.timeline { ... }
.timeline-day-group { ... }
.timeline-day-header { ... }
.timeline-event { ... }
.timeline-rail { ... }
.timeline-event-card { ... }
/* ... etc, match mockup */
```

Keep CSS additions minimal — reuse existing `.panel`, `.btn`, `.status-pill`, `.form-input`, etc. classes wherever the mockup permits. Only add new classes for genuinely new visual elements (the timeline structure itself).

### State to preserve (DO NOT change)

- `useSearchParams` for filters/page state
- All filter handlers (onEventTypeChange, etc.)
- All pagination handlers
- Fetch logic (`useEffect` + `useCallback`)
- Loading/error states
- All TypeScript types (`AgentEmbed`, `AdminEmbed`, `ActivityEvent`, `Meta`)
- Constants (`EVENT_TYPE_OPTIONS`, `BADGE_LABELS`, `BADGE_CLASS`)
- Helpers (`formatTimeAgo`, `agentLabel`, `formatDescription`)

### Important rules

- **Do not invent UI** — if the mockup doesn't show it, don't add it
- **Do not skip features the mockup shows** — if the mockup shows day-group separators, build them
- **Do not modify the backend** — `ActivityController.php` is off-limits
- **Do not break the URL state pattern** — filters and page must remain bookmarkable via URL
- **Do not change types** — `ActivityEvent` shape must match what the API returns
- **Do not add npm packages** — no react-vertical-timeline, no animation libs. Use existing `lucide-react` only if needed for icons.

### STOP after G3.1

Run:

```bash
npx tsc --noEmit 2>&1 | grep -v "TS5101\|baseUrl\|Visit" | head -10
npx vite build 2>&1 | tail -10
./vendor/bin/pest --filter=Activity 2>&1 | tail -10
```

Report:
1. TypeScript clean
2. Build zero errors
3. Backend Activity tests still green (NONE should fail — they test JSON shape, not UI)

Also report:
4. The new line count of `ActivityPage.tsx` (it may grow or shrink, both are fine — just report)
5. The CSS additions: `git diff resources/css/admin.css | head -100`
6. List of files touched

**Wait for explicit approval before proceeding to G3.2.**

---

## G3.2 — Frontend tests + commit

### File to create

`resources/js/admin/__tests__/ActivityPage.test.tsx`

### Tests to write (3 minimum)

Match the existing frontend test pattern from `PaymentMethodsPage.test.tsx` and `SettingsPage.test.tsx`. Mock the `@/api` module as in those tests.

1. `renders timeline with events grouped by day`
   - Mock GET response with 4-5 events spanning 2 different days
   - Render the page, await loading complete
   - Assert at least 2 day-group headers visible (e.g. "Today", "Yesterday")
   - Assert specific event descriptions visible (use `screen.getByText` with `formatDescription` output)

2. `renders empty state when no events`
   - Mock GET response with empty `data: []`
   - Assert empty-state copy visible (whatever the mockup specifies)
   - Assert no timeline elements rendered

3. `filter change triggers new API call with filter param`
   - Mock GET response
   - Render page
   - Click event type filter, select "Online"
   - Assert API was called a second time with the filter param in the URL

4. (optional) `pagination next button calls API with next page`
   - Mock GET response with `meta.last_page > 1`
   - Click pagination "Next" button
   - Assert API called with `?page=2`

### STOP after G3.2

Run:

```bash
npx vite build 2>&1 | tail -5
npx vitest run 2>&1 | tail -10
./vendor/bin/pest 2>&1 | grep "Tests:"
./vendor/bin/pint 2>&1 | tail -3
```

Expected:
- Build: zero errors
- Frontend tests: 24 passing (was 21, +3 new)
- Backend tests: 290 passing (unchanged)
- Pint: clean

### Commit

After all checks green:

```bash
git status
# Verify only intended files staged: ActivityPage.tsx, admin.css, ActivityPage.test.tsx
git add resources/js/admin/pages/ActivityPage.tsx resources/css/admin.css resources/js/admin/__tests__/ActivityPage.test.tsx
git status
```

Then commit with a full body in G1/G2 style:

```bash
git commit -m "$(cat <<'EOF'
feat(activity): timeline redesign (Phase G3)

G3.1 — Timeline rendering port:
- Replaces table layout in ActivityPage.tsx with vertical timeline matching admin-activity.html mockup (840 lines)
- Events grouped by day with "Today" / "Yesterday" / formatted-date headers
- Each event row has timeline rail (icon + connector line) + event card (badge + description + relative timestamp)
- Preserves all existing logic: data fetching, filter UI, URL state via useSearchParams, pagination
- Preserves all helpers: formatTimeAgo, agentLabel, formatDescription, BADGE_LABELS, BADGE_CLASS, EVENT_TYPE_OPTIONS
- New helpers: groupByDay, EVENT_ICONS

CSS additions to admin.css (~N lines under /* ============= ACTIVITY TIMELINE ============= */):
- .timeline, .timeline-day-group, .timeline-day-header, .timeline-event, .timeline-rail, .timeline-event-card

G3.2 — Frontend tests (3 in ActivityPage.test.tsx):
- Renders timeline with events grouped by day
- Renders empty state when no events
- Filter change triggers new API call

Backend untouched: ActivityController, routes, ActivityTest.php all unchanged.

Test counts: 290 backend + 24 frontend = 314 total.
EOF
)"
```

(Replace `~N lines` with the actual line count once you've added the CSS.)

Do NOT push. Wait for verification.

---

## Out of scope for G3

- ❌ Backend changes (no controller, route, or test modifications)
- ❌ Database changes (no migrations)
- ❌ npm package additions
- ❌ Modifications to other admin pages
- ❌ Changes to ActivityController response shape
- ❌ Changes to URL parameter names (filter, page) — these are stable contracts
- ❌ Pushing commits

## Reference files

- `docs/mockups/admin-activity.html` — VISUAL CONTRACT, match exactly
- `resources/js/admin/pages/ActivityPage.tsx` — current implementation, preserve all logic above rendering
- `resources/js/admin/pages/PaymentMethodsPage.tsx` — page pattern (just shipped in G1)
- `resources/js/admin/pages/SettingsPage.tsx` — page pattern (just shipped in G2)
- `resources/js/admin/__tests__/SettingsPage.test.tsx` — frontend test pattern
- `resources/js/admin/__tests__/PaymentMethodsPage.test.tsx` — frontend test pattern
- `app/Http/Controllers/Admin/ActivityController.php` — READ ONLY, do not modify
- `tests/Feature/Admin/ActivityTest.php` — READ ONLY, must stay green

## Approval-gate summary

```
G3.1 (port timeline rendering) → STOP, await approval
G3.2 (frontend tests + commit) → STOP, await final review
```

Begin with G3.1.
