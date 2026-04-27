# Project State — Kemerbet Agents

**Last updated:** 2026-04-27 (initial setup)
**Current phase:** Phase A — Foundation (not started)
**Build progress:** 0% (just bootstrapped)

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

---

## What's next — Phase A: Foundation

**Goal:** Get a working empty admin shell that Kidus can log into and see seeded agents.

### Tasks (work through in order)

1. **Database migrations** — create all tables per Section 3 of the spec:
   - `admins`
   - `agents`
   - `payment_methods`
   - `agent_payment_methods` (pivot)
   - `agent_tokens`
   - `status_events`
   - `click_events`
   - `visit_events`
   - `daily_stats`
   - `settings`

2. **Eloquent models** with relationships:
   - `Admin`, `Agent`, `PaymentMethod`, `AgentToken`, `StatusEvent`, `ClickEvent`, `VisitEvent`, `Setting`
   - Soft deletes where specified
   - Casts for jsonb, timestamps, decimals

3. **Sanctum admin auth**:
   - `POST /api/admin/login`
   - `POST /api/admin/logout`
   - `GET /api/admin/me`
   - Rate limit: 5/min per IP on login

4. **Admin login page** (Blade or React, simple):
   - Use the design from `docs/mockups/admin-login.html`

5. **Seed script**:
   - 1 admin: `kidus@kemerbet.com` (password set on first run, prompted)
   - 8 default payment methods (TeleBirr, M-Pesa, CBE Birr, Dashen, Awash, BoA, Coop, Wegagen)
   - 28 agents from the existing static HTML (display numbers 1–28, telegram usernames preserved, all assigned default payment methods)
   - Tokens for each agent (for Phase C use)

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
- [ ] Postgres port: spec says 5434, but for simplicity setup uses default 5432. If 5434 is needed, edit postgresql.conf and update `.env`.
- [ ] Whether to run admin SPA on the same port as API (Laravel dev server) or separate Vite dev server. Recommend Vite separate for Phase B.

---

## Phase progress map

```
[ ] Phase A — Foundation                  ← we are here
[ ] Phase B — Admin agent CRUD
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
