const NAMESPACE = 'cozyboard'

export interface Settings {
  token: string | null
  orgs: string[]
  musicEnabled: boolean
}

const DEFAULTS: Settings = {
  token: null,
  orgs: [],
  musicEnabled: false,
}

function key(name: string): string {
  return `${NAMESPACE}:${name}`
}

interface LegacyShape {
  token?: string | null
  org?: string
  orgs?: unknown
  musicEnabled?: boolean
}

function normaliseOrgs(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback
  const cleaned = value
    .filter((o): o is string => typeof o === 'string')
    .map((o) => o.trim())
    .filter((o) => o.length > 0)
  return cleaned.length > 0 ? Array.from(new Set(cleaned)) : fallback
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(key('settings'))
    if (raw === null) return { ...DEFAULTS, orgs: [...DEFAULTS.orgs] }
    const parsed = JSON.parse(raw) as LegacyShape
    const orgs = normaliseOrgs(
      parsed.orgs ?? (typeof parsed.org === 'string' ? [parsed.org] : undefined),
      [...DEFAULTS.orgs],
    )
    return {
      token: typeof parsed.token === 'string' && parsed.token.length > 0 ? parsed.token : null,
      orgs,
      musicEnabled: parsed.musicEnabled === true,
    }
  } catch {
    return { ...DEFAULTS, orgs: [...DEFAULTS.orgs] }
  }
}

export function saveSettings(settings: Settings): void {
  const cleaned: Settings = {
    token: settings.token === null || settings.token.length === 0 ? null : settings.token,
    orgs: normaliseOrgs(settings.orgs, [...DEFAULTS.orgs]),
    musicEnabled: settings.musicEnabled,
  }
  localStorage.setItem(key('settings'), JSON.stringify(cleaned))
}
