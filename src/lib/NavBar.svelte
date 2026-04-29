<script>
  import { createEventDispatcher } from 'svelte'

  export let tabs      = []          // [{ id: string, label: string }]
  export let activeTab = null        // id of active tab

  const dispatch = createEventDispatcher()
</script>

<nav class="navbar">
  <div class="navbar-brand">
    <span class="brand-bracket">[</span>macro<span class="brand-accent">_</span>db<span class="brand-bracket">]</span>
  </div>

  {#if tabs.length > 0}
    <div class="tab-strip">
      {#each tabs as tab}
        <button
          class="nav-tab"
          class:active={activeTab === tab.id}
          on:click={() => dispatch('tabChange', tab.id)}
        >{tab.label}</button>
      {/each}
    </div>
  {/if}
</nav>

<style>
  .navbar {
    display: flex;
    align-items: center;
    gap: 32px;
    padding: 0 24px;
    height: 52px;
    border-bottom: 1px solid var(--border);
    background: var(--bg-panel);
    flex-shrink: 0;
  }

  .navbar-brand {
    font-size: 18px;
    font-weight: 700;
    font-family: var(--font-mono);
    letter-spacing: -0.01em;
    line-height: 1;
    white-space: nowrap;
  }

  .brand-bracket { color: var(--text-muted); }
  .brand-accent   { color: var(--green); }

  .tab-strip {
    display: flex;
    align-items: stretch;
    gap: 2px;
    height: 100%;
  }

  .nav-tab {
    display: flex;
    align-items: center;
    padding: 0 16px;
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--text-secondary);
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: color 0.12s, border-color 0.12s;
    white-space: nowrap;
    letter-spacing: 0.03em;
  }

  .nav-tab:hover  { color: var(--text-primary); }
  .nav-tab.active { color: var(--green); border-bottom-color: var(--green); }
</style>
