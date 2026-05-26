<script lang="ts">
  import Spinner from '../lib/Spinner.svelte'
  import { formatAuthorizedKeys, usersWithoutKeys } from '../lib/keys'
  import { keysStore, load, clear } from '../lib/state/keysStore.svelte'
  import { settings } from '../lib/state/settings.svelte'
  import { relativeAge } from '../lib/age'

  let input = $state(keysStore.query)
  let copied = $state(false)
  let copiedTimer: ReturnType<typeof setTimeout> | null = null

  const formatted = $derived(keysStore.result ? formatAuthorizedKeys(keysStore.result) : '')
  const totalKeys = $derived(
    keysStore.result ? keysStore.result.users.reduce((n, u) => n + u.keys.length, 0) : 0,
  )
  const empties = $derived(keysStore.result ? usersWithoutKeys(keysStore.result) : [])

  function submit(event: SubmitEvent) {
    event.preventDefault()
    const token = settings.token
    if (token === null) return
    void load(token, input.trim())
  }

  async function copyAll() {
    if (formatted === '') return
    try {
      await navigator.clipboard.writeText(formatted)
      copied = true
      if (copiedTimer !== null) clearTimeout(copiedTimer)
      copiedTimer = setTimeout(() => {
        copied = false
      }, 1500)
    } catch {
      /* clipboard blocked */
    }
  }

  function pickSuggestion(s: string) {
    input = s
    const token = settings.token
    if (token === null) return
    void load(token, s)
  }
</script>

<section class="mb-4">
  <form onsubmit={submit} class="flex items-baseline gap-2 text-[12px]">
    <span class="text-[var(--color-fg-dim)]">▸ owner</span>
    <input
      type="text"
      bind:value={input}
      placeholder="username or org"
      spellcheck="false"
      autocomplete="off"
      class="flex-1 border border-[var(--color-border-bright)] bg-[var(--color-bg)] px-2 py-1 text-[var(--color-fg)] focus:border-[var(--color-accent)] focus:outline-none"
      aria-label="github username or organization"
    />
    <button
      type="submit"
      class="border border-[var(--color-accent)] bg-[var(--color-accent)] px-3 py-1 font-bold text-[var(--color-bg)] hover:bg-[var(--color-fg-bright)]"
      disabled={settings.token === null || input.trim() === ''}>fetch</button
    >
    {#if keysStore.query !== ''}
      <button
        type="button"
        onclick={clear}
        class="text-[var(--color-fg-dim)] hover:text-[var(--color-err)]">clear</button
      >
    {/if}
  </form>

  {#if settings.orgs.length > 0 || true}
    <div class="mt-1 flex flex-wrap items-baseline gap-2 text-[11px] text-[var(--color-fg-dim)]">
      <span>quick:</span>
      {#each settings.orgs as o (o)}
        <button
          type="button"
          onclick={() => {
            pickSuggestion(o)
          }}
          class="hover:text-[var(--color-accent)]">{o}</button
        >
      {/each}
    </div>
  {/if}
</section>

{#if keysStore.status === 'loading'}
  <div class="flex items-baseline gap-2 text-[var(--color-fg)]">
    <span class="text-[var(--color-fg-dim)]">[</span><Spinner /><span
      class="text-[var(--color-fg-dim)]">]</span
    >
    <span>fetching keys for {keysStore.query}<span class="cursor"></span></span>
  </div>
{:else if keysStore.status === 'error' && keysStore.result === null}
  <div class="border border-[var(--color-err)] p-3 text-[var(--color-err)]">
    <span class="font-bold">✗ error</span>
    <p class="mt-1">{keysStore.lastError ?? 'unknown error'}</p>
  </div>
{:else if keysStore.result}
  <div class="mb-1 flex items-baseline justify-between text-[var(--color-fg-dim)] text-[12px]">
    <span>
      ▸ {keysStore.result.kind}
      <span class="text-[var(--color-accent)]">{keysStore.result.login}</span>
      <span class="text-[var(--color-border-bright)]">·</span>
      {keysStore.result.users.length} user{keysStore.result.users.length === 1 ? '' : 's'}
      <span class="text-[var(--color-border-bright)]">·</span>
      {totalKeys} key{totalKeys === 1 ? '' : 's'}
      {#if keysStore.lastFetchedAt !== null}
        <span class="text-[var(--color-border-bright)]">·</span>
        cached {relativeAge(new Date(keysStore.lastFetchedAt).toISOString())} ago
      {/if}
    </span>
    <button
      type="button"
      onclick={() => {
        void copyAll()
      }}
      class="border border-[var(--color-border-bright)] px-2 py-0.5 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
      style:color={copied ? 'var(--color-accent)' : undefined}
      disabled={formatted === ''}
    >
      {copied ? '✓ copied' : '⧉ copy all'}
    </button>
  </div>

  {#if formatted === ''}
    {@const r = keysStore.result}
    <div class="text-[var(--color-fg-dim)]">
      {#if r.kind === 'user'}
        no public keys for <span class="text-[var(--color-accent)]">@{r.login}</span>
      {:else if r.users.length === 0}
        no visible members in org <span class="text-[var(--color-accent)]">{r.login}</span>
        — try a token with <span class="text-[var(--color-info)]">read:org</span> if you're a member
      {:else}
        no public keys for any of the {r.users.length} visible member{r.users.length === 1
          ? ''
          : 's'} in org <span class="text-[var(--color-accent)]">{r.login}</span>
      {/if}
    </div>
  {:else}
    <pre
      class="overflow-x-auto whitespace-pre border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-2 text-[11px] text-[var(--color-fg)]">{formatted}</pre>
    {#if empties.length > 0}
      <p class="mt-2 text-[11px] text-[var(--color-fg-dim)]">
        ▸ no keys ({empties.length}):
        <span class="text-[var(--color-fg)]">{empties.join(', ')}</span>
      </p>
    {/if}
  {/if}
{:else}
  <div class="text-[12px] text-[var(--color-fg-dim)]">
    enter a github username or org above to dump all visible public ssh keys.
    <br />for a user → just their keys. for an org → all visible members' keys.
    membership visibility depends on your token (private members need
    <span class="text-[var(--color-info)]">read:org</span> + being a member yourself).
  </div>
{/if}
