<script lang="ts">
  interface Props {
    user?: string | null
    org: string
    musicEnabled: boolean
    onToggleSettings: () => void
    onToggleMusic: () => void
  }

  const { user, org, musicEnabled, onToggleSettings, onToggleMusic }: Props = $props()
</script>

<header
  class="flex items-baseline justify-between border-b border-[var(--color-border-bright)] bg-[var(--color-bg-elev)] px-4 py-2"
>
  <div class="flex items-baseline gap-4">
    <span class="text-[var(--color-fg-bright)] font-bold tracking-widest">▣ COZYBOARD</span>
    <span class="text-[var(--color-fg-dim)]">v0.1</span>
    <span class="text-[var(--color-fg-dim)]">·</span>
    <span class="text-[var(--color-fg)]"
      >org:<span class="text-[var(--color-info)]">{org}</span></span
    >
  </div>

  <div class="flex items-baseline gap-3">
    {#if user}
      <span class="text-[var(--color-fg-dim)]"
        >@<span class="text-[var(--color-fg)]">{user}</span></span
      >
    {:else}
      <span class="text-[var(--color-fg-dim)]">[anon]</span>
    {/if}

    <button
      type="button"
      class="border border-[var(--color-border-bright)] px-2 py-0.5 text-[var(--color-fg)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
      onclick={onToggleMusic}
      aria-label={musicEnabled ? 'pause music' : 'play music'}
      title={musicEnabled ? 'pause music' : 'play music'}
    >
      {musicEnabled ? '⏸' : '▶'}
    </button>

    <button
      type="button"
      class="border border-[var(--color-border-bright)] px-2 py-0.5 text-[var(--color-fg)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
      onclick={onToggleSettings}
      aria-label="settings"
      title="settings"
    >
      ⚙
    </button>
  </div>
</header>
