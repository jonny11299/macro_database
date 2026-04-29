<script>
  // ── Props ────────────────────────────────────────────────────────────────────
  export let rows = []; // array of plain objects
  export let columns = []; // { key, label }[]
  export let tabBy = null; // field name to split rows into tabs
  export let alignRowsBy = null; // field name to group rows for alternating bands
  export let onRowClick = null; // (row) => void
  export let rowKey = null; // (row) => string — if omitted, auto_id is used

  // ── URL rendering ────────────────────────────────────────────────────────────
  const URL_RE = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;

  function escHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function cellHtml(value) {
    if (value === null || value === undefined) return "";
    const s = String(value);
    if (!s.includes("http")) return escHtml(s); // fast-path: no URL possible

    const parts = [];
    let last = 0;
    let m;
    URL_RE.lastIndex = 0;
    while ((m = URL_RE.exec(s)) !== null) {
      if (m.index > last) parts.push(escHtml(s.slice(last, m.index)));
      const url = m[1];
      const eu = escHtml(url);
      parts.push(
        `<a href="${eu}" target="_blank" rel="noopener noreferrer" class="url-link">${eu}</a>`,
      );
      last = m.index + url.length;
    }
    if (last < s.length) parts.push(escHtml(s.slice(last)));
    return parts.join("");
  }

  // ── auto_id ingestion ─────────────────────────────────────────────────────────
  let ingestedRows = [];
  let effectiveCols = [];

  $: {
    ingestedRows = rows.map((r, i) => ({ auto_id: i, ...r }));
    const autoCol = { key: "auto_id", label: "#" };
    effectiveCols = rowKey ? columns : [autoCol, ...columns];
  }

  $: effectiveRowKey = rowKey ?? ((row) => String(row.auto_id));

  // ── Tab state ─────────────────────────────────────────────────────────────────
  $: tabTitles = tabBy
    ? [...new Map(ingestedRows.map((r) => [r[tabBy], r[tabBy]])).keys()]
    : null;

  let activeTab = null;
  $: if (tabTitles?.length && !activeTab) activeTab = tabTitles[0];

  $: tabRows =
    tabBy && activeTab
      ? ingestedRows.filter((r) => r[tabBy] === activeTab)
      : ingestedRows;

  function switchTab(title) {
    activeTab = title;
    panelCol = null;
  }

  // ── Per-tab sort + filter state ───────────────────────────────────────────────
  let tabState = {};

  function tabKey() {
    return tabBy ? (activeTab ?? "__all__") : "__all__";
  }

  function ensureTS(k) {
    if (!tabState[k])
      tabState[k] = { filters: {}, sortCol: null, sortDir: "asc" };
  }

  $: ts = tabState[tabKey()] ?? { filters: {}, sortCol: null, sortDir: "asc" };
  $: filters = ts.filters;
  $: sortCol = ts.sortCol;
  $: sortDir = ts.sortDir;

  function toggleSort(key) {
    const k = tabKey();
    ensureTS(k);
    const s = tabState[k];
    if (s.sortCol === key) s.sortDir = s.sortDir === "asc" ? "desc" : "asc";
    else {
      s.sortCol = key;
      s.sortDir = "asc";
    }
    tabState = { ...tabState };
  }

  // ── Filter panel ──────────────────────────────────────────────────────────────
  let panelCol = null;
  let panelPos = { x: 0, y: 0 };
  let panelState = {};

  $: panelAllChecked =
    Object.values(panelState).length > 0 &&
    Object.values(panelState).every(Boolean);

  function uniqueVals(key) {
    return [...new Set(tabRows.map((r) => String(r[key] ?? "NULL")))].sort(
      (a, b) => a.localeCompare(b),
    );
  }

  function openFilter(key, btn) {
    if (panelCol === key) {
      panelCol = null;
      return;
    }
    const rect = btn.getBoundingClientRect();
    panelPos = { x: rect.left, y: rect.bottom + 4 };
    const k = tabKey();
    const active = tabState[k]?.filters[key];
    panelState = Object.fromEntries(
      uniqueVals(key).map((v) => [v, !active || active.has(v)]),
    );
    panelCol = key;
  }

  function syncFilter() {
    const k = tabKey();
    ensureTS(k);
    const s = tabState[k];
    const all = uniqueVals(panelCol);
    const inc = all.filter((v) => panelState[v]);
    if (inc.length === all.length) delete s.filters[panelCol];
    else s.filters[panelCol] = new Set(inc);
    tabState = { ...tabState };
  }

  function togglePanelAll() {
    panelState = Object.fromEntries(
      Object.keys(panelState).map((k) => [k, !panelAllChecked]),
    );
    syncFilter();
  }

  $: hasFilter = (key) => !!tabState[tabKey()]?.filters[key];

  // ── Display rows pipeline ─────────────────────────────────────────────────────
  let displayRows = [];
  $: {
    const {
      filters: f,
      sortCol: sc,
      sortDir: sd,
    } = tabState[tabKey()] ?? { filters: {}, sortCol: null, sortDir: "asc" };

    let r = tabRows.filter((row) =>
      effectiveCols.every((col) => {
        const cf = f[col.key];
        if (!cf) return true;
        return cf.has(String(row[col.key] ?? "NULL"));
      }),
    );

    if (sc) {
      r = [...r].sort((a, b) => {
        const av = a[sc] ?? "";
        const bv = b[sc] ?? "";
        const cmp = String(av).localeCompare(String(bv), undefined, {
          numeric: true,
        });
        return sd === "asc" ? cmp : -cmp;
      });
    }

    let band = false,
      lastBandVal = null;
    displayRows = r.map((row) => {
      const bv = alignRowsBy
        ? String(row[alignRowsBy] ?? "")
        : effectiveRowKey(row);
      if (bv !== lastBandVal) {
        band = !band;
        lastBandVal = bv;
      }
      return { ...row, _band: band };
    });
  }

  // ── Column resizing ───────────────────────────────────────────────────────────
  let colWidths = {};
  let resizing = null;

  const DEFAULT_COL_WIDTH = 140;

  $: anyResized = Object.keys(colWidths).length > 0;
  $: tableWidth = effectiveCols.reduce(
    (s, c) => s + (colWidths[c.key] ?? DEFAULT_COL_WIDTH),
    0,
  );

  function startResize(e, key) {
    const th = e.currentTarget.closest("th");
    resizing = {
      key,
      startX: e.clientX,
      startWidth: colWidths[key] ?? th.getBoundingClientRect().width,
    };
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  }

  function onMousemove(e) {
    if (!resizing) return;
    colWidths = {
      ...colWidths,
      [resizing.key]: Math.max(
        40,
        resizing.startWidth + (e.clientX - resizing.startX),
      ),
    };
  }

  function onMouseup() {
    if (!resizing) return;
    resizing = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }

  // ── Row highlight ─────────────────────────────────────────────────────────────
  let highlightedKey = null;
  let highlightTimeout;

  function handleRowClick(row) {
    if (!onRowClick) return;
    onRowClick(row);
    highlightedKey = effectiveRowKey(row);
    clearTimeout(highlightTimeout);
    highlightTimeout = setTimeout(() => (highlightedKey = null), 600);
  }
</script>

<svelte:window
  on:click={(e) => {
    if (
      panelCol &&
      !e.target.closest(".filter-panel") &&
      !e.target.closest(".filter-btn")
    )
      panelCol = null;
  }}
  on:mousemove={onMousemove}
  on:mouseup={onMouseup}
/>

<div class="datatable-root">
  <!-- ── Sheet tabs ── -->
  {#if tabTitles && tabTitles.length > 1}
    <div class="tab-strip">
      {#each tabTitles as title}
        <button
          class="tab"
          class:active={activeTab === title}
          on:click={() => switchTab(title)}>{title}</button
        >
      {/each}
    </div>
  {/if}

  <!-- ── Table ── -->
  <div class="table-wrap">
    <table
      style={anyResized ? `table-layout:fixed;width:${tableWidth}px;` : ""}
    >
      <thead>
        <tr>
          {#each effectiveCols as col}
            <th
              class:sorted={sortCol === col.key}
              style={colWidths[col.key]
                ? `width:${colWidths[col.key]}px;max-width:none;`
                : ""}
            >
              <div class="th-inner">
                <button class="sort-btn" on:click={() => toggleSort(col.key)}>
                  {col.label}
                  <span class="sort-icon">
                    {#if sortCol === col.key}{sortDir === "asc"
                        ? "↑"
                        : "↓"}{:else}⇅{/if}
                  </span>
                </button>
                <button
                  class="filter-btn"
                  class:filter-active={hasFilter(col.key)}
                  title="Filter"
                  on:click|stopPropagation={(e) =>
                    openFilter(col.key, e.currentTarget)}>▽</button
                >
              </div>
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <div
                class="col-resizer"
                on:mousedown|preventDefault={(e) => startResize(e, col.key)}
              />
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each displayRows as row}
          {@const rk = effectiveRowKey(row)}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <tr
            class:band={row._band}
            class:highlighted={highlightedKey === rk}
            class:clickable={!!onRowClick}
            on:click={() => handleRowClick(row)}
          >
            {#each effectiveCols as col}
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <td>{@html cellHtml(row[col.key])}</td>
            {/each}
          </tr>
        {/each}

        {#if displayRows.length === 0}
          <tr>
            <td colspan={effectiveCols.length} class="empty">
              No rows match the current filter.
            </td>
          </tr>
        {/if}
      </tbody>
    </table>
  </div>
</div>

<!-- ── Filter panel (portal-like, fixed position) ── -->
{#if panelCol}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="filter-panel"
    role="listbox"
    aria-label="Filter values"
    style="left:{panelPos.x}px;top:{panelPos.y}px"
    on:click|stopPropagation
  >
    <label class="filter-row filter-all">
      <input
        type="checkbox"
        checked={panelAllChecked}
        on:change={togglePanelAll}
      />
      <span>(Select All)</span>
    </label>
    <div class="filter-divider" />
    {#each Object.keys(panelState) as val}
      <label class="filter-row">
        <input
          type="checkbox"
          bind:checked={panelState[val]}
          on:change={syncFilter}
        />
        <span class="filter-val">{val}</span>
      </label>
    {/each}
  </div>
{/if}

<style>
  /* ── Root ── */
  .datatable-root {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  /* ── Tabs ── */
  .tab-strip {
    display: flex;
    gap: 2px;
    padding: 6px 10px 0;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    background: var(--bg-header);
  }

  .tab {
    padding: 5px 14px;
    font-size: var(--font-size-sm);
    font-weight: 600;
    font-family: var(--font-mono);
    color: var(--text-muted);
    background: none;
    border: 1px solid transparent;
    border-bottom: none;
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
    cursor: pointer;
    transition:
      color 0.12s,
      background 0.12s;
    white-space: nowrap;
    position: relative;
    bottom: -1px;
  }
  .tab:hover {
    color: var(--text-secondary);
    background: rgba(255, 255, 255, 0.04);
  }
  .tab.active {
    color: var(--green);
    background: var(--bg-panel);
    border-color: var(--border);
  }

  /* ── Table wrapper ── */
  .table-wrap {
    flex: 1;
    overflow: auto;
    background: var(--bg-panel);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--font-size-sm);
    font-family: var(--font-mono);
  }

  /* ── Header ── */
  thead {
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--bg-header);
  }

  th {
    padding: 0;
    text-align: left;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--border-bright);
    white-space: nowrap;
    position: relative;
    max-width: 10rem;
    overflow: hidden;
  }
  th.sorted {
    color: var(--green);
  }

  .th-inner {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .sort-btn {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 7px 6px 7px 10px;
    background: none;
    border: none;
    color: inherit;
    font: inherit;
    font-weight: 600;
    letter-spacing: 0.04em;
    cursor: pointer;
    text-align: left;
    white-space: nowrap;
    transition: color 0.12s;
  }
  .sort-btn:hover {
    color: var(--text-primary);
  }

  .sort-icon {
    font-size: var(--font-size-sm);
    opacity: 0.45;
    flex-shrink: 0;
  }
  th.sorted .sort-icon {
    opacity: 1;
  }

  .filter-btn {
    padding: 4px 6px;
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: var(--font-size-sm);
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition:
      color 0.12s,
      background 0.12s;
    flex-shrink: 0;
    line-height: 1;
  }
  .filter-btn:hover {
    color: var(--text-secondary);
    background: rgba(255, 255, 255, 0.06);
  }
  .filter-btn.filter-active {
    color: var(--green);
  }

  /* ── Column resizer ── */
  .col-resizer {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 5px;
    cursor: ew-resize;
    z-index: 2;
  }
  .col-resizer:hover {
    background: var(--green-border);
  }

  /* ── Body ── */
  td {
    padding: 5px 10px;
    border-bottom: 1px solid var(--border);
    vertical-align: top;
    color: var(--text-primary);
    max-width: 10rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  tr.band td {
    background: rgba(255, 255, 255, 0.02);
  }

  tr.clickable {
    cursor: pointer;
  }
  tr.clickable:hover td {
    background: var(--green-glow);
  }
  tr.highlighted td {
    background: var(--green-dim) !important;
  }

  .empty {
    color: var(--text-muted);
    font-style: italic;
    text-align: center;
    padding: 28px;
  }

  /* ── URL links (rendered via {@html}) ── */
  :global(.url-link) {
    color: var(--url-color);
    text-decoration: underline;
    text-underline-offset: 2px;
    text-decoration-color: rgba(88, 166, 255, 0.4);
    transition: color 0.1s;
  }
  :global(.url-link:hover) {
    color: var(--url-hover);
    text-decoration-color: var(--url-hover);
  }

  /* ── Filter panel ── */
  .filter-panel {
    position: fixed;
    z-index: 200;
    background: var(--bg-panel-raised);
    border: 1px solid var(--border-bright);
    border-radius: var(--radius-md);
    padding: 4px 0;
    min-width: 190px;
    max-width: 300px;
    max-height: 320px;
    overflow-y: auto;
    box-shadow: var(--shadow-popup);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
  }

  .filter-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 12px;
    cursor: pointer;
    transition: background 0.08s;
    user-select: none;
  }
  .filter-row:hover {
    background: rgba(255, 255, 255, 0.05);
  }
  .filter-row input {
    accent-color: var(--green);
    cursor: pointer;
    flex-shrink: 0;
  }

  .filter-all {
    font-weight: 600;
    color: var(--text-secondary);
  }

  .filter-val {
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .filter-divider {
    height: 1px;
    background: var(--border);
    margin: 3px 0;
  }
</style>
