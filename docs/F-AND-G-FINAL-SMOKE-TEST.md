# F+G Bundle — Final Smoke Test

**Goal:** Sanity check that the full F+G bundle works end-to-end before tagging the release. Lighter than F7 because we have 317 automated tests as a baseline; this catches what tests can't (visual rendering, real browser interactions, embed isolation).

**Estimated time:** ~30 minutes

**Bundle commits being verified:**
- Phase F (analytics) — `4c5d8e7`
- G1 Payment Methods — `5c72617`
- G2 Settings — `ec742ac` (with G2.3 honesty pass amend)
- G3 Activity timeline — `2b2ecb1`
- G2.5 Embed install panel — `31b8609`

---

## How to use this

Tick checkboxes as you verify. Use `[x]` for pass, `[!]` for defect. Log any defects in Section 9. Sign off when every section is green.

---

## Section 1 — Pre-flight (5 min)

- [ ] `git pull` — confirm on `main` at commit `31b8609` or later
- [ ] `php artisan migrate:fresh --seed` — clean DB with seeded data
- [ ] `npm run build` — confirm output mentions BOTH admin SPA AND embed widget builds
- [ ] `ls -la public/embed/embed.js` — confirm file regenerated with today's timestamp
- [ ] `php artisan serve --port=8001` — server starts, leave terminal open
- [ ] Open browser to `http://127.0.0.1:8001`
- [ ] Open Chrome DevTools (Console + Network tabs visible)

---

## Section 2 — Login + sidebar (3 min)

- [ ] Navigate to `/admin/login` — page renders, no console errors
- [ ] Log in with seeded admin credentials (`kidus@kemerbet.com`)
- [ ] Lands on Dashboard
- [ ] Click each sidebar link in order:
  - [ ] Dashboard
  - [ ] Agents
  - [ ] Analytics
  - [ ] Activity
  - [ ] Payment Methods
  - [ ] Settings
- [ ] Each page loads without console errors
- [ ] Active nav state highlights the current page on every page

---

## Section 3 — Dashboard (3 min)

- [ ] Loads with stats visible (numbers render, no NaN, no "undefined")
- [ ] Range toggle: `today` / `7d` / `30d` — numbers update for each
- [ ] No console errors during interactions

---

## Section 4 — Analytics (3 min)

- [ ] Heatmap renders, hover tooltips show counts
- [ ] Payment methods chart renders
- [ ] Recharts AreaChart renders, no overflow
- [ ] Leaderboard table populated, columns sortable
- [ ] `is_live` indicator shows green/grey correctly
- [ ] Range toggle updates all four widgets together

---

## Section 5 — Activity timeline (G3 — 5 min)

**This is the redesign — verify the new timeline UI works.**

- [ ] Page loads, no console errors
- [ ] Title shows "Activity Log" (not just "Activity")
- [ ] **Day groups visible:** "Today · [day name]" and at least one other day group
- [ ] **Each event row has 3 columns:** time (HH:MM) | colored dot | event description
- [ ] **Dot colors visible:**
  - [ ] Green glow for `went_online` events
  - [ ] Dim grey for `went_offline` / `session_expired`
  - [ ] Blue for `extended` events
  - [ ] Purple glow for admin actions (created, disabled, etc.)
- [ ] IP addresses show as monospace `IP xxx.xxx.xxx.xxx` below event text where present
- [ ] Filter dropdown: select "Went online" → page reloads with filtered events, URL updates
- [ ] Filter dropdown: select "All event types" → returns to full list
- [ ] Date range filters (From/To) work
- [ ] Pagination Next/Previous works if multiple pages
- [ ] Empty state: filter for an event type with no data, verify "No events match your filters" + "Clear filters" button

---

## Section 6 — Payment Methods (G1 — 5 min)

- [ ] Page loads, 8 seeded methods visible (TeleBirr, M-Pesa, CBE Birr, Dashen, Awash, BoA, Coop, Wegagen)
- [ ] Each row shows: order arrows | icon + name | slug code | status pill | "Used by N agent(s)" | actions
- [ ] **Active rows show:** ✎ Edit · ⏸ Deactivate · × Delete
- [ ] **Delete is disabled** on TeleBirr (since 24 agents are linked) — hover tooltip explains why
- [ ] Click "+ Add Method" → modal opens with display_name + slug + icon_url + active toggle
- [ ] Type a name → slug auto-generates (e.g. "Hibret Bank" → `hibret_bank`)
- [ ] Submit → new method appears in list with "Active" status, "0 agents"
- [ ] Click ⏸ Deactivate on the new method → row goes to 60% opacity, status pill changes to "Disabled"
- [ ] **Disabled rows show:** ▶ Re-enable · ✎ Edit · × Delete (Edit accessible on disabled rows — this was the G1.3 architect fix)
- [ ] Click ▶ Re-enable → row returns to active state
- [ ] Click × Delete on the custom method (which has 0 agents) → confirm modal → click Delete → row disappears
- [ ] Click × Delete on TeleBirr (24 agents) → button is disabled, can't click
- [ ] Try the up/down reorder arrows on a couple of rows → order persists after refresh

---

## Section 7 — Settings (G2 + G2.3 + G2.5 — 5 min)

- [ ] Page loads with 4 tabs: General (active), Public Page, Security, Account
- [ ] **General tab — 4 panels visible in this order:**
  - [ ] Telegram Pre-filled Message
  - [ ] **Install Embed** (G2.5 new panel)
  - [ ] Agent Behavior
  - [ ] Agent Notification Reminders (with 🚧 preview banner)
  - [ ] Danger Zone (with 🚧 not-yet-wired banner, all buttons disabled)

### Telegram message panel
- [ ] Textarea pre-filled with "Hi Kemerbet agent, I want to deposit"
- [ ] Character counter shows `36/200`
- [ ] Edit message → Save button enables, click Save → success toast appears for 3s
- [ ] Refresh page → change persists

### Install Embed panel (G2.5)
- [ ] Snippet code block renders with current dev URL: `http://localhost:8001/embed/embed.js`
- [ ] Click "📋 Copy snippet" → button text changes to "✓ Copied!" for 2s
- [ ] Open clipboard manager / paste in a text editor → snippet content matches: `<div id="kemerbet-agents"></div>\n<script src="http://localhost:8001/embed/embed.js"></script>`
- [ ] Click "🔍 Preview embed" → opens `/embed-test.html` in new tab
- [ ] Info banner shows current `public_refresh_interval_seconds` value (e.g. "60 seconds")

### Agent Behavior panel
- [ ] All 5 settings render with current values
- [ ] Toggle "Show offline agents" off → Save → refresh → still off
- [ ] Change "Hide offline agents after" to 24 hours → Save → persists

### Notification Reminders panel (G2.3 banner)
- [ ] Gold "🚧 Preview — not yet functional" banner visible at top
- [ ] All toggles disabled (cursor: not-allowed when hovered)
- [ ] Save button at bottom is disabled

### Danger Zone (G2.3 banner)
- [ ] Gold "🚧 Not yet wired up" banner visible at top
- [ ] Three buttons (Force Offline All, Regenerate All, Clear Data) all disabled
- [ ] No `alert()` dialog when hovering buttons

### Other tabs
- [ ] Click "Public Page" tab → "Available in Phase H" copy mentions "header text, branding, layout"
- [ ] Click "Security" tab → "Available in Phase H" copy mentions "2FA, login history"
- [ ] Click "Account" tab → "Available in Phase H" copy mentions "name, email, notification preferences"
- [ ] Click "General" tab → returns to the full settings panels

---

## Section 8 — Embed end-to-end (G2.5 most important test, 2 min)

**This is the new feature. Verify the embed actually works in a hostile host environment.**

- [ ] Open `http://127.0.0.1:8001/embed-test.html` in a new browser tab
- [ ] **Page loads with intentionally hostile host CSS:**
  - [ ] Host page background is light grey
  - [ ] Host page text is blue (`#1a3a6b`)
  - [ ] Host page font is Arial
  - [ ] Hostile rule `.agent-card { border: 3px solid red !important; }` is in host CSS
- [ ] **The embedded agent block renders inside its own dark theme:**
  - [ ] Dark navy background (`#0a1628`)
  - [ ] White text
  - [ ] Inter font (NOT Arial)
  - [ ] **Agent cards do NOT have red borders** (Shadow DOM blocking the host's `!important` rule)
- [ ] Live agents display with their numbers, usernames, payment methods
- [ ] Host page footer below the embed renders in normal Arial blue (host CSS untouched by embed)
- [ ] No console errors

**If Shadow DOM is broken:** the agent cards would have red borders, OR the host text would suddenly become white/Inter font. If everything looks isolated and clean, Shadow DOM is working correctly.

---

## Section 9 — Defects Found

| ID | Page | Expected | Actual | Severity |
|---|---|---|---|---|
| | | | | |
| | | | | |

(Leave blank if everything passes — that's the goal.)

---

## Section 10 — Sign-off

- [ ] All sections 1–8 pass
- [ ] Zero console errors anywhere
- [ ] No defects logged in Section 9, OR all defects are P2/P3 (not blocking launch)

**Tester:** ____________________
**Date:** ____________________
**Sign-off:** ☐ APPROVED — proceed to tag F+G bundle
            ☐ BLOCKED — list issues: ____________________

---

## After sign-off

Tag the bundle:

```bash
git tag -a v0.7.0-bundle-f-and-g -m "F+G bundle: analytics (F), Payment Methods (G1), Settings + honesty pass (G2 + G2.3), Activity timeline (G3), Embed install (G2.5)"
git push origin v0.7.0-bundle-f-and-g
```

Update `PROJECT_STATE.md` with the bundle completion. Add Phase H entries to a `DECISIONS.md` or backlog file.

KemerrBet admin is launch-ready as of this tag.
