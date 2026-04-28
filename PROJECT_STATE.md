# Project State — Kemerbet Agents

**Last updated:** 2026-04-28
**Current phase:** Phase C — Agent secret page (next)
**Build progress:** Phase A complete. Phase B COMPLETE (all 5 tasks shipped). Phase C next.

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

### Design decisions (locked 2026-04-28)

1. **Auth model:** URL-based at `/a/{token}` — token IS the credential. No login form.
2. **Durations:** 30/60/120 min daytime (7 AM–11 PM Africa/Addis_Ababa), 30/60 min sleeping hours (11 PM–7 AM). Strict cutoff at 11:00 PM.
3. **Presence model:** Expiration-based, no heartbeat. `live_until` is the single source of truth.
4. **Renewal:** STRICT REPLACEMENT — `live_until = now + duration`. All buttons always available. Agent could reduce remaining time by clicking a smaller duration. Accepted UX risk; button copy mitigates.
5. **Button labels:**
   - Offline state: "Go online for 30 min" / "Go online for 1 hour" / "Go online for 2 hours"
   - Live state: "Stay online for 30 minutes" / "Stay online for 1 hour" / "Stay online for 2 hours"
   - Both states use same backend endpoint, just different copy.
6. **Bundle:** Separate React entry at `resources/js/agent/main.tsx` via Vite multi-entry config.
7. **Design:** HTML mockup first at `docs/design-mockups/agent-page.html`, code follows mockup.

### Task breakdown

- **Task 0:** HTML mockup (5 visual states: loading, invalid, disabled, offline, live)
- **Task 1:** AgentSecretController backend — 4 endpoints (GET show, POST go-online, POST extend, POST go-offline). Extend uses same logic as go-online. Separate endpoints for audit log differentiation (`went_online` vs `extended`).
- **Task 2:** Time-based duration validation rule (Africa/Addis_Ababa timezone-aware)
- **Task 3:** Vite multi-entry config + agent React entry
- **Task 4:** Agent page state machine + countdown timer
- **Task 5:** Smoke test

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

### Resume next session

- **Phase C starts with HTML mockup creation** (Task 0).
- Resume: `cd ~/kemerbet-agents && claude`
- First action: build the agent page mockup at `docs/design-mockups/agent-page.html` matching locked design tokens (mint, navy, off-white, no red).
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
[ ] Phase C — Agent secret page           ← next
[ ] Phase D — Public API + HTML block
[ ] Phase E — Notifications              spec locked in docs/notifications-spec.md (2026-04-28)
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
