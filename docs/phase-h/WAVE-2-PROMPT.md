# Phase H — Wave 2: Honesty Pass on Dashboard + Analytics

## Context

In G2.3 we replaced deceptive `alert("coming soon")` calls in Settings with proper banners and disabled buttons. The same pattern needs to apply to Dashboard and Analytics, which still have the old `alert()` style.

**This is a one-shot revision. Single commit, no gates.** ~30 min of work.

## What's being fixed

Four locations identified:

| File | Line | Current | Fix |
|---|---|---|---|
| `DashboardPage.tsx` | ~342 | `onClick={() => alert('Export CSV coming soon')}` | Disable the button, add tooltip |
| `AnalyticsPage.tsx` | ~293 | `alert('Custom date range coming soon')` | Remove the trigger entirely |
| `AnalyticsPage.tsx` | ~362 | `onClick={() => alert('Export CSV coming soon')}` | Disable the button, add tooltip |
| `AnalyticsPage.tsx` | ~555 | `<option value="conversion" disabled>Sort by: Conversion Rate (coming soon)</option>` | Remove the option entirely |

After this pass, **zero `alert()` calls remain** in admin pages, and **no dropdown options labeled "(coming soon)"**.

## Required reading first

Before making changes:

```bash
sed -n '335,350p' resources/js/admin/pages/DashboardPage.tsx
sed -n '285,300p' resources/js/admin/pages/AnalyticsPage.tsx
sed -n '355,370p' resources/js/admin/pages/AnalyticsPage.tsx
sed -n '545,560p' resources/js/admin/pages/AnalyticsPage.tsx
```

Get the exact context for each change. Some may have surrounding markup (icon, tooltip, etc.) that should be preserved.

## The four changes

### Change 1: DashboardPage Export CSV button

Locate the button at ~line 342 with `onClick={() => alert('Export CSV coming soon')}`.

**Before:**
```tsx
<button className="btn btn-secondary btn-sm" onClick={() => alert('Export CSV coming soon')}>
    Export CSV
</button>
```

**After:**
```tsx
<button
    className="btn btn-secondary btn-sm"
    disabled
    title="Export CSV — coming in a future update"
>
    Export CSV
</button>
```

Keep any surrounding icons or markup. Just remove the onClick and add `disabled` + `title` props.

### Change 2: AnalyticsPage Custom date range trigger

Locate the `alert('Custom date range coming soon')` at ~line 293. This is inside a click handler on something — find the trigger element (likely a button or option).

**Most likely scenario:** A "Custom range..." option in a date range select, or a button labeled "Custom" in a date range toggle.

**Fix approach:**
- If it's a `<select>` option: remove the option entirely
- If it's a button: remove the button entirely
- If it's something else: tell me and I'll guide

The today/7d/30d toggle covers the actual operator workflow. Custom range is a nice-to-have for a future phase.

### Change 3: AnalyticsPage Export CSV button

Same pattern as Change 1. Locate at ~line 362.

**Before:**
```tsx
<button className="btn btn-secondary btn-sm" onClick={() => alert('Export CSV coming soon')}>
    Export CSV
</button>
```

**After:**
```tsx
<button
    className="btn btn-secondary btn-sm"
    disabled
    title="Export CSV — coming in a future update"
>
    Export CSV
</button>
```

### Change 4: AnalyticsPage Conversion Rate sort option

Locate the `<option value="conversion" disabled>Sort by: Conversion Rate (coming soon)</option>` at ~line 555.

**Action:** Remove the entire `<option>` element.

The dropdown should still have its other working sort options. Just delete this one disabled "coming soon" option — it's noise.

## Verification

After all 4 changes:

```bash
# Confirm zero alert() calls remain in admin pages
grep -rn "alert(" resources/js/admin/pages/*.tsx
```

Expected: zero matches. If anything matches, those need fixing too.

```bash
# Confirm no "coming soon" labels remain in admin pages
grep -rn "coming soon\|coming in" resources/js/admin/pages/*.tsx
```

Expected: zero matches (the legitimate "Phase H" banners are in the panel BODY, not in option labels — those should still be present per G2.3).

```bash
# Build + tests
npx vite build 2>&1 | tail -5
npx vitest run 2>&1 | tail -10
./vendor/bin/pest 2>&1 | grep "Tests:"
./vendor/bin/pint 2>&1 | tail -3
```

Expected:
- Build: zero errors
- Frontend tests: 26 passing (no test changes needed)
- Backend tests: 291 passing (untouched)
- Pint: clean

If any test breaks, that's a sign a test was implicitly relying on the alert() or option being present — show me the failure and we'll fix.

## Commit

```bash
git status
git add resources/js/admin/pages/DashboardPage.tsx resources/js/admin/pages/AnalyticsPage.tsx
git status   # verify only those 2 files staged
```

Commit:

```bash
git commit -m "$(cat <<'EOF'
chore(admin): honesty pass on Dashboard + Analytics (Phase H Wave 2)

Removes deceptive alert("coming soon") patterns left over from earlier phases. Matches the G2.3 honesty pass already applied to Settings.

Changes:
- DashboardPage Export CSV button: disabled with tooltip "coming in a future update" (was alert)
- AnalyticsPage Custom date range trigger: removed entirely (today/7d/30d covers operator workflow)
- AnalyticsPage Export CSV button: disabled with tooltip (was alert)
- AnalyticsPage "Sort by: Conversion Rate (coming soon)" option: removed entirely (disabled dropdown options are noise)

After this commit, zero alert() calls remain in admin pages, and no dropdown options labeled "(coming soon)" exist. Settings page banners unchanged (those are panel-level Phase H markers, correct UX pattern).

No backend changes. No new tests. Existing 26 frontend + 291 backend tests still passing.
EOF
)"
```

Do NOT push. Wait for verification.

## Out of scope

- ❌ Building Export CSV (that's a separate phase)
- ❌ Building Custom date range picker (separate phase)
- ❌ Building Conversion Rate sort (requires backend math)
- ❌ Removing the Settings page banners (those are correct G2.3 UX)
- ❌ Touching any other admin page
- ❌ Pushing the commit

## Reference

- `resources/js/admin/pages/SettingsPage.tsx` — G2.3 honesty pattern reference
- `resources/js/admin/pages/DashboardPage.tsx` — change 1
- `resources/js/admin/pages/AnalyticsPage.tsx` — changes 2, 3, 4

Begin now. Single commit when all four changes done and verified.
