const NAMESPACE = 'cozyboard'

export interface Settings {
  token: string | null
  org: string
  musicEnabled: boolean
}

const DEFAULTS: Settings = {
  token: null,
  org: 'cozystack',
  musicEnabled: false,
}

function key(name: string): string {
  return `${NAMESPACE}:${name}`
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(key('settings'))
    if (raw === null) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<Settings>
    return { ...DEFAULTS, ...parsed }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(key('settings'), JSON.stringify(settings))
}
