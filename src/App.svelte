<script>
  import DropZone from './lib/DropZone.svelte'
  import DataTable from './lib/DataTable.svelte'
  import { parseWorkbook } from './lib/parseSheet.js'

  let file        = null    // raw File from DropZone
  let sheets      = null    // parsed sheet data
  let activeSheet = 0       // index into sheets[]
  let loading     = false
  let parseError  = ''

  // Reset everything when the file is cleared
  function onCleared() {
    file        = null
    sheets      = null
    activeSheet = 0
    parseError  = ''
  }

  async function convert() {
    if (!file) return
    loading    = true
    parseError = ''
    sheets     = null
    try {
      sheets = await parseWorkbook(file)
      activeSheet = 0
    } catch (err) {
      parseError = err.message
    } finally {
      loading = false
    }
  }

  $: currentSheet = sheets?.[activeSheet] ?? null
  $: rowCount     = currentSheet?.rows?.length ?? 0
  $: colCount     = currentSheet?.columns?.length ?? 0
</script>

<div class="app">
  <!-- ── Header ── -->
  <header>
    <div class="logo">
      <span class="logo-bracket">[</span>macro<span class="logo-accent">_</span>db<span class="logo-bracket">]</span>
    </div>
    <p class="tagline">Upload a spreadsheet to explore and catalog URLs.</p>
  </header>

  <!-- ── Upload section ── -->
  <section class="upload-section">
    <DropZone
      bind:file
      on:fileSelected={() => { sheets = null; parseError = '' }}
      on:cleared={onCleared}
    />

    <div class="convert-row">
      <button
        class="convert-btn"
        disabled={!file || loading}
        on:click={convert}
      >
        {#if loading}
          <span class="spinner" />  parsing…
        {:else}
          ▶ Convert
        {/if}
      </button>

      {#if parseError}
        <p class="parse-error">{parseError}</p>
      {/if}
    </div>
  </section>

  <!-- ── Sheet tab selector (multiple sheets) ── -->
  {#if sheets && sheets.length > 1}
    <div class="sheet-tabs">
      {#each sheets as sheet, i}
        <button
          class="sheet-tab"
          class:active={activeSheet === i}
          on:click={() => activeSheet = i}
        >{sheet.name}</button>
      {/each}
    </div>
  {/if}

  <!-- ── Table section ── -->
  {#if currentSheet}
    <section class="table-section">
      <div class="table-meta">
        <span class="meta-label">Sheet:</span>
        <span class="meta-value">{currentSheet.name}</span>
        <span class="meta-sep">·</span>
        <span class="meta-value">{rowCount.toLocaleString()} rows</span>
        <span class="meta-sep">·</span>
        <span class="meta-value">{colCount} columns</span>
      </div>

      <div class="table-container">
        <DataTable
          rows={currentSheet.rows}
          columns={currentSheet.columns}
        />
      </div>
    </section>
  {/if}
</div>

<style>
  .app {
    max-width: 1400px;
    margin: 0 auto;
    padding: 40px 24px 80px;
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  /* ── Header ── */
  header {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .logo {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text-primary);
    font-family: var(--font-mono);
    line-height: 1;
  }

  .logo-bracket { color: var(--text-muted); }
  .logo-accent  { color: var(--green); }

  .tagline {
    margin: 0;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    font-family: var(--font-mono);
  }

  /* ── Upload section ── */
  .upload-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 680px;
  }

  .convert-row {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .convert-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 24px;
    background: var(--green);
    color: #0d1117;
    font-family: var(--font-mono);
    font-size: var(--font-size-base);
    font-weight: 700;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: opacity 0.15s, transform 0.1s;
    letter-spacing: 0.03em;
  }

  .convert-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
  .convert-btn:active:not(:disabled){ transform: translateY(0); }

  .convert-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
    transform: none;
  }

  /* Loading spinner */
  .spinner {
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 2px solid rgba(13, 17, 23, 0.3);
    border-top-color: #0d1117;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .parse-error {
    margin: 0;
    color: var(--red);
    font-size: var(--font-size-sm);
    font-family: var(--font-mono);
  }

  /* ── Sheet tabs ── */
  .sheet-tabs {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .sheet-tab {
    padding: 5px 14px;
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
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

  /* ── Table section ── */
  .table-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .table-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .meta-label { color: var(--text-muted); }
  .meta-value { color: var(--text-primary); }
  .meta-sep   { color: var(--text-muted); }

  .table-container {
    display: flex;
    flex-direction: column;
    height: 60vh;
    min-height: 320px;
  }
</style>
