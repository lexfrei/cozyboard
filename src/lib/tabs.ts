export type Tab = 'orgs' | 'prs' | 'keys'

const TABS: ReadonlySet<Tab> = new Set<Tab>(['orgs', 'prs', 'keys'])

export function tabFromHash(hash: string): Tab {
  const value = hash.replace(/^#/, '')
  return TABS.has(value as Tab) ? (value as Tab) : 'orgs'
}

export function hashForTab(tab: Tab): string {
  return tab === 'orgs' ? '' : `#${tab}`
}
