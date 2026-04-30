# Staging Deployment Checklist

Validation plan for Phase E notifications on staging (HTTPS required for Web Push).

---

## Environment setup

1. **HTTPS is mandatory.** Web Push requires a secure context. Use ngrok, cloudflared, or a real staging domain.
2. Update `.env`:
   - `APP_URL=https://your-staging-domain`
   - `SANCTUM_STATEFUL_DOMAINS` — add staging domain
3. Rebuild frontend: `npm run build`
4. Run migrations: `php artisan migrate`
5. Start scheduler: `php artisan schedule:work`

---

## Scenario A — Pre-expiration warnings (Rule 2)

1. Open agent secret page on Android Chrome, grant notification permission
2. Go online with 15-minute duration
3. Run `php artisan agents:check-reminders` when ~15 min remain
4. Phone buzzes: "15 minutes left. Tap to extend."
5. Repeat at ~10 min and ~5 min remaining
6. Verify 3 distinct notifications with correct body text

## Scenario B — Sleeping pre-expiration (Rule 2)

Only testable during 11 PM–7 AM EAT. If daytime, skip — unit tests cover this.

1. Go online during sleeping hours
2. Run check-reminders at 5 min remaining
3. Phone buzzes with sleep_warning_5: "Going to sleep? Switch to offline."
4. Verify NO 15-min or 10-min warnings fired

## Scenario C — Post-offline reminders (Rule 3)

1. Set agent offline (or let session expire)
2. Wait 15 minutes (or set up DB state)
3. Run `php artisan agents:check-reminders`
4. Phone buzzes: "Customers are missing you, come back online."
5. Run again immediately — no duplicate (dedup verified)

## Scenario D — Nighttime silence (Rule 3)

Only testable during sleeping hours.

1. Self-click "Go Offline" during nighttime
2. Wait 15 minutes, run check-reminders
3. Phone does NOT buzz (total silence for self-clicked offline)

## Scenario E — Wakeup (Rule 4)

1. Ensure agent is offline
2. Run `php artisan agents:wakeup`
3. Phone buzzes: "Good morning! Players are waiting..."
4. Run again — no second notification (dedup by today's 7 AM reference)

## Scenario F — Notification click

1. Trigger any notification (reuse Scenario A or E)
2. Close the browser tab entirely
3. Notification arrives on device
4. Tap the notification
5. Browser opens to the agent secret page URL

---

## Subscription lifecycle verification

After testing:
```bash
php artisan tinker --execute="App\Models\PushSubscription::latest()->get(['agent_id','endpoint','is_active','last_used_at','failed_at'])->toArray();"
```

Verify:
- `is_active = true` for current device
- `last_used_at` is recent (updated by successful dispatches)
- `endpoint` is a valid FCM/push service URL

---

## Acceptance criteria

| Check | Pass? |
|---|---|
| Notification appears — page open | |
| Notification appears — page closed | |
| Notification appears — browser closed | |
| Notification click opens agent page | |
| Pre-expiration body text correct | |
| Post-offline body text correct | |
| Wakeup body text correct | |
| Dedup works (no duplicates) | |
| push_subscriptions row active with recent last_used_at | |
| notification_log rows created per fired notification | |

---

## Troubleshooting

- **No notification at all:** Check `push_subscriptions` has `is_active=true`. Check `notification_log` for the entry. If log exists but no notification, subscription endpoint may be stale — re-visit page to refresh.
- **Notification appears but click doesn't work:** Check `sw.js` notificationclick handler. Verify `url` field in notification payload.
- **Duplicate notifications:** Check `notification_log` — should have exactly 1 row per (agent_id, type, reference_timestamp).
- **VAPID key mismatch:** If keys were regenerated after subscribing, the subscription is invalid. Re-visit page to re-subscribe.

---

## Known limitations (not blockers)

- **iOS Safari:** Push notifications require PWA install. Not tested in E9.
- **Battery optimization:** Android may delay notifications if battery saver is on.
- **Multiple origins:** localhost subscription won't transfer to staging URL — different origins = different subscriptions. Expect separate rows per origin.
