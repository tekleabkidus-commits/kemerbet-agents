# Kemerbet Agents — System Specification

**Version:** 1.0
**Last updated:** April 26, 2026
**Author:** Kidus (architect via Claude)
**Implementer:** Claude Code

---

## Table of Contents

1. Project Overview
2. Core Concepts & State Model
3. Database Schema
4. API Endpoints
5. Frontend Surfaces
6. Agent Notification Logic
7. Authentication & Authorization
8. Click & Visit Tracking
9. Caching Strategy
10. Build Phases
11. Edge Cases & Rules
12. The HTML Block (Final)
13. Hosting & Deployment
14. Open Decisions

---

## 1. Project Overview

A live agent presence system for Kemerbet's deposit page. Players visit a static HTML block embedded on kemerbet's website and see which deposit agents are currently online, who went offline recently, and can click through to Telegram to deposit. Agents manage their own online/offline status from a personal page accessed via a secret token link, with browser notifications reminding them to maintain their live window. The owner (Kidus) manages agents and views analytics through a private backoffice.

### 1.1 Repository

- **Name:** `kemerbet-agents`
- **Local path:** `/home/kidus/kemerbet-agents` (WSL Ubuntu 24.04)
- **GitHub:** `github.com/tekleabkidus-commits/kemerbet-agents` (private — to create)

### 1.2 Stack (locked)

Same stack as Birhan to leverage existing knowledge:

- Laravel 11 + PHP 8.3
- PostgreSQL 16 (port 5434 — different from Birhan's 5433)
- Redis (cache + queue)
- Sanctum cookie auth for the admin panel
- React + Vite + TypeScript for the admin SPA
- Blade for the agent secret page (single page, simple form)
- Tailwind CSS

### 1.3 Hosting (TBD)

API base URL is a placeholder: `https://API_BASE_URL_HERE`. Decision deferred.

### 1.4 Three Surfaces

1. **Public HTML block** — pasted ONCE into kemerbet's HTML block. Polls API every 1 minute (visibility-aware). No login required.
2. **Agent secret page** — each agent gets a unique URL with a 32-char token. Mobile-friendly Blade page.
3. **Backoffice admin panel** — Kidus only. Sanctum email/password login. React SPA at `/admin`.

### 1.5 Locked decisions summary

| Decision | Value |
|---|---|
| Refresh interval (public page) | 1 minute |
| Polling | Visibility-aware (pause when tab hidden) |
| Server-side cache TTL on public endpoint | 30 seconds |
| Live agents order | Shuffled server-side (re-shuffled per cache regeneration) |
| Offline agents order | Sorted by `live_until` desc (most recently offline first) |
| Hide threshold | 12 hours since `live_until` |
| Agent live durations | 15m, 30m, 45m, 1h, 2h |
| Manual offline | Yes, "Set Offline" button on agent page |
| Notification recipients | Agent only — never players |
| Token model | Simple 32-char random token in URL (Option A) |
| Telegram link model | Single username per agent + global pre-filled message |
| Payment methods | Master table, many-to-many to agents |
| Heartbeat | NOT used — agents must take deliberate action |

---

## 2. Core Concepts & State Model

### 2.1 Agent Status (computed, not stored)

| Status | Definition | Visibility |
|---|---|---|
| **LIVE** | `live_until > now` | Top of public page, green pulsing dot |
| **RECENTLY_OFFLINE** | `live_until <= now` AND `live_until > now - 12 hours` | Below live agents, faded, "Last seen Xh ago" |
| **HIDDEN** | `live_until` null OR `live_until < now - 12 hours` | Not rendered |

Status is **always derived from `live_until` at query time**. No separate `is_online` boolean — single source of truth.

### 2.2 Going Online

Agent picks duration on their secret page: **15m, 30m, 45m, 1h, or 2h**. System sets:
```
agents.live_until = now() + duration
```
Records a `status_events` row with `event_type = 'went_online'`, `duration_minutes = N`.

### 2.3 Going Offline (manual)

"Set Offline" button on agent page. System sets:
```
agents.live_until = now()
```
Records `status_events` row with `event_type = 'went_offline'`.

### 2.4 Extending Live Window

If agent is currently LIVE and picks a new duration, that's an extension. The new `live_until` REPLACES the old one (not added). Records `event_type = 'extended'`.

**Why replace, not add:** if agent has 2 minutes left and picks "1 hour", they meant "I'm live for 1 hour from now," not "1 hour 2 minutes from now."

### 2.5 Public Page Display Rules

- **Sort order:** LIVE agents first (server-shuffled, randomized per cache cycle), then RECENTLY_OFFLINE (most recent first by `live_until`)
- **LIVE agents:** full opacity, green pulsing dot badge "LIVE", count of remaining time NOT shown to players
- **RECENTLY_OFFLINE agents:** 50% opacity, gray badge "Last seen 2h 15m ago"
- **HIDDEN agents:** not in API response at all
- **Header counter:** "X agents live now" (updates each refresh)

### 2.6 No heartbeat / no auto-offline

If an agent goes online for 2 hours then closes their browser, their card stays LIVE for the full 2 hours. This is intentional — Kidus's requirement is that the agent's deliberate action proves their availability. After the 2 hours, `live_until` is past and they become RECENTLY_OFFLINE automatically.

---

## 3. Database Schema

All tables use Laravel's standard migrations, soft deletes where noted, and the conventions used in Birhan.

### 3.1 `admins`

```sql
id              bigserial PRIMARY KEY
email           varchar(191) UNIQUE NOT NULL
password        varchar(255) NOT NULL  -- bcrypt
name            varchar(100) NOT NULL
created_at      timestamp
updated_at      timestamp
deleted_at      timestamp NULL
```

Single admin (Kidus) for now. Schema supports multiple if needed later.

### 3.2 `agents`

```sql
id                       bigserial PRIMARY KEY
display_number           int NOT NULL UNIQUE        -- "Agent N" on cards, editable
telegram_username        varchar(100) NOT NULL      -- stored WITHOUT @ prefix
status                   varchar(20) DEFAULT 'active'  -- 'active' | 'disabled'
min_birr                 decimal(18,4) DEFAULT 25.0000
max_birr                 decimal(18,4) DEFAULT 25000.0000
notes                    text NULL                  -- private to admin
live_until               timestamp NULL             -- when current live window ends
last_status_change_at    timestamp NULL
created_at               timestamp
updated_at               timestamp
deleted_at               timestamp NULL

INDEX (live_until) WHERE deleted_at IS NULL AND status = 'active'
INDEX (status, deleted_at)
```

`status = 'disabled'` makes the agent invisible everywhere but preserves their token for restore.

### 3.3 `payment_methods` (master list)

```sql
id              bigserial PRIMARY KEY
slug            varchar(50) UNIQUE NOT NULL    -- e.g., 'telebirr'
display_name    varchar(100) NOT NULL          -- e.g., 'TeleBirr'
display_order   int DEFAULT 0
is_active       boolean DEFAULT true
icon_url        varchar(500) NULL              -- optional logo
created_at      timestamp
updated_at      timestamp
deleted_at      timestamp NULL
```

Seeded initial values:
| slug | display_name | order |
|---|---|---|
| telebirr | TeleBirr | 10 |
| mpesa | M-Pesa | 20 |
| cbe_birr | CBE Birr | 30 |
| dashen | Dashen Bank | 40 |
| awash | Awash Bank | 50 |
| boa | Bank of Abyssinia | 60 |
| coop | Cooperative Bank | 70 |
| wegagen | Wegagen Bank | 80 |

Admin can add/edit/disable methods anytime via backoffice.

### 3.4 `agent_payment_methods` (pivot)

```sql
agent_id            bigint REFERENCES agents(id) ON DELETE CASCADE
payment_method_id   bigint REFERENCES payment_methods(id) ON DELETE RESTRICT
created_at          timestamp

PRIMARY KEY (agent_id, payment_method_id)
INDEX (agent_id)
```

`ON DELETE RESTRICT` on payment_method side prevents deleting a method that's still in use — admin must reassign agents first.

### 3.5 `agent_tokens`

```sql
id              bigserial PRIMARY KEY
agent_id        bigint REFERENCES agents(id) ON DELETE CASCADE
token           varchar(64) UNIQUE NOT NULL     -- cryptographically random
revoked_at      timestamp NULL                  -- soft revoke
last_used_at    timestamp NULL
created_at      timestamp

INDEX (token, revoked_at)
INDEX (agent_id, revoked_at)
```

One agent can have multiple tokens over time (via regeneration). Only the most recent non-revoked token is "active." Old revoked tokens are kept for audit.

### 3.6 `status_events`

```sql
id                 bigserial PRIMARY KEY
agent_id           bigint REFERENCES agents(id) ON DELETE CASCADE
event_type         varchar(20) NOT NULL    -- 'went_online' | 'went_offline' | 'extended'
duration_minutes   int NULL                -- for went_online and extended
ip_address         varchar(45) NULL
user_agent         text NULL
created_at         timestamp NOT NULL

INDEX (agent_id, created_at DESC)
INDEX (created_at)
```

### 3.7 `click_events`

```sql
id            bigserial PRIMARY KEY
agent_id      bigint REFERENCES agents(id) ON DELETE CASCADE
click_type    varchar(20) NOT NULL    -- 'deposit' | 'chat'
visitor_id    varchar(64) NOT NULL    -- anonymous UUID from visitor's localStorage
ip_address    varchar(45) NULL
referrer      text NULL
created_at    timestamp NOT NULL

INDEX (agent_id, created_at DESC)
INDEX (created_at)
INDEX (visitor_id, created_at)
```

### 3.8 `visit_events`

```sql
id            bigserial PRIMARY KEY
visitor_id    varchar(64) NOT NULL
ip_address    varchar(45) NULL
user_agent    text NULL
created_at    timestamp NOT NULL

INDEX (created_at)
INDEX (visitor_id, created_at)
```

### 3.9 `daily_stats` (rollup, computed nightly)

```sql
id                       bigserial PRIMARY KEY
date                     date NOT NULL
agent_id                 bigint NULL REFERENCES agents(id)  -- NULL = global row
total_visits             int DEFAULT 0
unique_visitors          int DEFAULT 0
deposit_clicks           int DEFAULT 0
chat_clicks              int DEFAULT 0
minutes_live             int DEFAULT 0       -- only for agent rows
times_went_online        int DEFAULT 0       -- only for agent rows
created_at               timestamp

UNIQUE (date, agent_id)
INDEX (date)
INDEX (agent_id, date DESC)
```

A nightly cron at 02:00 EAT computes yesterday's stats from raw events. After computation, raw events older than 90 days are deleted (preserving daily rollup forever). This keeps the events tables small and analytics queries fast.

### 3.10 `settings` (key-value store)

```sql
key           varchar(100) PRIMARY KEY
value         text NOT NULL
updated_at    timestamp
```

Initial settings:
- `chat_prefilled_message` — the Amharic pre-fill text for Chat buttons (editable by admin)
- `agents_per_page_limit` — default 50, max number of agents returned by public API
- `notifications_enabled_global` — kill switch for agent notifications

---

## 4. API Endpoints

### 4.1 Routing structure

```
/api/public/*       — no auth, called by HTML block
/api/agent/*        — token-in-URL or POST body, agent secret page
/api/admin/*        — Sanctum auth required
```

### 4.2 Public endpoints

#### `GET /api/public/agents`

Returns currently visible agents (LIVE + RECENTLY_OFFLINE within 12h), shuffled.

**Cached for 30 seconds.** Cache key: `public:agents:v1`. On miss, query and re-shuffle live agents. Includes a `cached_at` timestamp so the client knows freshness.

**Response:**
```json
{
  "cached_at": "2026-04-26T14:32:00Z",
  "live_count": 12,
  "agents": [
    {
      "id": 7,
      "display_number": 7,
      "telegram_username": "DOITFAST21",
      "status": "live",
      "live_seconds_remaining": null,
      "last_seen_seconds_ago": null,
      "min_birr": "25.00",
      "max_birr": "25000.00",
      "payment_methods": [
        { "slug": "telebirr", "display_name": "TeleBirr" },
        { "slug": "mpesa", "display_name": "M-Pesa" }
      ]
    },
    {
      "id": 12,
      "display_number": 12,
      "telegram_username": "obina_t",
      "status": "recently_offline",
      "live_seconds_remaining": null,
      "last_seen_seconds_ago": 8100,
      "min_birr": "25.00",
      "max_birr": "25000.00",
      "payment_methods": [...]
    }
  ],
  "settings": {
    "chat_prefilled_message_url_encoded": "%E1%88%B0%E1%88%8B%E1%88%9D..."
  }
}
```

**Notes:**
- `live_seconds_remaining` is intentionally NOT returned for live agents (don't show countdown to players — Kidus's instinct is right that this creates pressure)
- `last_seen_seconds_ago` only present for offline; client formats as "2h ago" / "45m ago"
- Pre-filled message URL-encoded so client can build Chat URL directly

#### `POST /api/public/visit`

Records a page-load event. Called by HTML block on first load only (not on every poll).

**Body:**
```json
{ "visitor_id": "uuid-from-localStorage", "referrer": "..." }
```

**Response:** `{ "ok": true }` (fire-and-forget pattern, async write via queue)

#### `POST /api/public/click`

Records a Deposit or Chat click. Called when player clicks a button before being redirected to Telegram.

**Body:**
```json
{ "agent_id": 7, "click_type": "deposit", "visitor_id": "uuid" }
```

**Response:** `{ "ok": true }` — must be fast (<50ms), uses queue.

**Important:** the click handler in HTML uses `navigator.sendBeacon` so the request fires even as the page navigates to Telegram. Falls back to fetch with keepalive.

### 4.3 Agent secret page endpoints

The secret page itself is a Blade view at `/a/{token}`. All POSTs include the token in the form body for verification.

#### `GET /a/{token}`

Validates token, renders agent secret page. Response 404 if token invalid/revoked. Updates `agent_tokens.last_used_at`.

#### `POST /api/agent/go-online`

**Body:** `{ "token": "...", "duration_minutes": 30 }`

Validates token, sets `live_until = now() + duration`, records status_event. Returns updated state including `live_until` and `seconds_remaining`.

#### `POST /api/agent/go-offline`

**Body:** `{ "token": "..." }`

Sets `live_until = now()`, records status_event. Returns updated state.

#### `GET /api/agent/state?token=...`

Returns current state for the agent's secret page (used after page load and to refresh countdown). Response includes `live_until`, `seconds_remaining`, recent status history (last 10 events).

### 4.4 Admin endpoints

All require Sanctum auth except `/login`. Standard Laravel Sanctum SPA cookie pattern (same as Birhan).

#### Auth
- `POST /api/admin/login` — email + password
- `POST /api/admin/logout`
- `GET /api/admin/me`

#### Agents CRUD
- `GET /api/admin/agents` — list all (incl. disabled and soft-deleted with filter)
- `POST /api/admin/agents` — create new agent, returns agent + freshly generated token
- `GET /api/admin/agents/{id}` — single agent with full details + recent events
- `PATCH /api/admin/agents/{id}` — update (display_number, telegram_username, min/max, payment methods, notes, status)
- `DELETE /api/admin/agents/{id}` — soft delete + revoke all tokens
- `POST /api/admin/agents/{id}/restore` — undo soft delete
- `POST /api/admin/agents/{id}/regenerate-token` — revoke current, generate new
- `POST /api/admin/agents/{id}/force-offline` — admin can force any agent offline (e.g., if they leave their phone unlocked)

#### Payment methods CRUD
- `GET /api/admin/payment-methods`
- `POST /api/admin/payment-methods`
- `PATCH /api/admin/payment-methods/{id}`
- `DELETE /api/admin/payment-methods/{id}` — fails if any agent still uses it

#### Settings
- `GET /api/admin/settings`
- `PATCH /api/admin/settings/{key}`

#### Analytics
- `GET /api/admin/stats/overview?range=7d|30d|90d` — totals, trends
- `GET /api/admin/stats/agents?range=7d` — per-agent breakdown
- `GET /api/admin/stats/agent/{id}?range=30d` — deep dive on one agent
- `GET /api/admin/stats/timeline?range=7d` — daily breakdown chart data

---

## 5. Frontend Surfaces

### 5.1 Public HTML block (the main player-facing surface)

**Visual design:** the existing dark navy design (#1a2b4a background, mint-green LIVE dots, gold accents) carries over. Cards rendered dynamically from API response. Layout matches the most recent version of `kemerbet-agents.html`.

**Polling logic:**
```javascript
let timer = null;
let isFirstLoad = true;

function fetchAndRender() {
  fetch(`${API_BASE}/api/public/agents`)
    .then(r => r.json())
    .then(data => {
      renderAgents(data.agents);
      updateLiveCount(data.live_count);
      if (isFirstLoad) {
        recordVisit();
        isFirstLoad = false;
      }
    })
    .catch(err => showStaleNotice());
}

function startPolling() {
  fetchAndRender();
  timer = setInterval(fetchAndRender, 60000);
}

function stopPolling() {
  if (timer) { clearInterval(timer); timer = null; }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopPolling();
  else startPolling();
});

window.addEventListener('pageshow', (e) => {
  if (e.persisted) fetchAndRender();
});

if (!document.hidden) startPolling();
```

**Visitor ID:** generated via `crypto.randomUUID()` on first page load, stored in localStorage under `kemerbet_visitor_id`. Reused on every subsequent visit from same browser.

**Click tracking:** every Deposit/Chat button click fires a beacon BEFORE navigating to Telegram:
```javascript
function trackClick(agentId, clickType, telegramUrl) {
  const payload = JSON.stringify({
    agent_id: agentId,
    click_type: clickType,
    visitor_id: getVisitorId()
  });
  navigator.sendBeacon(`${API_BASE}/api/public/click`, payload);
  window.location.href = telegramUrl;
}
```

**Empty states:**
- Zero live agents: header shows "No agents live right now" with subtle pulse
- API error: shows last successfully cached data with small "Showing cached results" notice
- API completely unreachable on first load: shows static message "Loading agents..." followed by error after 10s timeout

**The full HTML block code is in Section 12.**

### 5.2 Agent secret page

Single-page Blade template at `/a/{token}`. Mobile-first design (most agents will use phones).

**Layout (top to bottom):**
1. Header: "Hi, you are Agent #7" + small "ሰላም" greeting
2. Current status card:
   - If LIVE: green background, "You are LIVE", countdown timer ("1h 23m remaining"), "Set Offline" button, "Extend" button
   - If OFFLINE: gray background, "You are OFFLINE", "Last online 3h ago"
3. Duration picker (only shown when offline OR clicked Extend):
   - Big buttons: 15m / 30m / 45m / 1h / 2h
   - Below: "Or set yourself offline manually"
4. Notification permission section:
   - If not granted: button "Enable Notifications" with explainer
   - If granted: "✓ Notifications enabled" + test button
5. Recent activity list: last 5 status changes with timestamps
6. Footer: "Need help? Contact admin" (Telegram link)

**Behavior:**
- After clicking a duration, page updates to LIVE state, countdown starts
- Countdown updates every second client-side (independent of API)
- Service worker registered on first load, schedules notifications based on `live_until`
- Page polls `/api/agent/state` every 60s to handle multi-device usage (agent goes online from laptop, then opens link on phone — phone should show current state)

### 5.3 Admin panel (React SPA)

**Routes:**
- `/admin/login` — email + password
- `/admin` — dashboard (overview stats + live agent grid)
- `/admin/agents` — agent list with filters (active, disabled, deleted)
- `/admin/agents/new` — create agent
- `/admin/agents/{id}` — edit agent + view their stats
- `/admin/payment-methods` — manage master list
- `/admin/analytics` — full analytics dashboards
- `/admin/settings` — global settings (pre-filled message, etc.)

**Dashboard at `/admin`:**
- **Top row stat cards:** Total agents · Live now · Visitors today · Clicks today · CTR today
- **Live agent grid:** real-time view of who's currently LIVE, their remaining time, click counts today
- **Recent activity feed:** last 20 status changes across all agents
- **Today's top performers:** top 5 agents by click count today

**Agent edit page:**
- Display number (editable, with uniqueness validation)
- Telegram username (with @ prefix shown, validation as defined)
- Status dropdown (active / disabled)
- Min/max Birr amounts
- Payment methods (multi-select checkboxes from master list)
- Notes (private textarea)
- **Token management section:**
  - Current active token with copy button and full URL ("Share this with the agent: https://kemerbet-agents.com/a/abc123...")
  - "Regenerate token" button (asks confirmation, old token immediately revoked)
  - History of past tokens (revoked dates, never the actual token strings — just `abc123...` truncated for audit)
- **Force offline button** (with confirm)
- **Delete agent button** (soft delete, with confirm)
- **Per-agent stats sidebar:**
  - Total clicks all-time
  - Total minutes live all-time
  - Click rate (clicks per minute live)
  - Last 30 days mini chart

**Analytics page:**
- Date range picker (7d / 30d / 90d / custom)
- **Overview chart:** visitors + clicks per day, dual-axis line chart
- **Agent leaderboard:** sortable table — display number, telegram, total clicks, total minutes live, click rate, last seen
- **Heatmap:** day-of-week × hour-of-day, color intensity = total clicks (shows when peak deposit traffic happens)
- **CTR funnel:** Visitors → clicked any agent → clicked deposit specifically
- **Per-payment-method breakdown:** which methods are most associated with high-click agents


---

## 6. Agent Notification Logic

Browser-side notifications, scheduled by service worker. All fire on the agent's own device — never to players.

### 6.1 Notification triggers

When agent goes online with duration D minutes, schedule:

| Trigger time | Notification |
|---|---|
| `live_until - 10 min` | "Your live time ends in 10 minutes. Tap to extend." |
| `live_until - 5 min` | "5 minutes left. Extend now to stay visible." |
| `live_until` (exact) | "You are now offline. Open the page to come back." |
| `live_until + 60 min` | "You've been offline 1 hour. Come back to receive deposits." |

### 6.2 Service worker

Registered on first visit to `/a/{token}`. Stores `live_until` in IndexedDB. On each registration:
1. Cancel any previously scheduled notifications for this agent
2. Schedule new ones based on current `live_until`

If agent goes offline manually, all upcoming notifications are cancelled (they'd be wrong) and only the "1 hour later" reminder is scheduled.

### 6.3 Notification permission

Prompted on first interaction (clicking a duration button), not on page load. The "Enable Notifications" UI explains:

> "We'll remind you 10 and 5 minutes before your live time ends, so you don't go offline by accident. We'll also remind you 1 hour after you go offline, in case you want to come back."

If denied: agent can still use the system, just no notifications. Page shows persistent banner "Notifications off — you may miss reminders" with a re-enable button.

### 6.4 Cross-device challenge

If an agent enables notifications on Phone A, then opens the link on Phone B, Phone B's service worker doesn't know about Phone A's schedule. Acceptable trade-off: notifications fire on whichever devices have the SW registered. Agent might get notifications on multiple devices — fine.

### 6.5 Background reliability caveats

iOS Safari has known issues with service worker notifications when the browser is fully closed. **This is a real limitation** — Apple restricts background JS execution. Spec says: notifications are best-effort, not guaranteed. The agent secret page UI should make this clear:

> "Notifications work best when this page is open or recently visited. Lock screen notifications may be delayed on iPhone."

### 6.6 Notification content rules

- Always in English (Amharic is fine but keep notification text simple — Unicode in notifications is inconsistent across platforms)
- Title: "Kemerbet Agent #N"
- Tap action: opens the agent's secret page

---

## 7. Authentication & Authorization

### 7.1 Admin auth

Standard Laravel Sanctum SPA cookie auth, identical to Birhan's implementation. CSRF token via `/sanctum/csrf-cookie`, login posts to `/api/admin/login`, session managed via secure HttpOnly cookies.

Single admin role for now. Schema supports adding more admins via direct DB insert if Kidus wants to grant access to a partner.

Rate limiting on `/api/admin/login`: 5 attempts per IP per minute.

### 7.2 Agent token auth

The 32-char token in the URL IS the credential. Rules:

- Token validation: must exist in `agent_tokens`, `revoked_at IS NULL`, agent's `status != 'disabled'` and not soft-deleted
- Failed validation returns generic 404 (not 401) — don't leak whether a token ever existed
- All POST endpoints require token in body, re-validated on every request
- `last_used_at` updated on every use
- Tokens generated using `bin2hex(random_bytes(32))` → 64-char hex string

### 7.3 Token regeneration flow

Admin clicks "Regenerate" → confirms → new token created with `created_at = now()`, old token gets `revoked_at = now()`. Admin sees the new full URL in the UI to share with agent.

### 7.4 No CSRF for agent endpoints

Agent endpoints don't use cookies — token is in body. No CSRF needed. CORS allows requests from any origin since the agent might be using the link from any browser.

### 7.5 Public endpoints

No auth, no rate limit per visitor (would defeat the purpose). Cloudflare in front handles abusive traffic. Server-side rate limit at 100 req/sec total per IP via Laravel throttle middleware.

---

## 8. Click & Visit Tracking

### 8.1 Visitor ID generation

Client-side, on first visit:
```javascript
let id = localStorage.getItem('kemerbet_visitor_id');
if (!id) {
  id = crypto.randomUUID();
  localStorage.setItem('kemerbet_visitor_id', id);
}
```

This UUID persists across visits from the same browser. Used to compute "unique visitors" stat. Privacy-safe — no PII, no cross-site tracking.

### 8.2 What's tracked on each visit

Single `visit_events` row written on first page load:
- `visitor_id`
- `ip_address` (server-side from request)
- `user_agent` (truncated to 500 chars)
- `created_at`

Subsequent polls (every 1 minute) do NOT create visit events. Only first load.

### 8.3 What's tracked on each click

Single `click_events` row written via beacon:
- `agent_id`
- `click_type` (`'deposit'` or `'chat'`)
- `visitor_id`
- `ip_address`
- `referrer` (from request headers)
- `created_at`

### 8.4 Async write pattern

Both visit and click endpoints push the row to a Redis-backed queue (Laravel job). Worker processes jobs asynchronously. Endpoint returns 200 immediately. This ensures:
- Click endpoint stays fast (<20ms) so the redirect to Telegram is instant
- DB write contention doesn't block players
- Burst traffic (sudden 50 clicks in 1 second) is smoothed out

### 8.5 Daily aggregation

Cron at 02:00 EAT daily:
1. Aggregate yesterday's events into `daily_stats` (per-agent rows + global row with `agent_id = NULL`)
2. After successful aggregation, delete `click_events` and `visit_events` older than 90 days
3. `status_events` retained forever (small volume, useful for audit)

### 8.6 Computed metrics

- **Total visitors** = count distinct visitor_id in date range
- **Returning visitors** = visitor_id seen on multiple days
- **CTR** = clicks ÷ visits × 100
- **Click rate per agent** = clicks ÷ minutes_live (clicks per minute live — a fairness-adjusted performance metric)
- **Top hours** = clicks bucketed by hour-of-day across the range

---

## 9. Caching Strategy

### 9.1 Public agents endpoint

- **Cache key:** `public:agents:v1`
- **TTL:** 30 seconds
- **Invalidation:** automatic on TTL expiry only — NOT invalidated when agents go online/offline (avoids cache stampede if many agents toggle in same minute)
- **Result:** worst-case staleness = 30 seconds. A new agent going LIVE appears within ~30s in the worst case, ~1s in the best case.

Cache miss path:
1. Query: `SELECT * FROM agents WHERE deleted_at IS NULL AND status = 'active' AND live_until > NOW() - INTERVAL '12 hours'`
2. With eager-loaded payment methods
3. Split into LIVE and RECENTLY_OFFLINE
4. Shuffle LIVE array (Fisher-Yates, server-side)
5. Sort RECENTLY_OFFLINE by `live_until DESC`
6. Build response, store in Redis with 30s TTL

### 9.2 Settings cache

`settings` table cached in Redis under `settings:all` with 5-minute TTL. Invalidated whenever admin updates a setting.

### 9.3 Payment methods cache

`payment_methods` master list cached under `payment_methods:active` with 5-minute TTL. Used when building public agent response.

### 9.4 No HTTP-level cache headers on public endpoint

Response sets `Cache-Control: no-store` to prevent CDN/browser caching. Players' browsers must hit the server every minute to see updated status. Cloudflare configured to NOT cache `/api/public/agents`.

---

## 10. Build Phases

Phased delivery so Kidus can review at each gate, same model as Birhan.

### Phase A — Foundation (≈3 days)

- Repo setup, Laravel 11 + Postgres + Redis + React/Vite scaffolding
- All migrations
- Models with relationships
- Sanctum admin auth
- Admin login page
- Seed script: 1 admin (kidus@), all 8 default payment methods, the 28 existing agents from current HTML

**Gate review:** Kidus logs in, sees empty admin shell, confirms agents and payment methods seeded correctly.

### Phase B — Admin agent CRUD (≈2 days)

- Admin agent list, create, edit, delete, restore
- Token generation and regeneration
- Payment methods CRUD page
- Settings page (pre-filled message editor)

**Gate review:** Kidus creates a test agent, edits, regenerates token, deletes, restores. Edits payment methods. Updates pre-filled message.

### Phase C — Agent secret page (≈2 days)

- `/a/{token}` Blade page
- Go online (duration buttons)
- Go offline button
- Countdown UI
- `/api/agent/state` for multi-device sync
- Status history list

**Gate review:** Kidus opens a test agent's URL on phone, goes live for 15 min, watches countdown, sets offline, opens on second device, sees synced state.

### Phase D — Public API + HTML block (≈2 days)

- `GET /api/public/agents` with caching
- `POST /api/public/visit` and `/click` with queue
- Final HTML block code (Section 12) ready to paste
- CORS configured properly for kemerbet's domain

**Gate review:** Kidus pastes HTML block into a test page, sees agents render, clicks Deposit, sees event in DB. Toggles a test agent's status, sees it propagate to public page within 30s-1min.

### Phase E — Notifications (≈1 day)

- Service worker setup
- Permission request UI
- Schedule on go-online
- Cancel on go-offline
- Tested across iPhone Safari, Android Chrome, desktop Chrome/Firefox

**Gate review:** Kidus goes online for 15 min on his phone, locks phone, gets the 10-min and 5-min warnings, gets the offline notification, gets the 1-hour follow-up. Tests on iPhone and Android.

### Phase F — Analytics (≈2 days)

- Daily rollup cron
- Admin dashboard with stat cards
- Per-agent stats page
- Analytics page with charts (Recharts)
- Heatmap component
- Leaderboard table

**Gate review:** Kidus sees his analytics, can sort agents by performance, drill into one agent, see daily breakdown.

### Phase G — Polish & deploy (≈2 days)

- Error states (offline mode for public block, retry logic)
- Production config
- Server provisioning (whatever host chosen)
- Domain + SSL + Cloudflare
- Backup script
- Monitoring (Sentry or Laravel Telescope)
- Documentation: how to add an agent, how to share token, troubleshooting

**Gate review:** End-to-end test in production. Real agents onboarded.

**Total: ~14 days** of focused work, similar pace to Birhan.

---

## 11. Edge Cases & Rules

### 11.1 Agent goes online twice in a row
Replaces `live_until` (not adds). Records second event as `'extended'`.

### 11.2 Two devices for same agent
Both work simultaneously. Last write wins. Polling on each device keeps them in sync.

### 11.3 Token leaked
Admin regenerates → old token instantly revoked. Anyone using old URL gets 404.

### 11.4 Agent disabled while live
`status = 'disabled'` immediately hides them from public page even if `live_until > now`. Their secret page also shows "Account disabled — contact admin" instead of normal UI.

### 11.5 Server down
Public page shows last successfully fetched data with "Showing cached results from X minutes ago" banner. After 10 minutes of failed fetches, banner becomes more prominent. After 30 minutes, falls back to a static "Service temporarily unavailable" view with a retry button.

### 11.6 Player clicks Deposit just as agent goes offline
Click is recorded normally. Agent gets the click in their analytics. Player ends up on Telegram either way — agent can respond or not.

### 11.7 Visitor clears localStorage
New `visitor_id` generated. Counted as a new unique visitor. Acceptable inaccuracy.

### 11.8 Same person on phone + laptop
Counted as 2 unique visitors. Acceptable.

### 11.9 Agent's clock is wrong
Doesn't matter — server is the source of truth for `live_until`. Client only displays countdown.

### 11.10 Duplicate click events from beacon retries
`click_events` is append-only with no dedup. A double-click that fires two beacons logs two events. Acceptable noise. If it becomes a problem, add a 2-second client-side debounce.

### 11.11 Malicious traffic / scraping
- Cloudflare in front
- Rate limit `/api/public/agents` to 60/min per IP at Laravel level
- Rate limit `/api/public/click` to 30/min per IP
- Public endpoint reveals only agent display info that's already public anyway

### 11.12 Timezone
All server timestamps in UTC. Display in EAT (UTC+3) on agent page and admin panel. Public page shows relative times only ("2h ago"), no absolute timestamps shown to players.

### 11.13 Display number conflicts
Two agents can't share a `display_number`. Validation in admin form. If admin tries to set a number already in use, shows error and suggests next free number.

---

## 12. The HTML Block (Final)

This is the code Kidus pastes into kemerbet's HTML block. ONCE. It auto-updates from API forever after.

The CSS is identical to the most recent design in `kemerbet-agents.html` (#1a2b4a background, mint-green/gold accents, glass cards, agent avatars). Only the body changes — agent cards are now rendered dynamically.

```html
<style>
  /* [Same CSS as kemerbet-agents.html v3 — see existing artifact] */
  /* ...truncated for brevity in spec; actual block uses full CSS... */

  .stale-banner { /* shown when API is stale */
    background: rgba(245,197,24,0.1);
    border: 1px solid rgba(245,197,24,0.3);
    color: var(--gold);
    padding: 10px 16px;
    border-radius: 12px;
    text-align: center;
    font-size: 0.85rem;
    margin-bottom: 20px;
    display: none;
  }

  .agent-card.recently-offline {
    opacity: 0.55;
  }

  .agent-card.recently-offline .badge {
    background: rgba(255,255,255,0.05);
    color: var(--text-muted);
    border-color: var(--card-border);
  }

  .agent-card.recently-offline .badge::before {
    background: var(--text-muted);
    box-shadow: none;
  }

  .last-seen {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 6px;
  }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: var(--text-muted);
  }
</style>

<div class="agents-wrapper">

  <div class="header">
    <div class="header-logo" id="liveCountBadge">Loading…</div>
    <h1>Kemerbet Agents</h1>
    <p>ኤጀንት መርጠው ዲፖዚት ማድረግ ይችላሉ — Select a trusted agent below to deposit.</p>
  </div>

  <div class="video-card" id="depositVideo">
    <div class="video-wrapper">
      <iframe src="https://www.youtube.com/embed/8Mky3nes3VQ" allowfullscreen></iframe>
    </div>
    <div class="video-info">
      <h3>How to Deposit</h3>
      <div class="amharic">ዲፖዚት እንዴት እንደሚደረግ</div>
      <p>Watch this guide to learn how to deposit through any of our verified agents.</p>
    </div>
  </div>

  <div id="staleBanner" class="stale-banner">
    Showing recent data — reconnecting…
  </div>

  <div class="section-title">
    <h2>Available Agents</h2>
    <div class="agent-count" id="liveCountInline">—</div>
  </div>

  <div class="agent-grid" id="agentGrid">
    <div class="empty-state">Loading agents…</div>
  </div>

  <div class="become">
    <h2>ማንኛውም ቅሬታ ካለዎ</h2>
    <p>If you have any complaints or need support, we're here to help you 24/7.</p>
    <a href="#">CONTACT US</a>
  </div>
</div>

<script>
(function () {
  const API_BASE = 'https://API_BASE_URL_HERE'; // ← swap at deploy time
  const POLL_INTERVAL = 60_000;
  const STALE_THRESHOLD = 120_000; // show banner if last successful fetch > 2 min ago

  // --- visitor ID ---
  function getVisitorId() {
    let id = localStorage.getItem('kemerbet_visitor_id');
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) ||
           (Date.now() + '-' + Math.random().toString(36).slice(2));
      localStorage.setItem('kemerbet_visitor_id', id);
    }
    return id;
  }

  // --- video visibility (24h new visitor, then weekly) ---
  function manageVideoVisibility() {
    const video = document.getElementById('depositVideo');
    if (!video) return;
    const FIRST_KEY = 'kemerbet_first_visit';
    const SHOWN_KEY = 'kemerbet_video_last_shown';
    const DAY = 86_400_000;
    const WEEK = 7 * DAY;
    const now = Date.now();
    try {
      const first = localStorage.getItem(FIRST_KEY);
      const last = localStorage.getItem(SHOWN_KEY);
      if (!first) {
        localStorage.setItem(FIRST_KEY, String(now));
        localStorage.setItem(SHOWN_KEY, String(now));
        return;
      }
      if (now - parseInt(first, 10) < DAY) {
        localStorage.setItem(SHOWN_KEY, String(now));
        return;
      }
      if (now - (parseInt(last, 10) || 0) >= WEEK) {
        localStorage.setItem(SHOWN_KEY, String(now));
      } else {
        video.style.display = 'none';
      }
    } catch (e) {}
  }

  // --- visit tracking (first load only) ---
  let visitRecorded = false;
  function recordVisit() {
    if (visitRecorded) return;
    visitRecorded = true;
    const payload = JSON.stringify({
      visitor_id: getVisitorId(),
      referrer: document.referrer || ''
    });
    try {
      navigator.sendBeacon(API_BASE + '/api/public/visit', payload);
    } catch (e) {
      fetch(API_BASE + '/api/public/visit', {
        method: 'POST',
        body: payload,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true
      }).catch(() => {});
    }
  }

  // --- click tracking ---
  function trackClickAndGo(agentId, clickType, url) {
    const payload = JSON.stringify({
      agent_id: agentId,
      click_type: clickType,
      visitor_id: getVisitorId()
    });
    try {
      navigator.sendBeacon(API_BASE + '/api/public/click', payload);
    } catch (e) {}
    setTimeout(() => { window.location.href = url; }, 50);
  }

  // --- last-seen formatter ---
  function formatLastSeen(secondsAgo) {
    if (secondsAgo < 60) return 'just now';
    const minutes = Math.floor(secondsAgo / 60);
    if (minutes < 60) return minutes + 'm ago';
    const hours = Math.floor(minutes / 60);
    const remMin = minutes % 60;
    return remMin > 0 ? hours + 'h ' + remMin + 'm ago' : hours + 'h ago';
  }

  // --- HTML escape ---
  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // --- render agent cards ---
  function renderAgents(data) {
    const grid = document.getElementById('agentGrid');
    const liveBadge = document.getElementById('liveCountBadge');
    const liveInline = document.getElementById('liveCountInline');
    const liveCount = data.live_count || 0;

    liveBadge.textContent = liveCount > 0
      ? `${liveCount} agents live now · 24/7`
      : 'No agents live · 24/7';
    liveInline.textContent = liveCount > 0
      ? `${liveCount} live · ${data.agents.length - liveCount} recently online`
      : `${data.agents.length} recently online`;

    if (data.agents.length === 0) {
      grid.innerHTML = '<div class="empty-state">No agents are available right now. Please check back soon.</div>';
      return;
    }

    const chatMsg = (data.settings && data.settings.chat_prefilled_message_url_encoded) || '';

    grid.innerHTML = data.agents.map(agent => {
      const isLive = agent.status === 'live';
      const username = esc(agent.telegram_username);
      const depositUrl = `https://t.me/${username}`;
      const chatUrl = chatMsg ? `${depositUrl}?text=${chatMsg}` : depositUrl;
      const num = String(agent.display_number).padStart(2, '0');
      const banks = (agent.payment_methods || [])
        .map(m => `<span class="bank">${esc(m.display_name)}</span>`)
        .join('');
      const lastSeen = !isLive
        ? `<div class="last-seen">Last seen ${formatLastSeen(agent.last_seen_seconds_ago)}</div>`
        : '';
      const minMax = `${parseInt(agent.min_birr).toLocaleString()} – ${parseInt(agent.max_birr).toLocaleString()} Birr`;

      return `
        <div class="agent-card ${isLive ? '' : 'recently-offline'}">
          <div class="agent-top">
            <div class="agent-name-wrap">
              <div class="agent-avatar">${num}</div>
              <div>
                <div class="agent-name">Agent ${esc(agent.display_number)}</div>
                <div class="agent-subname">ተወካይ ${esc(agent.display_number)}</div>
              </div>
            </div>
            <div class="badge">${isLive ? 'LIVE' : 'OFFLINE'}</div>
          </div>
          ${lastSeen}
          <div class="meta-row"><span class="icon">⚡</span> Available <strong>24/7</strong></div>
          <div class="meta-row"><span class="icon">💵</span> <strong>${minMax}</strong></div>
          <div class="banks">${banks}</div>
          <div class="actions">
            <a href="${depositUrl}" class="btn deposit"
               onclick="event.preventDefault(); window.__kbTrack(${agent.id}, 'deposit', '${depositUrl}');">Deposit</a>
            <a href="${chatUrl}" class="btn chat"
               onclick="event.preventDefault(); window.__kbTrack(${agent.id}, 'chat', '${chatUrl}');">💬 Chat</a>
          </div>
        </div>
      `;
    }).join('');
  }

  window.__kbTrack = trackClickAndGo;

  // --- polling ---
  let lastSuccess = 0;
  let timer = null;

  function fetchAndRender() {
    fetch(API_BASE + '/api/public/agents', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(data => {
        renderAgents(data);
        lastSuccess = Date.now();
        document.getElementById('staleBanner').style.display = 'none';
        recordVisit();
      })
      .catch(() => {
        if (lastSuccess && Date.now() - lastSuccess > STALE_THRESHOLD) {
          document.getElementById('staleBanner').style.display = 'block';
        }
      });
  }

  function startPolling() {
    fetchAndRender();
    if (timer) clearInterval(timer);
    timer = setInterval(fetchAndRender, POLL_INTERVAL);
  }

  function stopPolling() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopPolling();
    else startPolling();
  });

  window.addEventListener('pageshow', (e) => {
    if (e.persisted) fetchAndRender();
  });

  manageVideoVisibility();
  if (!document.hidden) startPolling();
})();
</script>
```

**Notes for Claude Code implementing this:**
- The full CSS from the latest `kemerbet-agents.html` artifact is dropped in unchanged
- The shuffle script is REMOVED (server shuffles now)
- The static agent cards are REMOVED (rendered from API)
- The 24h/weekly video visibility logic is preserved
- The visitor ID uses `crypto.randomUUID` with a fallback for older browsers

---

## 13. Hosting & Deployment

### 13.1 Server spec (worst-case sizing)

For 8,000 users/day with 1-min refresh, visibility-aware polling, and worst-case ~120K-480K API hits/day:

- **2 vCPU / 2 GB RAM / 40 GB SSD** comfortably handles 5-10x this load
- **Recommended provider:** Hetzner CPX11 (€4.50/month, ~$5)
- **Alternatives:** DigitalOcean ($12), Vultr ($12), Contabo ($6)

### 13.2 Stack on the server

- Nginx → PHP-FPM → Laravel
- Postgres 16 (port 5432 in production, no clash with Birhan since separate server)
- Redis 7
- Supervisor for queue worker
- Cron for daily aggregation

### 13.3 Cloudflare config

- Free tier sufficient
- Proxy enabled
- Page Rule: `/api/public/agents` → `Cache Level: Bypass` (we want server-side cache, not edge cache)
- Static assets (the HTML block CSS, if served separately) → cache normally

### 13.4 Environment variables (key ones)

```
APP_ENV=production
APP_URL=https://kemerbet-agents.com  # or whichever domain
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=kemerbet_agents
REDIS_HOST=127.0.0.1
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis
CACHE_DRIVER=redis

KEMERBET_PUBLIC_CACHE_TTL=30
KEMERBET_AGENT_HIDE_AFTER_HOURS=12
KEMERBET_TOKEN_LENGTH=64
KEMERBET_DAILY_AGGREGATION_HOUR=2

CORS_ALLOWED_ORIGINS=https://kemerbet.com,https://www.kemerbet.com
```

### 13.5 Backups

- Postgres dump nightly via cron, uploaded to S3-compatible storage (Backblaze B2 cheapest)
- Retention: 30 daily, 12 weekly, 12 monthly
- Restore tested quarterly

### 13.6 Monitoring

- Sentry free tier for errors (100k events/month)
- Laravel Telescope in staging only, NOT production (too heavy)
- Uptime monitoring: UptimeRobot free tier hitting `/api/public/agents` and `/admin/login`
- Alert channel: Telegram bot to Kidus

---

## 14. Open Decisions

These remain unresolved and should be addressed before Phase G:

1. **Final hosting decision** — separate server vs co-located with Birhan (recommendation: separate)
2. **Final domain** — `agents.kemerbet.com` requires Kemerbet to add a DNS record; alternatively a standalone domain like `kemerbet-agents.com`
3. **CORS allowlist** — needs the exact domain(s) where the HTML block will be embedded
4. **Telegram bot for monitoring alerts** — which bot, which chat ID
5. **Pre-filled chat message wording** — current value is the long Amharic message from existing HTML; admin can edit later
6. **Whether to log player IPs at all** — small GDPR-style consideration; current spec says yes (for fraud detection), but could be made optional
7. **iOS notification reliability acceptance** — Kidus needs to acknowledge that iPhone notifications may be unreliable when browser is fully closed

---

## End of Specification

This document is a frozen artifact at v1.0. Changes during build go into a `CHANGES.md` log, with rationale, before merging into spec v1.1.

**Total estimated build time:** 14 days of focused development across 7 phases.

**Next step:** hand this document to Claude Code, clarify any open decisions Kidus is ready to make, and start Phase A.
