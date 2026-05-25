<script lang="ts">
  import type { PullRequest } from './types'
  import { blockerOf, BLOCKER_META } from './blocker'
  import { relativeAge } from './age'

  interface Props {
    pr: PullRequest
  }

  const { pr }: Props = $props()

  const blocker = $derived(blockerOf(pr))
  const meta = $derived(BLOCKER_META[blocker])
  const age = $derived(relativeAge(pr.updatedAt))
</script>

<a
  href={pr.url}
  target="_blank"
  rel="noreferrer noopener"
  class="grid grid-cols-[2ch_6ch_1fr_auto] items-baseline gap-x-3 border-l-2 border-transparent py-1 pl-2 pr-3 hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-elev)]"
>
  <span
    class="text-center"
    style:color="var({meta.cssVar})"
    title={meta.label}
    aria-label={meta.label}>{meta.glyph}</span
  >
  <span class="text-[var(--color-fg-dim)]">#{pr.number}</span>
  <span class="truncate text-[var(--color-fg-bright)]">{pr.title}</span>
  <span class="text-[var(--color-fg-dim)] text-right whitespace-nowrap">
    @{pr.author?.login ?? '?'}
    <span class="text-[var(--color-border-bright)]">·</span>
    {age}
    <span class="text-[var(--color-border-bright)]">·</span>
    <span class="text-[var(--color-accent)]">+{pr.additions}</span>
    <span class="text-[var(--color-err)]">−{pr.deletions}</span>
  </span>

  {#if pr.labels.length > 0}
    <span class="col-span-4 col-start-3 flex flex-wrap gap-1 pt-0.5">
      {#each pr.labels as label (label.name)}
        <span
          class="border px-1 text-[10px]"
          style:color="#{label.color}"
          style:border-color="#{label.color}40"
        >
          {label.name}
        </span>
      {/each}
    </span>
  {/if}
</a>
