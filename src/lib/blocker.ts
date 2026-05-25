import type { BlockerCategory, PullRequest } from './types'

export function blockerOf(pr: PullRequest): BlockerCategory {
  if (pr.mergeable === 'CONFLICTING') return 'conflict'
  if (pr.statusCheckRollup === 'FAILURE') return 'ci-fail'
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
  'awaiting-review': { glyph: '⏳', label: 'awaiting review', cssVar: '--color-fg-dim' },
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
