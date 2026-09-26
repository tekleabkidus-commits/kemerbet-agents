# Project State — Kemerbet Agents

**Last updated:** 2026-05-01
**Current phase:** Phase H — Admin Polish & Security (in progress)
**Build progress:** Phase A–G functionally complete. Phase H near-complete — H1, H2, H3, EV1-3, Wave 2 shipped.

---

## Phase progress

| Phase | Scope | Status |
|-------|-------|--------|
| A | Foundation: repo, migrations, models, admin auth, seeds | Complete |
| B | Admin agent CRUD + payment methods + settings | Complete |
| C | Agent secret page (Blade) | Complete |
| D | Public API + HTML block | Complete |
| E | Notifications (service worker) | Complete |
| F | Analytics (rollups, charts, leaderboard) | Complete (F7 smoke test checklist written, manual walkthrough not yet performed) |
| G | Polish & Deploy | Complete (G1, G2, G2.5, G3 shipped; smoke test + deploy prep remaining) |
| H | Admin Polish & Security | In progress — H1, H2, H3, EV1-3, Wave 2 shipped |

---

## Phase H — Admin Polish & Security (in progress)

### Shipped tonight (2026-05-01)

- **H1 (6b18c6f)** — Admin password change feature in Settings > Security tab. POST /api/admin/auth/change-password endpoint with current-password verification, min-8-char rule, can't-reuse-current-password rule. Frontend form with success/error states, 6 backend + 2 frontend tests.

- **H2 (39590d9)** — Branded 404 page replacing Laravel's default. Dark navy theme, gold "K" letter mark, "Wrong page" headline, two action buttons (Go to Kemerbet → kemerbet.com, Contact Support → @KemerbetSupport on Telegram). Mobile-responsive, fully inline CSS. 3 backend tests covering HTML route, JSON API route, and admin SPA fallback.

- **H3 (df4658d)** — Login rate limit widened from 5 attempts per 1 minute to 5 attempts per 15 minutes per IP. One-line change in AppServiceProvider; existing throttle infrastructure already wired. 3 new tests verifying boundary, Retry-After header, and rate limit applies even with valid credentials. AuthTest description string updated to match new window.

- **EV1 (1020caa)** — Backend onboarding_video_url setting. Validation accepts YouTube URL formats (youtube.com/watch, youtu.be, youtube.com/embed) and empty string. Exposed via existing /api/public/agents endpoint. Seeded with empty default. 6 backend tests.

- **EV2 (e73bbb3)** — Settings General tab UI panel for editing the video URL. Inline regex validation feedback (green/red/neutral). Auto-wired to existing dirty detection and diff-only PATCH save flow. 2 frontend tests.

- **EV3 (7489774)** — Embed widget integration. localStorage-based 24h visibility (kemerbet_first_seen_at key), YouTube URL parser handles 3 supported formats, conditional iframe injection in #videoWrap above agent list. Verified end-to-end in browser. Skipped tests (no embed test infrastructure exists).

- **Wave 2 honesty pass (249ee43)** — Removed deceptive alert("coming soon") patterns from Dashboard + Analytics pages. Export CSV buttons now disabled with tooltip; "Custom" date range and "Conversion Rate" sort options removed entirely. Matches G2.3 honesty pattern applied to Settings.

### Remaining for Phase H

- **Force logout other devices on password change** — Requires AuthenticateSession middleware setup. Deferred from H1 due to cascading risk.

- **Audit log infrastructure** — admin_audit_log table for password changes, settings changes, login events. Deferred from H1.

- **2FA for admin login** — TOTP setup, backup codes. Major scope. Phase H2 (sub-phase).

- **Public Page settings tab** — Currently shows "Available in Phase H" placeholder. Customize public agent listing branding (if a public listing exists in scope).

- **Account settings tab** — Currently shows "Available in Phase H" placeholder. Admin profile (name/email/notifications).

- **Frontend 429 handling** — LoginPage should detect rate limit response and show formatted "try again in X minutes" message using Retry-After header.

---

## Phase G status (complete)

### Shipped

- **G1 — Payment Methods CRUD** (commit 5c72617): Replaces 3-line stub. Backend: 4 endpoints (create, update, delete with 422 protection if linked to agents, reorder). Frontend: 501-line page with table, add/edit modal, optimistic toggle and reorder. 10 backend + 4 frontend tests.
- **G2 — Settings Page** (commit ec742ac): Replaces 3-line stub. Backend: GET + PATCH with validation. Frontend: 410-line page with 4 panels (Telegram prefill, Agent Behavior, Notifications read-only, Danger Zone placeholder). Dirty detection, diff-only PATCH. 10 backend + 4 frontend tests.
- **G2.5 — Install Embed Panel** (commit 31b8609): Build pipeline fix (embed + admin builds). New "Install Embed" panel in Settings with copy-paste snippet. embed_base_url added to settings API response. 1 backend + 2 frontend tests.
- **G3 — Activity Timeline** (commit 2b2ecb1): Replaced table layout with vertical timeline matching mockup. Day-grouped events, colored dots, metadata display. 3 frontend tests. No backend changes.

### Remaining

- **F+G final smoke test execution** — Checklist exists at docs/F-AND-G-FINAL-SMOKE-TEST.md. Manual run with seeded data has not been performed. This is the equivalent of F7 + G smoke test combined. ESTIMATED: 30-45 min.
- **Real-device smoke test for Phase E notifications** — Deferred from end of Phase E. See docs/staging-deployment-checklist.md for the validation plan.
- **Real-device E2E for embed widget** — Test on actual mobile + desktop browsers, not just dev environment.
- **Bundle size optimization** — Admin chunk grew to 151KB gzipped after Recharts (F5C). Consider code-splitting AnalyticsPage via React.lazy so other admin pages stay light.
- **Production deployment preparation** — environment config, secrets management, deployment runbook, CI/CD setup.

---

## Test counts (current)

- Backend: 309 (1006 assertions)
- Frontend: 30 across 6 test files
  - DashboardPage.test.tsx (5 tests, Phase F)
  - AnalyticsPage.test.tsx (7 tests, Phase F)
  - PaymentMethodsPage.test.tsx (4 tests, G1)
  - SettingsPage.test.tsx (11 tests, G2 + G2.5 + H1 + EV2)
  - ActivityPage.test.tsx (3 tests, G3)
  - NotFoundPage.test.tsx (1 test, H2)
- **Total: 339 tests**

---

## Phase F summary (completed 2026-04-30)

### Backend (8 commits)
F0 visit tracking, F0.5 payment methods at click time, SessionMinutesCalculator refactor, F1A DailyStatsService, F1B rollup command, F2 StatsService with 5min cache, F3 admin API endpoints (overview/timeline/leaderboard/agentDetail), F5-PRE-1 heatmap endpoint, F5-PRE-2 payment methods breakdown endpoint.

Mid-session bug fix: parseRange returned 7-day range when range=today was passed. Silent — affected all stats endpoints. Fixed with regression test.

### Frontend (10 commits)
- F4-MOCKUP: HTML mockup for dashboard locked from architect-provided design system (7 mockups total).
- F4A: Dashboard visual port — CSS + structure with hardcoded data.
- F4B: Dashboard real data wiring + 30s polling with visibility-change pause.
- F4C: Frontend test infrastructure (vitest + @testing-library + jsdom) + 5 dashboard tests.
- F5A: Analytics visual port — all 5 sections with hardcoded sample data.
- F5B: Analytics real data wiring + date range state.
- F5D-PRE: is_live boolean added to leaderboard response.
- F5D: Leaderboard wired to real data with sort dropdown.
- F5C: Replaced static SVG trends chart with Recharts dual-Y-axis AreaChart.
- F5E: 7 frontend tests for AnalyticsPage.
- F6: Per-agent stats grid in EditAgentModal (last 30 days).
- F7: Smoke test checklist documented (manual execution rolled into Phase G smoke test).

### Architectural decisions locked in Phase F
- Architect-provided mockup wins over earlier revision suggestions
- Frontend test infrastructure: vitest + @testing-library/react + jsdom
- StatCard exported from DashboardPage for AnalyticsPage reuse
- Recharts dual Y-axis trends chart (overrides mockup's single axis for production resilience)
- Recharts ResponsiveContainer requires test mocking (jsdom returns 0 width)
- Bundle size +105KB gzipped accepted; code-split deferred to Phase G optimization
- F6 modal-embedded stats grid (no dedicated agent edit page exists)
- parseRange today bug fix with regression test

---

## Resume next session

**Next action:** No specific next feature scoped. Phase H mostly complete.

Open work that could be picked up:
- Force logout other devices on password change (deferred from H1, requires AuthenticateSession middleware)
- Audit log infrastructure (admin_audit_log table for password changes, settings changes, login events)
- 2FA for admin login (TOTP setup, backup codes — major scope)
- Public Page settings tab (currently placeholder, scope unclear)
- Account settings tab (currently placeholder, admin profile)
- Frontend 429 handling on LoginPage (read Retry-After, format wait time)
- Embed test infrastructure (set up vitest scaffold for the embed widget)
- F+G manual smoke test execution (checklist exists at docs/F-AND-G-FINAL-SMOKE-TEST.md, untested)
- Bundle size optimization (code-split AnalyticsPage)
- Production deployment prep
- Hosting decision (Forge+DO recommended; Laravel Cloud also viable)
- Real-device validation (Phase E notifications + embed widget on actual mobile/desktop)

---

## Pair rule — each player only sees their own agents (2026-09-26)

Admin switch: Settings → General → **Player Agent Pairing** (`pair_mode_enabled`, ships **off**; `pair_size`, default 2).

**Rules (agreed with Kidus):**
- A player = device id (random, localStorage `kemerbet_device_id`) + Player ID auto-detected from the login. Every agent a player is given is remembered under BOTH (`player_agent_assignments`, subject_type `device` / `player`) and the two memories are merged on every request.
  - New account on the same device → same agents. Same account on another device → same agents. Login detected → device agents copied to the Player ID (`POST /api/public/pair/sync`). Clashes merge (nothing lost).
- `POST /api/public/pair` picks the agents: previous agents who can serve the request first (most recently shown on the deposit list, then most recently shown anywhere), and only then random never-given agents to fill the pair. New agents join the memory.
- Withdrawals use the same memory: the deposit agents first if they are online, accept withdrawals, cover the amount and pay to the chosen bank; otherwise topped up with new agents who can. Nobody covers the amount → `withdrawal_no_match_behavior` (closest / empty), previous agents first.
- While on: no full list / directory / count in `GET /api/public/agents`, no offline agents, no recents, pins ignored. Player ID can't be typed or edited — not detected = "Player ID not detected" + Try again, cannot continue.
- Agent numbers are never shown to players (both modes): cards read "Agent" with a person icon.

**Code:** `app/Services/AgentPairingService.php`, `PublicAgentsController@pair/@pairSync`, `resources/js/embed/pairing.ts`, `card.ts`, pair sections in `flow.ts`.
**Tests:** `tests/Feature/Public/AgentPairingTest.php`, `tests/Feature/Admin/PairSettingsTest.php`, `resources/js/embed/__tests__/pairing.test.ts`, `resources/js/admin/__tests__/PairSettings.test.tsx`.
**Side fix:** withdraw buttons (and recents buttons) no longer also record a phantom *deposit* click (`main.ts` click delegation scoped to the deposit grids).

**Follow-up (2026-09-26 evening):**
- *Incident:* a few players saw "no agents" after the questionnaire. Their phones still had the pre-pair-rule widget cached; with the pair rule on the public list is empty. Fix: in pair mode `GET /api/public/agents` now sends old widgets a small numberless sample of online agents (`pair_size`, stable per IP + browser per hour; `pair_pool` is cached server-side only). Current widgets ignore it.
- *Widget delivery:* `/embed/embed.js` is no longer a static file (static files could be cached for hours). The bundle is built to `resources/embed-dist/embed.js` and served by `EmbedScriptController` (route registered outside the web group in `bootstrap/app.php`: no session/cookies) with `Cache-Control: public, max-age=300, s-maxage=300` + ETag/304. New widget versions reach phones within ~5 minutes.
- *Pair reset:* Settings → General → Player Agent Pairing → "Reset pairs automatically" (`pair_reset_enabled`, ships off) + "Reset every N hours" (`pair_reset_hours`, 1–720, default 72). Counted per player from when the current pairing started; on the next visit after it expires the device + player memory is forgotten and a fresh random pair is chosen, agents from the old pairing only if not enough others are online.

---

## Key file locations

- Public docs: `docs/PROJECT_STATE.md` (this file), `docs/SPECIFICATION.md`, `docs/F-AND-G-FINAL-SMOKE-TEST.md`, `docs/staging-deployment-checklist.md`
- Design mockups: `docs/design-mockups/admin-*.html` (7 locked mockups)
- Working agreement: `CLAUDE.md`
