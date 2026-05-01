# Macro Database — Developer Docs

Quick reference for AI agents and contributors. Describes each file's responsibility and key decisions.

---

## Project Overview

A Svelte SPA with a local Express backend. Accepts `.xls` / `.xlsx` uploads, parses them in the browser, displays their contents in a feature-rich DataTable, and extracts/catalogs URLs found in spreadsheet cells into a PostgreSQL database.

**Stack:** Svelte 4 · Vite · SheetJS (`xlsx`) · Express 4 · postgres (porsager) · PostgreSQL (local) → Supabase (production) · Source Code Pro (Google Fonts)

---

## Directory Structure

```
Macro_Database/
├── src/
│   ├── main.js
│   ├── App.svelte
│   ├── theme.css
│   ├── lib/                  ← Svelte components only
│   │   ├── NavBar.svelte
│   │   ├── DropZone.svelte
│   │   ├── DataTable.svelte
│   │   ├── UploadTab.svelte
│   │   └── LinksTab.svelte
│   └── scripts/              ← Pure JS utilities (no Svelte)
│       ├── uid.js
│       ├── api.js
│       ├── parseSheet.js
│       └── parseLinks.js
├── server/
│   ├── index.js
│   ├── db.js
│   ├── schema.sql
│   ├── server_docs.md
│   └── routes/
│       ├── sessions.js
│       ├── links.js
│       ├── domains.js
│       └── macros.js
├── index.html
├── vite.config.js
├── package.json
└── dev_docs.md
```

---

## File Map

### Entry & Config

| File | Responsibility |
|---|---|
| `index.html` | HTML shell. Loads Source Code Pro from Google Fonts, mounts `#app`. |
| `src/main.js` | Imports `theme.css`, mounts `App.svelte` into `#app`. |
| `vite.config.js` | Vite + `@sveltejs/vite-plugin-svelte`. Proxies `/api/*` to `localhost:3001` in dev. |
| `package.json` | Dependencies: `svelte`, `xlsx`, `express`, `postgres`, `@sveltejs/vite-plugin-svelte`, `vite`. |

---

### Styles

| File | Responsibility |
|---|---|
| `src/theme.css` | **Single source of truth for all design tokens.** CSS custom properties for backgrounds, brand green, text hierarchy, borders, URL link color, danger red, typography, spacing radii, and shadows. All components consume these variables — never hardcode colors elsewhere. Supabase-inspired dark theme (`#0d1117` base, `#3ecf8e` accent). |

---

### App Shell

| File | Responsibility |
|---|---|
| `src/App.svelte` | Thin shell. Owns `NAV_TABS` array and `activeNav` state. Renders `NavBar` and conditionally mounts tab components. Adding a new tab = add entry to `NAV_TABS` + new `{#if}` branch. Nothing else lives here. |

---

### Components (`src/lib/`) — Svelte files only

| File | Responsibility |
|---|---|
| `NavBar.svelte` | Top navigation bar. Props: `tabs` (`[{ id, label }]`), `activeTab` (string). Dispatches `tabChange` event with the tab `id`. Logo on the left, tab strip on the right. |
| `DropZone.svelte` | Drag-and-drop / click-to-browse file input. Accepts **multiple** `.xls`/`.xlsx` files. Validates extensions, skips invalid files with an error message, dispatches `filesAdded` with `{ files: File[] }`. Resets to ready state after each dispatch so more files can be added immediately. |
| `UploadTab.svelte` | All upload and viewing logic for the Upload tab. Owns the `fileList` array (each entry: `{ id, name, status, sheets, error, activeSheet, open }`). Calls `parseWorkbook` automatically on drop; last file in a batch opens automatically. Renders an accordion-style `<ul>` where each `<li>` toggles a DataTable open/closed inline. Multiple files can be open simultaneously. |
| `DataTable.svelte` | General-purpose data table. Props: `rows` (object[]), `columns` (`{ key, label }[]`), optional `tabBy`, `alignRowsBy`, `onRowClick`, `rowKey`. Features: sticky header, per-column sort, filter dropdown panel, column resizing by drag, alternating row bands, row click highlight, URL auto-detection (renders `http(s)://` values as clickable `<a>` links using safe HTML escaping). |
| `LinksTab.svelte` | Links tab. Displays all extracted URLs from uploaded VTS files. Shows inserted links and a duplicate report. Wired to the `/api/links` endpoints. |

---

### Scripts (`src/scripts/`) — Pure JS utilities

| File | Responsibility |
|---|---|
| `uid.js` | `generateUserId()` — generates a human-readable ID like `Vivian_Hurley_1714400000000_042`. `getUid()` — persists a UID in `localStorage` so the same user is recognised across page refreshes; generates a new one on first visit. |
| `api.js` | Thin `fetch` wrapper for all `/api` calls. Centralises base URL, error handling, and any headers needed later (e.g. auth tokens for Supabase). All components call this instead of raw `fetch`. |
| `parseSheet.js` | Parses a `File` object with SheetJS. `expandMerges` copies merged cell values across the merge range; `trim2D` finds the true data boundary and adds breathing-room padding. Returns `[{ name, rows, columns }]` — one entry per sheet. |
| `parseLinks.js` | Scans parsed sheet rows for `http(s)://` URLs and returns structured link objects ready to POST to `/api/links/bulk`. |

---

### Server (`server/`)

For full backend context see `server/server_docs.md`.

| File | Responsibility |
|---|---|
| `server/index.js` | Express entry point. Mounts all route files, starts the server on `PORT` (default `3001`). |
| `server/db.js` | Creates and exports the `postgres` client. Connects via `DATABASE_URL` env var; falls back to local Postgres.app config. |
| `server/schema.sql` | One-time DB setup. Run with `psql macro_database -f server/schema.sql`. |
| `server/routes/sessions.js` | `POST /api/sessions` |
| `server/routes/links.js` | `POST /api/links/bulk`, `GET /api/links` |
| `server/routes/domains.js` | Full CRUD for domains. |
| `server/routes/macros.js` | Full CRUD for macros. |

---

## Server Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/sessions` | Start a new session. Body: `{ user_id }`. |
| `GET` | `/api/links` | Fetch all links, optionally filtered by `?session_id=`. |
| `POST` | `/api/links/bulk` | Bulk insert links. Returns `{ inserted, duplicates }`. |
| `GET` | `/api/domains` | Fetch all domains. |
| `POST` | `/api/domains` | Add a domain. |
| `PUT` | `/api/domains/:id` | Update a domain. |
| `DELETE` | `/api/domains/:id` | Delete a domain. |
| `GET` | `/api/macros` | Fetch all macros. |
| `POST` | `/api/macros` | Add a macro. |
| `PUT` | `/api/macros/:id` | Update a macro. |
| `DELETE` | `/api/macros/:id` | Delete a macro. |

---

## Key Conventions

- **CSS variables only** — all colors, font sizes, and radii come from `theme.css`. Never hardcode a hex value in a component.
- **`lib/` = Svelte only, `scripts/` = pure JS** — no `.svelte` files in `scripts/`, no plain `.js` files in `lib/`.
- **API calls via `api.js`** — never use raw `fetch` in a component.
- **Server does classification** — domain matching and macro regex run server-side during bulk link insert. The client sends raw URLs.
- **Duplicate links** — `full_link` is UNIQUE in the DB. The bulk insert endpoint returns `{ inserted, duplicates }` so the UI can report what was skipped.
- **UID persistence** — `getUid()` in `src/scripts/uid.js` checks `localStorage` before generating a new ID. Same browser = same user across sessions.
- **Trim before load** — `trim2D` in `parseSheet.js` runs before rows reach DataTable, so DataTable never sees trailing empty cells.
- **Mount/unmount** — DataTable instances are created and destroyed with `{#if}`. No hidden-but-rendered tables.
- **Sequential parsing** — `addFiles` `await`s each file before starting the next, avoiding CPU spikes on large batch uploads.
- **Environment variables** — `PORT` and `DATABASE_URL`. Neither required locally; both must be set in production.
