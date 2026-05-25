<script lang="ts">
  // Column labels aligned to .row-grid in PRCard. Font-size on the container
  // must match PRCard's so the ch-based grid track widths agree.
  const CELL = 'text-[11px] uppercase tracking-wider'
</script>

<div
  class="row-grid border-l-2 border-b border-transparent border-b-[var(--color-border-bright)] py-1 pl-2 pr-3 text-[var(--color-fg-dim)]"
>
  <span class="{CELL} text-center" title="blocker">BLK</span>
  <span class="{CELL} text-center" title="ci">CI</span>
  <span class="{CELL} text-right">#</span>
  <span class={CELL}>TITLE</span>
  <span class="{CELL} text-right">AUTHOR</span>
  <span class="{CELL} text-right">AGE</span>
  <span class="{CELL} text-right" style:grid-column="span 2">DIFF</span>
</div>
