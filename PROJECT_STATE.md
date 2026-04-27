# Project State — Kemerbet Agents

**Last updated:** 2026-04-28
**Current phase:** Phase B — Admin agent CRUD (in progress)
**Build progress:** Phase A complete. Phase B Task 1 complete. Task 2 implementation complete (smoke test pending).

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

- 🔧 **Task 2 — Agent edit modal + destructive operations** (in progress, 2026-04-28)
  - ✅ GATE 1 — Backend reads + edits: GET/PUT /api/admin/agents/{id} (cc3ac3f)
  - ✅ GATE 2 — Backend destructive operations: disable, enable, regenerate-token, destroy (aea943d)
    - Migration: added admin_id to status_events for audit trail
    - New event types: disabled_by_admin, enabled_by_admin, token_regenerated, deleted_by_admin
    - Idempotent disable/enable (no event logged if already in target state)
    - Atomic transactions for regenerate-token and destroy
  - ✅ GATE 3 — Modal CSS infrastructure: overlay, animations, scroll lock, z-index scale (91b7bb5)
  - ✅ GATE 4 — Modal + ConfirmModal React components with focus trap (8dc9e9e)
  - ✅ GATE 5 step 1 — GET /api/admin/payment-methods endpoint (ff5cb70)
  - ✅ GATE 5 step 2a — Form/token/confirm CSS classes lifted from mockup (6f8f90b)
  - ✅ GATE 5 step 2b — Modal variant prop for confirm stacking (b39c554)
  - ✅ GATE 5 step 2c — EditAgentModal.tsx + AgentsPage wiring (1db7ed1)
    - EditAgentModal: ~557 lines, 14 state pieces, cancellation flag for race-safe loading
    - TokenDisplay (current token view) + TokenReveal (post-regen celebration with Telegram send)
    - 4 ConfirmModal instances gated by confirmAction state (disable/enable/regenerate/delete)
    - handleRegenerateToken defers onSaved to modal close (token reveal stays visible)
    - AgentsPage: Edit button wired, agentsVersion counter triggers list refetch on save
    - CSS: .modal-footer-right for split footer right-side button group
  - **Status: implementation complete, awaiting browser smoke test**

### Resume next session

- **Smoke test the full edit modal flow in the browser.** If smoke test passes, Task 2 ships and we move to Task 3 (create new agent).
- **Servers:** restart with `php artisan serve --port=8001` + `npm run dev`
- **Smoke test checklist:**
  1. Click Edit pencil on an agent row → modal opens with agent data loaded
  2. Change telegram username + toggle payment methods + edit notes → Save Changes → list refreshes
  3. Click Regenerate → confirm modal → new token revealed with Copy + Send via Telegram
  4. Dismiss token reveal → back to normal token display
  5. Click Disable → confirm → agent shows as disabled, button changes to Re-enable
  6. Click Re-enable → confirm → agent restored to active
  7. Click Delete → confirm → modal closes, agent removed from list (visible under Deleted filter)
  8. Test error state: open modal for a nonexistent agent ID → error message + Close button in footer

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
[🔧] Phase B — Admin agent CRUD          in progress — Task 2 implementation complete, smoke test pending
[ ] Phase C — Agent secret page
[ ] Phase D — Public API + HTML block
[ ] Phase E — Notifications
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
