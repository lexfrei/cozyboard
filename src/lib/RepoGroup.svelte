<script lang="ts">
  import type { RepoGroup } from './types'
  import PRCard from './PRCard.svelte'
  import PRColumnHeader from './PRColumnHeader.svelte'

  interface Props {
    group: RepoGroup
  }

  const { group }: Props = $props()

  let collapsed = $state(false)

  function toggle() {
    collapsed = !collapsed
  }
</script>

<section class="mb-2">
  <button
    type="button"
    onclick={toggle}
    class="flex w-full items-baseline gap-2 border-b border-[var(--color-border)] px-2 py-1 text-left hover:bg-[var(--color-bg-elev)]"
  >
    <span class="text-[var(--color-fg-bright)] w-[1ch]">{collapsed ? '▶' : '▼'}</span>
    <span class="text-[var(--color-fg)]">{group.nameWithOwner}</span>
    <span class="text-[var(--color-fg-dim)]"
      >[{group.pullRequests.length.toString().padStart(2, '0')}]</span
    >
  </button>

  {#if !collapsed}
    <div class="pl-2">
      <PRColumnHeader />
      {#each group.pullRequests as pr (pr.id)}
        <PRCard {pr} />
      {/each}
    </div>
  {/if}
</section>
