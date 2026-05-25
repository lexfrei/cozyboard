<script lang="ts">
  import FilterBar from './lib/FilterBar.svelte'
  import Header from './lib/Header.svelte'
  import LabelFacets from './lib/LabelFacets.svelte'
  import Legend from './lib/Legend.svelte'
  import RepoGroupView from './lib/RepoGroup.svelte'
  import SettingsDrawer from './lib/SettingsDrawer.svelte'
  import Spinner from './lib/Spinner.svelte'
  import Ticker from './lib/Ticker.svelte'
  import { passesFilters, type TriState } from './lib/filters'
  import { fetchViewer } from './lib/github'
  import { deriveLabelFacets } from './lib/labels'
  import { player } from './lib/music'
  import { pulls, refresh, reset, start, stop } from './lib/state/pulls.svelte'
  import {
    setFilters,
    setMusicEnabled,
    setOrgs,
    setToken,
    settings,
  } from './lib/state/settings.svelte'

  let settingsOpen = $state(false)
  let viewer = $state<string | null>(null)

  $effect(() => {
    const token = settings.token
    if (token === null) {
      viewer = null
      return
    }
    const controller = new AbortController()
    void (async () => {
      try {
        const login = await fetchViewer(token, controller.signal)
        viewer = login
        if (settings.orgs.length === 0) setOrgs([login])
      } catch {
        viewer = null
      }
    })()
    return () => {
      controller.abort()
    }
  })

  $effect(() => {
    const token = settings.token
    const orgs = settings.orgs
    if (token === null || orgs.length === 0) {
      reset()
      return
    }
    start(token, [...orgs])
    return () => {
      stop()
    }
  })

  function toggleSettings() {
    settingsOpen = !settingsOpen
  }

  function toggleMusic() {
    const next = !settings.musicEnabled
    // Sync inside the click handler so Safari sees the user gesture.
    if (next) void player.start()
    else player.stop()
    setMusicEnabled(next)
  }
</script>

<div class="crt min-h-screen">
  <Header
    user={viewer}
    orgs={settings.orgs}
    musicEnabled={settings.musicEnabled}
    onToggleSettings={toggleSettings}
    onToggleMusic={toggleMusic}
  />

  <main class="mx-auto max-w-5xl px-4 py-6">
    {#if settings.token === null}
      <pre class="text-[var(--color-fg)]">
&gt; awaiting configuration
&gt; no github token in localStorage
&gt;
&gt; click <span class="text-[var(--color-accent)]">[⚙]</span> in the header to begin
&gt;
&gt; <span class="cursor"></span>
      </pre>
    {:else if settings.orgs.length === 0}
      <div class="border border-[var(--color-warn)] p-3 text-[var(--color-warn)]">
        ▸ no orgs configured — add one in <button
          type="button"
          class="underline hover:text-[var(--color-accent)]"
          onclick={toggleSettings}>settings</button
        >
      </div>
    {:else if pulls.status === 'loading'}
      <div class="flex items-baseline gap-2 text-[var(--color-fg)]">
        <span class="text-[var(--color-fg-dim)]">[</span><Spinner /><span
          class="text-[var(--color-fg-dim)]">]</span
        >
        <span>fetching open prs from {settings.orgs.join(', ')}<span class="cursor"></span></span>
      </div>
    {:else if pulls.status === 'error' && pulls.groups.length === 0}
      <div class="border border-[var(--color-err)] p-3 text-[var(--color-err)]">
        <div class="flex items-baseline justify-between">
          <span class="font-bold">✗ error</span>
          <button
            type="button"
            class="border border-[var(--color-err)] px-2 hover:bg-[var(--color-err)] hover:text-[var(--color-bg)]"
            onclick={refresh}>↻ retry</button
          >
        </div>
        <p class="mt-2">{pulls.lastError ?? 'unknown error'}</p>
      </div>
    {:else}
      {@const filteredGroups = pulls.groups
        .map((g) => ({
          ...g,
          pullRequests: g.pullRequests.filter((pr) => passesFilters(pr, settings.filters, viewer)),
        }))
        .filter((g) => g.pullRequests.length > 0)}
      {@const matched = filteredGroups.reduce((n, g) => n + g.pullRequests.length, 0)}
      <div class="mb-1 flex items-baseline justify-between text-[var(--color-fg-dim)]">
        <span
          >▸ {filteredGroups.length}/{pulls.groups.length} repositories
          <span class="text-[var(--color-border-bright)]">·</span>
          {matched}/{pulls.totalPRs} open PRs</span
        >
        <Ticker lastFetchedAt={pulls.lastFetchedAt} onClick={refresh} />
      </div>

      <FilterBar
        filters={settings.filters}
        {matched}
        total={pulls.totalPRs}
        onChange={setFilters}
      />

      <LabelFacets
        facets={deriveLabelFacets(pulls.groups)}
        states={settings.filters.labels}
        onChange={(labels: Record<string, TriState>) => {
          setFilters({ ...settings.filters, labels })
        }}
      />

      {#each filteredGroups as group (group.nameWithOwner)}
        <RepoGroupView {group} />
      {/each}

      <div class="mt-6">
        <Legend />
      </div>
    {/if}
  </main>

  <SettingsDrawer open={settingsOpen} onClose={toggleSettings} {setToken} {setOrgs} />
</div>
