import { describe, it, expect } from 'bun:test'
import { blockerOf } from './blocker'
import type { PullRequest } from './types'

function pr(overrides: Partial<PullRequest> = {}): PullRequest {
  return {
    id: 'X',
    number: 1,
    title: 't',
    url: 'u',
    author: { login: 'a' },
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
    isDraft: false,
    additions: 0,
    deletions: 0,
    changedFiles: 0,
    labels: [],
    repository: { name: 'r', nameWithOwner: 'o/r' },
    reviewDecision: null,
    mergeable: 'MERGEABLE',
    statusCheckRollup: null,
    reviewRequests: [],
    ...overrides,
  }
}

describe('blockerOf', () => {
  it('conflict takes priority over everything else', () => {
    expect(
      blockerOf(
        pr({
          mergeable: 'CONFLICTING',
          statusCheckRollup: 'FAILURE',
          reviewDecision: 'CHANGES_REQUESTED',
        }),
      ),
    ).toBe('conflict')
  })

  it('ci failure surfaces when no conflict', () => {
    expect(blockerOf(pr({ statusCheckRollup: 'FAILURE' }))).toBe('ci-fail')
  })

  it('ci error counts the same as ci failure', () => {
    expect(blockerOf(pr({ statusCheckRollup: 'ERROR' }))).toBe('ci-fail')
  })

  it('changes-requested wins over no-reviewers', () => {
    expect(blockerOf(pr({ reviewDecision: 'CHANGES_REQUESTED' }))).toBe('changes-requested')
  })

  it('approved is the explicit happy state', () => {
    expect(blockerOf(pr({ reviewDecision: 'APPROVED' }))).toBe('approved')
  })

  it('no decision and no requested reviewers means no reviewers', () => {
    expect(blockerOf(pr({ reviewDecision: null, reviewRequests: [] }))).toBe('no-reviewers')
  })

  it('requested reviewers without a decision means awaiting review', () => {
    expect(blockerOf(pr({ reviewDecision: null, reviewRequests: [{ login: 'bob' }] }))).toBe(
      'awaiting-review',
    )
  })

  it('explicit REVIEW_REQUIRED is awaiting review', () => {
    expect(blockerOf(pr({ reviewDecision: 'REVIEW_REQUIRED' }))).toBe('awaiting-review')
  })

  it('passing ci with no review is no-reviewers, not approved', () => {
    expect(blockerOf(pr({ statusCheckRollup: 'SUCCESS' }))).toBe('no-reviewers')
  })
})
