<script lang="ts">
  import type { Settings } from './storage'
  import LoginPanel from './LoginPanel.svelte'

  interface Props {
    open: boolean
    settings: Settings
    onClose: () => void
    onSave: (next: Settings) => void
  }

  const { open, settings, onClose, onSave }: Props = $props()

  let token = $state('')
  let orgs = $state<string[]>([])
  let manualOpen = $state(false)

  $effect(() => {
    if (open) {
      token = settings.token ?? ''
      orgs = settings.orgs.length === 0 ? [''] : [...settings.orgs]
      manualOpen = false
    }
  })

  function commit(event: SubmitEvent) {
    event.preventDefault()
    persist()
    onClose()
  }

  function persist() {
    const cleaned = orgs.map((o) => o.trim()).filter((o) => o.length > 0)
    onSave({
      ...settings,
      token: token.trim() === '' ? null : token.trim(),
      orgs: cleaned,
    })
  }

  function applyDeviceFlowToken(next: string) {
    token = next
    persist()
    onClose()
  }

  function clearToken() {
    token = ''
  }

  function addOrg() {
    orgs = [...orgs, '']
  }

  function removeOrg(index: number) {
    orgs = orgs.filter((_, i) => i !== index)
    if (orgs.length === 0) orgs = ['']
  }

  function updateOrg(index: number, value: string) {
    orgs = orgs.map((o, i) => (i === index ? value : o))
  }
</script>

{#if open}
  <button
    type="button"
    aria-label="close settings"
    class="fixed inset-0 z-[200] cursor-default bg-black/70"
    onclick={onClose}
  ></button>

  <aside
    class="fixed right-0 top-0 z-[201] flex h-full w-full max-w-md flex-col border-l border-[var(--color-border-bright)] bg-[var(--color-bg-elev)] p-4"
  >
    <div
      class="mb-4 flex items-baseline justify-between border-b border-[var(--color-border)] pb-2"
    >
      <span class="text-[var(--color-fg-bright)] font-bold">⚙ SETTINGS</span>
      <button
        type="button"
        class="text-[var(--color-fg)] hover:text-[var(--color-err)]"
        onclick={onClose}
        aria-label="close">✗</button
      >
    </div>

    <form onsubmit={commit} class="flex flex-1 flex-col gap-4">
      <section class="flex flex-col gap-1">
        <span class="text-[var(--color-fg-dim)]">▸ authentication</span>
        {#if settings.token}
          <div
            class="flex items-baseline justify-between border border-[var(--color-fg-dim)] px-2 py-1"
          >
            <span class="text-[var(--color-accent)]">✓ logged in</span>
            <button
              type="button"
              onclick={() => {
                token = ''
                persist()
              }}
              class="text-[var(--color-fg-dim)] hover:text-[var(--color-err)]">log out</button
            >
          </div>
        {:else}
          <LoginPanel onAuthenticated={applyDeviceFlowToken} />
        {/if}
      </section>

      <fieldset class="flex flex-col gap-1">
        <legend class="text-[var(--color-fg-dim)]">▸ github orgs</legend>
        {#each orgs as org, i (i)}
          <div class="flex gap-1">
            <input
              type="text"
              value={org}
              oninput={(e) => {
                updateOrg(i, e.currentTarget.value)
              }}
              class="flex-1 border border-[var(--color-border-bright)] bg-[var(--color-bg)] px-2 py-1 text-[var(--color-fg)] focus:border-[var(--color-accent)] focus:outline-none"
              spellcheck="false"
              autocomplete="off"
              placeholder="cozystack"
            />
            <button
              type="button"
              onclick={() => {
                removeOrg(i)
              }}
              class="border border-[var(--color-border-bright)] px-2 text-[var(--color-fg)] hover:border-[var(--color-err)] hover:text-[var(--color-err)]"
              aria-label="remove org">✗</button
            >
          </div>
        {/each}
        <button
          type="button"
          onclick={addOrg}
          class="self-start border border-[var(--color-border-bright)] px-2 py-0.5 text-[var(--color-fg-dim)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >+ add org</button
        >
      </fieldset>

      <section class="flex flex-col gap-1">
        <button
          type="button"
          onclick={() => {
            manualOpen = !manualOpen
          }}
          class="self-start text-[var(--color-fg-dim)] hover:text-[var(--color-fg)]"
        >
          {manualOpen ? '▼' : '▶'} manual token (advanced)
        </button>
        {#if manualOpen}
          <div class="flex gap-1">
            <input
              type="password"
              bind:value={token}
              class="flex-1 border border-[var(--color-border-bright)] bg-[var(--color-bg)] px-2 py-1 text-[var(--color-fg)] focus:border-[var(--color-accent)] focus:outline-none"
              spellcheck="false"
              autocomplete="off"
              placeholder="github_pat_..."
            />
            <button
              type="button"
              onclick={clearToken}
              class="border border-[var(--color-border-bright)] px-2 text-[var(--color-fg)] hover:border-[var(--color-err)] hover:text-[var(--color-err)]"
              aria-label="clear token">✗</button
            >
          </div>
          <span class="text-[var(--color-fg-dim)] text-[11px]"
            >fine-grained PAT with read:org + repo · stored in localStorage</span
          >
        {/if}
      </section>

      <div class="mt-auto flex justify-end gap-2 border-t border-[var(--color-border)] pt-3">
        <button
          type="button"
          onclick={onClose}
          class="border border-[var(--color-border-bright)] px-3 py-1 text-[var(--color-fg-dim)] hover:text-[var(--color-fg)]"
          >cancel</button
        >
        <button
          type="submit"
          class="border border-[var(--color-accent)] bg-[var(--color-accent)] px-3 py-1 font-bold text-[var(--color-bg)] hover:bg-[var(--color-fg-bright)]"
          >▣ save</button
        >
      </div>
    </form>
  </aside>
{/if}
