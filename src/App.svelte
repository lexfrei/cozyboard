<script lang="ts">
  import Header from './lib/Header.svelte'
  import Legend from './lib/Legend.svelte'
  import PRColumnHeader from './lib/PRColumnHeader.svelte'
  import RepoGroupView from './lib/RepoGroup.svelte'
  import Spinner from './lib/Spinner.svelte'
  import SettingsDrawer from './lib/SettingsDrawer.svelte'
  import { loadSettings, saveSettings, type Settings } from './lib/storage'
  import { fetchOpenPRs, GitHubError } from './lib/github'
  import type { RepoGroup } from './lib/types'

  type Status =
    | { kind: 'awaiting-config' }
    | { kind: 'loading'; message: string }
    | { kind: 'ready'; groups: RepoGroup[]; totalPRs: number; fetchedAt: number }
    | { kind: 'error'; message: string }

  let settings = $state<Settings>(loadSettings())
  let settingsOpen = $state(false)
  let status = $state<Status>({ kind: 'awaiting-config' })
  let reloadTick = $state(0)

  $effect(() => {
    const token = settings.token
    const org = settings.org
    // Force re-run on reload button click.
    void reloadTick
    if (token === null) {
      status = { kind: 'awaiting-config' }
      return
    }
    status = { kind: 'loading', message: `fetching open prs from org:${org}` }
    const controller = new AbortController()
    void (async () => {
      try {
        const groups = await fetchOpenPRs(token, org, controller.signal)
        const totalPRs = groups.reduce((n, g) => n + g.pullRequests.length, 0)
        status = { kind: 'ready', groups, totalPRs, fetchedAt: Date.now() }
      } catch (err) {
        if (controller.signal.aborted) return
        const message =
          err instanceof GitHubError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'unknown error'
        status = { kind: 'error', message }
      }
    })()
    return () => {
      controller.abort()
    }
  })

  function toggleSettings() {
    settingsOpen = !settingsOpen
  }

  function toggleMusic() {
    settings = { ...settings, musicEnabled: !settings.musicEnabled }
    saveSettings(settings)
  }

  function applySettings(next: Settings) {
    settings = next
    saveSettings(next)
  }

  function reload() {
    reloadTick++
  }
</script>

<div class="crt min-h-screen">
  <Header
    user={settings.token === null ? null : 'authenticated'}
    org={settings.org}
    musicEnabled={settings.musicEnabled}
    onToggleSettings={toggleSettings}
    onToggleMusic={toggleMusic}
  />

  <main class="mx-auto max-w-5xl px-4 py-6">
    {#if status.kind === 'awaiting-config'}
      <pre class="text-[var(--color-fg)]">
&gt; awaiting configuration
&gt; no github token in localStorage
&gt;
&gt; click <span class="text-[var(--color-accent)]">[⚙]</span> in the header to begin
&gt;
&gt; <span class="cursor"></span>
      </pre>
    {:else if status.kind === 'loading'}
      <div class="flex items-baseline gap-2 text-[var(--color-fg)]">
        <span class="text-[var(--color-fg-dim)]">[</span><Spinner /><span
          class="text-[var(--color-fg-dim)]">]</span
        >
        <span>{status.message}<span class="cursor"></span></span>
      </div>
    {:else if status.kind === 'error'}
      <div class="border border-[var(--color-err)] p-3 text-[var(--color-err)]">
        <div class="flex items-baseline justify-between">
          <span class="font-bold">✗ error</span>
          <button
            type="button"
            class="border border-[var(--color-err)] px-2 hover:bg-[var(--color-err)] hover:text-[var(--color-bg)]"
            onclick={reload}>↻ retry</button
          >
        </div>
        <p class="mt-2">{status.message}</p>
      </div>
    {:else if status.kind === 'ready'}
      {@const groups = status.groups}
      {@const totalPRs = status.totalPRs}
      <div class="mb-4 flex items-baseline justify-between text-[var(--color-fg-dim)]">
        <span
          >▸ {groups.length} repositories
          <span class="text-[var(--color-border-bright)]">·</span>
          {totalPRs} open PRs</span
        >
        <button
          type="button"
          onclick={reload}
          class="text-[11px] text-[var(--color-fg-dim)] hover:text-[var(--color-accent)]"
          title="reload"
          aria-label="reload">↻ reload</button
        >
      </div>

      <PRColumnHeader />

      {#each groups as group (group.nameWithOwner)}
        <RepoGroupView {group} />
      {/each}

      <div class="mt-6">
        <Legend />
      </div>
    {/if}
  </main>

  <SettingsDrawer open={settingsOpen} {settings} onClose={toggleSettings} onSave={applySettings} />
</div>
