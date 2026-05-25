<script lang="ts">
  interface Props {
    chars?: string
    intervalMs?: number
  }

  const { chars = '|/—\\', intervalMs = 100 }: Props = $props()

  let frame = $state(0)

  $effect(() => {
    const id = setInterval(() => {
      frame = (frame + 1) % chars.length
    }, intervalMs)
    return () => {
      clearInterval(id)
    }
  })
</script>

<span class="inline-block w-[1ch] text-[var(--color-accent)]" aria-hidden="true"
  >{chars[frame]}</span
>
