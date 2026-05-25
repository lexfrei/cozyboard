import type { BlockerCategory, CheckStatus, PullRequest } from './types'

export function blockerOf(pr: PullRequest): BlockerCategory {
  if (pr.mergeable === 'CONFLICTING') return 'conflict'
  if (pr.statusCheckRollup === 'FAILURE' || pr.statusCheckRollup === 'ERROR') return 'ci-fail'
  if (pr.reviewDecision === 'CHANGES_REQUESTED') return 'changes-requested'
  if (pr.reviewDecision === 'APPROVED') return 'approved'
  if (pr.reviewRequests.length === 0 && pr.reviewDecision === null) return 'no-reviewers'
  return 'awaiting-review'
}

export const BLOCKER_META: Record<
  BlockerCategory,
  { glyph: string; label: string; cssVar: string }
> = {
  conflict: { glyph: '⚠', label: 'conflict', cssVar: '--color-err' },
  'ci-fail': { glyph: '✗', label: 'ci failing', cssVar: '--color-err' },
  'changes-requested': { glyph: '✎', label: 'changes requested', cssVar: '--color-warn' },
  'no-reviewers': { glyph: '◯', label: 'no reviewers', cssVar: '--color-info' },
  'awaiting-review': { glyph: '⊙', label: 'awaiting review', cssVar: '--color-fg-dim' },
  approved: { glyph: '✓', label: 'approved', cssVar: '--color-accent' },
}

export const BLOCKER_ORDER: BlockerCategory[] = [
  'conflict',
  'ci-fail',
  'changes-requested',
  'no-reviewers',
  'awaiting-review',
  'approved',
]

export const CI_META: Record<
  Exclude<CheckStatus, null> | 'NONE',
  { glyph: string; label: string; cssVar: string }
> = {
  NONE: { glyph: '−', label: 'no ci', cssVar: '--color-border-bright' },
  EXPECTED: { glyph: '⋯', label: 'queued', cssVar: '--color-fg-dim' },
  PENDING: { glyph: '◐', label: 'running', cssVar: '--color-warn' },
  SUCCESS: { glyph: '✓', label: 'passing', cssVar: '--color-accent' },
  FAILURE: { glyph: '✗', label: 'failing', cssVar: '--color-err' },
  ERROR: { glyph: '‼', label: 'errored', cssVar: '--color-err' },
}

export function ciMeta(status: CheckStatus): (typeof CI_META)[keyof typeof CI_META] {
  return CI_META[status ?? 'NONE']
}
