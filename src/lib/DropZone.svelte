<script>
  import { createEventDispatcher } from 'svelte'

  const dispatch = createEventDispatcher()

  let dragOver = false
  let inputEl
  let errorMsg = ''

  function isValidFile(f) {
    const ext = f.name.split('.').pop().toLowerCase()
    return ext === 'xls' || ext === 'xlsx'
  }

  function handleFiles(fileList) {
    const all    = Array.from(fileList)
    const valid  = all.filter(isValidFile)
    const bad    = all.filter(f => !isValidFile(f))

    if (bad.length > 0) {
      errorMsg = `Skipped ${bad.length} unsupported file${bad.length > 1 ? 's' : ''}: ${bad.map(f => f.name).join(', ')}`
    } else {
      errorMsg = ''
    }

    if (valid.length > 0) {
      dispatch('filesAdded', { files: valid })
    }
  }

  function onDrop(e) {
    dragOver = false
    handleFiles(e.dataTransfer?.files ?? [])
  }

  function onInputChange(e) {
    handleFiles(e.target.files ?? [])
    e.target.value = ''   // reset so same file can be re-added
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="dropzone"
  class:drag-over={dragOver}
  role="button"
  tabindex="0"
  aria-label="File upload drop zone"
  on:dragover|preventDefault={() => dragOver = true}
  on:dragleave={() => dragOver = false}
  on:drop|preventDefault={onDrop}
  on:click={() => inputEl.click()}
  on:keydown={e => e.key === 'Enter' && inputEl.click()}
>
  <input
    bind:this={inputEl}
    type="file"
    accept=".xls,.xlsx"
    multiple
    style="display:none"
    on:change={onInputChange}
  />

  <div class="prompt">
    <div class="upload-icon">↑</div>
    <p class="primary-text">Drag &amp; drop .xls / .xlsx files here</p>
    <p class="secondary-text">or <span class="browse-link">click to browse</span> — multiple files supported</p>
  </div>
</div>

{#if errorMsg}
  <p class="error-msg">{errorMsg}</p>
{/if}

<style>
  .dropzone {
    border: 2px dashed var(--border-bright);
    border-radius: var(--radius-lg);
    background: var(--bg-panel);
    padding: 28px 32px;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.18s, background 0.18s;
    user-select: none;
  }

  .dropzone:hover,
  .dropzone:focus-visible { border-color: var(--green-border); background: var(--green-glow); }
  .dropzone.drag-over     { border-color: var(--green);        background: var(--green-dim);  }

  .prompt { display: flex; flex-direction: column; align-items: center; gap: 5px; }

  .upload-icon {
    font-size: 28px;
    line-height: 1;
    color: var(--green);
    margin-bottom: 6px;
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

  .error-msg {
    margin: 8px 0 0;
    color: var(--red);
    font-size: var(--font-size-sm);
    text-align: center;
    font-family: var(--font-mono);
  }
</style>
