# F7 — Phase F Manual Smoke Test

**Goal:** Verify Phase F analytics work didn't regress any admin page, and confirm new analytics surfaces work end-to-end across the full admin surface.

**Why manual:** Visual contract checks against locked mockups need human eyes. Automated tests don't catch CSS drift, layout shift, or badge misalignment.

**Visual contract source of truth:** `docs/mockups/` (per `e13c755` commit authority).
**Note:** A duplicate exists at `docs/design-mockups/`. Folders are byte-identical for shared admin files. Cleanup tracked as post-F7 chore — do not flag during this smoke test.

**Bundled release context:** F7 is the gate to a bundled F+G release. After F7 sign-off, Phase G (Payment Methods admin, Settings admin, Activity timeline redesign) ships without a separate F-only release.

---

## How to use this doc

1. Work through sections in order. Each section is independent — you can stop and resume across multiple sessions.
2. Tick checkboxes as you verify. Use `[x]` for pass, `[!]` for defect found, `[~]` for known drift / out-of-scope.
3. Log any defect to **Section 12 — Defects Found** with a short description. Don't fix during smoke test — fixing is post-F7.
4. Sign off at the bottom only when every section is `[x]`, `[!]`, or `[~]` — no blank checkboxes.

---

## Pre-flight (5 min)

- [ ] Pull `main` at `4c5d8e7` or later — confirm `git log -1 --oneline` shows the F6 commit
- [ ] Run `php artisan migrate:fresh --seed` on a clean DB
- [ ] Confirm rollup command registered: `php artisan schedule:list` shows the daily rollup
- [ ] `npm run build` — zero Vite errors
- [ ] Clear all caches: `php artisan optimize:clear`
- [ ] Start the dev server: `php artisan serve` — confirm reachable at `http://127.0.0.1:8001`
- [ ] Open Chrome DevTools, keep Console + Network tabs visible throughout

---

## Section 1 — Seed live activity (5 min)

So pages aren't testing against empty states only:

- [ ] Hit visit tracking endpoint for 3–4 different agents over the last 7 days (vary timestamps so heatmap has density)
- [ ] Trigger clicks with at least 3 distinct `payment_methods` values (e.g. `["telebirr"]`, `["telebirr","mpesa"]`, `["cbe_birr","awash"]`) so the payment methods chart has data
- [ ] Keep at least one agent with **zero activity** (this is the empty-state test subject)
- [ ] Run rollup manually for yesterday: `php artisan stats:rollup --date=$(date -d yesterday +%Y-%m-%d)`
- [ ] Verify `daily_stats` populated: `php artisan tinker` → `DB::table('daily_stats')->count()` returns > 0
- [ ] Run rollup again for the same date — confirm idempotent (no duplicate rows, count stays the same)

---

## Section 2 — Auth surface

| Check | Expected | Pass |
|---|---|---|
| Load `/admin` while logged out | Redirects to `/admin/login` | [ ] |
| Login page renders | No console errors, form fields visible | [ ] |
| Visual contract | Matches `docs/mockups/admin-login.html` | [ ] |
| Submit empty form | Validation errors appear inline | [ ] |
| Submit wrong password | Error message shown, doesn't reveal if email exists | [ ] |
| Submit correct credentials | Redirects to dashboard | [ ] |
| Logout button | Clears session, redirects to login | [ ] |
| Visit `/admin/agents` while logged out | Redirects to login (not 500, not blank) | [ ] |
| Console errors during entire flow | Zero | [ ] |

**⚠️ Pre-launch cleanup note (don't flag as defect):** Login page placeholder shows `kidus@kemerbet.com`. Replace with generic `admin@kemerbet.com` before public launch. Log to Section 13.

---

## Section 3 — Dashboard (F4 contract)

**Visual contract:** `docs/mockups/admin-dashboard.html`

- [ ] Loads at `/admin` after login, no console errors
- [ ] Range toggle: `today` → numbers update (verify `parseRange` fix from `533b72f`)
- [ ] Range toggle: `7d` → numbers update
- [ ] Range toggle: `30d` → numbers update
- [ ] Refresh twice quickly → second load served from cache (Network tab shows cached response timing)
- [ ] Trigger a new visit, hard refresh → cache invalidates within expected window
- [ ] Stat cards render correctly (no NaN, no "undefined", no empty values)
- [ ] All buttons in mockup are present in React (Export CSV button shows "Coming soon" alert — known, by design)
- [ ] Visual diff against `admin-dashboard.html` — spacing, typography, badge colors, sidebar state all match
- [ ] Responsive: resize to ~1024px → no horizontal scroll, no layout break
- [ ] Responsive: resize to ~1440px → matches mockup at desktop width

---

## Section 4 — Analytics page (F5 contract)

**Visual contract:** `docs/mockups/admin-analytics.html`

- [ ] Loads at `/admin/analytics`, no console errors
- [ ] **Heatmap** renders with seeded data, hover tooltips show correct counts
- [ ] **Payment methods chart** renders, sums to total clicks (sanity check the math)
- [ ] **Recharts AreaChart** renders, axes labeled, no overflow, smooth on resize
- [ ] **Leaderboard** renders all agents with seeded data
- [ ] Leaderboard: click each sortable column, sort direction toggles correctly
- [ ] Leaderboard: `is_live` indicator green for live agents, grey for offline (verify with at least one of each)
- [ ] Range toggle (today / 7d / 30d): all four widgets update together
- [ ] "Custom date range" button → shows "Coming soon" alert (known, by design)
- [ ] Visual diff against `admin-analytics.html` — all four widgets match mockup
- [ ] Responsive 1024px / 1440px / 1920px

---

## Section 5 — Agents list page

**Visual contract:** `docs/mockups/admin-agents.html`
**⚠️ Known drift (don't flag):** Export CSV button missing — by design per `e13c755` commit.

- [ ] Loads at `/admin/agents`, no console errors
- [ ] Pagination works (if >1 page of agents)
- [ ] Search by number / username filters correctly
- [ ] Filters (status, live/offline) apply correctly
- [ ] Empty state renders cleanly when filters return zero results
- [ ] Each row shows agent number, username, status, payment methods, click counts
- [ ] **⚠️ DEFECT-F7-1 candidate:** Click counts on each row — are they real numbers or hardcoded zeros? Check `AgentController.php:96–97` returns real `clicks_today` / `clicks_total`. If zeros despite seeded activity → log to Section 12 as DEFECT-F7-1.
- [ ] Row click / "Edit" button opens EditAgentModal
- [ ] "Add Agent" button opens NewAgentModal
- [ ] Sort columns work (display number, status, last activity)
- [ ] Visual diff against `admin-agents.html`
- [ ] Sidebar agent count (referenced as TODO in `AdminLayout.tsx:38`) — is it real count or placeholder? If placeholder → log to Section 12 as DEFECT-F7-2.

---

## Section 6 — Agent create / edit (F6 contract)

**EditAgentModal is the F6 deliverable. Stats grid must work.**

### Create flow

- [ ] "Add Agent" opens NewAgentModal
- [ ] Form validates: empty username rejected, duplicate display_number rejected
- [ ] Submit valid → agent appears in list immediately
- [ ] Cancel button discards changes, no row added

### Edit flow with seeded-activity agent

- [ ] EditAgentModal opens for an agent with click data
- [ ] **F6 stats grid populates with real numbers** (not zeros, not "undefined")
- [ ] **Parity check:** modal stats for this agent match the leaderboard row for the same agent + same range. Numbers must agree.
- [ ] Edit a field (e.g. notes), save → list reflects change, modal closes
- [ ] Cancel button discards changes, no save fired
- [ ] Payment methods multi-select works (toggle one on/off, save, verify persisted)

### Edit flow with zero-activity agent

- [ ] EditAgentModal opens
- [ ] Stats grid shows clean empty state (zeros displayed properly, no NaN, no "undefined", no broken layout)
- [ ] Form still works for editing other fields

### Permissions

- [ ] Delete agent button (if exists) → confirmation modal → agent removed
- [ ] After delete, no orphan rows in `daily_stats` referencing the deleted agent (run query: `SELECT COUNT(*) FROM daily_stats WHERE agent_id = <deleted_id>`)

---

## Section 7 — Settings page (STUB — out of F7 scope)

**Status:** Stub, deferred to G2. Mockup exists at `docs/mockups/admin-settings.html` (820 lines) and will be the visual contract for Phase G.

- [~] Loads at `/admin/settings` without 500 error
- [~] Renders "Coming in Phase B" placeholder cleanly (no broken layout, no console errors)
- [~] Sidebar nav active state correct on this page
- [~] Auth still applies (logout → can't access page)
- [~] **Do not check visual contract.** Stub deferred to G2.

Mark stub status in Section 12 as `STUB-G2 — deferred`. Not a defect.

---

## Section 8 — Payment Methods page (STUB — out of F7 scope)

**Status:** Stub, deferred to G1. Mockup exists at `docs/mockups/admin-payment-methods.html` (901 lines) and will be the visual contract for Phase G.

- [~] Loads at `/admin/payment-methods` without 500 error
- [~] Renders "Coming in Phase B" placeholder cleanly
- [~] Sidebar nav active state correct
- [~] Auth still applies
- [~] **Do not check visual contract.** Stub deferred to G1.

Mark stub status in Section 12 as `STUB-G1 — deferred`. Not a defect.

---

## Section 9 — Activity page

**Visual contract:** `docs/mockups/admin-activity.html`
**⚠️ Known major drift (don't flag):** Mockup uses timeline UI, current React uses table. Drift is documented in `e13c755` commit, deferred to G3 in the F+G bundle.

For F7, verify the **current table implementation works correctly** — the timeline redesign comes in G3.

- [ ] Loads at `/admin/activity`, no console errors
- [ ] Table populates with seeded events (visits, clicks, sessions)
- [ ] Date range filter ("From" / "To" date pickers) applies correctly
- [ ] Pagination works
- [ ] Empty state renders cleanly when filters return zero events
- [ ] Click event payment_methods column displays correctly (jsonb array → readable list)
- [ ] **Skip visual diff against mockup** — known drift, G3 territory.

Log drift to Section 12 as `KNOWN-DRIFT-G3 — Activity timeline redesign deferred`. Not a defect.

---

## Section 10 — Cross-cutting checks

These catch the kind of bugs Phase F could have introduced via global CSS in `admin.css` (commit `4c5d8e7`).

### Sidebar / Navigation

- [ ] Active state correct on every admin page (highlight matches current route)
- [ ] Collapsible behavior works (if implemented)
- [ ] All nav links navigate to the correct route

### Global CSS regression

Walk every admin page (Dashboard, Analytics, Agents, Settings stub, Payment Methods stub, Activity) and verify on each:

- [ ] No unintended font weight changes vs mockup
- [ ] No color shifts (especially: NO RED USED ANYWHERE — design rule)
- [ ] No spacing drift
- [ ] No broken layout / overflow

### Layout shell consistency

- [ ] Header consistent across all pages
- [ ] Footer consistent across all pages
- [ ] Sidebar consistent across all pages
- [ ] Page padding consistent

### Responsive

Test these three pages at 1024px, 1440px, 1920px:

- [ ] Dashboard
- [ ] Analytics
- [ ] Agents list

For each: no horizontal scroll, no broken layouts, no overlapping elements.

### Console hygiene

- [ ] Zero console errors on any admin page
- [ ] Zero React warnings about keys, missing props, deprecated APIs
- [ ] No `404`s in Network tab for static assets

---

## Section 11 — Permissions matrix

For each admin route, verify three identities:

| Route | Admin (200) | Non-admin (403) | Logged out (302 → login) |
|---|---|---|---|
| `/admin` | [ ] | [ ] | [ ] |
| `/admin/agents` | [ ] | [ ] | [ ] |
| `/admin/analytics` | [ ] | [ ] | [ ] |
| `/admin/activity` | [ ] | [ ] | [ ] |
| `/admin/payment-methods` | [ ] | [ ] | [ ] |
| `/admin/settings` | [ ] | [ ] | [ ] |
| `GET /api/admin/payment-methods` | [ ] 200 | [ ] 403 | [ ] 401 |
| `GET /api/admin/stats/dashboard` | [ ] 200 | [ ] 403 | [ ] 401 |
| `GET /api/admin/stats/leaderboard` | [ ] 200 | [ ] 403 | [ ] 401 |

If a non-admin role doesn't exist in the system, mark "Non-admin" column N/A and note in Section 13.

---

## Section 12 — Defects Found

Log each defect with a short ID, page, expected vs actual, severity (P0/P1/P2). **Do not fix during smoke test.**

| ID | Page / Route | Expected | Actual | Severity | Notes |
|---|---|---|---|---|---|
| DEFECT-F7-1 | Agents list | `clicks_today` / `clicks_total` show real numbers | (verify during Section 5) | P1 | `AgentController.php:96–97` hardcoded zeros despite Phase F services existing |
| DEFECT-F7-2 | Sidebar | Real agent count shown | (verify during Section 5) | P2 | `AdminLayout.tsx:38` TODO indicates fake count |
| | | | | | |
| | | | | | |

### Stubs confirmed (NOT defects)

- [ ] STUB-G1: `/admin/payment-methods` — deferred to Phase G1
- [ ] STUB-G2: `/admin/settings` — deferred to Phase G2
- [ ] KNOWN-DRIFT-G3: `/admin/activity` timeline redesign — deferred to Phase G3

---

## Section 13 — Pre-launch cleanup tracker (NOT blocking F7)

Items found during F7 that should be fixed before KemerrBet public launch but don't block F7 sign-off:

- [ ] LoginPage placeholder reveals real admin email (`kidus@kemerbet.com` → `admin@kemerbet.com`)
- [ ] StubPage label "Coming in Phase B" is stale — replace with generic "Not yet available" (will be obsolete after G1+G2 ship)
- [ ] Mockup folder cleanup: consolidate `docs/design-mockups/` into `docs/mockups/`, update 4 file references in PROJECT_STATE.md and styles.ts
- [ ] (add others as found)

---

## Sign-off

**Smoke test signed off when ALL of the following are true:**

- [ ] Every checkbox in Sections 1–11 is `[x]`, `[!]`, or `[~]` (no blanks)
- [ ] Every defect in Section 12 is logged with a severity
- [ ] No P0 defects open (P0 = anything that breaks core admin function)
- [ ] All stubs and known drifts confirmed as out-of-scope, not regressions
- [ ] Console hygiene (Section 10) is clean

**Tester:** ____________________
**Date:** ____________________
**Sign-off:** ☐ APPROVED — proceed to F7 defect fixes, then Phase G
            ☐ BLOCKED — list blocking defects: ____________________

---

## What happens after F7 sign-off

1. Fix DEFECT-F7-1 (AgentController zeros) — Claude Code, ~1 hour
2. Fix any other P1 defects from Section 12
3. Begin Phase G: G1 (Payment Methods) → G2 (Settings) → G3 (Activity timeline)
4. Final F+G smoke test (lighter — only G surfaces + regression spot-check)
5. Tag bundled release, merge to main

Phase F+G bundle ships as one release.
