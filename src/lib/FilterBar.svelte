<script lang="ts">
  import { cycleTriState, EMPTY_FILTERS, type Filters, type TriState } from './filters'

  interface Props {
    filters: Filters
    matched: number
    total: number
    onChange: (next: Filters) => void
    onShare: () => Promise<boolean> | boolean
  }

  const { filters, matched, total, onChange, onShare }: Props = $props()

  let shared = $state(false)
  let sharedTimer: ReturnType<typeof setTimeout> | null = null

  async function handleShare() {
    const ok = await onShare()
    if (!ok) return
    shared = true
    if (sharedTimer !== null) clearTimeout(sharedTimer)
    sharedTimer = setTimeout(() => {
      shared = false
    }, 1500)
  }

  function glyph(state: TriState): string {
    if (state === true) return '✓'
    if (state === false) return '✗'
    return '?'
  }

  function colorVar(state: TriState): string {
    if (state === true) return '--color-accent'
    if (state === false) return '--color-err'
    return '--color-fg-dim'
  }

  type ToggleKey =
    | 'readyForReview'
    | 'mine'
    | 'fromMaintainer'
    | 'reviewedByMe'
    | 'requestedFromMe'

  function toggle(key: ToggleKey) {
    onChange({ ...filters, [key]: cycleTriState(filters[key]) })
  }

  function parseAge(raw: string): number | null {
    if (raw === '') return null
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? n : null
  }

  function updateMinAge(event: Event) {
    onChange({ ...filters, minAgeDays: parseAge((event.currentTarget as HTMLInputElement).value) })
  }

  function updateMaxAge(event: Event) {
    onChange({ ...filters, maxAgeDays: parseAge((event.currentTarget as HTMLInputElement).value) })
  }

  function reset() {
    onChange({ ...EMPTY_FILTERS })
  }
</script>

<section
  class="my-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-[var(--color-border)] py-2 text-[12px]"
>
  <span class="text-[var(--color-fg-dim)]">▸ filter</span>

  {#each [{ key: 'readyForReview' as const, label: 'ready' }, { key: 'mine' as const, label: 'mine' }, { key: 'fromMaintainer' as const, label: 'maintainer' }, { key: 'requestedFromMe' as const, label: 'requested' }, { key: 'reviewedByMe' as const, label: 'reviewed' }] as chip (chip.key)}
    {@const state = filters[chip.key]}
    <button
      type="button"
      onclick={() => {
        toggle(chip.key)
      }}
      class="border px-2 py-0.5 hover:border-[var(--color-accent)]"
      style:color="var({colorVar(state)})"
      style:border-color="var({colorVar(state)})"
      title="cycle: unset → include → exclude"
    >
      <span class="font-bold">{glyph(state)}</span>
      <span class="ml-1 text-[var(--color-fg-dim)]">{chip.label}</span>
    </button>
  {/each}

  <div
    class="flex items-baseline gap-1 border border-[var(--color-border-bright)] px-2 py-0.5 text-[var(--color-fg-dim)] focus-within:border-[var(--color-accent)]"
  >
    <input
      type="number"
      min="1"
      value={filters.minAgeDays ?? ''}
      oninput={updateMinAge}
      class="w-10 bg-transparent text-right text-[var(--color-fg)] focus:outline-none"
      placeholder="0"
      aria-label="min age in days"
    />
    <span>d ≤ age ≤</span>
    <input
      type="number"
      min="1"
      value={filters.maxAgeDays ?? ''}
      oninput={updateMaxAge}
      class="w-10 bg-transparent text-right text-[var(--color-fg)] focus:outline-none"
      placeholder="∞"
      aria-label="max age in days"
    />
    <span>d</span>
  </div>

  <span class="ml-auto text-[var(--color-fg-dim)]">
    <span class="text-[var(--color-fg)]">{matched}</span>/<span>{total}</span> shown
  </span>

  <button
    type="button"
    onclick={() => {
      void handleShare()
    }}
    class="text-[var(--color-fg-dim)] hover:text-[var(--color-accent)]"
    style:color={shared ? 'var(--color-accent)' : undefined}
    title="copy a link to this filter set">{shared ? '✓ copied' : '⧉ share'}</button
  >
  <button
    type="button"
    onclick={reset}
    class="text-[var(--color-fg-dim)] hover:text-[var(--color-fg)]">reset</button
  >
</section>
