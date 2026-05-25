<script lang="ts">
  import { cycleTriState, type TriState } from './filters'
  import { UNNAMESPACED, type LabelFacet } from './labels'

  interface Props {
    facets: LabelFacet[]
    states: Record<string, TriState>
    onChange: (next: Record<string, TriState>) => void
  }

  const { facets, states, onChange }: Props = $props()

  let expanded = $state(false)

  function activeCount(): number {
    let n = 0
    for (const value of Object.values(states)) if (value !== null) n++
    return n
  }

  function toggle(name: string) {
    const cycled = cycleTriState(states[name] ?? null)
    const next: Record<string, TriState> = {}
    for (const [key, value] of Object.entries(states)) {
      if (key !== name && value !== null) next[key] = value
    }
    if (cycled !== null) next[name] = cycled
    onChange(next)
  }

  function clearAll() {
    onChange({})
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

  function shortName(name: string, namespace: string): string {
    if (namespace === UNNAMESPACED) return name
    return name.slice(namespace.length + 1)
  }
</script>

{#if facets.length > 0}
  <section class="mb-2 text-[12px]">
    <div class="flex items-baseline gap-2">
      <button
        type="button"
        onclick={() => {
          expanded = !expanded
        }}
        class="flex items-baseline gap-2 text-[var(--color-fg-dim)] hover:text-[var(--color-fg)]"
      >
        <span class="w-[1ch] text-[var(--color-fg-bright)]">{expanded ? '▼' : '▶'}</span>
        <span>labels</span>
      </button>
      {#if activeCount() > 0}
        <span class="text-[var(--color-accent)]">[{activeCount()} active]</span>
        <button
          type="button"
          onclick={clearAll}
          class="text-[var(--color-fg-dim)] hover:text-[var(--color-err)]">clear</button
        >
      {/if}
    </div>

    {#if expanded}
      <div class="mt-1 flex flex-col gap-1 pl-3">
        {#each facets as facet (facet.namespace)}
          <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span class="min-w-[8ch] text-[var(--color-fg-dim)]"
              >{facet.namespace === UNNAMESPACED ? '·' : facet.namespace}:</span
            >
            {#each facet.labels as label (label.name)}
              {@const state = states[label.name] ?? null}
              <button
                type="button"
                onclick={() => {
                  toggle(label.name)
                }}
                class="border px-1 text-[11px] hover:border-[var(--color-accent)]"
                style:color="var({colorVar(state)})"
                style:border-color="var({colorVar(state)})"
                title={label.name}
              >
                <span class="font-bold">{glyph(state)}</span>
                <span class="ml-1" style:color="#{label.color}"
                  >{shortName(label.name, facet.namespace)}</span
                >
              </button>
            {/each}
          </div>
        {/each}
      </div>
    {/if}
  </section>
{/if}
