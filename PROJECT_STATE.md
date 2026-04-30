# Project State — Kemerbet Agents

**Last updated:** 2026-04-30
**Current phase:** Phase E — Notifications (next)
**Build progress:** Phase A complete. Phase B complete. Phase C complete. Phase D COMPLETE (all 6 tasks shipped). Phase E next.

---

## What's done

- ✅ Laravel 11 project initialized
- ✅ PostgreSQL database created (`kemerbet_agents`)
- ✅ Redis configured for cache/queue/session
- ✅ Sanctum installed for admin auth
- ✅ React + TypeScript + Vite scaffolding
- ✅ Tailwind CSS installed
- ✅ Project directories created
- ✅ Git initialized + GitHub remote configured
- ✅ Specification doc at `docs/SPECIFICATION.md`
- ✅ Visual mockups at `docs/mockups/` (public block, agent secret page, all admin pages)
- ✅ All 10 database migrations + legacy table cleanup + remember_token
- ✅ 9 Eloquent models with relationships, casts, soft deletes
- ✅ Sanctum admin auth (login/logout/me, rate-limited, persistent sessions)
- ✅ 9 Pest feature tests for auth flow (all passing)
- ✅ React SPA chassis: Vite + React 18 + TypeScript + Tailwind + path aliases
- ✅ AuthProvider context with login/logout/me + Sanctum CSRF cookie flow
- ✅ AdminLayout with sidebar matching dashboard mockup (6 nav items, user pill)
- ✅ LoginPage pixel-matching login mockup (error handling, auto-focus, email trim)
- ✅ ProtectedRoute / PublicOnlyRoute wrappers with loading states
- ✅ Smoke tested end-to-end: login, sidebar nav, session persistence, route guards
- ✅ Database seeder: 1 admin, 8 payment methods, 24 agents with tokens, 6 settings
  - Public agent block had 33 cards but only 24 unique telegram usernames. Duplicate slots deduplicated. Resolved 2026-04-27.
- ✅ Seeder is fully idempotent (db:seed can re-run without changing data)

### ✅ PHASE B COMPLETE (2026-04-28)

Full admin agent CRUD lifecycle: list, create, edit, display_number editing, disable/enable, token regeneration, soft-delete, restore, activity audit log. 92 tests passing across 5 test files.

---

## Phase C — Agent Secret Page Plan

### Design decisions (locked 2026-04-28, updated with mockup)

1. **Auth:** URL-based at `/a/{token}` — token IS the credential.
2. **Durations:** 15/30/45/60/120 min daytime (7 AM–11 PM Africa/Addis_Ababa), 15/30/45/60 min sleeping hours (11 PM–7 AM). Strict cutoff at 11:00 PM. "Recommended" badge on 120 button during daytime.
3. **Presence model:** Expiration-based, no heartbeat. `live_until` is the source of truth.
4. **Renewal:** Strict replacement — `live_until = now + duration`. All buttons always available.
5. **Visual contract (LOCKED):** `docs/design-mockups/agent-page.html` is the EXACT design. No deviations allowed.
   - Dark navy theme (`#1a2b4a`) with green/gold radial glows
   - Primary actions: green `#00a86b` (live status, extend), gold `#f5c518` (brand, recommended duration)
   - Red `#ef4444` allowed for danger actions (set offline, modal confirm)
   - Mobile-first, max-width 480px
   - Bottom-sheet modals (slide up from bottom)
   - Toast notifications (top-center)
   - SF Mono / JetBrains Mono / monospace for countdown numbers
   - Inter font family for everything else
6. **Bundle:** Separate React entry at `resources/js/agent/main.tsx` via Vite multi-entry.
7. **NEW PROJECT-WIDE RULE:** All visual contracts (mockups) are LOCKED once approved. No design changes during implementation. Additions allowed only for new states/components, must match existing design language exactly.

### Task breakdown (8 tasks)

- **Task 0:** HTML mockup — **DONE** (locked design contract at `docs/design-mockups/agent-page.html`)
- **Task 1:** Backend agent endpoints (GET show, POST go-online, POST extend, POST go-offline)
- **Task 2:** Time-based duration validation rule (Africa/Addis_Ababa timezone-aware)
- **Task 3:** Agent metrics endpoint (today's clicks, live time today, recent activity for THIS agent)
- **Task 4:** Vite multi-entry config + agent React entry
- **Task 5:** Agent page React component implementing all states from mockup (port HTML → JSX with state hooks)
- **Task 6:** Countdown timer hook with progress bar calculation
- **Task 7:** Browser notification permission banner UI (request permission, persist preference; firing logic stays in Phase E)
- **Task 8:** Smoke test

---

### Done in Phase B

- ✅ **Task 1 — Agent list endpoint + UI** (2026-04-27)
  - `GET /api/admin/agents` with search, status, payment_method, sort, pagination
  - `ListAgentsRequest` FormRequest with validation (422 on invalid params)
  - `AgentController@index` with computed_status, eager-loaded payment methods
  - Sort: number (default), last_seen (NULLS LAST). Click sorts deferred to Phase F
  - 17 Pest tests (auth, filters, search, sort, validation, response shape)
  - Separate test database (`kemerbet_agents_test`) via phpunit.xml + `composer test` script
  - `AgentsPage.tsx`: full agent list with URL-synced filters, debounced search, pagination
  - CSS: table, status pills, filter bar, bank tags, icon buttons, empty/loading/error states
  - Secrets policy added to CLAUDE.md

- ✅ **Task 2 — Agent edit modal + destructive operations** (2026-04-28, smoke test passed)
  - 4 destructive backend operations (disable, enable, regenerate-token, delete) with audit logging via status_events.admin_id
  - EditAgentModal: ~557 lines, 14 state pieces, race-safe loading with cancellation flag
  - Modal infrastructure: focus trap, scroll lock, z-index scale, confirm overlay stacking
  - TokenDisplay + TokenReveal sub-components, 4 ConfirmModal instances gated by confirmAction
  - AgentsPage wired: Edit button opens modal, agentsVersion counter triggers list refetch
  - 10 commits across 5 gates, 57 tests passing, smoke test passed 2026-04-28

- ✅ **Task 3 — Create new agent + display_number editing** (2026-04-28)
  - Backend: POST /api/admin/agents with CreateAgentRequest validation (5114afa)
    - Auto-assigned display_number via max(withTrashed) + 1 (soft-delete collision safe)
    - Token auto-generated, DB::transaction wraps agent + payment methods + token + status_event
    - New event_type: created_by_admin (audit trail with admin_id + ip_address)
    - 11 Pest tests in AgentCreateTest.php
  - Refactor: TokenReveal extracted to shared component (2f5f79a), warning prop added (18b8bc7)
  - Frontend: NewAgentModal.tsx ~243 lines, two-state render: form → token reveal (76d62c3)
    - AgentsPage: +New Agent button enabled, wired to open NewAgentModal
    - onCreated deferred until modal closes (consistent with EditAgentModal pattern)
  - Display number editing added: partial unique index migration + EditAgentModal field (02c97c3, 7116b2f)
    - Soft-deleted agents' numbers released for reuse (partial index WHERE deleted_at IS NULL)
    - 4 new Pest tests for display_number validation (72 total)
  - 8 commits total, 72 tests passing, create flow smoke test passed 2026-04-28

- ✅ **Task 4 — Activity Log** (2026-04-28, smoke test passed)
  - Backend: GET /api/admin/activity with filters (event_type[], admin_id, agent_id, date range, sort, pagination) (445d3d4)
    - Eager-loads agent (withTrashed) + admin — soft-deleted agents visible in audit trail
    - StatusEvent model: 8 event type constants, AgentController refactored to use them
    - 11 Pest tests in ActivityTest.php (83 total)
  - Frontend: ActivityPage.tsx ~310 lines with URL-synced filters, event badges, descriptions (63c0cd6)
    - formatDescription for all 8 event types with duration support and deleted suffix
    - Event badges color-coded: agent (green), admin (blue), destructive (red)
  - Sidebar nav: Activity item with ScrollText icon under "Audit" section (already existed in AdminLayout)
  - Cross-link: EditAgentModal "View activity" button → /admin/activity?agent_id={id} (fa4a3ee)
    - ActivityPage silently filters by agent_id, shows banner with agent label + "Show all events"
  - 3 commits, 83 tests passing

- ✅ **Task 5 — Restore deleted agents** (2026-04-28, smoke test passed)
  - Backend: POST /api/admin/agents/{id}/restore with ->withTrashed() route binding (89fc3db)
    - Display number reassignment BEFORE restore() to avoid partial unique index collision
    - Token reactivation via orderBy(created_at desc, id desc) for predictable most-recent semantics
    - Defensive fallback: creates new token if agent has zero tokens
    - New EVENT_RESTORED_BY_ADMIN constant (9th event type)
    - 9 Pest tests in AgentRestoreTest.php (92 total)
  - Frontend: AgentsPage restore flow inline with ConfirmModal → TokenReveal (f9181a9)
    - Restore button replaces Edit/Regenerate/Delete icons on deleted view
    - TokenReveal shows reactivated URL with reactivation-specific warning
    - ActivityPage formatDescription updated for restored_by_admin
  - 2 commits, 92 tests passing

### ✅ PHASE C COMPLETE (2026-04-29)

Agent secret page fully implemented — backend endpoints, React SPA, state machine, all visual components matching locked mockup.

**7 commits shipped:**

1. `aa4e1a7` — Backend agent secret page endpoints (GET state, POST go-online/extend/go-offline, duration validation with Africa/Addis_Ababa timezone awareness, merged metrics+activity into single state endpoint)
2. `4464332` — Vite multi-entry config + agent React shell (stub AgentApp, Blade view at `/a/{token}`, separate CSS entry)
3. `a7ab9a4` — State machine + API client (fetchState/goOnline/extend/goOffline, AgentApp with pageState derivation, action handlers with isProcessing guard, showToast)
4. `31f2346` — Visual sections + countdown hook (useCountdown with setInterval/useRef, TopBar, LoadingSpinner, InvalidCard, DisabledCard, Greeting, Footer, Toast, Activity, InfoStrip, GoLiveSection, StatusCard — 13 components total)
5. `f5b03d7` — Notification banner + bottom-sheet modal + action wiring (NotificationBanner with 3 permission states, BottomSheetModal with ESC/backdrop/scroll-lock, TopBar bell alert dot, Set Offline routed through confirm modal)
6. `1e10d86` — CSRF fix: excluded `api/agent/*` from validateCsrfTokens (Sanctum statefulApi applies CSRF to all API routes; agent endpoints use token-in-URL auth, not cookies)
7. `c1456ac` — Multi-browser sync + IE fallback (30s polling + focus refetch with isProcessingRef guard, IE detection with friendly unsupported message)

**Issues discovered & fixed during smoke test:**

- **CSRF for non-Sanctum API routes:** `statefulApi()` applies CSRF to ALL API routes. Must explicitly exclude token-auth routes. Remember this for Phase D public endpoints.
- **Multi-browser sync pattern:** 30s polling + window focus refetch with `isProcessingRef` guard to avoid clobbering in-flight actions. Pattern is reusable for Phase D public block if it becomes interactive.
- **Browser support:** Chrome, Edge, Firefox, Safari. IE explicitly unsupported (friendly fallback, zero polyfills).

### ✅ PHASE D COMPLETE (2026-04-30)

Public agents API + embeddable HTML block + click tracking — fully implemented and smoke tested (33 checks passed).

**8 commits shipped:**

1. `c2e627e` — Lock Phase D design: public agents block mockup is visual contract
2. `93cc873` — D1: Public agents API endpoint with payment methods
3. `da5889d` — D2: Click tracking endpoint
4. `9acaff8` — D3: Click metrics wired into agent state endpoint
5. `ab247a6` — D4A: Vite multi-entry config + embed shell + types + i18n + styles
6. `89b7f4f` — D4B: Rendering layer (agent cards, animations, payment chips)
7. `ac422ff` — D4C: Interactivity wiring (deposit clicks, offline modal, language toggle, polling)
8. `e8af6a9` — D5: Embed test page for Shadow DOM isolation

**Smoke test results (33/33 passed):**

- Visual matches mockup byte-for-byte
- Shadow DOM isolation verified (host CSS doesn't bleed in)
- Live agents render with animations (breathing card, pulsing badge, typing dots)
- Recently-offline agents render muted with last-seen relative time
- Payment method chips render correctly
- AM/EN language toggle persists in localStorage
- Live deposit clicks open Telegram + record click_event with referrer
- Offline deposit clicks show warning modal with all close paths (cancel, backdrop, ESC, confirm)
- 60s polling refreshes data with refresh indicator
- Visibility-change pauses polling when tab hidden, resumes on return

**Issues discovered & fixed during smoke test:**

- **Shadow DOM CSS gotcha:** `:root` CSS variables don't penetrate the shadow tree. Must define theme variables on `:host` instead. Fixed by changing `:root{` → `:host{` in styles.ts. Documented in CLAUDE.md for future reference.
- **CSRF for public API routes:** Same pattern as Phase C — excluded `api/public/*` from CSRF middleware.
- **Multi-browser sync pattern:** Reused from Phase C (60s polling + visibility-change pause/resume).

### Resume next session

- **Phase E** starts: Notifications (browser push notifications).
- Read `docs/notifications-spec.md` for the full notification spec (locked 2026-04-28).
- Permission banner UI already exists in agent page (Phase C Task 5C) — Phase E wires the firing logic.
- **Servers:** restart with `php artisan serve --port=8001` + `npm run dev`

### Gate review at end of Phase A

Kidus should be able to:
- Visit `http://localhost:8001` and see the login page
- Sign in with his credentials
- Land on an empty (or stub) dashboard
- Verify in psql that all tables exist with seeded data

**Until gate review passes, do not start Phase B.**

---

## Open decisions

These are unresolved and may need Kidus's input as you build:

- [ ] Final admin email (default: `kidus@kemerbet.com` — confirm before seeding)
- [x] Postgres port: using 5433 (shared cluster with Birhan, separate database) — resolved 2026-04-27
- [x] Admin session persistence: sessions never expire, no remember checkbox, logout-only. `SESSION_LIFETIME=525600`, `Auth::attempt($creds, true)` — resolved 2026-04-27
- [x] Dev server setup: SPA served via Laravel at `:8001/admin`, Vite HMR at `:5174`. Both `localhost` and `127.0.0.1` in `SANCTUM_STATEFUL_DOMAINS`, `SESSION_DOMAIN=null` — resolved 2026-04-27

---

## What we learned

- `@viteReactRefresh` must come before `@vite()` in Blade — without it, React mount silently fails with a cryptic preamble error
- `SANCTUM_STATEFUL_DOMAINS` must include both `localhost` and `127.0.0.1` variants — browsers resolve these differently
- `SESSION_DOMAIN=null` is more forgiving than `localhost` — lets Laravel use the request host, avoiding domain mismatch

---

## Phase progress map

```
[✅] Phase A — Foundation                 completed 2026-04-27
[✅] Phase B — Admin agent CRUD          completed 2026-04-28
[✅] Phase C — Agent secret page          completed 2026-04-29
[✅] Phase D — Public API + HTML block    completed 2026-04-30
[ ] Phase E — Notifications              ← next (spec locked in docs/notifications-spec.md)
[ ] Phase F — Analytics
[ ] Phase G — Polish & deploy
```

---

## Files of note

- `docs/SPECIFICATION.md` — locked v1.0 spec, 14 sections, ~1300 lines
- `docs/mockups/` — HTML mockups (visual contract)
- `CLAUDE.md` — working agreement Claude Code reads each session
- `.env` — local secrets (DO NOT commit)
- `.env.example` — template for new environments

---

## Update protocol

After each meaningful unit of work, update this file:

1. Move completed items from "What's next" to "What's done"
2. Update phase progress map
3. Add anything new to "Open decisions" if you discovered ambiguity
4. Update the "Last updated" date
5. Then commit
