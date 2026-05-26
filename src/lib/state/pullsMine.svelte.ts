import { fetchMyOpenPRs, GitHubError } from '../github'
import type { RepoGroup } from '../types'

export const POLL_INTERVAL_MS = 300_000 // 5 minutes — author-feed changes slowly

export type PullsStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface PullsState {
  groups: RepoGroup[]
  totalPRs: number
  status: PullsStatus
  refreshing: boolean
  lastFetchedAt: number | null
  lastError: string | null
}

export const pullsMine = $state<PullsState>({
  groups: [],
  totalPRs: 0,
  status: 'idle',
  refreshing: false,
  lastFetchedAt: null,
  lastError: null,
})

let pollTimer: ReturnType<typeof setInterval> | null = null
let activeController: AbortController | null = null
let currentToken: string | null = null
let currentViewer: string | null = null

async function fetchAndStore(): Promise<void> {
  if (currentToken === null || currentViewer === null) return
  activeController?.abort()
  const controller = new AbortController()
  activeController = controller
  if (pullsMine.groups.length === 0 && pullsMine.status !== 'error') {
    pullsMine.status = 'loading'
  }
  pullsMine.refreshing = true
  try {
    const groups = await fetchMyOpenPRs(currentToken, currentViewer, controller.signal)
    if (controller.signal.aborted) return
    pullsMine.groups = groups
    pullsMine.totalPRs = groups.reduce((n, g) => n + g.pullRequests.length, 0)
    pullsMine.status = 'ready'
    pullsMine.lastFetchedAt = Date.now()
    pullsMine.lastError = null
  } catch (err) {
    if (controller.signal.aborted) return
    const message =
      err instanceof GitHubError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'unknown error'
    pullsMine.status = pullsMine.groups.length === 0 ? 'error' : 'ready'
    pullsMine.lastError = message
  } finally {
    if (activeController === controller) {
      activeController = null
      pullsMine.refreshing = false
    }
  }
}

function onVisibilityChange(): void {
  if (document.hidden) return
  void fetchAndStore()
}

function tick(): void {
  if (document.hidden) return
  void fetchAndStore()
}

export function start(token: string, viewer: string): void {
  const sameTarget = token === currentToken && viewer === currentViewer
  stop()
  currentToken = token
  currentViewer = viewer
  if (!sameTarget) {
    pullsMine.groups = []
    pullsMine.totalPRs = 0
    pullsMine.status = 'idle'
    pullsMine.refreshing = false
    pullsMine.lastError = null
    pullsMine.lastFetchedAt = null
  }
  void fetchAndStore()
  pollTimer = setInterval(tick, POLL_INTERVAL_MS)
  document.addEventListener('visibilitychange', onVisibilityChange)
}

export function stop(): void {
  if (pollTimer !== null) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  activeController?.abort()
  activeController = null
  document.removeEventListener('visibilitychange', onVisibilityChange)
}

export function refresh(): void {
  void fetchAndStore()
}

export function reset(): void {
  stop()
  currentToken = null
  currentViewer = null
  pullsMine.groups = []
  pullsMine.totalPRs = 0
  pullsMine.status = 'idle'
  pullsMine.refreshing = false
  pullsMine.lastError = null
  pullsMine.lastFetchedAt = null
}
