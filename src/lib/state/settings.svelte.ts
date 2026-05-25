import { EMPTY_FILTERS, type Filters, type TriState } from '../filters'

const STORAGE_KEY = 'cozyboard:settings'

export interface Settings {
  token: string | null
  orgs: string[]
  filters: Filters
  musicEnabled: boolean
  pinnedRepos: string[]
}

function defaults(): Settings {
  return {
    token: null,
    orgs: [],
    filters: { ...EMPTY_FILTERS },
    musicEnabled: false,
    pinnedRepos: [],
  }
}

function triFrom(value: unknown): TriState {
  if (value === true || value === false) return value
  return null
}

function positiveNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
  return null
}

function normaliseLabelStates(value: unknown): Record<string, TriState> {
  if (typeof value !== 'object' || value === null) return {}
  const out: Record<string, TriState> = {}
  for (const [name, state] of Object.entries(value as Record<string, unknown>)) {
    if (typeof name !== 'string' || name.length === 0) continue
    const tri = triFrom(state)
    if (tri !== null) out[name] = tri
  }
  return out
}

function normaliseFilters(value: unknown): Filters {
  if (typeof value !== 'object' || value === null) {
    return { ...EMPTY_FILTERS, labels: {} }
  }
  const raw = value as Record<string, unknown>
  return {
    readyForReview: triFrom(raw.readyForReview),
    mine: triFrom(raw.mine),
    fromMaintainer: triFrom(raw.fromMaintainer),
    reviewedByMe: triFrom(raw.reviewedByMe),
    requestedFromMe: triFrom(raw.requestedFromMe),
    minAgeDays: positiveNumberOrNull(raw.minAgeDays),
    maxAgeDays: positiveNumberOrNull(raw.maxAgeDays),
    labels: normaliseLabelStates(raw.labels),
  }
}

function normaliseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(
      value
        .filter((o): o is string => typeof o === 'string')
        .map((o) => o.trim())
        .filter((o) => o.length > 0),
    ),
  )
}

interface LegacyShape {
  token?: string | null
  org?: string
  orgs?: unknown
  musicEnabled?: boolean
  filters?: unknown
  pinnedRepos?: unknown
}

function loadFromStorage(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return defaults()
    const parsed = JSON.parse(raw) as LegacyShape
    const orgs = normaliseStringArray(
      parsed.orgs ?? (typeof parsed.org === 'string' ? [parsed.org] : undefined),
    )
    return {
      token: typeof parsed.token === 'string' && parsed.token.length > 0 ? parsed.token : null,
      orgs,
      filters: normaliseFilters(parsed.filters),
      musicEnabled: parsed.musicEnabled === true,
      pinnedRepos: normaliseStringArray(parsed.pinnedRepos),
    }
  } catch {
    return defaults()
  }
}

export const settings = $state<Settings>(loadFromStorage())

function persist(): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        token: settings.token,
        orgs: settings.orgs,
        filters: settings.filters,
        musicEnabled: settings.musicEnabled,
        pinnedRepos: settings.pinnedRepos,
      }),
    )
  } catch {
    /* localStorage full or disabled — non-fatal */
  }
}

export function setToken(token: string | null): void {
  settings.token = token === null || token.length === 0 ? null : token
  persist()
}

export function setOrgs(orgs: string[]): void {
  settings.orgs = normaliseStringArray(orgs)
  persist()
}

export function setFilters(next: Filters): void {
  settings.filters = normaliseFilters(next)
  persist()
}

export function setMusicEnabled(enabled: boolean): void {
  settings.musicEnabled = enabled
  persist()
}

export function togglePinnedRepo(nameWithOwner: string): void {
  const idx = settings.pinnedRepos.indexOf(nameWithOwner)
  if (idx >= 0) {
    settings.pinnedRepos.splice(idx, 1)
  } else {
    settings.pinnedRepos.push(nameWithOwner)
  }
  persist()
}
