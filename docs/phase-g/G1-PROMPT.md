# Phase G1 — Payment Methods Admin

## Context

You are implementing the admin Payment Methods management page for KemerrBet. The data layer is already fully built — your job is to:

1. Extend the existing `PaymentMethodController` (currently has only `index()`) with full CRUD endpoints
2. Replace the React stub `PaymentMethodsPage.tsx` with a real admin page that ports the locked HTML mockup

This phase replaces the "Coming in Phase B" stub at `/admin/payment-methods` with a working CRUD UI.

## What already exists (do NOT recreate)

- **Migration** `2026_04_27_000030_create_payment_methods_table.php` — table has `id`, `slug`, `display_name`, `display_order`, `is_active`, `icon_url`, timestamps, soft deletes
- **Migration** `2026_04_27_000040_create_agent_payment_methods_table.php` — pivot with `onDelete('restrict')` (so any method linked to ≥1 agent cannot be hard-deleted; this is a feature, not a bug)
- **Model** `App\Models\PaymentMethod` with `agents()` belongsToMany relation
- **Seeder** `PaymentMethodSeeder` with 8 seeded methods (telebirr, mpesa, cbe_birr, dashen, awash, boa, coop, wegagen)
- **Controller** `App\Http\Controllers\Admin\PaymentMethodController::index()` already returns active methods
- **Route** `GET /api/admin/payment-methods` already wired in `routes/api.php`
- **Test file** `tests/Feature/PaymentMethodListTest.php` — extend, don't replace
- **HTML mockup** `docs/mockups/admin-payment-methods.html` (901 lines) — visual contract, port exactly

## What you are building

Sub-tasks G1.1 → G1.4 below. **STOP after each sub-task and await explicit approval before proceeding.** This is a hard rule per the project's approval-gate workflow.

---

## G1.1 — Backend CRUD endpoints

### Files to modify

1. `app/Http/Controllers/Admin/PaymentMethodController.php`
2. `routes/api.php`

### Files to create

1. `app/Http/Requests/Admin/CreatePaymentMethodRequest.php`
2. `app/Http/Requests/Admin/UpdatePaymentMethodRequest.php`
3. `app/Http/Requests/Admin/ReorderPaymentMethodsRequest.php`

### Requirements

**Update `PaymentMethodController::index()`** to also support listing inactive methods for admins:

- Accept optional `?include_inactive=true` query param
- When true, return all methods (active + inactive)
- When false or absent, keep existing behavior (active only)
- Always include `id`, `slug`, `display_name`, `display_order`, `is_active`, `icon_url`, plus a computed `agents_count` field showing how many agents reference this method (use `withCount('agents')`)
- Always order by `display_order` ASC

**Add `store()`** — create a new payment method:

- Use `CreatePaymentMethodRequest` for validation
- Validation rules:
  - `display_name`: required, string, max 100, unique on `payment_methods.display_name`
  - `slug`: required, string, max 50, unique on `payment_methods.slug`, regex `/^[a-z0-9_]+$/` (lowercase + underscores only — match seeded slugs like `cbe_birr`)
  - `icon_url`: nullable, string, max 500, must be a valid URL if present
  - `display_order`: nullable, integer, min 0; if not provided, default to `(max display_order) + 10`
  - `is_active`: nullable, boolean, default `true`
- Return 201 with the created resource

**Add `update()`** — edit an existing payment method:

- Route param: `{paymentMethod}` (use route model binding)
- Use `UpdatePaymentMethodRequest` for validation
- Validation rules: same as create, but all fields are `sometimes` (partial update)
- `slug` uniqueness must ignore the current record's id (use `Rule::unique('payment_methods', 'slug')->ignore($paymentMethod->id)`)
- Same for `display_name`
- Return 200 with the updated resource

**Add `destroy()`** — delete a payment method:

- Route param: `{paymentMethod}` (route model binding)
- Use soft delete (`$paymentMethod->delete()` — the schema has `softDeletes`)
- BUT: if the method has agents linked (`$paymentMethod->agents()->count() > 0`), return 422 with error message: `"Cannot delete payment method: it is linked to {N} agent(s). Deactivate it instead."`
- Return 204 on success

**Add `reorder()`** — bulk reorder by passing an ordered array of IDs:

- Accept POST body: `{ "ids": [3, 1, 4, 2, ...] }`
- Use `ReorderPaymentMethodsRequest` for validation:
  - `ids`: required, array, min 1
  - `ids.*`: integer, exists on `payment_methods.id`
- Wrap in DB transaction
- Update each method's `display_order` to its position in the array × 10 (so positions 0,1,2,3 become display_order 0,10,20,30 — leaves room for future inserts)
- Return 200 with the updated full list

### Routes to add

In `routes/api.php`, inside the `Route::middleware('auth:sanctum')->group(...)` block, group the payment method routes:

```php
Route::get('payment-methods', [PaymentMethodController::class, 'index']);
Route::post('payment-methods', [PaymentMethodController::class, 'store']);
Route::put('payment-methods/{paymentMethod}', [PaymentMethodController::class, 'update']);
Route::delete('payment-methods/{paymentMethod}', [PaymentMethodController::class, 'destroy']);
Route::post('payment-methods/reorder', [PaymentMethodController::class, 'reorder']);
```

### Conventions to match

- Form Request classes: follow `CreateAgentRequest` / `UpdateAgentRequest` patterns exactly (same structure, same `authorize()` returning `true`, same `rules()` method shape)
- Controller responses: use `JsonResponse` return type hint, return `response()->json(['data' => ...])` for resources, return validation errors via FormRequest auto-handling
- DB transactions: wrap `reorder()` in `DB::transaction(function () {...})` like `AgentSeeder` does

### STOP after G1.1

After you've made the code changes, run:

```bash
php artisan route:list | grep payment-methods
php -l app/Http/Controllers/Admin/PaymentMethodController.php
```

Report the output and **wait for explicit approval before proceeding to G1.2**.

---

## G1.2 — Backend tests

### File to extend

`tests/Feature/PaymentMethodListTest.php` — keep existing tests, add new ones.

OR if cleaner: create a new file `tests/Feature/PaymentMethodCrudTest.php` for the new CRUD tests, leaving the list test file alone. Use your judgment — match whichever convention the codebase already uses for similar splits.

### Tests to write (8 minimum)

1. `test_admin_can_list_active_payment_methods` — already exists, verify still passes
2. `test_admin_can_list_all_methods_including_inactive` — pass `?include_inactive=true`, expect inactive methods in response
3. `test_admin_can_create_a_custom_payment_method` — POST with valid data, expect 201, expect record in DB
4. `test_create_validation_rejects_duplicate_slug` — POST with existing slug like `telebirr`, expect 422
5. `test_create_validation_rejects_invalid_slug_format` — POST with `Slug With Spaces`, expect 422
6. `test_admin_can_update_payment_method` — PUT with new display_name, expect 200, expect DB updated
7. `test_admin_can_soft_delete_unused_payment_method` — DELETE on a method with zero agents, expect 204, expect soft-deleted in DB
8. `test_destroy_returns_422_when_method_has_linked_agents` — DELETE on `telebirr` (which has all 24 seeded agents), expect 422 with the specific error message
9. `test_admin_can_reorder_payment_methods` — POST with reordered IDs, expect 200, verify display_order updated correctly
10. `test_unauthenticated_user_cannot_access_endpoints` — hit each new endpoint without auth token, expect 401

### Conventions to match

- Use existing `RefreshDatabase` trait pattern from `AgentListTest.php`
- Use existing admin auth helper if one exists (check `AuthTest.php` for pattern)
- Run seeders in setUp if needed: `$this->seed(PaymentMethodSeeder::class)` and `$this->seed(AgentSeeder::class)`
- Use `assertDatabaseHas` / `assertSoftDeleted` for DB assertions

### STOP after G1.2

Run:

```bash
php artisan test --filter=PaymentMethod
```

Report the test output (which passed, which failed). All tests must pass before proceeding.

**Wait for explicit approval before proceeding to G1.3.**

---

## G1.3 — Frontend page (port mockup)

### File to replace

`resources/js/admin/pages/PaymentMethodsPage.tsx` — currently 3 lines (renders StubPage), replace entirely.

### Required reading first

**BEFORE writing any React, read the entire mockup file:**

```bash
cat docs/mockups/admin-payment-methods.html
```

The mockup is 901 lines and is the LOCKED visual contract. Match it exactly. The mockup is a self-contained HTML file with inline CSS — port the layout, spacing, colors, badges, button styles, modal designs, and interactions into React.

### Page structure to build

Based on the mockup, the page shows:

- Page header with title "Payment Methods" + primary action button "Add Custom Method"
- Filter/toggle: "Show inactive" checkbox or toggle
- Main content: a list/table/grid of payment methods (match mockup's chosen layout)
- Each method row/card shows:
  - Icon (from `icon_url`, with fallback if null)
  - Display name
  - Slug (small, muted)
  - Active toggle switch
  - Agents count badge ("Used by N agents")
  - Edit button → opens edit modal
  - Delete button → opens confirm modal (only enabled if `agents_count === 0`)
  - Drag handle for reorder (if mockup shows one — match mockup)

### Modals to build

1. **Add Custom Method modal** — fields: display_name, slug (auto-generate from display_name with debounce, but editable), icon_url (URL input with optional preview), is_active toggle (default on)
2. **Edit Method modal** — same fields as Add, pre-populated, slug field disabled if it's a seeded method (telebirr, mpesa, cbe_birr, dashen, awash, boa, coop, wegagen) since changing slug would break references
3. **Delete Confirmation modal** — only reachable when `agents_count === 0`. Show method name, confirm/cancel.

### State management

- Fetch list on mount via `GET /api/admin/payment-methods?include_inactive=true`
- Use existing API client pattern (check `AgentsPage.tsx` for the convention — likely `axios` or fetch wrapper)
- Optimistic updates on toggle (flip locally, rollback on API error)
- Show loading states during API calls
- Show toast / inline error on API errors (match existing pattern from `AgentsPage` or `EditAgentModal`)
- Handle the 422 "method has linked agents" error from delete — show the error message to the user, don't pretend it succeeded

### Conventions to match

- Component file structure: look at `AgentsPage.tsx`, mirror its setup (imports, hooks, layout components)
- Modal pattern: look at `NewAgentModal.tsx` and `EditAgentModal.tsx` — reuse the modal shell component if one exists
- Confirm modal pattern: look at `ConfirmModal.tsx` — reuse it, don't build a new one
- CSS: use existing classes from `resources/css/admin.css` first; only add new CSS if the mockup truly requires something not yet defined. If you add new CSS, add it to `admin.css` in a clearly labeled section like `/* ============= PAYMENT METHODS ============= */`.
- TypeScript: type all responses. Define a `PaymentMethod` type in a sensible place (probably alongside or in the same file as the page; or in `resources/js/admin/types.ts` if that file exists).

### Important rules

- **Do not invent UI** — if the mockup doesn't show it, don't add it
- **Do not skip features the mockup shows** — if the mockup shows reorder drag handles, build reorder
- **Do not use red coloring for non-destructive actions** — red is reserved for delete/destructive only (per design system)
- **Match the dark theme** — `--bg: #0a1628`, `--text: #ffffff` from the mockup's CSS variables. KemerrBet uses dark UI throughout.

### STOP after G1.3

Run:

```bash
npm run build
```

Report the build output. Zero errors required. If there are warnings about unused imports or any-types, report those too.

**Wait for explicit approval before proceeding to G1.4.**

---

## G1.4 — Frontend tests

### Tests to write (3–4 minimum)

Match the existing frontend test infra from F4C (commit `4b80dfe` introduced it — look at the existing 12 frontend tests for conventions).

1. `PaymentMethodsPage renders list of methods from API`
2. `PaymentMethodsPage opens Add modal when button clicked`
3. `PaymentMethodsPage shows error when delete fails with 422 (linked agents)`
4. `PaymentMethodsPage toggle flips is_active and calls API`

### STOP after G1.4

Run:

```bash
npm run test
```

Report the full test output. All tests pass.

**Final commit and report:**

After G1.4 passes:

1. Show me the full diff: `git diff --stat`
2. Stage and commit: `git add . && git commit -m "feat(payment-methods): admin CRUD page (Phase G1)"`
3. Do NOT push. Wait for me to verify the commit, then I'll push.

---

## Out of scope for G1

Do NOT do these things — they are explicitly other phases:

- ❌ Settings admin page (that is G2)
- ❌ Activity timeline redesign (that is G3)
- ❌ Modifying any other admin page
- ❌ Changing the design tokens or `admin.css` shared styles
- ❌ Adding new migrations (the schema is complete)
- ❌ Modifying the seeder (8 methods are already seeded)
- ❌ Building agent-facing payment method UI (this is admin-only)
- ❌ Pushing commits to origin

## Reference files (read these for context)

- `app/Http/Controllers/Admin/AgentController.php` — controller pattern
- `app/Http/Requests/Admin/CreateAgentRequest.php` — form request pattern
- `app/Http/Requests/Admin/UpdateAgentRequest.php` — partial update form request pattern
- `tests/Feature/AgentCreateTest.php` — test pattern
- `tests/Feature/PaymentMethodListTest.php` — existing test to extend
- `resources/js/admin/pages/AgentsPage.tsx` — page pattern
- `resources/js/admin/components/EditAgentModal.tsx` — modal pattern
- `resources/js/admin/components/ConfirmModal.tsx` — confirm modal pattern
- `docs/mockups/admin-payment-methods.html` — VISUAL CONTRACT, match exactly
- `routes/api.php` — route grouping pattern

## Approval-gate summary

```
G1.1 (backend) → STOP, await approval
G1.2 (backend tests) → STOP, await approval
G1.3 (frontend) → STOP, await approval
G1.4 (frontend tests + commit) → STOP, await final review
```

Begin with G1.1.
