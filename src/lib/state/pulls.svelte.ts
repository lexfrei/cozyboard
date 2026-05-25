import { fetchOpenPRs, GitHubError } from '../github'
import type { RepoGroup } from '../types'

const POLL_INTERVAL_MS = 60_000

export type PullsStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface PullsState {
  groups: RepoGroup[]
  totalPRs: number
  status: PullsStatus
  lastFetchedAt: number | null
  lastError: string | null
}

export const pulls = $state<PullsState>({
  groups: [],
  totalPRs: 0,
  status: 'idle',
  lastFetchedAt: null,
  lastError: null,
})

let pollTimer: ReturnType<typeof setInterval> | null = null
let activeController: AbortController | null = null
let currentToken: string | null = null
let currentOrgs: string[] = []

function orgsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

async function fetchAndStore(): Promise<void> {
  if (currentToken === null || currentOrgs.length === 0) return
  activeController?.abort()
  const controller = new AbortController()
  activeController = controller
  // Only show the big loading state on the very first fetch — subsequent
  // background refreshes keep the old data visible.
  if (pulls.groups.length === 0 && pulls.status !== 'error') {
    pulls.status = 'loading'
  }
  try {
    const groups = await fetchOpenPRs(currentToken, currentOrgs, controller.signal)
    if (controller.signal.aborted) return
    pulls.groups = groups
    pulls.totalPRs = groups.reduce((n, g) => n + g.pullRequests.length, 0)
    pulls.status = 'ready'
    pulls.lastFetchedAt = Date.now()
    pulls.lastError = null
  } catch (err) {
    if (controller.signal.aborted) return
    const message =
      err instanceof GitHubError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'unknown error'
    // Keep existing groups visible if we already had data; only blank out
    // when there's nothing to show.
    pulls.status = pulls.groups.length === 0 ? 'error' : 'ready'
    pulls.lastError = message
  } finally {
    if (activeController === controller) activeController = null
  }
}

function onVisibilityChange(): void {
  if (document.hidden) return
  // Tab is back in focus — refetch immediately, then resume the regular interval.
  void fetchAndStore()
}

function tick(): void {
  if (document.hidden) return
  void fetchAndStore()
}

export function start(token: string, orgs: string[]): void {
  const sameTarget = token === currentToken && orgsEqual(orgs, currentOrgs)
  stop()
  currentToken = token
  currentOrgs = [...orgs]
  if (!sameTarget) {
    pulls.groups = []
    pulls.totalPRs = 0
    pulls.status = 'idle'
    pulls.lastError = null
    pulls.lastFetchedAt = null
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
  currentOrgs = []
  pulls.groups = []
  pulls.totalPRs = 0
  pulls.status = 'idle'
  pulls.lastError = null
  pulls.lastFetchedAt = null
}
