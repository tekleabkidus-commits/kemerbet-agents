# Project State — Kemerbet Agents

**Last updated:** 2026-04-28
**Current phase:** Phase B — Admin agent CRUD (in progress)
**Build progress:** Phase A complete. Phase B Tasks 1+2+3+4 implementation complete (Task 4 smoke test pending).

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

- 🔧 **Task 4 — Activity Log** (implementation complete 2026-04-28, smoke test pending)
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

### Resume next session

- **Smoke test the activity log in the browser.** If smoke test passes, Task 4 ships and we move to Task 5 (restore deleted agents).
- **Servers:** restart with `php artisan serve --port=8001` + `npm run dev`
- **Smoke test checklist:**
  1. Click Activity in sidebar → page loads with events (or empty state if no events yet)
  2. Generate events: create/disable/enable/delete an agent → verify events appear in activity log
  3. Filter by event type → only matching events shown
  4. Filter by date range → only events in range shown
  5. Open EditAgentModal → click "View activity" → navigates to filtered activity page
  6. Filter banner shows "Showing activity for Agent N (@username)" with "Show all events" clear button
  7. Verify soft-deleted agent events show "(deleted)" suffix in descriptions

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
[🔧] Phase B — Admin agent CRUD          in progress — Tasks 1+2+3+4 done, Task 4 smoke test pending
[ ] Phase C — Agent secret page
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
