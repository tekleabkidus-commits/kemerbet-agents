# Project State — Kemerbet Agents

**Last updated:** 2026-05-01
**Current phase:** Phase G — Polish & Deploy (in progress)
**Build progress:** Phase A–E complete. Phase F functionally complete. Phase G at ~50% (G1 + G2 + G2.5 + G3 shipped; final smoke test + deployment prep remaining).

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
| G | Polish & Deploy | In progress — G1, G2, G2.5, G3 shipped |

---

## Phase G status (in progress)

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

- Backend: 291 (958 assertions)
- Frontend: 26 across 5 test files
  - DashboardPage.test.tsx (5 tests, Phase F)
  - AnalyticsPage.test.tsx (7 tests, Phase F)
  - PaymentMethodsPage.test.tsx (4 tests, G1)
  - SettingsPage.test.tsx (6 tests, G2 + G2.5)
  - ActivityPage.test.tsx (3 tests, G3)
- **Total: 317 tests**

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

**Next action:** Execute the F+G final smoke test from docs/F-AND-G-FINAL-SMOKE-TEST.md.

1. Servers: `php artisan serve --port=8001` + `npm run dev`
2. Seed data: `php artisan agents:rollup-daily --days=30` to populate daily_stats
3. Walk through every admin page with the checklist
4. Note bugs, slow queries, broken states
5. Document findings in docs/smoke-test-report.md (or fix as you go for trivial issues)

After smoke test passes, remaining Phase G work:
- Real-device validation (Phase E notifications + embed widget)
- Bundle optimization (code-split AnalyticsPage)
- Deployment prep

---

## Key file locations

- Public docs: `docs/PROJECT_STATE.md` (this file), `docs/SPECIFICATION.md`, `docs/F-AND-G-FINAL-SMOKE-TEST.md`, `docs/staging-deployment-checklist.md`
- Design mockups: `docs/design-mockups/admin-*.html` (7 locked mockups)
- Working agreement: `CLAUDE.md`
