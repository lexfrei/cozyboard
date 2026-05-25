<script lang="ts">
  interface Props {
    lastFetchedAt: number | null
    onClick: () => void
  }

  const { lastFetchedAt, onClick }: Props = $props()

  let now = $state(Date.now())

  $effect(() => {
    const id = setInterval(() => {
      now = Date.now()
    }, 1000)
    return () => {
      clearInterval(id)
    }
  })

  const ageSec = $derived(
    lastFetchedAt === null ? null : Math.max(0, Math.floor((now - lastFetchedAt) / 1000)),
  )

  const colorVar = $derived.by(() => {
    if (ageSec === null) return '--color-fg-dim'
    if (ageSec < 60) return '--color-fg-dim'
    if (ageSec < 180) return '--color-warn'
    return '--color-err'
  })

  function format(sec: number | null): string {
    if (sec === null) return '—'
    if (sec < 60) return `${sec.toString()}s`
    const m = Math.floor(sec / 60)
    if (m < 60) return `${m.toString()}m${(sec % 60).toString().padStart(2, '0')}s`
    const h = Math.floor(m / 60)
    return `${h.toString()}h${(m % 60).toString().padStart(2, '0')}m`
  }
</script>

<button
  type="button"
  onclick={onClick}
  class="text-[11px] tabular-nums hover:text-[var(--color-accent)]"
  style:color="var({colorVar})"
  title="click to refresh now"
  aria-label="refresh — last fetch {format(ageSec)} ago"
>
  ↻ {format(ageSec)}
</button>
