# Notifications Spec — Kemerbet Agents

**Status:** Locked design, awaiting Phase E implementation
**Last updated:** 2026-04-28
**Implementation phase:** Phase E (after Phase C agent secret page exists)

---

## Goal

Drive agent engagement and presence on the public block by delivering timely browser push notifications about session state, time-of-day, and re-engagement.

---

## Delivery channel

**Browser push notifications via Service Worker + Web Push (VAPID).** Agents grant notification permission on first visit to their secret link page (Phase C surface). The browser registers a push subscription with our backend, and from that point onward we deliver notifications to their device regardless of tab/browser state — even when the browser is fully closed.

An agent may have multiple active subscriptions (phone + laptop + tablet). Notification deduplication is per-agent, not per-subscription — all devices receive each notification.

**iOS Safari limitation:** iPhone users must install the page as a Home Screen PWA (iOS 16.4+) to receive notifications when Safari is closed. Without PWA install, notifications only fire while Safari is open. We surface a one-time "Add to Home Screen" hint to iOS users. Android Chrome, Desktop Chrome/Firefox/Edge, and macOS Safari all work fully without PWA install.

No Telegram bot, no SMS fallback in v1. May be revisited post-launch.

---

## Time zones

All clock-time references (11 PM, 7 AM) are in Africa/Addis_Ababa timezone (East Africa Time, UTC+3).

---

## The 5 rules

### Rule 1 — Session length cap

**Outside 11 PM – 7 AM:** Agents extend their online session normally; no automatic cap.

**During 11 PM – 7 AM:** Maximum 1 hour per session. When the cap is reached, the agent goes offline automatically.

If an agent is already online when 11 PM hits with a remaining session > 1 hour, the cap takes effect from 11 PM (i.e., they have 1 hour from 11 PM, regardless of how long they had remaining before).

---

### Rule 2 — Session-ending warnings (BEFORE going offline)

**Daytime (7 AM – 11 PM):** Three warnings sent at 15 min, 10 min, and 5 min before session ends.
- Message: "Your online time is ending in [X] minutes. Tap to extend."

**Sleeping hours (11 PM – 7 AM):** ONE warning sent at 5 min before session ends.
- Message: "Your online time is ending soon. If you're going to sleep, please switch to offline."

---

### Rule 3 — Just-went-offline reminders (AFTER going offline)

**Daytime (7 AM – 11 PM):** Reminders at 15 min, 1 hr, 3 hr, 6 hr, 12 hr after going offline.
- Message: "Customers are missing you, come back online."
- Reference point = the moment they went offline.
- Chain stops if agent comes back online.

**Sleeping hours (11 PM – 7 AM), session expired naturally (cap hit, not user-initiated):** ONE reminder at 15 min after going offline.
- Message: "Players are waiting. If you're sleeping, please make sure your status is offline."
- Then no more reminders until 7 AM.

**Sleeping hours (11 PM – 7 AM), agent self-clicked Go Offline:** ZERO reminders during the night.
- Total silence until 7 AM.
- Implementation note: this requires distinguishing "session expired naturally" from "agent ended session manually" in the offline event log. status_events.event_type already supports this distinction.

---

### Rule 4 — 7 AM daily wakeup

Every day at 7 AM, all currently-offline agents receive:
- Message: "Good morning! Players are waiting for your approval. Please be online."

This fires regardless of how/when they went offline. It functions as the daily reset.

---

### Rule 5 — Reminder schedule resumes at 7 AM

If an agent is still offline at 7 AM, the daytime reminder cycle starts fresh from 7 AM as the new baseline.
- 7 AM: wakeup notification (Rule 4)
- 8 AM: 1-hour reminder (using Rule 3 daytime message)
- 10 AM: 3-hour reminder
- 1 PM: 6-hour reminder
- 7 PM: 12-hour reminder

If the agent comes online at any point, the chain stops.

---

## Notification deduplication

An agent must not receive the same notification twice for the same event. Implementation should track sent notifications by (agent_id, notification_type, reference_timestamp) and check before dispatching.

---

## Edge cases & open implementation questions

These don't change the rules but will need answers during implementation:

1. **Session active at 6:55 AM (sleeping hours), continuing past 7 AM:** Does the 1-hour cap end at 7 AM (sleeping hours over) or at the cap time? Decision: cap ends at 7 AM. The "during sleeping hours" cap only applies while sleeping hours are active.

2. **Agent came online at 6:50 AM:** They're in sleeping hours, capped at 1 hour. At 7 AM, sleeping hours end — does the cap lift? Decision: yes, cap lifts at 7 AM. Their session can continue normally after.

3. **Multiple sessions in one night:** Agent online 11 PM – midnight (cap hit), goes offline, doesn't get reminders, comes online at 2 AM, online 2 AM – 3 AM (cap hit), goes offline. Each session is its own cap. Reminders fire per session.

4. **Browser permission denied:** Agent denies notification permission at first visit. They get no notifications, ever. UI should show a banner explaining why notifications matter and how to re-grant permission.

5. **Daylight saving:** Ethiopia does not observe DST, so 11 PM and 7 AM are stable year-round.

---

## Architecture (locked 2026-04-30)

1. **Web Push (Service Worker + VAPID)** — not window-only `new Notification()`
2. **Many subscriptions per agent** (phone, laptop, tablet) — soft-delete on 410 Gone
3. **Notification log dedupes by `(agent_id, notification_type, reference_timestamp)`**, not per subscription
4. **Polling cron every minute** for reminder dispatching, not queued scheduled jobs
5. **`Africa/Addis_Ababa` timezone** for all scheduling (`->timezone('Africa/Addis_Ababa')` in Laravel scheduler)
6. **iOS Safari limitation acknowledged** — documented above, no workaround attempted
7. **No Telegram bot fallback** in Phase E

## Implementation surface

This spec requires:
- `minishlink/web-push` composer package for VAPID-based push delivery
- VAPID keypair in `.env` (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`)
- `push_subscriptions` table (agent_id, endpoint, keys, user_agent, soft deletes)
- `notification_log` table for deduplication and audit
- Service Worker at `public/sw.js` handling `push` and `notificationclick` events
- Agent secret link page (Phase C) — exists; push permission UI needs wiring to SW + subscription endpoint
- Scheduled artisan commands: `agents:check-reminders` (every minute), `agents:wakeup` (daily 7 AM EAT)
- Agent self-click vs system-expired offline event distinction in `status_events` — **needs migration** (currently only `went_offline`, must split into `went_offline` + `session_expired`)

---

## Update history

- 2026-04-28: Initial spec captured. Locked by Kidus before returning to Phase B Task 3.
- 2026-04-30: Architecture revised — Web Push (Service Worker + VAPID) replaces window-only notifications. Closed-browser delivery now required. iOS Safari limitation documented.
