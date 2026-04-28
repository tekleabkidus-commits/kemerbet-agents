# Notifications Spec — Kemerbet Agents

**Status:** Locked design, awaiting Phase E implementation
**Last updated:** 2026-04-28
**Implementation phase:** Phase E (after Phase C agent secret page exists)

---

## Goal

Drive agent engagement and presence on the public block by delivering timely browser push notifications about session state, time-of-day, and re-engagement.

---

## Delivery channel

**Browser push notifications only.** Agents must grant notification permission on first visit to their secret link page (Phase C surface).

Accepted limitations:
- Notifications only deliver when the agent has the secret link page open in a browser tab (foreground or background).
- Agents who close their browser will miss reminders for the duration the browser is closed. They will not see them later when reopening.
- No Telegram bot, no SMS fallback in v1. May be revisited post-launch.

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

## Implementation surface (when Phase E begins)

This spec will require:
- A scheduling system (Laravel scheduler / cron / queue worker) — does not exist yet
- A notification dispatch service capable of browser push — does not exist yet
- Agent secret link page (Phase C) — must exist first; this is where push permission is granted
- A notifications_log table to track sent notifications for deduplication and audit
- Agent self-click vs system-expired offline event distinction in status_events — already supported via event_type

Recommended first task in Phase E: implement the scheduler, then Rule 4 (7 AM wakeup) as the simplest end-to-end test of the dispatch system.

---

## Update history

- 2026-04-28: Initial spec captured. Locked by Kidus before returning to Phase B Task 3.
