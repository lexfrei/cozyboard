<script lang="ts">
  import { BLOCKER_META, BLOCKER_ORDER, CI_META } from './blocker'

  const CI_ORDER: (keyof typeof CI_META)[] = [
    'NONE',
    'EXPECTED',
    'PENDING',
    'SUCCESS',
    'FAILURE',
    'ERROR',
  ]

  let collapsed = $state(false)

  function toggle() {
    collapsed = !collapsed
  }
</script>

<section
  class="mb-4 border border-[var(--color-border)] bg-[var(--color-bg-elev)] text-[12px]"
>
  <button
    type="button"
    onclick={toggle}
    class="flex w-full items-baseline gap-2 px-2 py-1 text-left text-[var(--color-fg-dim)] hover:text-[var(--color-fg)]"
  >
    <span class="w-[1ch] text-[var(--color-fg-bright)]">{collapsed ? '▶' : '▼'}</span>
    <span>legend</span>
  </button>

  {#if !collapsed}
    <div class="grid gap-y-1 px-3 py-2 sm:grid-cols-[6ch_1fr]">
      <span class="text-[var(--color-fg-dim)]">BLK·</span>
      <span class="flex flex-wrap gap-x-3 gap-y-1">
        {#each BLOCKER_ORDER as key (key)}
          {@const m = BLOCKER_META[key]}
          <span class="whitespace-nowrap">
            <span style:color="var({m.cssVar})">{m.glyph}</span>
            <span class="text-[var(--color-fg-dim)]">{m.label}</span>
          </span>
        {/each}
      </span>

      <span class="text-[var(--color-fg-dim)]">CI·</span>
      <span class="flex flex-wrap gap-x-3 gap-y-1">
        {#each CI_ORDER as key (key)}
          {@const m = CI_META[key]}
          <span class="whitespace-nowrap">
            <span style:color="var({m.cssVar})">{m.glyph}</span>
            <span class="text-[var(--color-fg-dim)]">{m.label}</span>
          </span>
        {/each}
      </span>
    </div>
  {/if}
</section>
