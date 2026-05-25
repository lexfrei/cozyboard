import { describe, it, expect } from 'bun:test'
import { EMPTY_FILTERS, type Filters } from './filters'
import { parseShareableState, serializeShareableState } from './share'

function filters(overrides: Partial<Filters> = {}): Filters {
  return { ...EMPTY_FILTERS, ...overrides, labels: { ...(overrides.labels ?? {}) } }
}

describe('serializeShareableState', () => {
  it('omits keys for unset filters and empty query', () => {
    const params = serializeShareableState({ filters: filters(), query: '' })
    expect([...params.keys()]).toEqual([])
  })

  it('emits compact keys for each set chip', () => {
    const params = serializeShareableState({
      filters: filters({ readyForReview: true, mine: false, reviewedByMe: false }),
      query: '',
    })
    expect(params.get('ready')).toBe('t')
    expect(params.get('mine')).toBe('f')
    expect(params.get('rev')).toBe('f')
  })

  it('encodes labels as repeated label=name:t/f pairs, sorted', () => {
    const params = serializeShareableState({
      filters: filters({ labels: { 'kind/bug': true, 'area/apps': false } }),
      query: '',
    })
    expect(params.getAll('label')).toEqual(['area/apps:f', 'kind/bug:t'])
  })

  it('includes age bounds and free-text query', () => {
    const params = serializeShareableState({
      filters: filters({ minAgeDays: 7, maxAgeDays: 30 }),
      query: 'cilium tls',
    })
    expect(params.get('min')).toBe('7')
    expect(params.get('max')).toBe('30')
    expect(params.get('q')).toBe('cilium tls')
  })
})

describe('serializeShareableState — implicit org context', () => {
  it('emits explicit filter.orgs when set', () => {
    const params = serializeShareableState(
      { filters: filters({ orgs: { cozystack: true, 'aenix-io': false } }), query: '' },
      ['cozystack', 'aenix-io', 'other'],
    )
    expect(params.getAll('org')).toEqual(['aenix-io:f', 'cozystack:t'])
  })

  it('falls back to context orgs (all include) when filter.orgs is empty', () => {
    const params = serializeShareableState(
      { filters: filters(), query: '' },
      ['cozystack', 'aenix-io'],
    )
    expect(params.getAll('org')).toEqual(['aenix-io:t', 'cozystack:t'])
  })

  it('emits no org param when filter is empty and context is empty', () => {
    const params = serializeShareableState({ filters: filters(), query: '' }, [])
    expect(params.getAll('org')).toEqual([])
  })
})

describe('parseShareableState', () => {
  it('returns null on an empty query string', () => {
    expect(parseShareableState(new URLSearchParams(''))).toBeNull()
  })

  it('round-trips a full state', () => {
    const original = {
      filters: filters({
        readyForReview: true,
        mine: false,
        fromMaintainer: true,
        reviewedByMe: false,
        requestedFromMe: true,
        minAgeDays: 5,
        maxAgeDays: 30,
        orgs: { cozystack: true },
        labels: { 'area/apps': true, 'kind/bug': false },
      }),
      query: 'hello world',
    }
    const params = serializeShareableState(original)
    const parsed = parseShareableState(params)
    expect(parsed).toEqual(original)
  })

  it('ignores unknown values gracefully', () => {
    const params = new URLSearchParams('ready=garbage&min=-5&label=bad')
    const parsed = parseShareableState(params)
    expect(parsed?.filters.readyForReview).toBeNull()
    expect(parsed?.filters.minAgeDays).toBeNull()
    expect(Object.keys(parsed?.filters.labels ?? {})).toEqual([])
  })

  it('handles labels with colons in their name', () => {
    const params = new URLSearchParams('label=area%2Ffoo%3Abar%3At')
    const parsed = parseShareableState(params)
    expect(parsed?.filters.labels).toEqual({ 'area/foo:bar': true })
  })
})
