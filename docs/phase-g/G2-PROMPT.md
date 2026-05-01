# Phase G2 — Settings Admin

## Context

You are implementing the admin Settings page for KemerrBet. The data layer is fully built — your job is to add an admin controller for reading/writing settings and replace the React stub `SettingsPage.tsx` with a real form that ports the locked HTML mockup.

This phase replaces the "Coming in Phase B" stub at `/admin/settings` with a working Settings UI.

## What already exists (do NOT recreate)

- **Migration** `2026_04_27_000100_create_settings_table.php` — settings table is built
- **Model** `App\Models\Setting` — key/value store with JSON casting (key as primary string key, value as JSON)
- **Seeder** `SettingSeeder` with **6 seeded settings**, all already populated:

| Key | Type | Default | Purpose |
|---|---|---|---|
| `prefill_message` | string | `"Hi Kemerbet agent, I want to deposit"` | Telegram message template when customer clicks an agent |
| `agent_hide_after_hours` | integer | `12` | Auto-hide agents who haven't been live in N hours |
| `public_refresh_interval_seconds` | integer | `60` | Public site re-fetch interval |
| `show_offline_agents` | boolean | `true` | Display offline agents on public site |
| `warn_on_offline_click` | boolean | `true` | Warn customer before clicking an offline agent |
| `shuffle_live_agents` | boolean | `true` | Randomize live agent order on public site |

- **Public consumer** `PublicAgentsController` reads `prefill_message`, `show_offline_agents`, `shuffle_live_agents` (verify and respect this when changing values)
- **HTML mockup** `docs/mockups/admin-settings.html` (820 lines) — visual contract, port exactly

## What you are building

Sub-tasks G2.1 → G2.2 below (just two gates, smaller phase). **STOP after each sub-task and await explicit approval before proceeding.**

---

## G2.1 — Backend controller + tests

### Files to create

1. `app/Http/Controllers/Admin/SettingController.php`
2. `app/Http/Requests/Admin/UpdateSettingsRequest.php`
3. `tests/Feature/Admin/SettingsTest.php`

### Files to modify

1. `routes/api.php` — add 2 routes

### Backend behavior

**`SettingController::index()`** — return all 6 settings as a single keyed object:

- Read all rows from `Setting` model
- Return `{ "data": { "prefill_message": "...", "agent_hide_after_hours": 12, ... } }`
- Cast each value to its proper type (the model's JSON cast handles this — but verify: `12` should be integer not string, `true` should be boolean not string, etc.)
- Order doesn't matter (object, not array)

**`SettingController::update(UpdateSettingsRequest $request)`** — partial update via PATCH:

- Accept any subset of the 6 known keys in the request body
- Only update keys that are actually present in the request (not all 6 — admin might be saving a single field)
- Wrap in DB transaction
- Use `Setting::updateOrCreate(['key' => $k], ['value' => $v, 'updated_at' => now()])` for each provided key (matches the seeder pattern — see `SettingSeeder`)
- Clear any cache that might hold settings (we'll add caching in a future phase, but for now just code the cache clear as a no-op `Cache::forget('settings.public')` so the hook is in place)
- Return the full updated settings object (same shape as `index()`)
- Return 200

### Validation rules (`UpdateSettingsRequest`)

```php
public function rules(): array
{
    return [
        'prefill_message' => ['sometimes', 'string', 'max:200'],
        'agent_hide_after_hours' => ['sometimes', 'integer', 'min:1', 'max:168'],
        'public_refresh_interval_seconds' => ['sometimes', 'integer', 'min:10', 'max:3600'],
        'show_offline_agents' => ['sometimes', 'boolean'],
        'warn_on_offline_click' => ['sometimes', 'boolean'],
        'shuffle_live_agents' => ['sometimes', 'boolean'],
    ];
}
```

**Important:** all rules use `sometimes`, never `required`. This is a partial-update endpoint. If the admin only changes one field, the request body has only that one field.

**Reject unknown keys:** if the request body contains a key that's not in the 6 known settings, return 422 with a clear error message. This prevents typos from silently being saved as new settings rows. Implement this either via custom validation or by stripping `$request->validated()` to only known keys (your call — match codebase convention).

### Routes to add

In `routes/api.php`, inside the `Route::middleware('auth:sanctum')->group(...)` block, group the settings routes near the existing settings-adjacent routes:

```php
Route::get('settings', [SettingController::class, 'index']);
Route::patch('settings', [SettingController::class, 'update']);
```

### Tests to write (8 minimum)

In `tests/Feature/Admin/SettingsTest.php`. Match the Pest/RefreshDatabase pattern from `tests/Feature/Admin/PaymentMethodCrudTest.php`.

1. `test_admin_can_get_all_settings` — GET, expect 200, expect all 6 keys present with correct types
2. `test_unauthenticated_cannot_get_settings` — GET without auth, expect 401
3. `test_admin_can_update_single_setting` — PATCH with just `prefill_message`, expect 200, expect DB updated, expect other 5 unchanged
4. `test_admin_can_update_multiple_settings` — PATCH with 3 keys, expect 200, expect those 3 updated
5. `test_validation_rejects_invalid_integer` — PATCH `agent_hide_after_hours` with `200` (over max 168), expect 422
6. `test_validation_rejects_invalid_string` — PATCH `prefill_message` with 250-char string (over max 200), expect 422
7. `test_validation_rejects_unknown_key` — PATCH with `{"foo": "bar"}`, expect 422 (or whatever the codebase pattern returns for unknown keys)
8. `test_unauthenticated_cannot_update_settings` — PATCH without auth, expect 401
9. `test_response_returns_full_settings_after_update` — PATCH one key, expect response includes all 6 keys (not just the updated one)
10. `test_boolean_values_round_trip_correctly` — PATCH `show_offline_agents` to `false`, GET, expect `false` (not `0` or `"false"` — must be boolean in JSON response)

### Conventions to match

- Form Request: follow `CreatePaymentMethodRequest` pattern exactly (`authorize()` returns `true`, `rules()` method)
- Controller: use `JsonResponse` return type, `response()->json(['data' => ...])` shape
- Tests: `uses(RefreshDatabase::class)`, seed `SettingSeeder` in `beforeEach`, admin auth via `actingAs($this->admin)`
- Use `assertDatabaseHas` for state verification

### STOP after G2.1

Run:

```bash
php artisan route:list | grep -E "settings|GET\|HEAD" | grep settings
php -l app/Http/Controllers/Admin/SettingController.php
./vendor/bin/pest --filter=Settings 2>&1 | tail -20
./vendor/bin/pint 2>&1 | tail -3
```

Report:
1. Routes registered (should show 2 new routes: GET and PATCH `/api/admin/settings`)
2. Lint clean
3. All settings tests passing
4. Pint clean

**Wait for explicit approval before proceeding to G2.2.**

---

## G2.2 — Frontend page (port mockup) + tests

### File to replace

`resources/js/admin/pages/SettingsPage.tsx` — currently 3 lines, replace entirely.

### Required reading first

**BEFORE writing any React, read the entire mockup:**

```bash
cat docs/mockups/admin-settings.html
```

The mockup is 820 lines. Match it exactly. Pay attention to grouping — the mockup likely organizes the 6 settings into logical sections (Public site behavior, Agent visibility, Customer experience). Mirror those groupings in the React form.

### Page structure to build

Based on the spec and likely mockup design, the page will show:

- Page header: title "Settings" + "Save Changes" primary button (top right)
- Logical grouping of the 6 settings into 2-4 panels/sections (match mockup)
- For each setting, an appropriate input control:
  - `prefill_message` → textarea (200-char limit, show character counter)
  - `agent_hide_after_hours` → number input (1-168 range, suffix "hours")
  - `public_refresh_interval_seconds` → number input (10-3600 range, suffix "seconds")
  - `show_offline_agents` → toggle switch (the same inline toggle pattern from G1's PaymentMethodsPage modal — no .toggle class exists, inline styles are acceptable)
  - `warn_on_offline_click` → toggle switch
  - `shuffle_live_agents` → toggle switch
- Each setting should have:
  - Clear label
  - Short help text explaining what it does (1 sentence, write good copy)
  - Visual feedback when value differs from saved state (e.g. "modified" indicator)
- Bottom of page: "Save Changes" button + "Discard" button
- Save flow: PATCH only the **diff** (changed keys), not all 6
- Show success toast / inline success message on save
- Show field-level validation errors from API on failed save
- Disable Save button when there are no changes (clean state)

### State management

- Fetch settings on mount via `GET /api/admin/settings`
- Store both `savedSettings` (from API) and `formSettings` (current form state)
- Compute `isDirty` as `JSON.stringify(saved) !== JSON.stringify(form)` or per-field comparison
- On Save: PATCH only the diff
- On successful save: update both `savedSettings` and `formSettings` from the response, show success
- On error: keep `formSettings`, show error, allow retry

### Confirmation guard

If user navigates away with unsaved changes, prompt confirmation. Use `window.onbeforeunload` for browser refresh/close, and React Router's `useBlocker` (if available) or a custom modal for in-app navigation. **If implementing the navigation guard adds significant complexity, just implement `window.onbeforeunload` and skip the in-app guard — log to commit message as future polish.**

### Conventions to match

- Page layout: look at `PaymentMethodsPage.tsx` (just shipped in G1) for the page-head + panel structure
- Form inputs: use existing `.form-input`, `.form-label`, `.form-help` CSS classes
- Toggle: same inline-style pattern as G1's modal toggle (the `.toggle` class doesn't exist in admin.css)
- Save button: `.btn .btn-primary`
- Toasts/alerts: use existing patterns from `PaymentMethodsPage` or `EditAgentModal`
- TypeScript: strong types throughout, define `Settings` interface with the 6 keys

### Tests to write (4 minimum)

In `resources/js/admin/__tests__/SettingsPage.test.tsx`. Match the pattern from `PaymentMethodsPage.test.tsx`.

1. `renders all 6 settings from API` — mock GET response, assert all 6 labels visible, assert input values match defaults
2. `Save button is disabled when no changes` — initial render, button disabled
3. `Save button calls API with only changed fields` — change one field, click Save, assert PATCH called with `{ prefill_message: "..." }` (just that one key, not all 6)
4. `Shows error when save fails with validation errors` — mock 422 response, assert error message appears

### STOP after G2.2

Run:

```bash
npm run build 2>&1 | tail -10
npx vitest run 2>&1 | tail -10
```

Report:
1. Build output (zero errors required)
2. All frontend tests passing (should show 16 prior + 4 new = 20 total)
3. The full diff: `git diff --stat`

**Final commit and report:**

After tests pass:

1. Stage all G2 files: `git add .`
2. `git status` — verify only intended files staged
3. Commit:
```bash
git commit -m "feat(settings): admin settings page (Phase G2)"
```
(write a full commit body in the same style as the G1 commit message: G2.1 backend, G2.2 frontend, test counts)

4. Do NOT push. Wait for verification.

---

## Out of scope for G2

- ❌ Adding new settings beyond the 6 already seeded (data layer is locked; new settings require their own phase)
- ❌ Activity timeline redesign (that is G3)
- ❌ Modifying any other admin page
- ❌ Adding npm packages
- ❌ Changing the design tokens or shared admin.css beyond the minimum needed for the form
- ❌ Adding new migrations
- ❌ Modifying SettingSeeder defaults
- ❌ Building agent-facing or public-facing settings UI (this is admin-only)
- ❌ Pushing commits to origin

## Reference files

- `app/Http/Controllers/Admin/PaymentMethodController.php` — controller pattern (just shipped in G1)
- `app/Http/Requests/Admin/UpdatePaymentMethodRequest.php` — partial update form request pattern
- `tests/Feature/Admin/PaymentMethodCrudTest.php` — backend test pattern
- `resources/js/admin/pages/PaymentMethodsPage.tsx` — page pattern (just shipped in G1)
- `resources/js/admin/__tests__/PaymentMethodsPage.test.tsx` — frontend test pattern
- `app/Http/Controllers/Public/PublicAgentsController.php:31` — current consumer of settings (reads 3 of the 6 keys)
- `database/seeders/SettingSeeder.php` — defaults, source of truth for the 6 keys
- `app/Models/Setting.php` — model with JSON casting
- `docs/mockups/admin-settings.html` — VISUAL CONTRACT, match exactly

## Approval-gate summary

```
G2.1 (backend + tests) → STOP, await approval
G2.2 (frontend + tests + commit) → STOP, await final review
```

Begin with G2.1.
