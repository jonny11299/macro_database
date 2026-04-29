<script>
  import { createEventDispatcher } from 'svelte'

  const dispatch = createEventDispatcher()

  export let file = null     // currently selected File
  export let error = ''      // error message to show

  let dragOver = false
  let inputEl

  const ACCEPTED = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ]

  function isValidFile(f) {
    if (!f) return false
    const ext = f.name.split('.').pop().toLowerCase()
    return ext === 'xls' || ext === 'xlsx'
  }

  function select(f) {
    if (!f) return
    if (!isValidFile(f)) {
      error = `"${f.name}" is not an .xls or .xlsx file.`
      return
    }
    error = ''
    file = f
    dispatch('fileSelected', { file })
  }

  function onDrop(e) {
    dragOver = false
    const f = e.dataTransfer?.files?.[0]
    select(f)
  }

  function onInputChange(e) {
    select(e.target.files?.[0])
    // reset so same file can be re-selected
    e.target.value = ''
  }

  function onDragOver(e) {
    e.preventDefault()
    dragOver = true
  }

  function clearFile() {
    file = null
    error = ''
    dispatch('cleared')
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="dropzone"
  class:drag-over={dragOver}
  class:has-file={!!file}
  on:dragover={onDragOver}
  on:dragleave={() => dragOver = false}
  on:drop|preventDefault={onDrop}
  on:click={() => !file && inputEl.click()}
  role="button"
  tabindex="0"
  aria-label="File upload drop zone"
  on:keydown={e => e.key === 'Enter' && !file && inputEl.click()}
>
  <input
    bind:this={inputEl}
    type="file"
    accept=".xls,.xlsx"
    style="display:none"
    on:change={onInputChange}
  />

  {#if file}
    <div class="file-info">
      <span class="file-icon">⊞</span>
      <span class="file-name">{file.name}</span>
      <span class="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
      <button
        class="clear-btn"
        on:click|stopPropagation={clearFile}
        title="Remove file"
        aria-label="Remove file"
      >✕</button>
    </div>
  {:else}
    <div class="prompt">
      <div class="upload-icon">↑</div>
      <p class="primary-text">Drag &amp; drop an .xls or .xlsx file here</p>
      <p class="secondary-text">or <span class="browse-link">click to browse</span></p>
    </div>
  {/if}
</div>

{#if error}
  <p class="error-msg">{error}</p>
{/if}

<style>
  .dropzone {
    border: 2px dashed var(--border-bright);
    border-radius: var(--radius-lg);
    background: var(--bg-panel);
    padding: 40px 32px;
    text-align: center;
    cursor: pointer;
    transition:
      border-color 0.18s,
      background   0.18s;
    user-select: none;
  }

  .dropzone:hover,
  .dropzone:focus-visible {
    border-color: var(--green-border);
    background: var(--green-glow);
  }

  .dropzone.drag-over {
    border-color: var(--green);
    background: var(--green-dim);
  }

  .dropzone.has-file {
    cursor: default;
    border-color: var(--green-border);
    background: var(--green-glow);
    padding: 20px 32px;
  }

  /* ── Empty state ── */
  .prompt { display: flex; flex-direction: column; align-items: center; gap: 6px; }

  .upload-icon {
    font-size: 32px;
    line-height: 1;
    color: var(--green);
    margin-bottom: 8px;
    font-family: var(--font-mono);
  }

  .primary-text {
    margin: 0;
    color: var(--text-primary);
    font-size: var(--font-size-base);
    font-weight: 600;
  }

  .secondary-text {
    margin: 0;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  .browse-link {
    color: var(--green);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  /* ── File selected state ── */
  .file-info {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .file-icon {
    font-size: 18px;
    color: var(--green);
  }

  .file-name {
    color: var(--text-primary);
    font-weight: 600;
    font-size: var(--font-size-base);
    word-break: break-all;
  }

  .file-size {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }

  .clear-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    padding: 0;
    background: none;
    border: 1px solid var(--border-bright);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-family: var(--font-mono);
    font-size: 11px;
    cursor: pointer;
    transition: color 0.12s, border-color 0.12s, background 0.12s;
    flex-shrink: 0;
  }

  .clear-btn:hover {
    color: var(--red);
    border-color: var(--red);
    background: rgba(248, 81, 73, 0.08);
  }

  /* ── Error ── */
  .error-msg {
    margin: 8px 0 0;
    color: var(--red);
    font-size: var(--font-size-sm);
    text-align: center;
  }
</style>
