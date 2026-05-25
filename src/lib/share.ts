import { EMPTY_FILTERS, type Filters, type TriState } from './filters'

const TRI: Record<string, TriState> = { t: true, f: false }

function triToParam(state: TriState): string | null {
  if (state === true) return 't'
  if (state === false) return 'f'
  return null
}

function paramToTri(value: string | null): TriState {
  if (value === null) return null
  return TRI[value] ?? null
}

function intFromParam(value: string | null): number | null {
  if (value === null) return null
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

export interface ShareableState {
  filters: Filters
  query: string
}

function serializeOrgFacet(
  states: Record<string, TriState>,
  contextOrgs: string[],
  params: URLSearchParams,
  paramName: string,
): void {
  const explicit = Object.entries(states).filter(([, s]) => s !== null)
  if (explicit.length > 0) {
    for (const [name, state] of explicit.sort(([a], [b]) => a.localeCompare(b))) {
      const tri = triToParam(state)
      if (tri !== null) params.append(paramName, `${name}:${tri}`)
    }
    return
  }
  // Implicit: capture the currently-fetched orgs as include, so the recipient
  // sees the same scope even when the sharer didn't set the filter explicitly.
  for (const org of [...contextOrgs].sort()) {
    params.append(paramName, `${org}:t`)
  }
}

export function serializeShareableState(
  state: ShareableState,
  contextOrgs: string[] = [],
): URLSearchParams {
  const params = new URLSearchParams()
  const f = state.filters

  const ready = triToParam(f.readyForReview)
  if (ready !== null) params.set('ready', ready)
  const mine = triToParam(f.mine)
  if (mine !== null) params.set('mine', mine)
  const maint = triToParam(f.fromMaintainer)
  if (maint !== null) params.set('maint', maint)
  const rev = triToParam(f.reviewedByMe)
  if (rev !== null) params.set('rev', rev)
  const req = triToParam(f.requestedFromMe)
  if (req !== null) params.set('req', req)

  if (f.minAgeDays !== null) params.set('min', String(f.minAgeDays))
  if (f.maxAgeDays !== null) params.set('max', String(f.maxAgeDays))

  serializeOrgFacet(f.orgs, contextOrgs, params, 'org')

  const labelEntries = Object.entries(f.labels)
    .filter(([, state]) => state !== null)
    .sort(([a], [b]) => a.localeCompare(b))
  for (const [name, state] of labelEntries) {
    const tri = triToParam(state)
    if (tri !== null) params.append('label', `${name}:${tri}`)
  }

  if (state.query !== '') params.set('q', state.query)
  return params
}

export function parseShareableState(params: URLSearchParams): ShareableState | null {
  if ([...params.keys()].length === 0) return null

  function parseFacet(paramName: string): Record<string, TriState> {
    const out: Record<string, TriState> = {}
    for (const raw of params.getAll(paramName)) {
      const idx = raw.lastIndexOf(':')
      if (idx <= 0) continue
      const name = raw.slice(0, idx)
      const tri = paramToTri(raw.slice(idx + 1))
      if (tri !== null) out[name] = tri
    }
    return out
  }

  const orgs = parseFacet('org')
  const labels = parseFacet('label')

  const filters: Filters = {
    ...EMPTY_FILTERS,
    readyForReview: paramToTri(params.get('ready')),
    mine: paramToTri(params.get('mine')),
    fromMaintainer: paramToTri(params.get('maint')),
    reviewedByMe: paramToTri(params.get('rev')),
    requestedFromMe: paramToTri(params.get('req')),
    minAgeDays: intFromParam(params.get('min')),
    maxAgeDays: intFromParam(params.get('max')),
    orgs,
    labels,
  }

  return { filters, query: params.get('q') ?? '' }
}
