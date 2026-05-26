import { GitHubError } from '../github'
import { fetchKeys, type KeysResult } from '../keys'

const STORAGE_KEY = 'cozyboard:keys'

export type KeysStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface KeysState {
  query: string
  result: KeysResult | null
  status: KeysStatus
  refreshing: boolean
  lastFetchedAt: number | null
  lastError: string | null
}

interface Persisted {
  query: string
  result: KeysResult | null
  lastFetchedAt: number | null
}

function loadFromStorage(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return { query: '', result: null, lastFetchedAt: null }
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return {
      query: typeof parsed.query === 'string' ? parsed.query : '',
      result:
        typeof parsed.result === 'object' && parsed.result !== null
          ? (parsed.result as KeysResult)
          : null,
      lastFetchedAt: typeof parsed.lastFetchedAt === 'number' ? parsed.lastFetchedAt : null,
    }
  } catch {
    return { query: '', result: null, lastFetchedAt: null }
  }
}

const initial = loadFromStorage()

export const keysStore = $state<KeysState>({
  query: initial.query,
  result: initial.result,
  status: initial.result ? 'ready' : 'idle',
  refreshing: false,
  lastFetchedAt: initial.lastFetchedAt,
  lastError: null,
})

function persist(): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        query: keysStore.query,
        result: keysStore.result,
        lastFetchedAt: keysStore.lastFetchedAt,
      } satisfies Persisted),
    )
  } catch {
    /* non-fatal */
  }
}

let activeController: AbortController | null = null

export async function load(token: string, query: string): Promise<void> {
  const trimmed = query.trim()
  if (trimmed === '') return
  activeController?.abort()
  const controller = new AbortController()
  activeController = controller
  keysStore.query = trimmed
  // Only blank the result when the query actually changed, so re-fetching
  // the same target keeps showing the cached keys while the refresh runs.
  const targetChanged = keysStore.result?.login !== trimmed
  if (targetChanged && keysStore.status !== 'error') {
    keysStore.status = 'loading'
    keysStore.result = null
  }
  keysStore.refreshing = true
  try {
    const result = await fetchKeys(token, trimmed, controller.signal)
    if (controller.signal.aborted) return
    keysStore.result = result
    keysStore.status = 'ready'
    keysStore.lastFetchedAt = Date.now()
    keysStore.lastError = null
    persist()
  } catch (err) {
    if (controller.signal.aborted) return
    keysStore.status = keysStore.result === null ? 'error' : 'ready'
    keysStore.lastError =
      err instanceof GitHubError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'unknown error'
  } finally {
    if (activeController === controller) {
      activeController = null
      keysStore.refreshing = false
    }
  }
}

export function clear(): void {
  activeController?.abort()
  activeController = null
  keysStore.query = ''
  keysStore.result = null
  keysStore.status = 'idle'
  keysStore.refreshing = false
  keysStore.lastError = null
  keysStore.lastFetchedAt = null
  persist()
}
