# Claude Code Working Agreement — Kemerbet Agents

This file is read by Claude Code on every session. It defines how we work together on this project.

---

## Project at a glance

**Kemerbet Agents** is a live agent presence system for Kemerbet's deposit page. Players see which deposit agents are currently online via a static HTML block embedded on kemerbet's website. Agents manage their online/offline status from a personal page accessed via a secret token link. The owner (Kidus) manages everything through a private backoffice.

**Repository:** `github.com/tekleabkidus-commits/kemerbet-agents`
**Local path:** `/home/kidus/kemerbet-agents` (WSL Ubuntu 24.04)
**Stack:** Laravel 11 + PHP 8.3 + PostgreSQL + Redis + React/Vite/TypeScript + Tailwind

---

## Read these files first, every session

1. **`docs/SPECIFICATION.md`** — the locked spec for the entire system. The contract.
2. **`docs/PROJECT_STATE.md`** — the current state of the build (what's done, what's next).
3. **`CHANGES.md`** (if present) — log of in-flight decisions that may amend the spec.

If `PROJECT_STATE.md` does not exist or is unclear, **ask Kidus before doing anything**.

---

## Working agreement

### Per-file approval gate
- Every code file goes through a review before merge.
- For complex phases (carrier integration, auth, payments-adjacent code), Kidus reviews **each file individually** before you move to the next one.
- For simpler phases (UI scaffolds, migrations from spec), batch review is fine — but always show the diff/summary first and wait for "go".
- **When in doubt, default to per-file approval.**

### Phase discipline
- Build is divided into 7 phases (A through G in the spec).
- Don't skip ahead. Finish a phase, get gate review, then start the next.
- Update `PROJECT_STATE.md` at the end of each phase.

### Never invent unstated requirements
- If the spec doesn't cover a case, **ask before guessing**.
- If you find a contradiction in the spec, **stop and flag it** — don't pick a side silently.
- Acceptable surprises: typos, formatting fixes, obvious bugs in your own work.
- Unacceptable surprises: new fields in the schema, new endpoints, new UI screens, new dependencies, design changes.

### Design language locks
The visual design has been carefully iterated. Do not redesign without asking. Locked decisions:

- **Public agents page:** dark navy `#0a1628` background with green/gold radial accents
- **Live agents** breathing card animation, pulsing badges, "Truly online · ትክክለኛ ኦንላይን ያሉ" with typing dots
- **Single Deposit button** per agent card (no separate Chat button)
- **Pre-filled message:** "Hi Kemerbet agent, I want to deposit" (configurable in admin)
- **Bilingual UI:** Amharic default, EN toggle, choice persisted in localStorage
- **Offline warning modal** before redirecting to Telegram for offline agents
- **Admin design:** dark navy with sidebar, dense tables, color-coded status pills
- **No "24/7" copy** anywhere — removed by design decision
- **No "Range: X-Y Birr"** on agent cards — removed by design decision
- **Admin sessions are persistent** — no expiry, no remember checkbox, only manual logout signs out
- **Dev URL convention:** Access the admin SPA at `http://127.0.0.1:8001/admin` in development. `SANCTUM_STATEFUL_DOMAINS` includes both `localhost` and `127.0.0.1` variants for browser-resolution robustness. `SESSION_DOMAIN` is `null` (uses request host) for the same reason.

The HTML mockups for these designs live in `docs/mockups/` (committed to the repo). Implementation must match these mockups visually. Treat them as the visual contract.

### Code style
- Follow Laravel 11 conventions strictly.
- PSR-12, run Pint before every commit.
- Eloquent over query builder unless query is performance-critical.
- All money as `DECIMAL(18,4)` (ETB).
- All timestamps in UTC at the DB layer; display in EAT (UTC+3) on agent page and admin panel.
- React components use TypeScript strict mode.
- No inline styles in React (Tailwind only); inline styles allowed in Blade for embedded HTML block.
- Test feature endpoints with Pest. Aim for ~80% coverage on critical paths (token validation, status transitions, public agents endpoint).

### Database
- All migrations descriptive (`2026_04_27_000010_create_agents_table.php` not `create_agents.php`).
- Foreign keys with explicit `onDelete` behavior. Cascade only when intended.
- Indexes on every foreign key + every column used in WHERE clauses.
- Soft deletes on main entity tables (admins, agents, payment_methods).
- Never alter a table by dropping + recreating; always use proper migrations.

### Seeder
- Seeder uses `'secret-password'` as the admin password in non-interactive mode. To change it after seeding, use: `php artisan tinker`, then `App\Models\Admin::find(1)->update(['password' => 'new-password'])`.

### Security
- Sanctum cookie auth for admin (CSRF + HttpOnly cookies). No JWTs.
- Agent endpoints use token-in-body validation. Fail closed (404 not 401) on invalid token.
- All public endpoints rate-limited via Laravel throttle middleware.
- CORS allowlist for kemerbet domains in production.
- Never log full tokens. Truncated audit-friendly versions only (`abc123...`).

### Don't do these things
- Don't add npm packages without asking.
- Don't add composer packages without asking.
- Don't change Tailwind config arbitrarily — design tokens live in mockups.
- Don't write throwaway test files in the project root. Use `/tmp/` or `tests/`.
- Don't commit `.env` or any secrets.
- Don't push directly to `main`. Always work on a feature branch and ask before merge.
- Don't create new top-level directories without asking.

---

## Communication style with Kidus

- Be direct. He prefers brief summaries over walls of text.
- Show diffs/summaries before asking for approval.
- When uncertain, explicitly say "I'm not sure about X — choices are A, B, C. Which?"
- If a task is large, break it into smaller PRs/commits and check in between each.
- Multilingual context: Kidus is fluent in English, Amharic, Tigrinya. Default to English for code/docs; user-facing strings have English + Amharic per the spec.
- Match his rigor. He runs things tightly with Birhan and expects the same here.

---

## Phase tracking quick reference

| Phase | Scope | Status |
|---|---|---|
| A | Foundation: repo, migrations, models, admin auth, seeds | not started |
| B | Admin agent CRUD + payment methods + settings | not started |
| C | Agent secret page (Blade) | not started |
| D | Public API + HTML block | not started |
| E | Notifications (service worker) | not started |
| F | Analytics (rollups, charts, leaderboard) | not started |
| G | Polish & deploy | not started |

Update this table in `PROJECT_STATE.md`, not here. This file is a living agreement; the table is just a quick mental map.

---

## When you finish a meaningful unit of work

1. Run Pint: `./vendor/bin/pint`
2. Run tests: `./vendor/bin/pest` (or `php artisan test`)
3. Update `PROJECT_STATE.md`: what changed, what's next
4. Show Kidus the diff or a summary
5. Wait for "go" before committing
6. Use clear conventional commit messages: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`

---

End of working agreement. Stay rigorous. Ask questions. Don't surprise.
