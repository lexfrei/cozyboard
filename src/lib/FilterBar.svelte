<script lang="ts">
  import { cycleTriState, EMPTY_FILTERS, type Filters, type TriState } from './filters'

  interface Props {
    filters: Filters
    matched: number
    total: number
    onChange: (next: Filters) => void
  }

  const { filters, matched, total, onChange }: Props = $props()

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

  type ToggleKey = 'readyForReview' | 'mine' | 'fromMaintainer'

  function toggle(key: ToggleKey) {
    onChange({ ...filters, [key]: cycleTriState(filters[key]) })
  }

  function updateMaxAge(event: Event) {
    const value = (event.currentTarget as HTMLInputElement).value
    const n = value === '' ? null : Number(value)
    const cleaned = n !== null && Number.isFinite(n) && n > 0 ? n : null
    onChange({ ...filters, maxAgeDays: cleaned })
  }

  function reset() {
    onChange({ ...EMPTY_FILTERS })
  }
</script>

<section
  class="my-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-[var(--color-border)] py-2 text-[12px]"
>
  <span class="text-[var(--color-fg-dim)]">▸ filter</span>

  {#each [{ key: 'readyForReview' as const, label: 'ready' }, { key: 'mine' as const, label: 'mine' }, { key: 'fromMaintainer' as const, label: 'maintainer' }] as chip (chip.key)}
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

  <label class="flex items-baseline gap-1 text-[var(--color-fg-dim)]">
    <span>age ≤</span>
    <input
      type="number"
      min="1"
      value={filters.maxAgeDays ?? ''}
      oninput={updateMaxAge}
      class="w-14 border border-[var(--color-border-bright)] bg-[var(--color-bg)] px-1 py-0 text-right text-[var(--color-fg)] focus:border-[var(--color-accent)] focus:outline-none"
      placeholder="∞"
    />
    <span>d</span>
  </label>

  <span class="ml-auto text-[var(--color-fg-dim)]">
    <span class="text-[var(--color-fg)]">{matched}</span>/<span>{total}</span> shown
  </span>

  <button
    type="button"
    onclick={reset}
    class="text-[var(--color-fg-dim)] hover:text-[var(--color-fg)]">reset</button
  >
</section>
