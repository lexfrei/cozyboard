<script lang="ts">
  import type { PullRequest } from './types'
  import { blockerOf, BLOCKER_META, ciMeta } from './blocker'
  import { relativeAge } from './age'

  interface Props {
    pr: PullRequest
    dim?: boolean
    dimReason?: string
  }

  const { pr, dim = false, dimReason }: Props = $props()

  const blocker = $derived(blockerOf(pr))
  const meta = $derived(BLOCKER_META[blocker])
  const ci = $derived(ciMeta(pr.statusCheckRollup))
  const age = $derived(relativeAge(pr.updatedAt))
</script>

<a
  href={pr.url}
  target="_blank"
  rel="noreferrer noopener"
  class="row-grid border-l-2 border-transparent py-1 pl-2 pr-3 hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-elev)]"
  class:opacity-50={dim}
  title={dim ? dimReason : undefined}
>
  <span
    class="text-center"
    style:color="var({meta.cssVar})"
    title={meta.label}
    aria-label="blocker: {meta.label}">{meta.glyph}</span
  >
  <span
    class="text-center"
    style:color="var({ci.cssVar})"
    title="ci: {ci.label}"
    aria-label="ci: {ci.label}">{ci.glyph}</span
  >
  <span class="text-right text-[var(--color-fg-dim)]">#{pr.number}</span>
  <span class="truncate text-[var(--color-fg-bright)]">{pr.title}</span>
  <span class="truncate text-right text-[var(--color-fg)]">@{pr.author?.login ?? '?'}</span>
  <span class="text-right text-[var(--color-fg-dim)]">{age}</span>
  <span class="text-right text-[var(--color-accent)]">+{pr.additions}</span>
  <span class="text-right text-[var(--color-err)]">−{pr.deletions}</span>

  {#if pr.labels.length > 0}
    <span class="labels flex flex-wrap gap-1 pt-0.5">
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
