<script lang="ts">
  import Spinner from './Spinner.svelte'

  interface Props {
    lastFetchedAt: number | null
    refreshing: boolean
    intervalMs: number
    onClick: () => void
  }

  const { lastFetchedAt, refreshing, intervalMs, onClick }: Props = $props()

  let now = $state(Date.now())

  $effect(() => {
    const id = setInterval(() => {
      now = Date.now()
    }, 1000)
    return () => {
      clearInterval(id)
    }
  })

  const secondsRemaining = $derived(
    lastFetchedAt === null
      ? null
      : Math.max(0, Math.ceil((lastFetchedAt + intervalMs - now) / 1000)),
  )

  const colorVar = $derived.by(() => {
    if (refreshing) return '--color-accent'
    if (secondsRemaining === null) return '--color-fg-dim'
    if (secondsRemaining === 0) return '--color-warn'
    if (secondsRemaining < 10) return '--color-fg-bright'
    return '--color-fg-dim'
  })
</script>

<button
  type="button"
  onclick={onClick}
  class="text-[11px] tabular-nums hover:text-[var(--color-accent)]"
  style:color="var({colorVar})"
  title="click to refresh now"
  aria-label="refresh"
>
  {#if refreshing}
    <Spinner />
  {:else if secondsRemaining === null}
    ↻ —
  {:else}
    ↻ {secondsRemaining}s
  {/if}
</button>
