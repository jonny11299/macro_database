# Macro Database — Developer Docs

Quick reference for AI agents and contributors. Describes each file's responsibility and key decisions.

---

## Project Overview

A client-side Svelte SPA that accepts `.xls` / `.xlsx` uploads, parses them in the browser, and displays their contents in a feature-rich DataTable. Future goal: extract and catalog URLs found in spreadsheet cells.

**Stack:** Svelte 4 · Vite · SheetJS (`xlsx`) · Source Code Pro (Google Fonts) · No backend

---

## File Map

### Entry & Config

| File | Responsibility |
|---|---|
| `index.html` | HTML shell. Loads Source Code Pro from Google Fonts, mounts `#app`. |
| `src/main.js` | Imports `theme.css`, mounts `App.svelte` into `#app`. |
| `vite.config.js` | Vite + `@sveltejs/vite-plugin-svelte`. No special config needed. |
| `package.json` | Dependencies: `svelte`, `xlsx`, `@sveltejs/vite-plugin-svelte`, `vite`. |

---

### Styles

| File | Responsibility |
|---|---|
| `src/theme.css` | **Single source of truth for all design tokens.** CSS custom properties for backgrounds, brand green, text hierarchy, borders, URL link color, danger red, typography, spacing radii, and shadows. All components consume these variables — never hardcode colors elsewhere. Supabase-inspired dark theme (`#0d1117` base, `#3ecf8e` accent). |

---

### App Shell

| File | Responsibility |
|---|---|
| `src/App.svelte` | Thin shell. Owns `NAV_TABS` array and `activeNav` state. Renders `NavBar` and conditionally mounts tab components (`UploadTab` for `activeNav === 'upload'`). Adding a new tab = add entry to `NAV_TABS` + new `{#if}` branch. Nothing else lives here. |

---

### Components (`src/lib/`)

| File | Responsibility |
|---|---|
| `NavBar.svelte` | Top navigation bar. Props: `tabs` (`[{ id, label }]`), `activeTab` (string). Dispatches `tabChange` event with the tab `id`. Logo on the left, tab strip on the right. |
| `DropZone.svelte` | Drag-and-drop / click-to-browse file input. Accepts **multiple** `.xls`/`.xlsx` files. Validates extensions, skips invalid files with an error message, dispatches `filesAdded` with `{ files: File[] }`. Resets to ready state after each dispatch so more files can be added immediately. |
| `UploadTab.svelte` | All upload and viewing logic for the Upload tab. Owns the `fileList` array (each entry: `{ id, name, status, sheets, error, activeSheet, open }`). Calls `parseWorkbook` automatically on drop; last file in a batch opens automatically. Renders an accordion-style `<ul>` where each `<li>` toggles a DataTable open/closed inline. Multiple files can be open simultaneously. |
| `DataTable.svelte` | General-purpose data table. Props: `rows` (object[]), `columns` (`{ key, label }[]`), optional `tabBy`, `alignRowsBy`, `onRowClick`, `rowKey`. Features: sticky header, per-column sort, filter dropdown panel, column resizing by drag, alternating row bands, row click highlight, URL auto-detection (renders `http(s)://` values as clickable `<a>` links using safe HTML escaping). |

---

### Utilities (`src/lib/`)

| File | Responsibility |
|---|---|
| `parseSheet.js` | Parses a `File` object with SheetJS. Two steps before converting to row objects: (1) **`expandMerges`** — copies merged cell values to every cell in the merge range (SheetJS only stores the value at the top-left); (2) **`trim2D`** — reverse-scans from the last row/column to find the true data boundary, then adds `ROW_PAD = 2` / `COL_PAD = 2` blank rows/cols as visual breathing room, synthesizing rows if the sheet's `!ref` didn't include them. Returns `[{ name, rows, columns }]` — one entry per sheet. |

---

## Key Conventions

- **CSS variables only** — all colors, font sizes, and radii come from `theme.css`. Never hardcode a hex value in a component.
- **No server** — everything runs in the browser. `parseWorkbook` uses `FileReader` + `Uint8Array`.
- **Trim before load** — `trim2D` runs before rows are handed to DataTable, so DataTable never sees trailing empty cells.
- **Mount/unmount** — DataTable instances are created and destroyed with `{#if f.open ...}`. There are no hidden-but-rendered tables.
- **Sequential parsing** — `addFiles` `await`s each file before starting the next, avoiding CPU spikes on large batch uploads.
