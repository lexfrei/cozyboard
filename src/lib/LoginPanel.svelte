<script lang="ts">
  import Spinner from './Spinner.svelte'
  import { requestDeviceCode, pollForToken, type DeviceCode } from './oauth'

  interface Props {
    onAuthenticated: (token: string) => void
  }

  const { onAuthenticated }: Props = $props()

  type Phase =
    | { kind: 'idle' }
    | { kind: 'requesting' }
    | { kind: 'awaiting'; code: DeviceCode }
    | { kind: 'error'; message: string }

  let phase = $state<Phase>({ kind: 'idle' })
  let copied = $state(false)
  let controller: AbortController | null = null
  let copiedResetTimer: ReturnType<typeof setTimeout> | null = null

  function sleep(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const id = setTimeout(resolve, ms)
      signal.addEventListener('abort', () => {
        clearTimeout(id)
        reject(new DOMException('aborted', 'AbortError'))
      })
    })
  }

  async function poll(code: DeviceCode, signal: AbortSignal): Promise<void> {
    const deadline = Date.now() + code.expires_in * 1000
    let intervalSec = code.interval
    while (Date.now() < deadline) {
      await sleep(intervalSec * 1000, signal)
      const result = await pollForToken(code.device_code)
      switch (result.kind) {
        case 'success':
          onAuthenticated(result.token)
          phase = { kind: 'idle' }
          return
        case 'denied':
          phase = { kind: 'error', message: 'access denied by user' }
          return
        case 'expired':
          phase = { kind: 'error', message: 'device code expired' }
          return
        case 'error':
          phase = { kind: 'error', message: result.message }
          return
        case 'slow_down':
          intervalSec += 5
          break
        case 'pending':
          break
      }
    }
    phase = { kind: 'error', message: 'device code expired before authorization' }
  }

  async function start() {
    controller?.abort()
    controller = new AbortController()
    const signal = controller.signal
    phase = { kind: 'requesting' }
    try {
      const code = await requestDeviceCode()
      if (signal.aborted) return
      phase = { kind: 'awaiting', code }
      await poll(code, signal)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      phase = { kind: 'error', message: err instanceof Error ? err.message : 'unknown error' }
    }
  }

  function cancel() {
    controller?.abort()
    controller = null
    phase = { kind: 'idle' }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      copied = true
      if (copiedResetTimer !== null) clearTimeout(copiedResetTimer)
      copiedResetTimer = setTimeout(() => {
        copied = false
      }, 1500)
    } catch {
      /* clipboard blocked — user can read it on screen */
    }
  }
</script>

<div class="flex flex-col gap-2">
  {#if phase.kind === 'idle'}
    <button
      type="button"
      onclick={start}
      class="border border-[var(--color-accent)] bg-[var(--color-accent)] px-3 py-1 font-bold text-[var(--color-bg)] hover:bg-[var(--color-fg-bright)]"
      >▣ login with github</button
    >
  {:else if phase.kind === 'requesting'}
    <div class="flex items-baseline gap-2 text-[var(--color-fg)]">
      <Spinner /><span>requesting device code…</span>
    </div>
  {:else if phase.kind === 'awaiting'}
    {@const code = phase.code}
    <div class="border border-[var(--color-accent)] p-3">
      <div class="text-[var(--color-fg-dim)]">▸ open in browser:</div>
      <a
        href={code.verification_uri}
        target="_blank"
        rel="noopener noreferrer"
        class="text-[var(--color-info)] underline">{code.verification_uri}</a
      >
      <div class="mt-3 text-[var(--color-fg-dim)]">▸ enter this code:</div>
      <div class="mt-1 flex items-center gap-3">
        <button
          type="button"
          onclick={() => {
            void copyCode(code.user_code)
          }}
          class="text-2xl font-bold tracking-[0.3em] text-[var(--color-accent)] hover:text-[var(--color-fg-bright)]"
          title="click to copy">{code.user_code}</button
        >
        <button
          type="button"
          onclick={() => {
            void copyCode(code.user_code)
          }}
          class="border border-[var(--color-border-bright)] px-2 py-1 text-[var(--color-fg)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          title="copy code"
          aria-label="copy code"
        >
          {copied ? '✓ copied' : '⧉ copy'}
        </button>
      </div>
      <div class="mt-3 flex items-baseline gap-2 text-[var(--color-fg)]">
        <span class="text-[var(--color-fg-dim)]">[</span><Spinner /><span
          class="text-[var(--color-fg-dim)]">]</span
        >
        <span>waiting for authorization<span class="cursor"></span></span>
      </div>
      <button
        type="button"
        onclick={cancel}
        class="mt-2 text-[var(--color-fg-dim)] hover:text-[var(--color-err)]">cancel</button
      >
    </div>
  {:else if phase.kind === 'error'}
    <div class="border border-[var(--color-err)] p-2 text-[var(--color-err)]">
      <div class="flex items-baseline justify-between">
        <span>✗ {phase.message}</span>
        <button
          type="button"
          onclick={start}
          class="text-[var(--color-fg)] hover:text-[var(--color-accent)]">↻ retry</button
        >
      </div>
    </div>
  {/if}
</div>
