<script>
  import { onMount } from 'svelte'
  import DataTable from './DataTable.svelte'
  import { fileList } from '../scripts/stores.js'
  import { getUid } from '../scripts/uid.js'
  import { api } from '../scripts/api.js'
  import { parseLinks } from '../scripts/parseLinks.js'

  const BATCH_SIZE = 50

  // ── State ────────────────────────────────────────────────────────────────────
  let session        = null   // { session_id, user_id, time_started }
  let links          = []     // all links fetched from DB
  let lastResult     = null   // { inserted: [], duplicates: [] } from last bulk insert
  let isExtracting   = false
  let isLoadingLinks = false
  let error          = null
  let batchProgress  = null   // { current, total } while extracting

  // ── Derived ──────────────────────────────────────────────────────────────────
  $: readyFiles   = $fileList.filter(f => f.status === 'ready')
  $: canExtract   = readyFiles.length > 0 && !!session && !isExtracting

  $: linkColumns = [
    { key: 'full_link',   label: 'URL' },
    { key: 'domain_name', label: 'Domain' },
    { key: 'header_name', label: 'Header' },
    { key: 'file_name',   label: 'File' },
    { key: 'sheet_name',  label: 'Sheet' },
  ]

  // ── Lifecycle ─────────────────────────────────────────────────────────────────
  onMount(async () => {
    await initSession()
    await loadLinks()
  })

  // ── Session ───────────────────────────────────────────────────────────────────
  async function initSession() {
    // One session per browser tab — use sessionStorage so a new tab = new session
    const stored = sessionStorage.getItem('macro_session')
    if (stored) {
      session = JSON.parse(stored)
      return
    }
    try {
      const user_id = getUid()
      session = await api.post('/sessions', { user_id })
      sessionStorage.setItem('macro_session', JSON.stringify(session))
    } catch (err) {
      error = `Could not start session: ${err.message}`
    }
  }

  // ── Links ─────────────────────────────────────────────────────────────────────
  async function loadLinks() {
    isLoadingLinks = true
    error = null
    try {
      links = await api.get('/links')
    } catch (err) {
      error = `Could not load links: ${err.message}`
    } finally {
      isLoadingLinks = false
    }
  }

  async function extractLinks() {
    if (!canExtract) return
    isExtracting  = true
    error         = null
    lastResult    = null
    batchProgress = null

    try {
      const rawLinks = parseLinks($fileList)
      if (rawLinks.length === 0) {
        lastResult = []
        return
      }

      // Split into chunks of BATCH_SIZE
      const batches = []
      for (let i = 0; i < rawLinks.length; i += BATCH_SIZE) {
        batches.push(rawLinks.slice(i, i + BATCH_SIZE))
      }

      // One result slot per batch — filled with success or error as we go
      const results = new Array(batches.length).fill(null)

      for (let i = 0; i < batches.length; i++) {
        batchProgress = { current: i + 1, total: batches.length }
        try {
          const result = await api.post('/links/bulk', {
            session_id: session.session_id,
            links: batches[i],
          })
          results[i] = {
            status:     'success',
            inserted:   result.inserted,
            duplicates: result.duplicates,
          }
        } catch (err) {
          results[i] = {
            status: 'error',
            error:  err.message,
          }
        }
      }

      lastResult = results
      await loadLinks()
    } catch (err) {
      error = `Extraction failed: ${err.message}`
    } finally {
      isExtracting  = false
      batchProgress = null
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  let duplicatesOpen = false

  function formatTime(iso) {
    return new Date(iso).toLocaleString()
  }
</script>

<section class="links-section">

  <!-- ── Session bar ── -->
  {#if session}
    <div class="session-bar">
      <span class="session-label">session</span>
      <span class="session-value">{session.user_id}</span>
      <span class="session-sep">·</span>
      <span class="session-label">started</span>
      <span class="session-value">{formatTime(session.time_started)}</span>
    </div>
  {/if}

  <!-- ── Action row ── -->
  <div class="action-row">
    <button
      class="extract-btn"
      class:disabled={!canExtract}
      disabled={!canExtract}
      on:click={extractLinks}
    >
      {#if isExtracting}
        <span class="spinner" />
        {#if batchProgress}
          Batch {batchProgress.current} / {batchProgress.total}…
        {:else}
          Extracting…
        {/if}
      {:else}
        ↓ Extract Links from Loaded Files
      {/if}
    </button>

    <span class="file-count">
      {#if readyFiles.length === 0}
        no files loaded — go to Upload tab
      {:else}
        {readyFiles.length} file{readyFiles.length > 1 ? 's' : ''} ready
      {/if}
    </span>
  </div>

  <!-- ── Error ── -->
  {#if error}
    <p class="error-msg">{error}</p>
  {/if}

  <!-- ── Last result summary ── -->
  {#if lastResult}
    {@const totalInserted   = lastResult.filter(r => r?.status === 'success').flatMap(r => r.inserted).length}
    {@const totalDuplicates = lastResult.filter(r => r?.status === 'success').flatMap(r => r.duplicates)}
    {@const failedBatches   = lastResult.map((r, i) => ({ ...r, index: i })).filter(r => r?.status === 'error')}

    <div class="result-summary">
      <span class="result-inserted">✓ {totalInserted} link{totalInserted !== 1 ? 's' : ''} stored</span>

      <span class="result-sep">·</span>

      {#if totalDuplicates.length > 0}
        <button class="duplicates-toggle" on:click={() => duplicatesOpen = !duplicatesOpen}>
          {totalDuplicates.length} duplicate{totalDuplicates.length !== 1 ? 's' : ''} skipped
          <span class="chevron" class:rotated={duplicatesOpen}>›</span>
        </button>
      {:else}
        <span class="result-no-dupes">0 duplicates</span>
      {/if}

      {#if failedBatches.length > 0}
        <span class="result-sep">·</span>
        <span class="result-failed">
          ✕ {failedBatches.length} batch{failedBatches.length !== 1 ? 'es' : ''} failed
        </span>
      {/if}
    </div>

    <!-- Per-batch breakdown -->
    <div class="batch-grid">
      {#each lastResult as result, i}
        <div
          class="batch-pill"
          class:batch-ok={result?.status === 'success'}
          class:batch-err={result?.status === 'error'}
          title={result?.status === 'error' ? result.error : `successfully uploaded ${result?.inserted?.length ?? 0} links`}
        >
          {i + 1}
        </div>
      {/each}
    </div>

    {#if duplicatesOpen && totalDuplicates.length > 0}
      <ul class="duplicates-list">
        {#each totalDuplicates as url}
          <li class="duplicate-item">{url}</li>
        {/each}
      </ul>
    {/if}
  {/if}

  <!-- ── Links table ── -->
  <div class="table-header">
    <span class="table-title">Stored Links</span>
    <span class="table-count">
      {#if isLoadingLinks}
        loading…
      {:else}
        {links.length.toLocaleString()} total
      {/if}
    </span>
    <button class="refresh-btn" on:click={loadLinks} disabled={isLoadingLinks}>↺</button>
  </div>

  {#if links.length > 0}
    <div class="table-wrap">
      <DataTable rows={links} columns={linkColumns} />
    </div>
  {:else if !isLoadingLinks}
    <p class="empty-msg">No links stored yet. Load files and click Extract.</p>
  {/if}

</section>

<style>
  .links-section {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin: 30px;
  }

  /* ── Session bar ── */
  .session-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
    padding: 6px 10px;
    background: var(--bg-panel);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    width: fit-content;
  }
  .session-label { color: var(--text-muted); }
  .session-value { color: var(--text-primary); }
  .session-sep   { color: var(--border-bright); }

  /* ── Action row ── */
  .action-row {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .extract-btn {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 8px 18px;
    background: var(--green);
    color: #0d1117;
    border: none;
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .extract-btn:hover:not(.disabled) { opacity: 0.85; }
  .extract-btn.disabled { opacity: 0.35; cursor: not-allowed; }

  .file-count {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--text-muted);
  }

  /* ── Spinner ── */
  .spinner {
    display: inline-block;
    width: 11px;
    height: 11px;
    border: 2px solid rgba(13,17,23,0.3);
    border-top-color: #0d1117;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Error ── */
  .error-msg {
    margin: 0;
    padding: 8px 12px;
    color: var(--red);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    background: rgba(248,81,73,0.07);
    border: 1px solid rgba(248,81,73,0.2);
    border-radius: var(--radius-md);
  }

  /* ── Result summary ── */
  .result-summary {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    padding: 8px 12px;
    background: var(--bg-panel);
    border: 1px solid var(--green-border);
    border-radius: var(--radius-md);
  }
  .result-inserted  { color: var(--green); }
  .result-sep       { color: var(--text-muted); }
  .result-no-dupes  { color: var(--text-muted); }

  .duplicates-toggle {
    display: flex;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    color: var(--red);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    cursor: pointer;
    padding: 0;
    transition: opacity 0.12s;
  }
  .duplicates-toggle:hover { opacity: 0.75; }

  .chevron {
    font-size: 13px;
    display: inline-block;
    transition: transform 0.18s;
    line-height: 1;
  }
  .chevron.rotated { transform: rotate(90deg); }

  .result-failed { color: var(--red); font-family: var(--font-mono); font-size: var(--font-size-sm); }

  /* ── Batch grid ── */
  .batch-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .batch-pill {
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    font-weight: 600;
    cursor: default;
  }
  .batch-ok  { background: var(--green-glow);          color: var(--green); border: 1px solid var(--green-border); }
  .batch-err { background: rgba(248,81,73,0.1); color: var(--red);   border: 1px solid rgba(248,81,73,0.3); }

  .duplicates-list {
    list-style: none;
    margin: 0;
    padding: 8px 12px;
    background: var(--bg-panel);
    border: 1px solid rgba(248,81,73,0.2);
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 200px;
    overflow-y: auto;
  }

  .duplicate-item {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--text-muted);
    word-break: break-all;
  }

  /* ── Table ── */
  .table-header {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .table-title {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--text-primary);
  }

  .table-count {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--text-muted);
    flex: 1;
  }

  .refresh-btn {
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    font-size: 13px;
    width: 26px;
    height: 26px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.12s, border-color 0.12s;
  }
  .refresh-btn:hover { color: var(--green); border-color: var(--green-border); }

  .table-wrap {
    height: 520px;
    display: flex;
    flex-direction: column;
  }

  .empty-msg {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--text-muted);
  }
</style>
