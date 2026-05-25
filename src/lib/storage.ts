import { EMPTY_FILTERS, type Filters, type TriState } from './filters'

const NAMESPACE = 'cozyboard'

export interface Settings {
  token: string | null
  orgs: string[]
  musicEnabled: boolean
  filters: Filters
}

const DEFAULTS: Settings = {
  token: null,
  orgs: [],
  musicEnabled: false,
  filters: { ...EMPTY_FILTERS },
}

function key(name: string): string {
  return `${NAMESPACE}:${name}`
}

interface LegacyShape {
  token?: string | null
  org?: string
  orgs?: unknown
  musicEnabled?: boolean
  filters?: unknown
}

function triFrom(value: unknown): TriState {
  if (value === true || value === false) return value
  return null
}

function normaliseFilters(value: unknown): Filters {
  if (typeof value !== 'object' || value === null) return { ...EMPTY_FILTERS }
  const raw = value as Record<string, unknown>
  const maxAge = typeof raw.maxAgeDays === 'number' && raw.maxAgeDays > 0 ? raw.maxAgeDays : null
  return {
    readyForReview: triFrom(raw.readyForReview),
    mine: triFrom(raw.mine),
    fromMaintainer: triFrom(raw.fromMaintainer),
    maxAgeDays: maxAge,
  }
}

function normaliseOrgs(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback
  const cleaned = value
    .filter((o): o is string => typeof o === 'string')
    .map((o) => o.trim())
    .filter((o) => o.length > 0)
  return cleaned.length > 0 ? Array.from(new Set(cleaned)) : fallback
}

function freshDefaults(): Settings {
  return { ...DEFAULTS, orgs: [...DEFAULTS.orgs], filters: { ...EMPTY_FILTERS } }
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(key('settings'))
    if (raw === null) return freshDefaults()
    const parsed = JSON.parse(raw) as LegacyShape
    const orgs = normaliseOrgs(
      parsed.orgs ?? (typeof parsed.org === 'string' ? [parsed.org] : undefined),
      [...DEFAULTS.orgs],
    )
    return {
      token: typeof parsed.token === 'string' && parsed.token.length > 0 ? parsed.token : null,
      orgs,
      musicEnabled: parsed.musicEnabled === true,
      filters: normaliseFilters(parsed.filters),
    }
  } catch {
    return freshDefaults()
  }
}

export function saveSettings(settings: Settings): void {
  const cleaned: Settings = {
    token: settings.token === null || settings.token.length === 0 ? null : settings.token,
    orgs: normaliseOrgs(settings.orgs, [...DEFAULTS.orgs]),
    musicEnabled: settings.musicEnabled,
    filters: normaliseFilters(settings.filters),
  }
  localStorage.setItem(key('settings'), JSON.stringify(cleaned))
}
