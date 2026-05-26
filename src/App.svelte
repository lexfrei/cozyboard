<script lang="ts">
  import Header from './lib/Header.svelte'
  import SettingsDrawer from './lib/SettingsDrawer.svelte'
  import TabNav from './lib/TabNav.svelte'
  import { fetchViewer } from './lib/github'
  import { player } from './lib/music'
  import { hashForTab, tabFromHash, type Tab } from './lib/tabs'
  import { refresh } from './lib/state/pulls.svelte'
  import {
    setMusicEnabled,
    setOrgs,
    setToken,
    settings,
  } from './lib/state/settings.svelte'
  import OrgsView from './views/OrgsView.svelte'
  import PRsView from './views/PRsView.svelte'
  import KeysView from './views/KeysView.svelte'

  let settingsOpen = $state(false)
  let viewer = $state<string | null>(null)
  let activeTab = $state<Tab>(tabFromHash(window.location.hash))

  $effect(() => {
    function syncFromHash() {
      activeTab = tabFromHash(window.location.hash)
    }
    window.addEventListener('hashchange', syncFromHash)
    return () => {
      window.removeEventListener('hashchange', syncFromHash)
    }
  })

  function switchTab(tab: Tab) {
    const hash = hashForTab(tab)
    if (hash === '' && window.location.hash !== '') {
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}${window.location.search}`,
      )
    } else if (hash !== '' && window.location.hash !== hash) {
      window.location.hash = hash
    }
    activeTab = tab
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

  {#if settings.token === null}
    <main class="mx-auto max-w-5xl px-4 py-6">
      <pre
        class="whitespace-pre-wrap text-[var(--color-fg)]"
      >&gt; awaiting configuration
&gt; no github token in localStorage
&gt;
&gt; click <span class="text-[var(--color-accent)]">[⚙]</span> in the header to begin
&gt;
&gt;
&gt; <span class="text-[var(--color-fg-bright)]">[why is a login required?]</span>
&gt; github's graphql api refuses anonymous queries — even for fully public
&gt; repos. without a token cozyboard literally cannot fetch anything.
&gt;
&gt; <span class="text-[var(--color-fg-bright)]">[is the login safe?]</span>
&gt; <span class="text-[var(--color-accent)]">yes — your token stays in your browser.</span> it's written to
&gt; localStorage and sent with every fetch to api.github.com directly,
&gt; over https, from this page. the cozyboard server never stores it
&gt; and never logs it.
&gt;
&gt; the only moment the server even handles the token is the oauth device
&gt; flow exchange: github's /login/oauth/access_token endpoint doesn't
&gt; return CORS headers, so the browser can't call it directly. cozyboard
&gt; proxies that single request transparently and forgets the result the
&gt; instant the response leaves the server.
&gt;
&gt; <span class="text-[var(--color-fg-bright)]">[trust nobody?]</span>
&gt; 1. fork <a href="https://github.com/lexfrei/cozyboard" target="_blank" rel="noopener noreferrer" class="text-[var(--color-info)] underline">github.com/lexfrei/cozyboard</a>
&gt; 2. read <span class="text-[var(--color-info)]">src/</span> and <span class="text-[var(--color-info)]">server.ts</span> — a small typescript codebase
&gt; 3. deploy your own with the <span class="text-[var(--color-info)]">Containerfile</span> at the repo root
&gt; 4. profit
&gt;
&gt; alternatively: open <span class="text-[var(--color-accent)]">[⚙]</span> → ▶ manual token (advanced), paste a
&gt; fine-grained PAT, and the device-flow server proxy is bypassed
&gt; entirely — the token goes straight from your clipboard to
&gt; localStorage to api.github.com, no third party in the middle.
&gt;
&gt; <span class="cursor"></span></pre>
    </main>
  {:else}
    <TabNav active={activeTab} onChange={switchTab} />

    <main class="mx-auto max-w-5xl px-4 py-6">
      {#if activeTab === 'orgs'}
        <OrgsView {viewer} onOpenSettings={toggleSettings} />
      {:else if activeTab === 'prs'}
        <PRsView {viewer} />
      {:else if activeTab === 'keys'}
        <KeysView />
      {/if}
    </main>
  {/if}

  <SettingsDrawer open={settingsOpen} onClose={toggleSettings} {setToken} {setOrgs} />
</div>
