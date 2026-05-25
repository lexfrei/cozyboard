import type { Label, PullRequest, RepoGroup } from './types'
import type { TriState } from './filters'

export const UNNAMESPACED = '_'

export function namespaceOf(label: string): string {
  const idx = label.indexOf('/')
  return idx === -1 ? UNNAMESPACED : label.slice(0, idx)
}

export interface LabelFacet {
  namespace: string
  labels: Label[]
}

export function deriveLabelFacets(groups: RepoGroup[]): LabelFacet[] {
  const byNs = new Map<string, Map<string, Label>>()
  for (const group of groups) {
    for (const pr of group.pullRequests) {
      for (const lbl of pr.labels) {
        const ns = namespaceOf(lbl.name)
        let inner = byNs.get(ns)
        if (!inner) {
          inner = new Map()
          byNs.set(ns, inner)
        }
        if (!inner.has(lbl.name)) inner.set(lbl.name, lbl)
      }
    }
  }
  const facets: LabelFacet[] = []
  for (const [namespace, inner] of byNs) {
    facets.push({
      namespace,
      labels: [...inner.values()].sort((a, b) => a.name.localeCompare(b.name)),
    })
  }
  facets.sort((a, b) => {
    if (a.namespace === UNNAMESPACED) return 1
    if (b.namespace === UNNAMESPACED) return -1
    return a.namespace.localeCompare(b.namespace)
  })
  return facets
}

export function passesLabelFilter(
  pr: PullRequest,
  labelStates: Record<string, TriState>,
): boolean {
  const prLabels = new Set(pr.labels.map((l) => l.name))
  const includesByNs = new Map<string, string[]>()

  for (const [name, state] of Object.entries(labelStates)) {
    if (state === true) {
      const ns = namespaceOf(name)
      const list = includesByNs.get(ns) ?? []
      list.push(name)
      includesByNs.set(ns, list)
    } else if (state === false) {
      if (prLabels.has(name)) return false
    }
  }

  for (const list of includesByNs.values()) {
    if (!list.some((name) => prLabels.has(name))) return false
  }

  return true
}
