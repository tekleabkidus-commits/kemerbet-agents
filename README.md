# Kemerbet Agents

A live agent presence system for Kemerbet's deposit page. Players see which deposit agents are currently online via a static HTML block embedded on Kemerbet's website. Agents manage their online/offline status from a personal page accessed via a secret token link. The owner manages everything through a private backoffice with analytics.

---

## Stack

- **Backend:** Laravel 11, PHP 8.3
- **Database:** PostgreSQL 16
- **Cache / Queue / Session:** Redis
- **Frontend:** React 18 + TypeScript + Vite (admin SPA), Blade (agent secret page), pure HTML/JS (public block)
- **Auth:** Sanctum cookie auth (admin), token-in-URL (agents)
- **Styling:** Tailwind CSS

---

## Quick start

```bash
# Install
git clone git@github.com:tekleabkidus-commits/kemerbet-agents.git
cd kemerbet-agents
composer install
npm install

# Configure
cp .env.example .env
php artisan key:generate
# Edit .env with your DB credentials

# Database
php artisan migrate --seed

# Run
php artisan serve --port=8001     # API
npm run dev                        # Admin SPA (Vite)
php artisan queue:work             # Background jobs
```

Access:
- Public agent block (test page): `http://localhost:8001/test-block`
- Admin login: `http://localhost:8001/admin/login`
- Agent secret page: `http://localhost:8001/a/{token}`

---

## Architecture overview

Three surfaces:

1. **Public HTML block** — a single `<div>` + `<script>` snippet pasted into Kemerbet's website ONCE. Polls API every 1 minute (visibility-aware). Renders live + recently-offline agents. Shuffled order on each refresh.

2. **Agent secret page** — each of ~28 agents gets a unique URL like `/a/abc123...`. Mobile-first Blade page where they go online (15m / 30m / 45m / 1h / 2h) or offline. Browser notifications remind them before time ends.

3. **Admin backoffice** — React SPA at `/admin`. Manages agents, payment methods, settings, analytics. Sanctum auth.

---

## Documentation

- **`docs/SPECIFICATION.md`** — full system spec (14 sections, locked v1.0)
- **`docs/mockups/`** — visual mockups for every page (HTML files)
- **`CLAUDE.md`** — working agreement for Claude Code
- **`PROJECT_STATE.md`** — current build progress

---

## Development phases

1. **Phase A** — Foundation (migrations, models, admin auth, seeds)
2. **Phase B** — Admin agent CRUD + payment methods + settings
3. **Phase C** — Agent secret page
4. **Phase D** — Public API + HTML block
5. **Phase E** — Browser notifications (service worker)
6. **Phase F** — Analytics (rollups, charts, leaderboard)
7. **Phase G** — Polish & deploy

Estimated build time: ~14 days.

---

## License

Proprietary. All rights reserved.
