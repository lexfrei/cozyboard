<script lang="ts">
  import type { Settings } from './storage'

  interface Props {
    open: boolean
    settings: Settings
    onClose: () => void
    onSave: (next: Settings) => void
  }

  const { open, settings, onClose, onSave }: Props = $props()

  let token = $state('')
  let org = $state('')

  $effect(() => {
    if (open) {
      token = settings.token ?? ''
      org = settings.org
    }
  })

  function commit(event: SubmitEvent) {
    event.preventDefault()
    onSave({ ...settings, token: token.trim() === '' ? null : token.trim(), org: org.trim() })
    onClose()
  }

  function clearToken() {
    token = ''
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
      <label class="flex flex-col gap-1">
        <span class="text-[var(--color-fg-dim)]">▸ github org</span>
        <input
          type="text"
          bind:value={org}
          class="border border-[var(--color-border-bright)] bg-[var(--color-bg)] px-2 py-1 text-[var(--color-fg)] focus:border-[var(--color-accent)] focus:outline-none"
          spellcheck="false"
          autocomplete="off"
        />
      </label>

      <label class="flex flex-col gap-1">
        <span class="text-[var(--color-fg-dim)]"
          >▸ github token <span class="text-[var(--color-info)]"
            >[fine-grained PAT, read:org + repo]</span
          ></span
        >
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
          >stored in localStorage only · device-flow auth coming later</span
        >
      </label>

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
