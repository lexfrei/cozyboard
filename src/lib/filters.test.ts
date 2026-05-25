import { describe, it, expect } from 'bun:test'
import {
  cycleTriState,
  EMPTY_FILTERS,
  isReadyForReview,
  passesFilters,
  type Filters,
} from './filters'
import type { PullRequest } from './types'

function pr(overrides: Partial<PullRequest> = {}): PullRequest {
  return {
    id: 'X',
    number: 1,
    title: 't',
    url: 'u',
    author: { login: 'alice' },
    authorAssociation: 'CONTRIBUTOR',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    isDraft: false,
    additions: 0,
    deletions: 0,
    changedFiles: 0,
    labels: [],
    repository: { name: 'r', nameWithOwner: 'o/r' },
    reviewDecision: null,
    mergeable: 'MERGEABLE',
    statusCheckRollup: 'SUCCESS',
    reviewRequests: [],
    ...overrides,
  }
}

describe('cycleTriState', () => {
  it('walks null → true → false → null', () => {
    expect(cycleTriState(null)).toBe(true)
    expect(cycleTriState(true)).toBe(false)
    expect(cycleTriState(false)).toBe(null)
  })
})

describe('isReadyForReview', () => {
  it('passes a clean PR', () => {
    expect(isReadyForReview(pr())).toBe(true)
  })

  it('blocks a draft', () => {
    expect(isReadyForReview(pr({ isDraft: true }))).toBe(false)
  })

  it('blocks a merge conflict', () => {
    expect(isReadyForReview(pr({ mergeable: 'CONFLICTING' }))).toBe(false)
  })

  it('blocks a CI failure', () => {
    expect(isReadyForReview(pr({ statusCheckRollup: 'FAILURE' }))).toBe(false)
  })

  it('blocks a CI errored', () => {
    expect(isReadyForReview(pr({ statusCheckRollup: 'ERROR' }))).toBe(false)
  })

  it('blocks changes-requested', () => {
    expect(isReadyForReview(pr({ reviewDecision: 'CHANGES_REQUESTED' }))).toBe(false)
  })

  it('treats pending CI as still ready', () => {
    expect(isReadyForReview(pr({ statusCheckRollup: 'PENDING' }))).toBe(true)
  })

  it('counts an APPROVED PR as ready too', () => {
    expect(isReadyForReview(pr({ reviewDecision: 'APPROVED' }))).toBe(true)
  })
})

describe('passesFilters', () => {
  const filters = (overrides: Partial<Filters> = {}): Filters => ({
    ...EMPTY_FILTERS,
    ...overrides,
  })

  it('passes everything when nothing is set', () => {
    expect(passesFilters(pr(), filters(), 'bob')).toBe(true)
  })

  describe('readyForReview', () => {
    it('= true keeps only ready PRs', () => {
      expect(passesFilters(pr(), filters({ readyForReview: true }), null)).toBe(true)
      expect(passesFilters(pr({ isDraft: true }), filters({ readyForReview: true }), null)).toBe(
        false,
      )
    })

    it('= false keeps only NOT-ready PRs', () => {
      expect(passesFilters(pr(), filters({ readyForReview: false }), null)).toBe(false)
      expect(
        passesFilters(pr({ mergeable: 'CONFLICTING' }), filters({ readyForReview: false }), null),
      ).toBe(true)
    })
  })

  describe('mine', () => {
    it('= true keeps only viewer-authored PRs', () => {
      expect(passesFilters(pr({ author: { login: 'bob' } }), filters({ mine: true }), 'bob')).toBe(
        true,
      )
      expect(
        passesFilters(pr({ author: { login: 'alice' } }), filters({ mine: true }), 'bob'),
      ).toBe(false)
    })

    it('= false hides viewer-authored PRs', () => {
      expect(passesFilters(pr({ author: { login: 'bob' } }), filters({ mine: false }), 'bob')).toBe(
        false,
      )
      expect(
        passesFilters(pr({ author: { login: 'alice' } }), filters({ mine: false }), 'bob'),
      ).toBe(true)
    })

    it('= true with no viewer drops everything', () => {
      expect(passesFilters(pr(), filters({ mine: true }), null)).toBe(false)
    })
  })

  describe('fromMaintainer', () => {
    it('= true keeps OWNER / MEMBER / COLLABORATOR', () => {
      const f = filters({ fromMaintainer: true })
      expect(passesFilters(pr({ authorAssociation: 'OWNER' }), f, null)).toBe(true)
      expect(passesFilters(pr({ authorAssociation: 'MEMBER' }), f, null)).toBe(true)
      expect(passesFilters(pr({ authorAssociation: 'COLLABORATOR' }), f, null)).toBe(true)
      expect(passesFilters(pr({ authorAssociation: 'CONTRIBUTOR' }), f, null)).toBe(false)
      expect(passesFilters(pr({ authorAssociation: 'NONE' }), f, null)).toBe(false)
    })

    it('= false drops OWNER / MEMBER / COLLABORATOR', () => {
      const f = filters({ fromMaintainer: false })
      expect(passesFilters(pr({ authorAssociation: 'MEMBER' }), f, null)).toBe(false)
      expect(passesFilters(pr({ authorAssociation: 'CONTRIBUTOR' }), f, null)).toBe(true)
    })
  })

  describe('maxAgeDays', () => {
    const now = new Date('2025-01-30T00:00:00Z').getTime()

    it('drops PRs older than the threshold', () => {
      const old = pr({ updatedAt: '2025-01-01T00:00:00Z' }) // 29d
      expect(passesFilters(old, filters({ maxAgeDays: 7 }), null, now)).toBe(false)
      expect(passesFilters(old, filters({ maxAgeDays: 30 }), null, now)).toBe(true)
    })
  })

  describe('combined', () => {
    it('AND-combines all set filters', () => {
      const f = filters({ readyForReview: true, mine: false })
      const mine = pr({ author: { login: 'bob' } })
      const otherButBroken = pr({ author: { login: 'alice' }, mergeable: 'CONFLICTING' })
      const otherAndReady = pr({ author: { login: 'alice' } })
      expect(passesFilters(mine, f, 'bob')).toBe(false) // is mine, mine filter excludes
      expect(passesFilters(otherButBroken, f, 'bob')).toBe(false) // not mine OK but not ready
      expect(passesFilters(otherAndReady, f, 'bob')).toBe(true) // not mine, ready
    })
  })
})
