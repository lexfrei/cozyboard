import { passesLabelFilter } from './labels'
import type { AuthorAssociation, PullRequest } from './types'

export type TriState = null | true | false

export interface Filters {
  readyForReview: TriState
  mine: TriState
  fromMaintainer: TriState
  reviewedByMe: TriState
  requestedFromMe: TriState
  minAgeDays: number | null
  maxAgeDays: number | null
  orgs: Record<string, TriState>
  labels: Record<string, TriState>
}

export const EMPTY_FILTERS: Filters = {
  readyForReview: null,
  mine: null,
  fromMaintainer: null,
  reviewedByMe: null,
  requestedFromMe: null,
  minAgeDays: null,
  maxAgeDays: null,
  orgs: {},
  labels: {},
}

export function cycleTriState(value: TriState): TriState {
  if (value === null) return true
  if (value) return false
  return null
}

const MAINTAINER_SET: ReadonlySet<AuthorAssociation> = new Set<AuthorAssociation>([
  'OWNER',
  'MEMBER',
  'COLLABORATOR',
])

export function isReadyForReview(pr: PullRequest): boolean {
  if (pr.isDraft) return false
  if (pr.mergeable === 'CONFLICTING') return false
  if (pr.statusCheckRollup === 'FAILURE' || pr.statusCheckRollup === 'ERROR') return false
  if (pr.reviewDecision === 'CHANGES_REQUESTED') return false
  return true
}

export function isFromMaintainer(pr: PullRequest): boolean {
  return MAINTAINER_SET.has(pr.authorAssociation)
}

export function isMine(pr: PullRequest, viewer: string | null): boolean {
  if (viewer === null) return false
  return pr.author?.login === viewer
}

export function isReviewedByMe(pr: PullRequest): boolean {
  // PENDING means a draft review the viewer hasn't submitted yet — treat as not reviewed.
  return pr.viewerLatestReviewState !== null && pr.viewerLatestReviewState !== 'PENDING'
}

// For 'my prs' view: the viewer authored the PR, this tells whether the next
// move belongs to the viewer (rebase, fix CI, address review) or is waiting
// on someone else (review, merge).
export function isActionableByAuthor(pr: PullRequest): boolean {
  if (pr.mergeable === 'CONFLICTING') return true
  if (pr.statusCheckRollup === 'FAILURE' || pr.statusCheckRollup === 'ERROR') return true
  if (pr.reviewDecision === 'CHANGES_REQUESTED') return true
  return false
}

export function isRequestedFromMe(pr: PullRequest, viewer: string | null): boolean {
  if (viewer === null) return false
  return pr.reviewRequests.some((r) => r.login === viewer)
}

function ageDays(pr: PullRequest, now: number = Date.now()): number {
  const updated = new Date(pr.updatedAt).getTime()
  return (now - updated) / 86_400_000
}

export function orgOf(pr: PullRequest): string {
  const idx = pr.repository.nameWithOwner.indexOf('/')
  return idx === -1 ? pr.repository.nameWithOwner : pr.repository.nameWithOwner.slice(0, idx)
}

function passesOrgFilter(pr: PullRequest, orgStates: Record<string, TriState>): boolean {
  const org = orgOf(pr)
  let anyInclude = false
  let anyMatchedInclude = false
  for (const [name, state] of Object.entries(orgStates)) {
    if (state === false && name === org) return false
    if (state === true) {
      anyInclude = true
      if (name === org) anyMatchedInclude = true
    }
  }
  if (anyInclude && !anyMatchedInclude) return false
  return true
}

function matchesTriState(state: TriState, predicate: boolean): boolean {
  if (state === null) return true
  return state ? predicate : !predicate
}

export function passesFilters(
  pr: PullRequest,
  filters: Filters,
  viewer: string | null,
  now: number = Date.now(),
): boolean {
  if (!matchesTriState(filters.readyForReview, isReadyForReview(pr))) return false
  if (!matchesTriState(filters.mine, isMine(pr, viewer))) return false
  if (!matchesTriState(filters.fromMaintainer, isFromMaintainer(pr))) return false
  if (!matchesTriState(filters.reviewedByMe, isReviewedByMe(pr))) return false
  if (!matchesTriState(filters.requestedFromMe, isRequestedFromMe(pr, viewer))) return false
  if (!passesOrgFilter(pr, filters.orgs)) return false
  if (filters.minAgeDays !== null || filters.maxAgeDays !== null) {
    const age = ageDays(pr, now)
    if (filters.minAgeDays !== null && age < filters.minAgeDays) return false
    if (filters.maxAgeDays !== null && age > filters.maxAgeDays) return false
  }
  if (!passesLabelFilter(pr, filters.labels)) return false
  return true
}

function anyLabelSet(labels: Record<string, TriState>): boolean {
  for (const value of Object.values(labels)) {
    if (value !== null) return true
  }
  return false
}

export function isFilterActive(filters: Filters): boolean {
  return (
    filters.readyForReview !== null ||
    filters.mine !== null ||
    filters.fromMaintainer !== null ||
    filters.reviewedByMe !== null ||
    filters.requestedFromMe !== null ||
    filters.minAgeDays !== null ||
    filters.maxAgeDays !== null ||
    anyLabelSet(filters.orgs) ||
    anyLabelSet(filters.labels)
  )
}
