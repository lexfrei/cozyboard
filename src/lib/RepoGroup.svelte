<script lang="ts">
  import type { RepoGroup } from './types'
  import PRCard from './PRCard.svelte'
  import PRColumnHeader from './PRColumnHeader.svelte'

  interface Props {
    group: RepoGroup
    pinned: boolean
    onTogglePin: () => void
  }

  const { group, pinned, onTogglePin }: Props = $props()

  let collapsed = $state(false)

  function toggle() {
    collapsed = !collapsed
  }
</script>

<section class="mb-2">
  <div
    class="flex items-baseline gap-2 border-b border-[var(--color-border)] px-2 py-1 hover:bg-[var(--color-bg-elev)]"
  >
    <button
      type="button"
      onclick={toggle}
      class="flex flex-1 items-baseline gap-2 text-left"
    >
      <span class="text-[var(--color-fg-bright)] w-[1ch]">{collapsed ? '▶' : '▼'}</span>
      <span class="text-[var(--color-fg)]">{group.nameWithOwner}</span>
      <span class="text-[var(--color-fg-dim)]"
        >[{group.pullRequests.length.toString().padStart(2, '0')}]</span
      >
    </button>
    <button
      type="button"
      onclick={onTogglePin}
      class="text-[var(--color-fg-dim)] hover:text-[var(--color-accent)]"
      style:color={pinned ? 'var(--color-accent)' : undefined}
      title={pinned ? 'unpin' : 'pin to top'}
      aria-label={pinned ? 'unpin' : 'pin to top'}>{pinned ? '★' : '☆'}</button
    >
  </div>

  {#if !collapsed}
    <div class="pl-2">
      <PRColumnHeader />
      {#each group.pullRequests as pr (pr.id)}
        <PRCard {pr} />
      {/each}
    </div>
  {/if}
</section>
