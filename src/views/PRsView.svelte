<script lang="ts">
  import FilterBar from '../lib/FilterBar.svelte'
  import LabelFacets from '../lib/LabelFacets.svelte'
  import Legend from '../lib/Legend.svelte'
  import RepoGroupView from '../lib/RepoGroup.svelte'
  import Spinner from '../lib/Spinner.svelte'
  import Ticker from '../lib/Ticker.svelte'
  import { isActionableByAuthor, passesFilters, type TriState } from '../lib/filters'
  import { deriveLabelFacets } from '../lib/labels'
  import type { PullRequest } from '../lib/types'
  import {
    POLL_INTERVAL_MS,
    pullsMine,
    refresh,
    reset,
    start,
    stop,
  } from '../lib/state/pullsMine.svelte'
  import {
    setPrsFilters,
    settings,
    toggleCollapsedRepo,
    togglePinnedRepo,
  } from '../lib/state/settings.svelte'

  interface Props {
    viewer: string | null
  }

  const { viewer }: Props = $props()

  let titleQuery = $state('')

  function matchesQuery(title: string, author: string, query: string): boolean {
    const q = query.trim().toLowerCase()
    if (q === '') return true
    const haystack = `${title.toLowerCase()} @${author.toLowerCase()}`
    return q.split(/\s+/).every((word) => haystack.includes(word))
  }

  $effect(() => {
    const token = settings.token
    const v = viewer
    if (token === null || v === null) {
      reset()
      return
    }
    start(token, v)
    return () => {
      stop()
    }
  })

  async function shareFilters(): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(window.location.href)
      return true
    } catch {
      return false
    }
  }

  const orgsInData = $derived(
    [
      ...new Set(
        pullsMine.groups.map((g) => {
          const idx = g.nameWithOwner.indexOf('/')
          return idx === -1 ? g.nameWithOwner : g.nameWithOwner.slice(0, idx)
        }),
      ),
    ].sort(),
  )
</script>

{#if viewer === null}
  <div class="border border-[var(--color-fg-dim)] p-3 text-[var(--color-fg-dim)]">
    ▸ waiting for viewer identity…
  </div>
{:else if pullsMine.status === 'loading'}
  <div class="flex items-baseline gap-2 text-[var(--color-fg)]">
    <span class="text-[var(--color-fg-dim)]">[</span><Spinner /><span
      class="text-[var(--color-fg-dim)]">]</span
    >
    <span>fetching open prs by @{viewer}<span class="cursor"></span></span>
  </div>
{:else if pullsMine.status === 'error' && pullsMine.groups.length === 0}
  <div class="border border-[var(--color-err)] p-3 text-[var(--color-err)]">
    <div class="flex items-baseline justify-between">
      <span class="font-bold">✗ error</span>
      <button
        type="button"
        class="border border-[var(--color-err)] px-2 hover:bg-[var(--color-err)] hover:text-[var(--color-bg)]"
        onclick={refresh}>↻ retry</button
      >
    </div>
    <p class="mt-2">{pullsMine.lastError ?? 'unknown error'}</p>
  </div>
{:else}
  {@const pinnedSet = new Set(settings.pinnedRepos)}
  {@const collapsedSet = new Set(settings.collapsedRepos)}
  {@const filteredGroups = pullsMine.groups
    .map((g) => ({
      ...g,
      pullRequests: g.pullRequests.filter(
        (pr) =>
          passesFilters(pr, settings.prsFilters, viewer) &&
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
      >▸ {filteredGroups.length}/{pullsMine.groups.length} repositories
      <span class="text-[var(--color-border-bright)]">·</span>
      {matched}/{pullsMine.totalPRs} open PRs by <span class="text-[var(--color-accent)]"
        >@{viewer}</span
      ></span
    >
    <Ticker
      lastFetchedAt={pullsMine.lastFetchedAt}
      refreshing={pullsMine.refreshing}
      intervalMs={POLL_INTERVAL_MS}
      onClick={refresh}
    />
  </div>

  <input
    type="search"
    bind:value={titleQuery}
    class="mb-2 w-full border border-[var(--color-border-bright)] bg-[var(--color-bg)] px-2 py-1 text-[var(--color-fg)] focus:border-[var(--color-accent)] focus:outline-none"
    placeholder="/ search title (space = AND)"
    aria-label="search PR titles"
  />

  <FilterBar
    filters={settings.prsFilters}
    orgs={orgsInData}
    {matched}
    total={pullsMine.totalPRs}
    onChange={setPrsFilters}
    onShare={shareFilters}
  />

  <LabelFacets
    facets={deriveLabelFacets(pullsMine.groups)}
    states={settings.prsFilters.labels}
    onChange={(labels: Record<string, TriState>) => {
      setPrsFilters({ ...settings.prsFilters, labels })
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
      dimFor={(pr: PullRequest) => {
        const actionable = isActionableByAuthor(pr)
        return {
          dim: !actionable,
          reason: actionable ? undefined : 'waiting on others — not actionable',
        }
      }}
    />
  {/each}

  <div class="mt-6">
    <Legend />
  </div>
{/if}
