<script lang="ts">
  interface Props {
    viewer: string | null
  }

  const { viewer }: Props = $props()
</script>

<div class="border border-[var(--color-fg-dim)] p-3 text-[var(--color-fg-dim)]">
  ▸ my prs — <span class="text-[var(--color-fg)]">coming soon</span>
  {#if viewer}
    <p class="mt-1 text-[11px]">
      will show open prs authored by <span class="text-[var(--color-accent)]">@{viewer}</span>
      across all of github, with the same filter bar (org filter optional).
    </p>
  {/if}
</div>
