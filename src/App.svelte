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
  import { parseShareableState, serializeShareableState } from './lib/share'
  import { POLL_INTERVAL_MS, pulls, refresh, reset, start, stop } from './lib/state/pulls.svelte'
  import {
    setFilters,
    setMusicEnabled,
    setOrgs,
    setToken,
    settings,
    toggleCollapsedRepo,
    togglePinnedRepo,
  } from './lib/state/settings.svelte'

  let settingsOpen = $state(false)
  let viewer = $state<string | null>(null)
  let titleQuery = $state('')

  // One-shot: if the URL carries a share-link, override filters and query.
  const shared = parseShareableState(new URLSearchParams(window.location.search))
  if (shared !== null) {
    setFilters(shared.filters)
    titleQuery = shared.query
  }

  function matchesQuery(title: string, author: string, query: string): boolean {
    const q = query.trim().toLowerCase()
    if (q === '') return true
    const haystack = `${title.toLowerCase()} @${author.toLowerCase()}`
    return q.split(/\s+/).every((word) => haystack.includes(word))
  }

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

  async function shareFilters(): Promise<boolean> {
    const params = serializeShareableState(
      { filters: settings.filters, query: titleQuery },
      settings.orgs,
    )
    const queryString = params.toString()
    const url =
      `${window.location.origin}${window.location.pathname}` +
      (queryString === '' ? '' : `?${queryString}`)
    window.history.replaceState({}, '', url)
    try {
      await navigator.clipboard.writeText(url)
      return true
    } catch {
      return false
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    const target = event.target
    const inEditable = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
    if (event.key === '/' && !inEditable && !event.metaKey && !event.ctrlKey) {
      const input = document.querySelector<HTMLInputElement>('input[type=search]')
      if (input !== null) {
        event.preventDefault()
        input.focus()
        input.select()
      }
      return
    }
    if (event.key === 'Escape' && inEditable) {
      if (target instanceof HTMLInputElement && target.type === 'search') target.value = ''
      ;(target as HTMLElement).blur()
      titleQuery = ''
      return
    }
    if (event.key === 'r' && !inEditable && !event.metaKey && !event.ctrlKey) {
      event.preventDefault()
      refresh()
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

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
      {@const pinnedSet = new Set(settings.pinnedRepos)}
      {@const collapsedSet = new Set(settings.collapsedRepos)}
      {@const filteredGroups = pulls.groups
        .map((g) => ({
          ...g,
          pullRequests: g.pullRequests.filter(
            (pr) =>
              passesFilters(pr, settings.filters, viewer) &&
              matchesQuery(pr.title, pr.author?.login ?? '', titleQuery),
          ),
        }))
        .filter((g) => g.pullRequests.length > 0)
        .sort((a, b) => {
          const ap = pinnedSet.has(a.nameWithOwner) ? 0 : 1
          const bp = pinnedSet.has(b.nameWithOwner) ? 0 : 1
          if (ap !== bp) return ap - bp
          return b.pullRequests.length - a.pullRequests.length
        })}
      {@const matched = filteredGroups.reduce((n, g) => n + g.pullRequests.length, 0)}
      <div class="mb-1 flex items-baseline justify-between text-[var(--color-fg-dim)]">
        <span
          >▸ {filteredGroups.length}/{pulls.groups.length} repositories
          <span class="text-[var(--color-border-bright)]">·</span>
          {matched}/{pulls.totalPRs} open PRs</span
        >
        <Ticker
          lastFetchedAt={pulls.lastFetchedAt}
          refreshing={pulls.refreshing}
          intervalMs={POLL_INTERVAL_MS}
          onClick={refresh}
        />
      </div>

      <input
        type="search"
        value={titleQuery}
        oninput={(e) => {
          const value = e.currentTarget.value
          if (value.toLowerCase() === 'iddqd') {
            e.currentTarget.value = ''
            titleQuery = ''
            // No noopener: we want to focus the new tab so it doesn't stay
            // hidden behind cozyboard. The destination is fixed and trusted.
            const tab = window.open(
              'https://www.youtube.com/watch?v=dQw4w9WgXcQ&autoplay=1',
              '_blank',
            )
            tab?.focus()
            return
          }
          titleQuery = value
        }}
        class="mb-2 w-full border border-[var(--color-border-bright)] bg-[var(--color-bg)] px-2 py-1 text-[var(--color-fg)] focus:border-[var(--color-accent)] focus:outline-none"
        placeholder="/ search title or @author (space = AND)"
        aria-label="search PR titles"
      />

      <FilterBar
        filters={settings.filters}
        orgs={settings.orgs}
        {matched}
        total={pulls.totalPRs}
        onChange={setFilters}
        onShare={shareFilters}
      />

      <LabelFacets
        facets={deriveLabelFacets(pulls.groups)}
        states={settings.filters.labels}
        onChange={(labels: Record<string, TriState>) => {
          setFilters({ ...settings.filters, labels })
        }}
      />

      {#each filteredGroups as group (group.nameWithOwner)}
        <RepoGroupView
          {group}
          pinned={pinnedSet.has(group.nameWithOwner)}
          collapsed={collapsedSet.has(group.nameWithOwner)}
          onTogglePin={() => {
            togglePinnedRepo(group.nameWithOwner)
          }}
          onToggleCollapsed={() => {
            toggleCollapsedRepo(group.nameWithOwner)
          }}
        />
      {/each}

      <div class="mt-6">
        <Legend />
      </div>
    {/if}
  </main>

  <SettingsDrawer open={settingsOpen} onClose={toggleSettings} {setToken} {setOrgs} />
</div>
