# short

A small self-hosted URL shortener and link-page tool for a handful of people, with login through Authentik (OIDC).

- **Short links**: `/<code>` for admins, `/<username>/<code>` for everyone else. Codes can be custom or random, and both codes and destinations can be edited later.
- **Link pages**: a "link in bio" page with avatar, link buttons, Markdown text blocks and colour themes, including trending or pasted [coolors.co](https://coolors.co) palettes. Blocks are reordered by drag and drop.
- **QR codes**: choose the error correction level and colours, then download as PNG or SVG.
- **Privacy-friendly stats**: clicks per day, daily unique visitors, last visit. No raw IPs are stored, the visitor hash uses a salt that rotates daily, and individual clicks are deleted after 90 days.
- **API with personal access tokens**: for scripts and iOS Shortcuts.
- **Mobile-friendly admin UI** with light and dark mode, installable as a PWA. Everything runs as a single container with SQLite.

See [REQUIREMENTS.md](REQUIREMENTS.md) for the full feature list.

## URLs

| Path | What |
|---|---|
| `/` | Redirects to the pinned page, if an admin pinned one |
| `/<code>` | Root links and pages (admins) |
| `/<username>/<code>` | User links and pages |
| `/~/` | Admin UI |
| `/~/api/…` | JSON API |
| `/~/health` | Health check |

## Roles

- **Users** can create and manage links and link pages under `/<their username>/`. Link pages can only use their own links.
- **Admins** are members of the Authentik group `ADMIN_GROUP`. They can additionally create root links, pin a page to `/`, and view, edit and delete everything.

The username is Authentik's `preferred_username`, fixed at the first login. Usernames have to be URL-safe (`A-Z a-z 0-9 . _ -`). Root codes that match a username are blocked, and the dashboard warns admins about conflicts.

## Setup

### 1. Authentik

Create an **OAuth2/OpenID provider** and an application for it:

- Client type: *Confidential*
- Redirect URI: `https://<your domain>/~/auth/callback`
- Scopes: `openid`, `profile`, `email` (the default `profile` mapping includes the `groups` claim)
- Create a group (e.g. `short-admins`) for admins.
- Use the application's policy bindings to control who can log in at all.

### 2. Configuration

Copy `.env.template` to `.env` and fill it in:

| Variable | Required | Description |
|---|---|---|
| `BASE_URL` | yes | Public URL, e.g. `https://short.example.com` |
| `OIDC_ISSUER` | yes | The provider's issuer URL, e.g. `https://auth.example.com/application/o/short/` |
| `OIDC_CLIENT_ID` / `OIDC_CLIENT_SECRET` | yes | From the Authentik provider |
| `SESSION_SECRET` | yes | At least 32 random characters: `openssl rand -base64 32` |
| `ADMIN_GROUP` | | Authentik group for admins, default `short-admins` |
| `TIMEZONE` | | Timezone for "today" and the daily stats, default `UTC` |
| `TRUST_PROXY` | | `true` behind a reverse proxy, so `X-Forwarded-For` is used for the visitor IP |
| `DATA_DIR` | | Database and uploads, default `./data` (`/data` in Docker) |
| `LOGO_DEV_TOKEN` | | Shows website logos on link page buttons via [logo.dev](https://logo.dev) (adds an attribution) |
| `DISABLE_ATTRIBUTION` | | `true` hides the "powered by" footer |

### 3. Run

```sh
mkdir -p data && sudo chown 1000:1000 data   # the container runs as uid 1000
docker compose up -d
```

Put it behind a reverse proxy with TLS. Back up `data/`: it holds the SQLite database (`short.db`) and the uploaded avatars. Database migrations run automatically on startup.

## API

The admin UI uses the same JSON API. Create a token under **API tokens**; it has the same permissions as your account.

```sh
curl -X POST https://short.example.com/~/api/pages \
  -H "Authorization: Bearer short_…" \
  -H "Content-Type: application/json" \
  -d '{"kind":"redirect","dest":"https://example.com","code":"optional"}'
```

Main endpoints: `GET/POST /pages`, `GET/PATCH/DELETE /pages/:id`, `GET/DELETE /pages/:id/stats?days=7|30|90`, `POST /pages/:id/blocks`, `PUT /pages/:id/blocks/order`, `PATCH/DELETE /blocks/:id`, `PUT /pages/:id/avatar`, `GET/POST/DELETE /tokens`.
Admin only: `PUT/DELETE /pin`, `GET /users`, `GET /conflicts`.

## Development

```sh
pnpm install
cp .env.template .env      # BASE_URL=http://localhost:5173 for dev
pnpm dev                   # API on :3000, admin UI with hot reload on http://localhost:5173/~/
pnpm test                  # vitest
pnpm typecheck
pnpm db:generate           # after changing src/server/db/schema.ts
```

Stack: Node 24, [Hono](https://hono.dev), SQLite with [Drizzle](https://orm.drizzle.team), [openid-client](https://github.com/panva/openid-client), React + Vite + Tailwind for the admin UI.
