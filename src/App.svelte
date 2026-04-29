<script>
  import NavBar    from './lib/NavBar.svelte'
  import DropZone  from './lib/DropZone.svelte'
  import DataTable from './lib/DataTable.svelte'
  import { parseWorkbook } from './lib/parseSheet.js'

  // ── Nav ───────────────────────────────────────────────────────────────────────
  const NAV_TABS = [{ id: 'upload', label: 'Upload' }]
  let activeNav  = 'upload'

  // ── File list ─────────────────────────────────────────────────────────────────
  // { id, name, status: 'parsing'|'ready'|'error', sheets, error, activeSheet, open }
  let fileList = []
  let nextId   = 0

  async function addFiles(files) {
    for (const file of files) {
      const id = nextId++
      fileList = [...fileList, {
        id,
        name:        file.name,
        status:      'parsing',
        sheets:      null,
        error:       '',
        activeSheet: 0,
        open:        false,
      }]

      try {
        const sheets = await parseWorkbook(file)
        fileList = fileList.map(f =>
          f.id === id ? { ...f, status: 'ready', sheets } : f
        )
      } catch (err) {
        fileList = fileList.map(f =>
          f.id === id ? { ...f, status: 'error', error: err.message } : f
        )
      }
    }
  }

  function toggleOpen(id) {
    fileList = fileList.map(f =>
      f.id === id ? { ...f, open: f.status === 'ready' ? !f.open : f.open } : f
    )
  }

  function setSheet(id, idx) {
    fileList = fileList.map(f =>
      f.id === id ? { ...f, activeSheet: idx } : f
    )
  }

  function removeFile(id, e) {
    e.stopPropagation()
    fileList = fileList.filter(f => f.id !== id)
  }
</script>

<div class="layout">
  <NavBar tabs={NAV_TABS} activeTab={activeNav} on:tabChange={e => activeNav = e.detail} />

  <main class="main">
    <section class="upload-section">
      <DropZone on:filesAdded={e => addFiles(e.detail.files)} />

      {#if fileList.length > 0}
        <p class="list-hint">Click to view VTS.</p>

        <ul class="file-list">
          {#each fileList as f (f.id)}
            <li class="file-item" class:is-open={f.open}>

              <!-- ── File row button ── -->
              <button
                class="file-btn"
                class:is-open={f.open}
                class:is-error={f.status === 'error'}
                on:click={() => toggleOpen(f.id)}
              >
                <!-- Status indicator -->
                <span class="file-status">
                  {#if f.status === 'parsing'}
                    <span class="spinner" />
                  {:else if f.status === 'error'}
                    <span class="status-dot error-dot">✕</span>
                  {:else}
                    <span class="status-dot ready-dot">✓</span>
                  {/if}
                </span>

                <span class="file-name">{f.name}</span>

                {#if f.status === 'ready' && f.sheets}
                  <span class="sheet-count">{f.sheets.length} sheet{f.sheets.length > 1 ? 's' : ''}</span>
                {/if}

                <!-- Chevron (only shown when ready) -->
                {#if f.status === 'ready'}
                  <span class="chevron" class:rotated={f.open}>›</span>
                {/if}

                <!-- Remove -->
                <button class="remove-btn" title="Remove" on:click={e => removeFile(f.id, e)}>✕</button>
              </button>

              <!-- ── Inline table (mounted only when open + ready) ── -->
              {#if f.open && f.status === 'ready' && f.sheets}
                {@const sheet = f.sheets[f.activeSheet ?? 0]}
                <div class="file-table-area">

                  {#if f.sheets.length > 1}
                    <div class="sheet-tabs">
                      {#each f.sheets as s, i}
                        <button
                          class="sheet-tab"
                          class:active={f.activeSheet === i}
                          on:click|stopPropagation={() => setSheet(f.id, i)}
                        >{s.name}</button>
                      {/each}
                    </div>
                  {/if}

                  <div class="table-meta">
                    <span class="meta-label">sheet:</span>
                    <span class="meta-value">{sheet.name}</span>
                    <span class="meta-sep">·</span>
                    <span class="meta-value">{sheet.rows.length.toLocaleString()} rows</span>
                    <span class="meta-sep">·</span>
                    <span class="meta-value">{sheet.columns.length} cols</span>
                  </div>

                  <div class="table-wrap">
                    <DataTable rows={sheet.rows} columns={sheet.columns} />
                  </div>
                </div>
              {/if}

              <!-- ── Error message ── -->
              {#if f.status === 'error'}
                <p class="inline-error">{f.error}</p>
              {/if}

            </li>
          {/each}
        </ul>
      {/if}
    </section>
  </main>
</div>

<style>
  /* ── Shell ── */
  .layout {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }

  .main {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 28px 24px 60px;
  }

  /* ── Upload section ── */
  .upload-section {
    display: flex;
    flex-direction: column;
    gap: 14px;
    max-width: 760px;
  }

  /* ── Hint text ── */
  .list-hint {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--text-muted);
    letter-spacing: 0.02em;
  }

  /* ── File list ── */
  .file-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .file-item {
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    overflow: hidden;
    transition: border-color 0.15s;
  }

  .file-item.is-open {
    border-color: var(--green-border);
  }

  /* ── File header button ── */
  .file-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 9px 12px;
    background: var(--bg-panel);
    border: none;
    color: var(--text-secondary);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    cursor: pointer;
    text-align: left;
    transition: background 0.12s, color 0.12s;
  }

  .file-btn:hover         { background: var(--bg-panel-raised); color: var(--text-primary); }
  .file-btn.is-open       { background: var(--green-glow);      color: var(--text-primary); }
  .file-btn.is-error      { color: var(--red); }

  /* status dot */
  .file-status { display: flex; align-items: center; flex-shrink: 0; width: 16px; }
  .status-dot  { font-size: 10px; }
  .ready-dot   { color: var(--green); }
  .error-dot   { color: var(--red); }

  .spinner {
    display: inline-block;
    width: 11px;
    height: 11px;
    border: 2px solid var(--border-bright);
    border-top-color: var(--green);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .file-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
  }

  .sheet-count {
    font-size: var(--font-size-xs);
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .chevron {
    font-size: 14px;
    color: var(--text-muted);
    flex-shrink: 0;
    transition: transform 0.18s;
    display: inline-block;
    line-height: 1;
  }
  .chevron.rotated { transform: rotate(90deg); color: var(--green); }

  .remove-btn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    padding: 0;
    background: none;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    font-size: 9px;
    font-family: var(--font-mono);
    cursor: pointer;
    transition: color 0.1s, background 0.1s;
  }
  .remove-btn:hover { color: var(--red); background: rgba(248,81,73,0.1); }

  /* ── Inline table area ── */
  .file-table-area {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px 12px;
    background: var(--bg-base);
    border-top: 1px solid var(--green-border);
  }

  .sheet-tabs {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .sheet-tab {
    padding: 3px 11px;
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--text-secondary);
    background: var(--bg-panel);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: color 0.12s, border-color 0.12s, background 0.12s;
  }
  .sheet-tab:hover  { color: var(--text-primary); border-color: var(--border-bright); }
  .sheet-tab.active { color: var(--green); border-color: var(--green-border); background: var(--green-glow); }

  .table-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }
  .meta-label { color: var(--text-muted); }
  .meta-value { color: var(--text-primary); }
  .meta-sep   { color: var(--text-muted); }

  .table-wrap {
    height: 520px;
    display: flex;
    flex-direction: column;
  }

  /* ── Inline error ── */
  .inline-error {
    margin: 0;
    padding: 8px 12px;
    color: var(--red);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    background: var(--bg-base);
    border-top: 1px solid rgba(248,81,73,0.2);
  }
</style>
