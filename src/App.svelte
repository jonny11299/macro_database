<script>
  import NavBar    from './lib/NavBar.svelte'
  import UploadTab from './lib/UploadTab.svelte'

  const NAV_TABS = [{ id: 'upload', label: 'Upload' }]
  let activeNav  = 'upload'
</script>

<div class="layout">
  <NavBar tabs={NAV_TABS} activeTab={activeNav} on:tabChange={e => activeNav = e.detail} />

  <main class="main">
    {#if activeNav === 'upload'}
      <UploadTab />
    {/if}
  </main>
</div>

<style>
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
</style>
