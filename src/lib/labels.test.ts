import { describe, it, expect } from 'bun:test'
import { deriveLabelFacets, namespaceOf, passesLabelFilter, UNNAMESPACED } from './labels'
import type { PullRequest, RepoGroup } from './types'

function pr(labelNames: string[]): PullRequest {
  return {
    id: 'X',
    number: 1,
    title: 't',
    url: 'u',
    author: { login: 'a' },
    authorAssociation: 'CONTRIBUTOR',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    isDraft: false,
    additions: 0,
    deletions: 0,
    changedFiles: 0,
    labels: labelNames.map((name) => ({ name, color: 'ffffff' })),
    repository: { name: 'r', nameWithOwner: 'o/r' },
    reviewDecision: null,
    mergeable: 'MERGEABLE',
    statusCheckRollup: null,
    reviewRequests: [],
    viewerLatestReviewState: null,
  }
}

function group(labelSets: string[][]): RepoGroup {
  return {
    name: 'r',
    nameWithOwner: 'o/r',
    pullRequests: labelSets.map((s) => pr(s)),
  }
}

describe('namespaceOf', () => {
  it('extracts the prefix before /', () => {
    expect(namespaceOf('area/apps')).toBe('area')
    expect(namespaceOf('kind/feature')).toBe('kind')
  })

  it('returns UNNAMESPACED for labels without /', () => {
    expect(namespaceOf('release')).toBe(UNNAMESPACED)
  })

  it('takes the first / as the boundary', () => {
    expect(namespaceOf('area/sub/nested')).toBe('area')
  })
})

describe('deriveLabelFacets', () => {
  it('groups labels by namespace and dedupes', () => {
    const facets = deriveLabelFacets([
      group([['area/apps', 'kind/bug']]),
      group([['area/apps', 'kind/feature']]),
    ])
    const byNs = new Map(facets.map((f) => [f.namespace, f.labels.map((l) => l.name)]))
    expect(byNs.get('area')).toEqual(['area/apps'])
    expect(byNs.get('kind')).toEqual(['kind/bug', 'kind/feature'])
  })

  it('places UNNAMESPACED facet last', () => {
    const facets = deriveLabelFacets([group([['release', 'area/apps', 'kind/bug']])])
    expect(facets[facets.length - 1]?.namespace).toBe(UNNAMESPACED)
  })

  it('returns empty when no PRs have labels', () => {
    expect(deriveLabelFacets([group([[]])])).toEqual([])
  })
})

describe('passesLabelFilter', () => {
  it('passes when no labels are filtered', () => {
    expect(passesLabelFilter(pr(['area/apps']), {})).toBe(true)
  })

  it('include = true within one namespace acts as OR', () => {
    const filter = { 'area/apps': true as const, 'area/system': true as const }
    expect(passesLabelFilter(pr(['area/apps']), filter)).toBe(true)
    expect(passesLabelFilter(pr(['area/system']), filter)).toBe(true)
    expect(passesLabelFilter(pr(['area/talos']), filter)).toBe(false)
  })

  it('include across namespaces acts as AND', () => {
    const filter = { 'area/apps': true as const, 'kind/bug': true as const }
    expect(passesLabelFilter(pr(['area/apps', 'kind/bug']), filter)).toBe(true)
    expect(passesLabelFilter(pr(['area/apps']), filter)).toBe(false)
    expect(passesLabelFilter(pr(['kind/bug']), filter)).toBe(false)
  })

  it('exclude = false drops any PR with that label', () => {
    const filter = { 'kind/bug': false as const }
    expect(passesLabelFilter(pr(['kind/bug']), filter)).toBe(false)
    expect(passesLabelFilter(pr(['kind/feature']), filter)).toBe(true)
  })

  it('exclude wins over include in same namespace', () => {
    const filter = { 'area/apps': true as const, 'area/internal': false as const }
    expect(passesLabelFilter(pr(['area/apps', 'area/internal']), filter)).toBe(false)
    expect(passesLabelFilter(pr(['area/apps']), filter)).toBe(true)
  })

  it('unset entries (null) are ignored', () => {
    const filter = { 'area/apps': null }
    expect(passesLabelFilter(pr([]), filter)).toBe(true)
    expect(passesLabelFilter(pr(['area/apps']), filter)).toBe(true)
  })
})
