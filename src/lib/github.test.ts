import { describe, it, expect } from 'bun:test'
import { groupByRepo, transformPR, type RawPR } from './github'
import type { PullRequest } from './types'

function raw(overrides: Partial<RawPR> = {}): RawPR {
  return {
    id: 'X',
    number: 1,
    title: 't',
    url: 'u',
    author: { login: 'a' },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    isDraft: false,
    additions: 0,
    deletions: 0,
    changedFiles: 0,
    labels: { nodes: [] },
    repository: { name: 'r', nameWithOwner: 'o/r' },
    reviewDecision: null,
    mergeable: 'MERGEABLE',
    commits: { nodes: [{ commit: { statusCheckRollup: { state: 'SUCCESS' } } }] },
    reviewRequests: { nodes: [] },
    ...overrides,
  }
}

describe('transformPR', () => {
  it('lifts statusCheckRollup state out of the commits envelope', () => {
    expect(transformPR(raw()).statusCheckRollup).toBe('SUCCESS')
  })

  it('treats a missing last commit as no ci', () => {
    expect(transformPR(raw({ commits: { nodes: [] } })).statusCheckRollup).toBeNull()
  })

  it('treats a commit with null statusCheckRollup as no ci', () => {
    const r = raw({ commits: { nodes: [{ commit: { statusCheckRollup: null } }] } })
    expect(transformPR(r).statusCheckRollup).toBeNull()
  })

  it('keeps only user reviewers with a login (teams without login are dropped)', () => {
    const r = raw({
      reviewRequests: {
        nodes: [
          { requestedReviewer: { __typename: 'User', login: 'alice' } },
          { requestedReviewer: { __typename: 'Team', login: null } },
          { requestedReviewer: null },
        ],
      },
    })
    expect(transformPR(r).reviewRequests).toEqual([{ login: 'alice' }])
  })

  it('flattens labels.nodes into a plain array', () => {
    const r = raw({
      labels: {
        nodes: [
          { name: 'kind/bug', color: 'ff0000' },
          { name: 'priority/high', color: '00ff00' },
        ],
      },
    })
    expect(transformPR(r).labels).toEqual([
      { name: 'kind/bug', color: 'ff0000' },
      { name: 'priority/high', color: '00ff00' },
    ])
  })
})

describe('groupByRepo', () => {
  function pr(repo: string, id: string, updatedAt: string): PullRequest {
    return {
      id,
      number: 1,
      title: id,
      url: 'u',
      author: { login: 'a' },
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt,
      isDraft: false,
      additions: 0,
      deletions: 0,
      changedFiles: 0,
      labels: [],
      repository: { name: repo, nameWithOwner: `cozystack/${repo}` },
      reviewDecision: null,
      mergeable: 'MERGEABLE',
      statusCheckRollup: null,
      reviewRequests: [],
    }
  }

  it('groups PRs by repository.nameWithOwner', () => {
    const groups = groupByRepo([
      pr('a', '1', '2025-01-01T00:00:00Z'),
      pr('b', '2', '2025-01-01T00:00:00Z'),
      pr('a', '3', '2025-01-01T00:00:00Z'),
    ])
    const a = groups.find((g) => g.nameWithOwner === 'cozystack/a')
    const b = groups.find((g) => g.nameWithOwner === 'cozystack/b')
    expect(a?.pullRequests.length).toBe(2)
    expect(b?.pullRequests.length).toBe(1)
  })

  it('sorts groups by PR count descending', () => {
    const groups = groupByRepo([
      pr('small', '1', '2025-01-01T00:00:00Z'),
      pr('big', '2', '2025-01-01T00:00:00Z'),
      pr('big', '3', '2025-01-01T00:00:00Z'),
      pr('big', '4', '2025-01-01T00:00:00Z'),
    ])
    expect(groups.map((g) => g.name)).toEqual(['big', 'small'])
  })

  it('sorts PRs within a group by updatedAt descending (newest first)', () => {
    const groups = groupByRepo([
      pr('r', 'older', '2025-01-01T00:00:00Z'),
      pr('r', 'newer', '2025-01-02T00:00:00Z'),
      pr('r', 'newest', '2025-01-03T00:00:00Z'),
    ])
    expect(groups[0]?.pullRequests.map((p) => p.id)).toEqual(['newest', 'newer', 'older'])
  })
})
