# short v2 — Requirements

Scope: self-hosted URL shortener and link-page tool for a small audience (~10 users, a handful of clicks),
authenticated against an existing Authentik instance.

## Users & roles
- **R1** Login via OIDC (Authentik). Users are created automatically on first login.
- **R2** Admin = member of the Authentik group named in `ADMIN_GROUP`. Everyone else who can log in is a user.
  The admin flag is refreshed on every login.
- **R3** Users create links and link pages only under `/<username>/<code>`. The bare `/<username>` stays unused.
  The username is the Authentik `preferred_username`. Usernames cannot change and are moderated by admins.
  Logins with usernames that are not URL-safe (`A-Z a-z 0-9 . _ -`) are rejected.
- **R4** Admins can also create links and pages at root level (`/<code>`) and can view, edit and delete
  everything, including stats.
- **R5** Root codes can't match an existing username. If a new user's name already exists as a root code,
  admins see a warning.
- **R6** Every route and endpoint is protected by default. Only redirects, public link pages and login are open.

## Links
- **R7** The shortcode is either typed in or, if left empty, randomly generated (5 characters).
- **R8** Destinations must be `http(s)://`. Reserved codes are blocked.
- **R9** Destinations can be edited. Links use 302 redirects.
- **R10** Deleting a link removes its stats and its buttons on link pages, in one transaction.
- **R11** An admin can pin the root `/` to any page.

## Link pages
- **R12** Title, avatar, ordered blocks (drag-and-drop reordering) and a theme (background and button colours).
- **R13** Block types: link button (points at a short link, so clicks are tracked) and text.
- **R14** Text blocks support basic Markdown (bold, italic, links, lists, headings). Raw HTML is stripped.
- **R15** Optional logo.dev favicons with letter placeholders as fallback. Optional attribution footer.
- Users' link pages can only use links from their own namespace. Admins can use any link.

## QR codes
- **R16** Choice of error correction level and colours. Download as PNG or SVG.

## Stats
- **R17** Total clicks, clicks today, unique visitors, last visit, and a clicks-per-day chart (7, 30 or 90 days).
- **R18** No raw IPs are stored. The visitor hash is a salted hash of IP and user agent, and the salt rotates daily,
  so unique visitors are counted per day.
- **R19** Detailed clicks are deleted after 90 days and only daily totals are kept. Stats can be reset per link.
- **R20** Recording a click never slows down the redirect.

## API
- **R21** A JSON API that the admin UI itself uses.
- **R22** Personal access tokens per user (create and revoke in the UI), with the same permissions as that user.

## Operations
- **R23** SQLite in a volume, with migrations that run on startup. Starting fresh, no data migration from v1.
- **R24** A single Docker image, built by GitHub Actions and pushed to GHCR and Docker Hub.
  Configured through env vars, with a health check endpoint.
- **R25** The admin UI works well on mobile and can be installed as a PWA.

## Non-goals (v1)
Image blocks, referrer/device/country stats, link expiry, custom domains, public sign-up.
