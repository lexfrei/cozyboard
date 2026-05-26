<script lang="ts">
  import type { Tab } from './tabs'

  interface Props {
    active: Tab
    onChange: (tab: Tab) => void
  }

  const { active, onChange }: Props = $props()

  const TABS: { id: Tab; label: string }[] = [
    { id: 'orgs', label: 'my orgs' },
    { id: 'prs', label: 'my prs' },
    { id: 'keys', label: 'keys' },
  ]
</script>

<nav
  class="flex items-baseline gap-3 border-b border-[var(--color-border-bright)] bg-[var(--color-bg-elev)] px-4 py-1 text-[12px]"
>
  {#each TABS as tab, i (tab.id)}
    {#if i > 0}
      <span class="text-[var(--color-border-bright)]">|</span>
    {/if}
    <button
      type="button"
      onclick={() => {
        onChange(tab.id)
      }}
      class="hover:text-[var(--color-accent)]"
      style:color={active === tab.id
        ? 'var(--color-fg-bright)'
        : 'var(--color-fg-dim)'}
    >
      {active === tab.id ? `[${tab.label}]` : tab.label}
    </button>
  {/each}
</nav>
